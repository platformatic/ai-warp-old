import { buildServer } from '@platformatic/service'
import { FastifyInstance } from 'fastify'
import stackable from '../../index.js'
import { AiWarpConfig } from '../../config.js'

declare module 'fastify' {
  interface FastifyInstance {
    start: () => Promise<void>
  }
}

let apps = 0
export function getPort (): number {
  apps++
  return 3042 + apps
}

export async function buildAiWarpApp (config: AiWarpConfig): Promise<[FastifyInstance, number]> {
  const port = getPort()
  const app = await buildServer({
    server: {
      port,
      forceCloseConnections: true,
      healthCheck: false,
      logger: {
        level: 'silent'
      }
    },
    service: {
      openapi: true
    },
    ...config
  }, stackable)

  return [app, port]
}
