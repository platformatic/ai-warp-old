/* eslint-disable @typescript-eslint/no-floating-promises */
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { MistralProvider } from '../../ai-providers/mistral'
import { OpenAiProvider } from '../../ai-providers/open-ai'
import { AiProvider } from '../../ai-providers/provider'
import { MOCK_CONTENT_RESPONSE, OLLAMA_MOCK_HOST, buildExpectedStreamBodyString } from '../utils/mocks'
import { OllamaProvider } from '../../ai-providers/ollama'

const expectedStreamBody = buildExpectedStreamBodyString()

const providers: AiProvider[] = [
  new OpenAiProvider('gpt-3.5-turbo', ''),
  new MistralProvider('open-mistral-7b', ''),
  new OllamaProvider(OLLAMA_MOCK_HOST, 'some-model')
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
