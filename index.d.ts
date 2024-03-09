import { PlatformaticApp } from '@platformatic/service'
import { AiWarpConfig } from './config'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<AiWarpConfig>
    ai: {
      warp: (prompt: string) => Promise<string>
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
