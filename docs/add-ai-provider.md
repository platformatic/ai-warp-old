# Adding a new AI Provider
Documentation on how to support a new AI provider.

## Steps

### 1. Setup your developer environment

See [Dev Setup](./dev-setup.md).

### 2. Add it to the Config Schema

The `aiProvider` property in the config schema ([lib/schema.ts](../lib/schema.ts)) needs to be updated to allow for inputting any necessary information for this AI provider (e.g. model name, api key). Don't forget to rebuild the config!

### 3. Creating the Provider class

Implement the `Provider` interface ([ai-providers/provider.ts](../ai-providers/provider.ts)) in a file also under [ai-providers/](../ai-providers/) (e.g. [ai-providers/open-ai.ts](../ai-providers/open-ai.ts)).

Ensure that the `askStream` response returns a Node.js-builtin `ReadableStream` that outputs the expected format defined in the [REST API docs](./rest-api.md).

### 4. Add the provider to the `build` function in the `warp` plugin

See [plugins/warp.ts](https://github.com/platformatic/ai-warp/blob/b9cddeedf8609d1c2ce3efcfdd84a739150a1e91/plugins/warp.ts#L12) `build()`.

### 5. Add the provider to the generator code

See [lib/generator.ts](https://github.com/platformatic/ai-warp/blob/b9cddeedf8609d1c2ce3efcfdd84a739150a1e91/lib/generator.ts#L64-L88).

### 6. Unit Tests

Add provider to [tests/unit/ai-providers.test.ts](https://github.com/platformatic/ai-warp/blob/b9cddeedf8609d1c2ce3efcfdd84a739150a1e91/tests/unit/ai-providers.test.ts#L11).

### 7. E2E Tests

Add provider config to [tests/e2e/api.test.ts](https://github.com/platformatic/ai-warp/blob/b9cddeedf8609d1c2ce3efcfdd84a739150a1e91/tests/e2e/api.test.ts#L17-L36).

### 8. Type Tests

Add the provider config to the schema tests [tests/types/schema.test-d.ts](https://github.com/platformatic/ai-warp/blob/main/tests/types/schema.test-d.ts).
