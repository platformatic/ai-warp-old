// eslint-disable-next-line
/// <reference path="../index.d.ts" />
import { FastifyLoggerInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { AiProvider, StreamChunkCallback } from '../ai-providers/provider.js'
import { AiWarpConfig } from '../config.js'
import createError from '@fastify/error'

const UnknownAiProviderError = createError('UNKNOWN_AI_PROVIDER', 'Unknown AI Provider')

async function build (aiProvider: AiWarpConfig['aiProvider'], logger: FastifyLoggerInstance): Promise<AiProvider> {
  if ('openai' in aiProvider) {
    const { OpenAiProvider } = await import('../ai-providers/open-ai.js')
    return new OpenAiProvider(aiProvider.openai)
  } else if ('mistral' in aiProvider) {
    const { MistralProvider } = await import('../ai-providers/mistral.js')
    return new MistralProvider(aiProvider.mistral)
  } else if ('ollama' in aiProvider) {
    const { OllamaProvider } = await import('../ai-providers/ollama.js')
    return new OllamaProvider(aiProvider.ollama)
  } else if ('azure' in aiProvider) {
    const { AzureProvider } = await import('../ai-providers/azure.js')
    return new AzureProvider(aiProvider.azure)
  } else if ('llama2' in aiProvider) {
    const { Llama2Provider } = await import('../ai-providers/llama2.js')
    return new Llama2Provider({
      ...aiProvider.llama2,
      logger
    })
  } else {
    throw new UnknownAiProviderError()
  }
}

export default fastifyPlugin(async (fastify) => {
  const { config } = fastify.platformatic
  const provider = await build(config.aiProvider, fastify.log)

  fastify.decorate('ai', {
    warp: async (request, prompt) => {
      let decoratedPrompt = prompt
      if (config.promptDecorators !== undefined) {
        const { prefix, suffix } = config.promptDecorators
        decoratedPrompt = (prefix ?? '') + decoratedPrompt + (suffix ?? '')
      }

      let response = await provider.ask(decoratedPrompt)
      if (fastify.ai.preResponseCallback !== undefined) {
        response = await fastify.ai.preResponseCallback(request, response) ?? response
      }

      return response
    },
    warpStream: async (request, prompt) => {
      let decoratedPrompt = prompt
      if (config.promptDecorators !== undefined) {
        const { prefix, suffix } = config.promptDecorators
        decoratedPrompt = (prefix ?? '') + decoratedPrompt + (suffix ?? '')
      }

      let chunkCallback: StreamChunkCallback | undefined
      if (fastify.ai.preResponseChunkCallback !== undefined) {
        chunkCallback = async (response) => {
          if (fastify.ai.preResponseChunkCallback === undefined) {
            return response
          }
          return await fastify.ai.preResponseChunkCallback(request, response) ?? response
        }
      }

      const response = await provider.askStream(decoratedPrompt, chunkCallback)
      return response
    },
    rateLimiting: {}
  })
})
