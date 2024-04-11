import { ReadableStream } from 'node:stream/web'
import { PlatformaticApp } from '@platformatic/service'
import { errorResponseBuilderContext } from '@fastify/rate-limit'
import { AiWarpConfig } from './config'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<AiWarpConfig>
    ai: {
      /**
       * Send a prompt to the AI provider and receive the full response.
       */
      warp: (request: FastifyRequest, prompt: string) => Promise<string>

      /**
       * Send a prompt to the AI provider and receive a streamed response.
       */
      warpStream: (request: FastifyRequest, prompt: string) => Promise<ReadableStream>

      /**
       * A function to be called before warp() returns it's result. It can
       *  modify the response and can be synchronous or asynchronous.
       */
      preResponseCallback?: ((request: FastifyRequest, response: string) => void) |
      ((request: FastifyRequest, response: string) => string) |
      ((request: FastifyRequest, response: string) => Promise<void>) |
      ((request: FastifyRequest, response: string) => Promise<string>)

      /**
       * A function to be called on each chunk present in the `ReadableStream`
       *  returned by warpStream(). It can modify each individual chunk and can
       *  be synchronous or asynchronous.
       */
      preResponseChunkCallback?: ((request: FastifyRequest, response: string) => void) |
      ((request: FastifyRequest, response: string) => string) |
      ((request: FastifyRequest, response: string) => Promise<void>) |
      ((request: FastifyRequest, response: string) => Promise<string>)

      rateLimiting: {
        /**
         * Callback for determining the max amount of requests a client can
         *  send before they are rate limited. If the `rateLimiting.max`
         *  property is defined in the Platformatic config, this method will
         *  not be called.
         * @see https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options
         */
        max?: ((request: FastifyRequest, key: string) => number) | ((request: FastifyRequest, key: string) => Promise<number>)

        /**
         * Callback for determining the clients excluded from rate limiting. If
         *  the `rateLimiting.allowList` property is defined in the Platformatic
         *  config, this method will not be called.
         * @see https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options
         */
        allowList?: (request: FastifyRequest, key: string) => boolean | Promise<boolean>

        /**
         * Callback executed when a client reaches the ban threshold.
         * @see https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options
         */
        onBanReach?: (request: FastifyRequest, key: string) => void

        /**
         * Callback for generating the unique rate limiting identifier for each client.
         * @see https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options
         */
        keyGenerator?: (request: FastifyRequest) => string | number | Promise<string | number>

        /**
         * Callback for generating custom response objects for rate limiting errors.
         * @see https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options
         */
        errorResponseBuilder?: (
          request: FastifyRequest,
          context: errorResponseBuilderContext
        ) => object

        /**
         * Callback executed before a client exceeds their request limit.
         * @see https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options
         */
        onExceeding?: (request: FastifyRequest, key: string) => void

        /**
         * Callback executed after a client exceeds their request limit.
         * @see https://github.com/fastify/fastify-rate-limit?tab=readme-ov-file#options
         */
        onExceeded?: (request: FastifyRequest, key: string) => void
      }
    }
  }
}

export { PlatformaticApp, AiWarpConfig }
