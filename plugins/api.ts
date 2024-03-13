/// <reference path="../index.d.ts" />
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
      let response: string
      try {
        const { prompt } = request.body
        response = await fastify.ai.warp(prompt)
      } catch (exception) {
        if (exception instanceof Object && isAFastifyError(exception)) {
          return exception
        } else {
          return new InternalServerError()
        }
      }

      return { response }
    }
  })
}

export default plugin
