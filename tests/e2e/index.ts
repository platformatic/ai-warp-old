import './api.test'
import './rate-limiting.test'
import './auth.test'
import { mockMistralApi, mockOllama, mockOpenAiApi } from '../utils/mocks'

mockOpenAiApi()
mockMistralApi()
mockOllama()
