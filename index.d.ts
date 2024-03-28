import { ReadableStream } from 'node:stream/web'
import { PlatformaticApp } from '@platformatic/service'
import { errorResponseBuilderContext } from '@fastify/rate-limit'
import { AiWarpConfig } from './config'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<AiWarpConfig>
    ai: {
      warp: (request: FastifyRequest, prompt: string) => Promise<string>
      warpStream: (request: FastifyRequest, prompt: string) => Promise<ReadableStream>
      preResponseCallback?: ((request: FastifyRequest, response: string) => string) | ((request: FastifyRequest, response: string) => Promise<string>)
      preResponseChunkCallback?: ((request: FastifyRequest, response: string) => string) | ((request: FastifyRequest, response: string) => Promise<string>)
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
