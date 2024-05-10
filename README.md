# ai-warp

Platformatic Stackable to interact with AI services.

## Usage

1. `npx create-platformatic@latest`
2. Select `Application`, then `@platformatic/ai-warp`
3. Enter `my-ai-app` (or anything you like) as your app name
4. Select `@platformatic/ai-warp`
5. Select your AI provider
6. Enter the model you want to use (use the path in case of local llama2)
7. Enter the API key if using an online provider (openai, mistral, azure)

For more information, see [CONTRIBUTING.md](./CONTRIBUTING.md) and [Documentation](#documentation).

## Documentation

* [REST API](./docs/rest-api.md)
* [Config](./docs/config.md)
  * [Authentication](./docs/auth.md)
  * [Rate Limiting](./docs/rate-limiting.md)
* [Plugin API](./docs/plugin-api.md)
* [Contributing](./CONTRIBUTING.md)
  * [Adding a AI Provider](./docs/add-ai-provider.md)
