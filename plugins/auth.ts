/// <reference path="../index.d.ts" />
import { FastifyInstance } from 'fastify'
import createError from '@fastify/error'
import fastifyPlugin from 'fastify-plugin'

const UnauthorizedError = createError('UNAUTHORIZED', 'Unauthorized', 401)

export default fastifyPlugin(async (fastify: FastifyInstance) => {
  const { config } = fastify.platformatic

  fastify.addHook('preHandler', async (request) => {
    await request.extractUser()

    if (config.auth?.required !== undefined && config.auth?.required && request.user === undefined) {
      throw new UnauthorizedError()
    }
  })
})
