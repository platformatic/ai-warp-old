// eslint-disable-next-line
/// <reference path="../index.d.ts" />
import { FastifyInstance } from 'fastify'
import createError from '@fastify/error'
import fastifyPlugin from 'fastify-plugin'
import fastifyRateLimit from '@fastify/rate-limit'
import { AiWarpConfig } from '../config.js'

interface RateLimitMax {
  // One claim to many values & maxes
  values: Record<string, number>
}

function buildMaxByClaimLookupTable (config: AiWarpConfig['rateLimiting']): Record<string, RateLimitMax> {
  const table: Record<string, RateLimitMax> = {}
  if (config === undefined || config.maxByClaims === undefined) {
    return table
  }

  for (const { claim, claimValue: value, max } of config.maxByClaims) {
    if (!(claim in table)) {
      table[claim] = { values: {} }
    }

    table[claim].values[value] = max
  }

  return table
}

export default fastifyPlugin(async (fastify: FastifyInstance) => {
  const { config } = fastify.platformatic
  const { rateLimiting: rateLimitingConfig } = config
  const maxByClaimLookupTable = buildMaxByClaimLookupTable(rateLimitingConfig)
  const { rateLimiting } = fastify.ai

  await fastify.register(fastifyRateLimit, {
    // Note: user can override this by setting it in their platformatic config
    max: async (req, key) => {
      if (rateLimiting.max !== undefined) {
        return await rateLimiting.max(req, key)
      }

      if (rateLimitingConfig !== undefined) {
        if (
          req.user !== undefined &&
          req.user !== null &&
          typeof req.user === 'object'
        ) {
          for (const claim of Object.keys(req.user)) {
            if (claim in maxByClaimLookupTable) {
              const { values } = maxByClaimLookupTable[claim]

              // @ts-expect-error
              if (req.user[claim] in values) {
                // @ts-expect-error
                return values[req.user[claim]]
              }
            }
          }
        }

        const { max } = rateLimitingConfig
        if (max !== undefined) {
          return max
        }
      }

      return 1000 // default used in @fastify/rate-limit
    },
    // Note: user can override this by setting it in their platformatic config
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
})
