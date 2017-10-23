# Authentication

Bitbucket uses an Access Token for authentication, using the `OAuth2` protocols

The client app needs to request the Access Token from the server, which has an expiration period.

Access tokens expire in *one hour*. When this happens you’ll get `401` responses

Most *access token grant* responses (Implicit and JWT excluded) therefore include a *refresh token* that can then be used to generate a new *access token*, without the need for end user participation

## OAuth2 end user authorization

The bitbucket API includes the method `authorizeOAuth2`:

```js
apiModel.authorizeOAuth2 = client_id => {
  let parameters = {
    client_id,
    response_type: 'code'
  }
  apiModel.request.get('oauth2/authorize', parameters || {}, requestOptions, callback)
}
```

This can be used for request authorization from the end user, by sending their browser to a page where they must approve access policies (scopes) by the app.

## Access Token authentication

To get the access token, use the `getAccessToken` function (by [@tpettersen](https://bitbucket.org/tpettersen/bitbucket-auth-token/)).

The function is available in `bitbucket-api-v2/auth`

```js
import {
  createBitbucketAPI,
} from 'bitbucket-api-v2'

import {
  getAccessToken
} from 'bitbucket-api-v2/auth'

const config = {
  appName: 'my-app',
  consumerKey: process.env.bitbucketKey,
  consumerSecret: process.env.bitbucketSecret,
  // ... more optional configuration (see getAccessToken function )
}

const accessToken = await getAccessToken(config)

// create API instance with accessToken set in header for each request
const api = createBitbucketAPI(accessToken)
```

`getAccessToken` will try to read the `consumerKey` and `consumerSecret` from the above listed environment variables if they are not passed as arguments.

If you follow this best practice, you can simplify it to:

```js
const accessToken = await getAccessToken({
  appName: 'my-app'
})
// create API instance with accessToken set in header for each request
const api = createBitbucketAPI(accessToken)
```

We also expose a `createAuthenticatedAPI` function to encapsulate this commong practice:

```js
import {
  createAuthenticatedAPI,
} from 'bitbucket-api-v2'

// create API instance with accessToken set in header for each request
const api = await createAuthenticatedAPI({
  getAccessToken,
  appName: 'my-app'
})
```

## Test cases

The `authorize.test.js` file contains tests for each of the authrozation routes and primary authentication protocols available for bitbucket API access.

`$ ava test/auth/authorize.test.js`

The request testing is done via [supertest](https://github.com/visionmedia/supertest)

## Browser app authentication flow

To request authorization from the end user, call this uri in the browser app:

`https://bitbucket.org/site/oauth2/authorize?client_id={client_id}&response_type=code`

This will redirecting the browser to `https://bitbucket.org/site/oauth2/authorize` and display an authentication confirmation page, asking the user to approve permissions.

Approval will trigger a call to the callback (route) as configured in the bitbucket OAuth settings for the app (ie. client_id).

The callback includes the `?code={}` query parameter that you can swap for an access token:

```bash
$ curl -X POST -u "client_id:secret" \
  https://bitbucket.org/site/oauth2/access_token \
  -d grant_type=authorization_code -d code={code}
```

`-u "client_id:secret"` is the username

Once you have an access token, as per [RFC-6750](https://tools.ietf.org/html/rfc6749), you can use it in bitbucket requests.

### Auth0 auth

[Auth0 for bitbucket](https://auth0.com/docs/connections/social/bitbucket) is another option.

[Auth0](https://auth0.com/) works for a client app that does the authentication handshake using the browser. The app can store the JWT/access token in `localstorage`.
The token is piggy-backed on the request header on each request to the server.

### Auth Callback handler

When the user approves permission for the app, bitbucket will call the configured callback (as defined on the bitbucket OAuth configuration page).

A sample [express server](https://expressjs.com/) can be found in the `/server` folder which you can use to test this callback auth flow.

Simply create an app in the bitbucket OAuth config page (under account settings) and set the callback to `http://localhost:3000/authenticated`

Create a client/browser app, include this package (create a bundle via webpack, browserify or similar?).

Create an API instance as usual, then call the `authorizeOAuth2` API method to trigger the browser redirect to the bitbucket OAuth2 authentication page.

When permissions are approved, the server should trigger a callback of the uri/route (such as `http://localhost:3000/authenticated`)

## Managing (token) secrets

During development/testing, you can place your own tokens in `test/secret/access-tokens.json`, something like this (not real keys here!).

Please not that `test/secret/access-tokens.json` has been added to `.npmignore` and `.gitignore` for your safety.

```json
{
  "key": "a9d9fg2A3XrNFPjPwh9zx",
  "secret": "1djJwEd3fU4ptVut9QRPz6zjAxfUNqLA"
}
```

## Bitbucket Cloud JWT Grant (urn:bitbucket:oauth2:jwt)

If your Atlassian Connect add-on uses JWT authentication, you can swap a JWT for an OAuth access token. The resulting access token represents the account for which the add-on is installed.

Make sure you send the JWT token in the Authorization request header using the "JWT" scheme (case sensitive). Note that this custom scheme makes this different from HTTP Basic Auth (and so you cannot use `curl -u`).

Making Requests

```bash
$ curl -X POST -H "Authorization: JWT {jwt_token}" \
  https://bitbucket.org/site/oauth2/access_token \
  -d grant_type=urn:bitbucket:oauth2:jwt
```

### JWT example code

- [Bitbucket JWT code examples (Java)](https://bitbucket.org/b_c/jose4j/wiki/JWT%20Examples)

### Adding JWT to bitbucket API

The bitbucket API doesn't yet support JWT authentication. Please feel free to add JWT auth if that better suits your need.

An (experimental skeleton) implementation could start with sth. like this:

```js
apiModel.authenticateJwt = accessToken => {
  apiModel.request
    .setOption('login_type', 'jwt')
    .setOption('jwt_access_token', accessToken)
  return apiModel
}
```

To perform JWT authentication you would have to do a form `POST` request, similar to the approach used for `getTokens` in `src/auth/access-tokens.js`

It might look something like this (with `supertest` as an example)

```js
import supertest from 'supertest'
let connection = supertest('https://bitbucket.org')
try {
  let result = await connection
    .post('site/oauth2/access_token')
    .header({
      'Authorization': `JWT ${accessToken}`
    })
    .field('grant_type', 'urn:bitbucket:oauth2:jwt')
catch (err) {
  console.error(err)
}
```

May the JWT authentication gods be with you!

#### JWT Issues (for reference)

- [issue #1](https://community.atlassian.com/t5/Answers-Developer-Questions/Can-t-get-access-token-with-JWT-from-Bitbucket-API/qaq-p/533548)
- [Issue #2](https://community.atlassian.com/t5/Answers-Developer-Questions/Bitbucket-get-access-token-from-JWT/qaq-p/549041)

If you have problems, try asking on the [Atlassian community forum](https://community.atlassian.com) or on [Stack overflow](https://stackoverflow.com/questions/tagged/bitbucket)