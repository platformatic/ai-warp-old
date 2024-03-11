/// <reference path="../index.d.ts" />
import { FastifyInstance } from 'fastify'
import { OpenAiProvider } from '../ai-providers/open-ai'
import { MistralProvider } from '../ai-providers/mistral.js'
import { AiProvider } from '../ai-providers/provider'
import { AiWarpConfig } from '../config'
import createError from '@fastify/error'

const UnknownAiProviderError = createError('UNKNOWN_AI_PROVIDER', 'Unknown AI Provider')

function build (config: AiWarpConfig): AiProvider {
  const { aiProvider } = config
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

export default async function (fastify: FastifyInstance): Promise<void> {
  const { config } = fastify.platformatic
  const provider = build(config)

  fastify.ai = {
    warp: async (prompt) => {
      let decoratedPrompt = prompt
      if (config.promptDecorators !== undefined) {
        const { prefix, suffix } = config.promptDecorators
        decoratedPrompt = (prefix ?? '') + decoratedPrompt + (suffix ?? '')
      }

      const response = await provider.ask(decoratedPrompt)

      // TODO: sanitizing/filtering response

      return response
    },
    rateLimiting: {}
  }
}
