/* eslint-disable @typescript-eslint/no-floating-promises */
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { MistralProvider } from '../../ai-providers/mistral.js'
import { OpenAiProvider } from '../../ai-providers/open-ai.js'
import { AiProvider } from '../../ai-providers/provider.js'
import { OllamaProvider } from '../../ai-providers/ollama.js'
import { AzureProvider } from '../../ai-providers/azure.js'
import { MOCK_CONTENT_RESPONSE, buildExpectedStreamBodyString } from '../utils/mocks/base.js'
import { OLLAMA_MOCK_HOST } from '../utils/mocks/ollama.js'
import { AZURE_DEPLOYMENT_NAME, AZURE_MOCK_HOST } from '../utils/mocks/azure.js'
import { mockLlama2 } from '../utils/mocks/llama2.js'
import { mockAllProviders } from '../utils/mocks/index.js'
mockAllProviders()

const expectedStreamBody = buildExpectedStreamBodyString()

const { Llama2Provider: MockedLlamaProvider } = await mockLlama2()

const providers: AiProvider[] = [
  new OpenAiProvider({ model: 'gpt-3.5-turbo', apiKey: '' }),
  new MistralProvider({ model: 'open-mistral-7b', apiKey: '' }),
  new OllamaProvider({ host: OLLAMA_MOCK_HOST, model: 'some-model' }),
  new AzureProvider({
    endpoint: AZURE_MOCK_HOST,
    apiKey: 'abc',
    deploymentName: AZURE_DEPLOYMENT_NAME,
    allowInsecureConnections: true
  }),
  new MockedLlamaProvider({ modelPath: '' })
]

for (const provider of providers) {
  describe(provider.constructor.name, () => {
    it('ask', async () => {
      const response = await provider.ask('asd')
      assert.strictEqual(response, MOCK_CONTENT_RESPONSE)
    })

    it('askStream', async () => {
      const response = await provider.askStream('asd')
      const reader = response.getReader()

      let body = ''
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done !== undefined && done) {
          break
        }

        body += decoder.decode(value)
      }

      assert.strictEqual(body, expectedStreamBody)
    })
  })
}
