import './generator.test'
import './ai-providers.test'
import { mockMistralApi, mockOllama, mockOpenAiApi } from '../utils/mocks'

mockOpenAiApi()
mockMistralApi()
mockOllama()
