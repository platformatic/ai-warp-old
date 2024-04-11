import { platformaticService, Stackable } from '@platformatic/service'
import fastifyUser from 'fastify-user'
import fastifyPlugin from 'fastify-plugin'
import { schema } from './lib/schema'
import { Generator } from './lib/generator'
import { AiWarpConfig } from './config'
import warpPlugin from './plugins/warp'
import authPlugin from './plugins/auth'
import apiPlugin from './plugins/api'
import rateLimitPlugin from './plugins/rate-limiting'

const stackable: Stackable<AiWarpConfig> = async function (fastify, opts) {
  const { config } = fastify.platformatic
  await fastify.register(fastifyUser, config.auth)
  await fastify.register(authPlugin, opts)

  await fastify.register(warpPlugin, opts) // needs to be registered here for fastify.ai to be decorated

  await fastify.register(rateLimitPlugin, opts)
  await fastify.register(apiPlugin, opts)

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
