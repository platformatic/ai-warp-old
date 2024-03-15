import { platformaticService, Stackable } from '@platformatic/service'
import fastifyUser from 'fastify-user'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyPlugin from 'fastify-plugin'
import { schema } from './lib/schema'
import { Generator } from './lib/generator'
import { AiWarpConfig } from './config'
import warpPlugin from './plugins/warp'
import apiPlugin from './plugins/api'
import createError from '@fastify/error'

const stackable: Stackable<AiWarpConfig> = async function (fastify, opts) {
  const { config } = fastify.platformatic
  await fastify.register(fastifyUser, config.auth)

  await fastify.register(warpPlugin, opts) // needs to be registered here for fastify.ai to be decorated

  const { rateLimiting } = fastify.ai
  const { rateLimiting: rateLimitingConfig } = config
  await fastify.register(fastifyRateLimit, {
    max: async (req, key) => {
      if (rateLimiting.max !== undefined) {
        return await rateLimiting.max(req, key)
      } else {
        return rateLimitingConfig?.max ?? 1000
      }
    },
    allowList: async (req, key) => {
      if (rateLimiting.allowList !== undefined) {
        return await rateLimiting.allowList(req, key)
      } else if (rateLimitingConfig?.allowList !== undefined) {
        return rateLimitingConfig.allowList.includes(key)
      }
      return false
    },
    onBanReach: (req, key) => {
      if (rateLimiting.onBanReach !== undefined) {
        rateLimiting.onBanReach(req, key)
      }
    },
    keyGenerator: async (req) => {
      if (rateLimiting.keyGenerator !== undefined) {
        return await rateLimiting.keyGenerator(req)
      } else {
        return req.ip
      }
    },
    errorResponseBuilder: (req, context) => {
      if (rateLimiting.errorResponseBuilder !== undefined) {
        return rateLimiting.errorResponseBuilder(req, context)
      } else {
        const RateLimitError = createError<string>('RATE_LIMITED', 'Rate limit exceeded, retry in %s')
        const err = new RateLimitError(context.after)
        err.statusCode = 429 // TODO: use context.statusCode https://github.com/fastify/fastify-rate-limit/pull/366
        return err
      }
    },
    onExceeding: (req, key) => {
      if (rateLimiting.onExceeded !== undefined) {
        rateLimiting.onExceeded(req, key)
      }
    },
    onExceeded: (req, key) => {
      if (rateLimiting.onExceeding !== undefined) {
        rateLimiting.onExceeding(req, key)
      }
    },
    ...rateLimitingConfig
  })
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
