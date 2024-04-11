# AI Warp API

Documentation on the methods and properties availabile to plugins added onto this stackable.

All of these exist under the `fastify.ai` object.

## `fastify.ai.warp()`

Send a prompt to the AI provider and receive the full response.

Takes in:

 * `request` (`FastifyRequest`) The request object
 * `prompt` (`string`) The prompt to send to the AI provider

Returns:

 * `string` - Full response from the AI provider

<details>
    <summary>Example usage</summary>

```typescript
const response: string = await fastify.ai.warp(request, "What's 1+1?")
fastify.log.info(`response: ${response}`)
```
</details>

## `fastify.ai.warpStream`

Send a prompt to the AI provider and receive a streamed response. See [here](./rest-api.md#post-apiv1stream) for more information on the contents of the stream.

Takes in:

 * `request` (`FastifyRequest`) The request object
 * `prompt` (`string`) The prompt to send to the AI provider

Returns:

 * `ReadableStream<Uint8Array>` - Streamed response chunks from the AI provider

<details>
    <summary>Example usage</summary>

```typescript
const response: ReadableStream = await fastify.ai.warpStream(request, "What's 1+1?")

const decoder = new TextDecoder()
const reader = stream.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done !== undefined && done) {
    break
  }

  fastify.log.info(`response chunk: ${decoder.decode(value)}`)
}
```
</details>

## `fastify.ai.preResponseCallback`

A function to be called before [fastify.ai.warp](#fastifyaiwarp) returns it's result. It can modify the response and can be synchronous or asynchronous.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  // This prefixes each response with `The AI has spoken: `
  fastify.ai.preResponseCallback = (request, response) => {
    return `The AI has spoken: ${response}`
  }
})
```
</details>

## `fastify.ai.preResponseChunkCallback`

A function to be called on each chunk present in the `ReadableStream` returned by [fastify.ai.warpStream](#fastifyaiwarpstream). It can modify each individual chunk and can be synchronous or asynchronous.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  // This prefixes each chunk with `The AI has partially spoken: `
  fastify.ai.preResponseChunkCallback = (request, response) => {
    return `The AI has partially spoken: ${response}`
  }
})
```
</details>

## `fastify.ai.rateLimiting.max`

Callback for determining the max amount of requests a client can send before they are rate limited. If the `rateLimiting.max` property is defined in the Platformatic config, this method will not be called.

See [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options) options for more info.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  // This uses a hypothetical isUserPremium function to decide if a client gets
  //  a request limit of 2000 or 1000. 
  fastify.ai.rateLimiting.max = (request, key) => {
    return isUserPremium(request) ? 2000 : 1000
  }
})
```
</details>

## `fastify.ai.rateLimiting.allowList`

Callback for determining the clients excluded from rate limiting. If the `rateLimiting.allowList` property is defined in the Platformatic config, this method will not be called.

See [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options) options for more info.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  // This allows localhost clients to be exempt from rate limiting
  fastify.ai.rateLimiting.allowList = (request, key) => {
    return key === '127.0.0.1'
  }
})
```
</details>

## `fastify.ai.rateLimiting.onBanReach`

Callback executed when a client reaches the ban threshold.

See [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options) options for more info.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  // Logs when a client is rate limit banned
  fastify.ai.rateLimiting.onBanReach = (request, key) => {
    fastify.log.warn(`client ${key} has been banned for exceeding the rate limit!`)
  }
})
```
</details>

## `fastify.ai.rateLimiting.keyGenerator`

Callback for generating the unique rate limiting identifier for each client.

See [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options) options for more info.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  // Uses the client's ip as the rate limit key
  fastify.ai.rateLimiting.keyGenerator = (request) => {
    return request.ip
  }
})
```
</details>

## `fastify.ai.rateLimiting.errorResponseBuilder`

Callback for generating custom response objects for rate limiting errors.

See [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options) options for more info.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  fastify.ai.rateLimiting.errorResponseBuilder = (request, context) => {
    return {
      statusCode: 429,
      error: 'Too many requests',
      message: `Rate limit exceeded! Try again in ${context.after}`
    }
  }
})
```
</details>

## `fastify.ai.rateLimiting.onExceeding`

Callback executed before a client exceeds their request limit.

See [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options) options for more info.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  fastify.ai.rateLimiting.onExceeding = (request, key) => {
    fastify.log.warn(`client ${key} is about to hit the request limit!`)
  }
})
```
</details>

## `fastify.ai.rateLimiting.onExceeded`

Callback executed after a client exceeds their request limit.

See [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options) options for more info.

<details>
    <summary>Example usage</summary>

```typescript
export default fastifyPlugin(async (fastify) => {
  fastify.ai.rateLimiting.onExceeded = (request, response) => {
    fastify.log.warn(`client ${key} has hit the request limit!`)
  }
})
```
</details>
