import { after } from 'node:test'
import { mockAzure } from './azure'
import { mockMistralApi } from './mistral'
import { mockOllama } from './ollama'
import { mockOpenAiApi } from './open-ai'

export function mockAllProviders (): void {
  mockOpenAiApi()
  mockMistralApi()
  mockOllama()

  const azureMock = mockAzure()
  after(() => {
    azureMock.close()
  })
}
