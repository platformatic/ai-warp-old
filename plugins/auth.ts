
import { FastifyInstance } from 'fastify'
import createError from '@fastify/error'

const UnauthorizedError = createError('UNAUTHORIZED', 'Unauthorized', 401)

export default async function (fastify: FastifyInstance): Promise<void> {
  const { config } = fastify.platformatic

  fastify.addHook('preHandler', async (request) => {
    await request.extractUser()

    if (config.auth?.required !== undefined && config.auth?.required && request.user === undefined) {
      throw new UnauthorizedError()
    }
  })
}
