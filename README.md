# ai-warp

Platformatic Stackable to interact with AI services.

## Usage

To get started using AI Warp, all you need to do is three steps:

 1. Generate an AI Warp app. As of now, this can only be done through this repository.

    ```bash
    npm install
    npm run build
    npm run create
    ```

 2. Configure the app's Platformatic config file. By default, this is located
 at `ai-warp-app/platformatic.json`. For a full list of available configuration
 options, see [docs/config.md](./docs/config.md).

 3. Start the app!

    ```bash
    npm start
    ```

For more information, see [CONTRIBUTING.md](./CONTRIBUTING.md) and [Documentation](#documentation).

## Documentation

* [REST API](./docs/rest-api.md)
* [Config](./docs/config.md)
  * [Authentication](./docs/auth.md)
  * [Rate Limiting](./docs/rate-limiting.md)
* [Plugin API](./docs/plugin-api.md)
* [Contributing](./CONTRIBUTING.md)
  * [Adding a AI Provider](./docs/add-ai-provider.md)
