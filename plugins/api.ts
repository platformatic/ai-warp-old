// eslint-disable-next-line
/// <reference path="../index.d.ts" />
import { ReadableStream } from 'node:stream/web'
import { FastifyError } from 'fastify'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import createError from '@fastify/error'

function isAFastifyError (object: object): object is FastifyError {
  return 'code' in object && 'name' in object
}

const InternalServerError = createError('INTERNAL_SERVER_ERROR', 'Internal Server Error', 500)

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.route({
    url: '/api/v1/prompt',
    method: 'POST',
    schema: {
      body: Type.Object({
        prompt: Type.String()
      }),
      response: {
        200: Type.Object({
          response: Type.String()
        }),
        default: Type.Object({
          code: Type.String(),
          message: Type.String()
        })
      }
    },
    handler: async (request) => {
      try {
        const { prompt } = request.body

        const response = await fastify.ai.warp(request, prompt, false)
        if (response instanceof ReadableStream) {
          throw new InternalServerError()
        }

        return { response }
      } catch (exception) {
        if (exception instanceof Object && isAFastifyError(exception)) {
          return exception
        } else {
          fastify.log.error(exception)
          return new InternalServerError()
        }
      }
    }
  })

  fastify.route({
    url: '/api/v1/stream',
    method: 'POST',
    schema: {
      produces: ['text/event-stream'],
      body: Type.Object({
        prompt: Type.String()
      })
    },
    handler: async (request, reply) => {
      try {
        const { prompt } = request.body

        const response = await fastify.ai.warp(
          request,
          prompt,
          true,
          (error) => {
            fastify.log.error(error)
            // Eslint thinks status and send are async?
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            reply.status(500)
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            reply.send(new InternalServerError())
          }
        )
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        reply.header('content-type', 'text/event-stream; charset=utf-16')
        return response
      } catch (exception) {
        if (exception instanceof Object && isAFastifyError(exception)) {
          return exception
        } else {
          fastify.log.error(exception)
          return new InternalServerError()
        }
      }
    }
  })
}

export default plugin
