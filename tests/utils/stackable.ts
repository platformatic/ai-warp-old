import { buildServer } from '@platformatic/service'
import { FastifyInstance } from 'fastify'
import stackable from '../../index'
import { AiWarpConfig } from '../../config'

declare module 'fastify' {
  interface FastifyInstance {
    start: () => Promise<void>
  }
}

let apps = 0
function getPort (): number {
  apps++
  return 3042 + apps
}

export async function buildAiWarpApp (config: AiWarpConfig): Promise<[FastifyInstance, number]> {
  const port = getPort()
  const app = await buildServer({
    server: {
      port,
      forceCloseConnections: true,
      healthCheck: {
        enabled: false
      },
      logger: {
        level: 'silent'
      }
    },
    ...config
  }, stackable)

  return [app, port]
}
