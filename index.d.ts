import { ReadableStream } from 'node:stream/web'
import { PlatformaticApp } from '@platformatic/service'
import { AiWarpConfig } from './config'
import { StreamErrorCallback } from './ai-providers/provider'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<AiWarpConfig>
    ai: {
      warp: (request: FastifyRequest, prompt: string, stream?: boolean, streamErrorCallback?: StreamErrorCallback) => Promise<string | ReadableStream>
      preResponseCallback?: ((request: FastifyRequest, response: string) => string) | ((request: FastifyRequest, response: string) => Promise<string>)
      preResponseChunkCallback?: ((request: FastifyRequest, stream: ReadableStream) => void) | ((request: FastifyRequest, stream: ReadableStream) => Promise<void>)
      rateLimiting: {
        max?: ((req: FastifyRequest, key: string) => number) | ((req: FastifyRequest, key: string) => Promise<number>)
        allowList?: (req: FastifyRequest, key: string) => boolean | Promise<boolean>
        onBanReach?: (req: FastifyRequest, key: string) => void
        keyGenerator?: (req: FastifyRequest) => string | number | Promise<string | number>
        errorResponseBuilder?: (
          req: FastifyRequest,
          context: errorResponseBuilderContext
        ) => object
        onExceeding?: (req: FastifyRequest, key: string) => void
        onExceeded?: (req: FastifyRequest, key: string) => void
      }
    }
  }
}

export { PlatformaticApp, AiWarpConfig }
