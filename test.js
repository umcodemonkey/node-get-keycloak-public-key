const tap = require('tap');
const nock = require('nock');
const Fetcher = require('./index.js');

const JSON = { keys: [
  { kid: 'kid1', kty: 'RSA', alg: 'RS256', use: 'sig', n: 'r8iqr2NkSIauZmDqMWu/nSrBuF817zDk+ylG9Lhs7CZha2GRpbfJp9HFivIthxuwNSltz4u15fuWLD3X+qjTHt29mOYFGtTXfceWyWOjDPYcrpudGoUtPG8mtHiVljsNTVqi4tbkHHQ8CTPZrQUpkLMuYQCTWyOMrjmcGbWtOcD6uvXZpOg9XMS5/yOPNN0ZlIYLGIpPiDh4ZfI38CzOEZE74hae2QF+fYwW5W5CJ/jBVN+hzhZ3FALFLYdGRtIzFwsQhi/DPJEoHc7bY392xBGmQeL9sqttOHJieXj1DMKEejDq4q6AHwbum95BfHjryPwq0HymnizZXiNx+A4pHQ', e: 'EQ' },
  { kid: 'kid2', kty: 'RSA', alg: 'RS256', use: 'sig', n: 'niqcAxl7LclB0kE6q9AcAd8EE+0W6AsriR9Fs9T+6QVXl8uiCiAbh/KCyy8X8C2bHsFpNBvwGTqMwHbqZqWBVUvYRtfCFcy3Xmertb09DnOBeWqKS4181kss97JDO6G07QNbuLSWwkkO82CHD1kUmeF5/dof0Ra6bsRXqppdo86NzlgFud+E2s5BM3XwewZVSpA69bwEiXaRDhrsg5mqeOm68VyxE8LQu+895kKsBnTvTueZTrXT+HNaIveoYe8+Lb7b/mZYtlhrDK0i/8EDox85vxnzKZ7wNswqqcDg6vfC2911phSTPh13jv2FIOkjO/WHhHEzRnS2VQqivqIbsQ', e: 'AQAB' }
] };

const PUBLIC_KEY_1 = '-----BEGIN RSA PUBLIC KEY-----\nMIIBCAKCAQEAr8iqr2NkSIauZmDqMWu/nSrBuF817zDk+ylG9Lhs7CZha2GRpbfJ\np9HFivIthxuwNSltz4u15fuWLD3X+qjTHt29mOYFGtTXfceWyWOjDPYcrpudGoUt\nPG8mtHiVljsNTVqi4tbkHHQ8CTPZrQUpkLMuYQCTWyOMrjmcGbWtOcD6uvXZpOg9\nXMS5/yOPNN0ZlIYLGIpPiDh4ZfI38CzOEZE74hae2QF+fYwW5W5CJ/jBVN+hzhZ3\nFALFLYdGRtIzFwsQhi/DPJEoHc7bY392xBGmQeL9sqttOHJieXj1DMKEejDq4q6A\nHwbum95BfHjryPwq0HymnizZXiNx+A4pHQIBEQ==\n-----END RSA PUBLIC KEY-----\n';
const PUBLIC_KEY_2 = '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAniqcAxl7LclB0kE6q9AcAd8EE+0W6AsriR9Fs9T+6QVXl8uiCiAb\nh/KCyy8X8C2bHsFpNBvwGTqMwHbqZqWBVUvYRtfCFcy3Xmertb09DnOBeWqKS418\n1kss97JDO6G07QNbuLSWwkkO82CHD1kUmeF5/dof0Ra6bsRXqppdo86NzlgFud+E\n2s5BM3XwewZVSpA69bwEiXaRDhrsg5mqeOm68VyxE8LQu+895kKsBnTvTueZTrXT\n+HNaIveoYe8+Lb7b/mZYtlhrDK0i/8EDox85vxnzKZ7wNswqqcDg6vfC2911phST\nPh13jv2FIOkjO/WHhHEzRnS2VQqivqIbsQIDAQAB\n-----END RSA PUBLIC KEY-----\n';

['http', 'https'].forEach((protocol) => {
  /* eslint-disable require-await */
  tap.test(`${protocol} error`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .replyWithError('Error');
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Error'));
  });

  tap.test(`${protocol} response 404`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(404);
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Status: 404, Content-type: undefined'));
  });

  tap.test(`${protocol} response with non application/json content type`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(200, '<html/>', { 'Content-Type': 'text/html' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Status: 200, Content-type: text/html'));
  });

  tap.test(`${protocol} response with invalid json data`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(200, '{"invalid":json}', { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Unexpected token j in JSON at position 11'));
  });

  tap.test(`${protocol} response with missing keys`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(200, '{"k":[]}', { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Can\'t find key for kid "kid1" in response.'));
  });

  tap.test(`${protocol} response with missing kid`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(200, '{"keys":[]}', { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Can\'t find key for kid "kid1" in response.'));
  });

  tap.test(`${protocol} response with missing modulus`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(200, '{"keys":[ { "kid": "kid1", "e": "x" }]}', { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Can\'t find modulus or exponent in key.'));
  });

  tap.test(`${protocol} response with missing exponent`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(200, '{"keys":[ { "kid": "kid1", "n": "x" }]}', { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Can\'t find modulus or exponent in key.'));
  });

  tap.test(`${protocol} response with invalid key type`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(200, '{"keys":[ { "kid": "kid1", "n": "x", "e": "y", "kty": "EC" }]}', { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Key type (kty) must be RSA.'));
  });

  tap.test(`${protocol} response with invalid algorythm`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .reply(200, '{"keys":[ { "kid": "kid1", "n": "x", "e": "y", "kty": "RSA" }]}', { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    t.rejects(fetcher.fetch('kid1'), new Error('Algorithm (alg) must be RS256.'));
  });

  /* eslint-enable require-await */
  tap.test(`${protocol} response with correct input`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/auth/realms/testrealm/protocol/openid-connect/certs')
      .twice()
      .reply(200, JSON, { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net`, 'testrealm');
    const publicKey1 = await fetcher.fetch('kid1');
    const publicKey2 = await fetcher.fetch('kid2');
    t.equals(publicKey1, PUBLIC_KEY_1, 'matches public key1');
    t.equals(publicKey2, PUBLIC_KEY_2, 'matches public key2');
    t.end();
  });

  tap.test(`${protocol} response on custom url`, async (t) => {
    nock(`${protocol}://testkeycloak.net`)
      .get('/custom')
      .twice()
      .reply(200, JSON, { 'Content-Type': 'application/json' });
    const fetcher = new Fetcher(`${protocol}://testkeycloak.net/custom`);
    const publicKey1 = await fetcher.fetch('kid1');
    const publicKey2 = await fetcher.fetch('kid2');
    t.equals(publicKey1, PUBLIC_KEY_1, 'matches public key1');
    t.equals(publicKey2, PUBLIC_KEY_2, 'mathces public key2');
    t.end();
  });
});
