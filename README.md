# Get KeyCloak Public Key [![Build Status](https://travis-ci.org/aquator/node-get-keycloak-public-key.svg?branch=master)](https://travis-ci.org/aquator/node-get-keycloak-public-key)
Provides access to PEM Public Keys from a [KeyCloak][1] server for [JWT][2] validation.

## Introduction
[KeyCloak][1] has a bunch of libraries, but for [NodeJs][3] the only solution is a [Connect based adapter][4]. In case you want to use [koa][5], or something else, you are toast with your token.

This module provides access to the PEM encoded Public Key used for the token based on the KID value, so you can validate the token with anything you want.

The module has no dependencies, the algorithm used to reconstruct the PEM encoded value from the modulus and the exponent is taken from [tracker1's solution]( https://github.com/tracker1/node-rsa-pem-from-mod-exp).

## Features
The idea is to keep this simple and stupid, so nothing fancy is included. It can download the certificates JSON from a KeyCloak server, find the one with matching KID value, and reconstruct the Public Key in PEM format. End of story.

If you need improved behavior like caching of Public Keys, you can easily implement one.

## Installation
```bash
$ npm install --save get-keycloak-public-key
```

## Usage
```javascript
const KeyCloakCerts = require('get-keycloak-public-key');

const keyCloakCerts = new KeyCloakCerts('https://my-keycloak.com', 'my-realm');

// You can also pass the full URL instead, as a single argument:
// 'https://my-keycloak.com/auth/realms/my-realm/protocol/openid-connect/certs'

const publicKey = keyCloakCerts.get('my-kid')
```

## Example
Verifying the token using [koa][5] and [jsonwebtoken][6]:
```javascript
const Koa = require('koa');
const KeyCloakCerts = require('get-keycloak-public-key');
const jwt = require('jsonwebtoken');

const keyCloakCerts = new KeyCloakCerts('https://my-keycloak.com', 'my-realm');
const app = new Koa();
app.use(async (ctx) => {
  // Check the Authorization header
  if (!(ctx.request.header.autorization && ctx.request.header.authorization.startsWith('Bearer '))) {
    // Authorization header is missing
    ctx.status = 401;
    return;
  }

  // Get the token from the Authorization header, skip 'Bearer ' prefix
  const token = ctx.request.header.authorization.substr(7);

  // decode the token without verification to have the kid value
  const kid = jwt.decode(token, { complete: true }).header.kid;

  // fetch the PEM Public Key
  const publicKey = await keyCloakCerts.get(kid);

  if (publicKey) {
    try {
      // Token is not valid
      process.stderr.write(error.toString());
      ctx.status = 401;
    }
  } else {
    // KeyCloak has no Public Key for the specified KID
    ctx.status = 401;
  }
});
app.listen(3000);
```

[1]: http://www.keycloak.org/
[2]: https://jwt.io/
[3]: https://nodejs.org/en/
[4]: https://github.com/keycloak/keycloak-nodejs-connect
[5]: http://koajs.com/
[6]: https://github.com/auth0/node-jsonwebtoken
