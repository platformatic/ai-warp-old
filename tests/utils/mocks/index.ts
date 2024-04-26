import { after } from 'node:test'
import { mockAzure } from './azure.js'
import { mockMistralApi } from './mistral.js'
import { mockOllama } from './ollama.js'
import { mockOpenAiApi } from './open-ai.js'

export function mockAllProviders (): void {
  mockOpenAiApi()
  mockMistralApi()
  mockOllama()

  const azureMock = mockAzure()
  after(() => {
    azureMock.close()
  })
}
