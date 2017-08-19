const http = require('http');
const https = require('https');

const BEGIN_KEY = '-----BEGIN RSA PUBLIC KEY-----\n';
const END_KEY = '\n-----END RSA PUBLIC KEY-----\n';

module.exports = function KeycloakPublicKeyFetcher(url, realm) {
  const certsUrl = realm ? `${url}/auth/realms/${realm}/protocol/openid-connect/certs` : url;
  return {
    fetch: kid => fetch(certsUrl, kid)
  };
};

async function fetch(url, kid) {
  const response = await getJson(url);
  const key = getKey(response, kid);
  if (!key) {
    throw new Error(`Can't find key for kid "${kid}" in response.`);
  }
  verify(key);
  return getPublicKey(key.n, key.e);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const agent = url.startsWith('https') ? https : http;
    agent.get(url, (res) => {
      if (!valid(res)) {
        res.resume();
        reject(new Error(`Status: ${res.statusCode}, Content-type: ${res.headers['content-type']}`));
      }
      parse(res)
        .then(result => resolve(result))
        .catch(error => reject(error));
    }).on('error', (e) => { reject(e); });
  });
}

function valid(response) {
  return response.statusCode === 200 && response.headers['content-type'] === 'application/json';
}

function parse(response) {
  return new Promise((resolve, reject) => {
    let rawData = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { rawData += chunk; });
    response.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        resolve(parsedData);
      } catch (e) {
        reject(e);
      }
    });
  });
}

function getKey(response, kid) {
  return Object.hasOwnProperty.call(response, 'keys')
    ? response.keys.find(k => k.kid === kid)
    : undefined;
}

function verify(key) {
  if (!(key.n && key.e)) {
    throw new Error('Can\'t find modulus or exponent in key.');
  }
  if (key.kty !== 'RSA') {
    throw new Error('Key type (kty) must be RSA.');
  }
  if (key.alg !== 'RS256') {
    throw new Error('Algorithm (alg) must be RS256.');
  }
}

// Based on tracker1's node-rsa-pem-from-mod-exp module.
// See https://github.com/tracker1/node-rsa-pem-from-mod-exp
function getPublicKey(modulus, exponent) {
  const mod = convertToHex(modulus);
  const exp = convertToHex(exponent);
  const encModLen = encodeLenght(mod.length / 2);
  const encExpLen = encodeLenght(exp.length / 2);
  const part = [mod, exp, encModLen, encExpLen].map(n => n.length / 2).reduce((a, b) => a + b);
  const bufferSource = `30${encodeLenght(part + 2)}02${encModLen}${mod}02${encExpLen}${exp}`;
  const pubkey = Buffer.from(bufferSource, 'hex').toString('base64');
  return BEGIN_KEY + pubkey.match(/.{1,64}/g).join('\n') + END_KEY;
}

function convertToHex(str) {
  const hex = Buffer.from(str, 'base64').toString('hex');
  return hex[0] < '0' || hex[0] > '7'
    ? `00${hex}`
    : hex;
}

function encodeLenght(n) {
  return n <= 127
    ? toHex(n)
    : toLongHex(n);
}

function toLongHex(number) {
  const str = toHex(number);
  const lengthByteLength = 128 + (str.length / 2);
  return toHex(lengthByteLength) + str;
}

function toHex(number) {
  const str = number.toString(16);
  return (str.length % 2)
    ? `0${str}`
    : str;
}
