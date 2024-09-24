import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { app as platformaticService, Stackable, buildStackable as serviceBuildStackable } from '@platformatic/service'
import { ConfigManager } from '@platformatic/config'
import fastifyUser from 'fastify-user'
import fastifyPlugin from 'fastify-plugin'
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
    configManager: ConfigManager<AiWarpConfig>,
    config: AiWarpConfig
  }
}

type AiGenerator = new () => Generator

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
  schema: schema,
  Generator: Generator,
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
  }
}

// break Fastify encapsulation
// @ts-expect-error
stackable.app[Symbol.for('skip-override')] = true

function buildStackable (opts: { config: string }) {
  return serviceBuildStackable(opts, stackable.app)
}

export default stackable
export { Generator, schema, buildStackable }
