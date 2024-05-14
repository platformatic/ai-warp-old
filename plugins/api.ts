// eslint-disable-next-line
/// <reference path="../index.d.ts" />
import { FastifyError } from 'fastify'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import createError from '@fastify/error'

function isAFastifyError (object: object): object is FastifyError {
  return 'code' in object && 'name' in object
}

const InternalServerError = createError('INTERNAL_SERVER_ERROR', 'Internal Server Error', 500)

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  let security: Array<Record<string, string[]>> | undefined
  if (fastify.platformatic.config.auth?.jwt !== undefined) {
    security = [{ aiWarpJwtToken: [] }]
  }

  fastify.route({
    url: '/api/v1/prompt',
    method: 'POST',
    schema: {
      security,
      body: Type.Object({
        prompt: Type.String(),
        chatHistory: Type.Optional(Type.Array(Type.Object({
          prompt: Type.String(),
          response: Type.String()
        })))
      }),
      response: {
        200: Type.Object({
          response: Type.String()
        }),
        default: Type.Object({
          code: Type.Optional(Type.String()),
          message: Type.String()
        })
      }
    },
    handler: async (request) => {
      try {
        const { prompt } = request.body
        const response = await fastify.ai.warp(request, prompt)

        return { response }
      } catch (exception) {
        if (exception instanceof Object && isAFastifyError(exception)) {
          return exception
        } else {
          const err = new InternalServerError()
          err.cause = exception
          throw err
        }
      }
    }
  })

  fastify.route({
    url: '/api/v1/stream',
    method: 'POST',
    schema: {
      produces: ['text/event-stream'],
      security,
      body: Type.Object({
        prompt: Type.String(),
        chatHistory: Type.Optional(Type.Array(Type.Object({
          prompt: Type.String(),
          response: Type.String()
        })))
      })
    },
    handler: async (request, reply) => {
      try {
        const { prompt } = request.body

        const response = await fastify.ai.warpStream(request, prompt)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        reply.header('content-type', 'text/event-stream')

        return response
      } catch (exception) {
        if (exception instanceof Object && isAFastifyError(exception)) {
          return exception
        } else {
          const err = new InternalServerError()
          err.cause = exception
          throw err
        }
      }
    }
  })
}

export default plugin
