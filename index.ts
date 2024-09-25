import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { app as platformaticService, Stackable, buildStackable as serviceBuildStackable } from '@platformatic/service'
import { ConfigManager } from '@platformatic/config'
import type { StackableInterface } from '@platformatic/config'
import fastifyUser from 'fastify-user'
import fastifyStatic from '@fastify/static'
import { schema } from './lib/schema.js'
import { Generator } from './lib/generator.js'
import { AiWarpConfig } from './config.js'
import warpPlugin from './plugins/warp.js'
import authPlugin from './plugins/auth.js'
import apiPlugin from './plugins/api.js'
import rateLimitPlugin from './plugins/rate-limiting.js'

export interface AiWarpMixin {
  platformatic: {
    configManager: ConfigManager<AiWarpConfig>
    config: AiWarpConfig
  }
}

type AiGenerator = new () => Generator

async function buildStackable (opts: { config: string }): Promise<StackableInterface> {
  // eslint-disable-next-line
  return await serviceBuildStackable(opts, stackable)
}

const stackable: Stackable<AiWarpConfig, AiGenerator> = {
  async app (app, opts) {
    const fastify = app as unknown as FastifyInstance & AiWarpMixin
    const { config } = fastify.platformatic
    await fastify.register(fastifyUser as any, config.auth)
    await fastify.register(authPlugin, opts)

    if (config.showAiWarpHomepage !== undefined && config.showAiWarpHomepage) {
      await fastify.register(fastifyStatic, {
        root: join(import.meta.dirname, 'static'),
        wildcard: false
      })
    }

    await fastify.register(platformaticService, opts)

    await fastify.register(warpPlugin, opts) // needs to be registered here for fastify.ai to be decorated

    await fastify.register(rateLimitPlugin, opts)
    await fastify.register(apiPlugin, opts)
  },
  configType: 'ai-warp-app',
  schema,
  Generator,
  configManagerConfig: {
    schema,
    envWhitelist: ['PORT', 'HOSTNAME'],
    allowToWatch: ['.env'],
    schemaOptions: {
      useDefaults: true,
      coerceTypes: true,
      allErrors: true,
      strict: false
    },
    async transformConfig () {}
  },
  buildStackable
}

// break Fastify encapsulation
// @ts-expect-error
stackable.app[Symbol.for('skip-override')] = true

export default stackable
export { Generator, schema, buildStackable }
