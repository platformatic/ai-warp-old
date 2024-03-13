import { platformaticService, Stackable } from '@platformatic/service'
import fastifyUser from 'fastify-user'
import fastifyRateLimit from '@fastify/rate-limit'
import { schema } from './lib/schema'
import { Generator } from './lib/generator'
import { AiWarpConfig } from './config'
import warpPlugin from './plugins/warp'
import apiPlugin from './plugins/api'

const stackable: Stackable<AiWarpConfig> = async function (fastify, opts) {
  await fastify.register(platformaticService, opts)
  
  const { config } = fastify.platformatic
  await fastify.register(fastifyUser, config.auth)

  await fastify.register(warpPlugin, opts) // needs to be registered here for fastify.ai to be decorated
  
  const { rateLimiting } = fastify.ai
  await fastify.register(fastifyRateLimit, {
    // TODO: how do we let the dev define these callbacks in between decorating fastify.ai and here?
    max: rateLimiting.max,
    allowList: rateLimiting.allowList,
    onBanReach: rateLimiting.onBanReach,
    keyGenerator: rateLimiting.keyGenerator,
    errorResponseBuilder: rateLimiting.errorResponseBuilder,
    onExceeding: rateLimiting.onExceeding,
    onExceeded: rateLimiting.onExceeded,
    ...config.rateLimiting
  })
  await fastify.register(apiPlugin, opts)
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

export default stackable
export { Generator, schema }
