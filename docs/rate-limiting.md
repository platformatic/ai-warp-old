# Rate Limiting

Documentation on configuring AI Warp's rate limiting.

## Configuring

Configuring rate limiting can be done via your Platformatic config file under the `rateLimiting` object. E.g.

```json
// platformatic.json
{
  "rateLimiting": {
    // ...
  }
}
```

We utilize the [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit) module for rate limiting. You can
pass in any configuration options from it into the `rateLimiting` object.

For defining the callbacks allowed by that module, set them in the `fastify.ai.rateLimiting` object.
See the [Plugin API docs](./plugin-api.md#fastifyairatelimitingmax) for more information.

## Determining a client's request limit from JWT claims

AI Warp provides an easy and simple way to decide a client's request limit based off of JWT claims.
This is useful for say differentiating between free and premium users, where premium users get a higher
request limit.

> \[!NOTE]\
> This requires authentication to be enabled. Documentation for configuring authentication is available [here](./auth.md).

You can configure this within your Platformatic config under the `rateLimiting.maxByClaims` array:

```json
{
  "rateLimiting": {
    "maxByClaims": [
      {
        "claim": "name-of-the-claim",
        "claimValue": "value-necessary",
        "max": 10
      }
    ]
  }
}
```

So, for differentiating between free and premium users, you could do:

```json
{
  "rateLimiting": {
    "max": 100, // request limit for free users
    "maxByClaims": {
      {
        "claim": "userType",
        "claimValue": "premium",
        "max": 1000
      }
    }
  }
}
```
