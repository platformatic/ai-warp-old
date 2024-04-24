# AI Warp Configuration

Documentation on AI Warp's configuration options.

## How to Configure AI Warp

AI Warp can be configured in your applications's Platformatic config.

## Config Options

### `aiProvider`

 * `object`

> \[!NOTE]\
> This is a required configuration option.

This configuration option tells AI Warp what AI provider to use.

```json
{
  "aiProvider": {
    "openai": {
      "model": "gpt-3.5-turbo",
      "apiKey": "{PLT_OPENAI_API_KEY}" // reads from environment variables
    }
  }
}
```

### `promptDecorators`

 * `object`

Tells AI Warp to append a prefix and/or a suffix to a prompt. 

<details>
    <summary>Example usage</summary>

```json
{
  "promptDecorators": {
    "prefix": "Hello AI! Your prompt is as follows: \n",
    "suffix": "\nThank you!"
  }
}
```
</details>

### `auth`

 * `object`

Configure authentication for AI Warp. See [auth.md](./auth.md) for more information.

### `rateLimiting`

 * `object`

Configure rate limiting for AI Warp. See [rate-limiting.md](./rate-limiting.md) for more information.
