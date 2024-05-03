import { join } from 'node:path'
import { platformaticService, Stackable } from '@platformatic/service'
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

const stackable: Stackable<AiWarpConfig> = async function (fastify, opts) {
  const { config } = fastify.platformatic
  await fastify.register(fastifyUser as any, config.auth)
  await fastify.register(authPlugin, opts)

  await fastify.register(warpPlugin, opts) // needs to be registered here for fastify.ai to be decorated

  await fastify.register(rateLimitPlugin, opts)
  await fastify.register(apiPlugin, opts)

  if (config.showAiWarpHomepage !== undefined && config.showAiWarpHomepage) {
    await fastify.register(fastifyStatic, {
      root: join(import.meta.dirname, 'static')
    })
  }

  await fastify.register(platformaticService, opts)
}

stackable.configType = 'ai-warp-app'
stackable.schema = schema
stackable.Generator = Generator
stackable.configManagerConfig = {
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

// break Fastify encapsulation
// @ts-expect-error
stackable[Symbol.for('skip-override')] = true

export default fastifyPlugin(stackable)
export { Generator, schema }
