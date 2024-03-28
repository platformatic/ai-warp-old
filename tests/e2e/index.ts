import './api.test'
import './rate-limiting.test'
import './auth.test'
import { mockMistralApi, mockOpenAiApi } from '../utils/mocks'

mockOpenAiApi()
mockMistralApi()
