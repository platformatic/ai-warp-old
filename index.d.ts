import { PlatformaticApp } from '@platformatic/service'
import { AiWarpConfig } from './config'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<AiWarpConfig>
    ai: {
      warp: (prompt: string) => Promise<string>
    }
  }
}

export { PlatformaticApp, AiWarpConfig }
