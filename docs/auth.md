# Authentication

Documentation on how to configure and use AI Warp's authentication.

## Configuring

Configuring authentication can be done via your Platformatic config file under the `auth` object. E.g.

```json
// platformatic.json
{
  "auth": {
    // ...
  }
}
```

We utilize [fastify-user](https://github.com/platformatic/fastify-user) to do authentication, so you
can pass in any configuration options for it in the `auth` object.

AI Warp-specific options:

 * `required` (`boolean`) - If true, any unauthenticated users will receive a 401 status code and body.

### Example

This makes authentication required and accepts JWTs signed with the secret `abc123`:

```json
{
  "auth": {
    "required": true,
    "jwt": {
      "secret": "abc123"
    }
  }
}
```

## Using

By default, [fastify-user](https://github.com/platformatic/fastify-user) reads the `Authorization` header.

You can configure AI Warp to read the token from cookies in your Platformatic config:

```json
{
  "auth": {
    "jwt": {
      "cookie": {
        "cookieName": "token",
        "signed": false
      }
    }
  }
}
```
