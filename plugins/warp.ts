// eslint-disable-next-line
/// <reference path="../index.d.ts" />
import { ReadableStream } from 'node:stream/web'
import fastifyPlugin from 'fastify-plugin'
import { OpenAiProvider } from '../ai-providers/open-ai'
import { MistralProvider } from '../ai-providers/mistral.js'
import { AiProvider } from '../ai-providers/provider'
import { AiWarpConfig } from '../config'
import createError from '@fastify/error'

const UnknownAiProviderError = createError('UNKNOWN_AI_PROVIDER', 'Unknown AI Provider')

function build (aiProvider: AiWarpConfig['aiProvider']): AiProvider {
  if ('openai' in aiProvider) {
    const { model, apiKey } = aiProvider.openai
    return new OpenAiProvider(model, apiKey)
  } else if ('mistral' in aiProvider) {
    const { model, apiKey } = aiProvider.mistral
    return new MistralProvider(model, apiKey)
  } else {
    throw new UnknownAiProviderError()
  }
}

export default fastifyPlugin(async (fastify) => {
  const { config } = fastify.platformatic
  const provider = build(config.aiProvider)

  fastify.decorate('ai', {
    warp: async (request, prompt, stream) => {
      let decoratedPrompt = prompt
      if (config.promptDecorators !== undefined) {
        const { prefix, suffix } = config.promptDecorators
        decoratedPrompt = (prefix ?? '') + decoratedPrompt + (suffix ?? '')
      }

      let response = await provider.ask(decoratedPrompt, stream ?? false)
      if (response instanceof ReadableStream) {
        // Checking in this scope to make typescript happy
        if (fastify.ai.preResponseChunkCallback !== undefined) {
          await fastify.ai.preResponseChunkCallback(request, response)
        }
      } else if (fastify.ai.preResponseCallback !== undefined) {
        response = await fastify.ai.preResponseCallback(request, response)
      }

      return response
    },
    rateLimiting: {}
  })
})
