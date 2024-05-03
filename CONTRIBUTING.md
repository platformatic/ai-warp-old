# Contributing

Steps for downloading and setting up AI Warp for local development.

## Steps

 1. Fork the repository.

 2. Clone your fork using SSH, Github CLI, or HTTPS.

    ```bash
    git clone git@github.com:<YOUR_GITHUB_USERNAME>/ai-warp.git # SSH
    git clone https://github.com/<YOUR_GITHUB_USERNAME>/ai-warp.git # HTTPS
    gh repo clone <YOUR_GITHUB_USERNAME>/ai-warp # GitHub CLI
    ```

 3. Install [Node.js](https://nodejs.org/).

 4. Install dependencies.

    ```bash
    npm install
    ```

 5. Build.

    ```bash
    npm run build
    ```

 6. Generate the test app.

    ```bash
    npm run create
    ```

 7. Configure the test app's `platformatic.json` to your liking. By default, it
 is located at `ai-warp-app/platformatic.json`. **Note: this will be overwrited
 every time you generate the test app.**

 8. Start the test app.

    ```bash
    npm start
    ```

## Important Notes

* AI Warp needs to be rebuilt for any code change to take affect in your test
app. This includes schema changes.

## Noteable Commands

* `npm run build` - Build the app.
* `npm run build:config` - Rebuild the config.
* `npm run lint:fix` - Fix all formatting issues and console log any linting
issues that need to be fixed in code.
* `npm run test` - Run Unit, E2E, and Type tests.

## Additional Resources

* [Use Stackables to build Platformatic applications](https://docs.platformatic.dev/docs/guides/applications-with-stackables)
