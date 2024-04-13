/* eslint-disable @typescript-eslint/no-floating-promises */
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { MistralProvider } from '../../ai-providers/mistral'
import { OpenAiProvider } from '../../ai-providers/open-ai'
import { AiProvider } from '../../ai-providers/provider'
import { OllamaProvider } from '../../ai-providers/ollama'
import { AzureProvider } from '../../ai-providers/azure'
import { MOCK_CONTENT_RESPONSE, buildExpectedStreamBodyString } from '../utils/mocks/base'
import { OLLAMA_MOCK_HOST } from '../utils/mocks/ollama'
import { AZURE_DEPLOYMENT_NAME, AZURE_MOCK_HOST } from '../utils/mocks/azure'

const expectedStreamBody = buildExpectedStreamBodyString()

const providers: AiProvider[] = [
  new OpenAiProvider({ model: 'gpt-3.5-turbo', apiKey: '' }),
  new MistralProvider({ model: 'open-mistral-7b', apiKey: '' }),
  new OllamaProvider({ host: OLLAMA_MOCK_HOST, model: 'some-model' }),
  new AzureProvider({
    endpoint: AZURE_MOCK_HOST,
    apiKey: 'abc',
    deploymentName: AZURE_DEPLOYMENT_NAME,
    allowInsecureConnections: true
  })
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
