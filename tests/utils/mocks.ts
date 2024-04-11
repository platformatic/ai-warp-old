import { MockAgent, setGlobalDispatcher } from 'undici'

export const MOCK_CONTENT_RESPONSE = 'asd123'

export const MOCK_STREAMING_CONTENT_CHUNKS = [
  'chunk1',
  'chunk2',
  'chunk3'
]

/**
 * @returns The full body that should be returned from the stream endpoint
 */
export function buildExpectedStreamBodyString (): string {
  let body = ''
  for (const chunk of MOCK_STREAMING_CONTENT_CHUNKS) {
    body += `event: content\ndata: {"response":"${chunk}"}\n\n`
  }
  return body
}

const mockAgent = new MockAgent()
let isMockAgentEstablished = false
function establishMockAgent (): void {
  if (isMockAgentEstablished) {
    return
  }
  setGlobalDispatcher(mockAgent)
  isMockAgentEstablished = true
}

let isOpenAiMocked = false

/**
 * Mock OpenAI's rest api
 * @see https://platform.openai.com/docs/api-reference/chat
 */
export function mockOpenAiApi (): void {
  if (isOpenAiMocked) {
    return
  }

  isOpenAiMocked = true

  establishMockAgent()

  const pool = mockAgent.get('https://api.openai.com')
  pool.intercept({
    path: '/v1/chat/completions',
    method: 'POST'
  }).reply(200, (opts) => {
    if (typeof opts.body !== 'string') {
      throw new Error(`body is not a string (${typeof opts.body})`)
    }

    const body = JSON.parse(opts.body)

    let response = ''
    if (body.stream === true) {
      for (let i = 0; i < MOCK_STREAMING_CONTENT_CHUNKS.length; i++) {
        response += 'data: '
        response += JSON.stringify({
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: 1694268190,
          model: 'gpt-3.5-turbo-0125',
          system_fingerprint: 'fp_44709d6fcb',
          choices: [{
            index: 0,
            delta: {
              role: 'assistant',
              content: MOCK_STREAMING_CONTENT_CHUNKS[i]
            },
            logprobs: null,
            finish_reason: i === MOCK_STREAMING_CONTENT_CHUNKS.length ? 'stop' : null
          }]
        })
        response += '\n\n'
      }
      response += 'data: [DONE]\n\n'
    } else {
      response += JSON.stringify({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: new Date().getTime() / 1000,
        model: 'gpt-3.5-turbo-0125',
        system_fingerprint: 'fp_fp_44709d6fcb',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: MOCK_CONTENT_RESPONSE
          },
          logprobs: null,
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2
        }
      })
    }

    return response
  }, {
    headers: {
      'content-type': 'application/json'
    }
  }).persist()
}

let isMistralMocked = false

/**
 * Mock Mistral's rest api
 * @see https://docs.mistral.ai/api/#operation/createChatCompletion
 */
export function mockMistralApi (): void {
  if (isMistralMocked) {
    return
  }

  isMistralMocked = true

  establishMockAgent()

  const pool = mockAgent.get('https://api.mistral.ai')
  pool.intercept({
    path: '/v1/chat/completions',
    method: 'POST'
  }).reply(200, (opts) => {
    if (typeof opts.body !== 'string') {
      throw new Error(`body is not a string (${typeof opts.body})`)
    }

    const body = JSON.parse(opts.body)

    let response = ''
    if (body.stream === true) {
      for (let i = 0; i < MOCK_STREAMING_CONTENT_CHUNKS.length; i++) {
        response += 'data: '
        response += JSON.stringify({
          id: 'cmpl-e5cc70bb28c444948073e77776eb30ef',
          object: 'chat.completion.chunk',
          created: 1694268190,
          model: 'mistral-small-latest',
          choices: [{
            index: 0,
            delta: {
              role: 'assistant',
              content: MOCK_STREAMING_CONTENT_CHUNKS[i]
            },
            logprobs: null,
            finish_reason: i === MOCK_STREAMING_CONTENT_CHUNKS.length ? 'stop' : null
          }]
        })
        response += '\n\n'
      }
      response += 'data: [DONE]\n\n'
    } else {
      response += JSON.stringify({
        id: 'cmpl-e5cc70bb28c444948073e77776eb30ef',
        object: 'chat.completion',
        created: new Date().getTime() / 1000,
        model: 'mistral-small-latest',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: MOCK_CONTENT_RESPONSE
          },
          logprobs: null,
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2
        }
      })
    }

    return response
  }, {
    headers: {
      'content-type': 'application/json'
    }
  }).persist()
}

export const OLLAMA_MOCK_HOST = 'http://127.0.0.1:41434'
let isOllamaMocked = false

/**
 * @see https://github.com/ollama/ollama/blob/9446b795b58e32c8b248a76707780f4f96b6434f/docs/api.md
 */
export function mockOllama (): void {
  if (isOllamaMocked) {
    return
  }

  isOllamaMocked = true

  establishMockAgent()

  const pool = mockAgent.get(OLLAMA_MOCK_HOST)
  pool.intercept({
    path: '/api/chat',
    method: 'POST'
  }).reply(200, (opts) => {
    if (typeof opts.body !== 'string') {
      throw new Error(`body is not a string (${typeof opts.body})`)
    }

    const body = JSON.parse(opts.body)

    let response = ''
    if (body.stream === true) {
      for (let i = 0; i < MOCK_STREAMING_CONTENT_CHUNKS.length; i++) {
        response += JSON.stringify({
          model: 'llama2',
          created_at: '2023-08-04T08:52:19.385406455-07:00',
          message: {
            role: 'assistant',
            content: MOCK_STREAMING_CONTENT_CHUNKS[i],
            images: null
          },
          done: i === MOCK_STREAMING_CONTENT_CHUNKS.length - 1
        })
        response += '\n'
      }
    } else {
      response += JSON.stringify({
        model: 'llama2',
        created_at: '2023-08-04T19:22:45.499127Z',
        message: {
          role: 'assistant',
          content: MOCK_CONTENT_RESPONSE,
          images: null
        },
        done: true
      })
    }

    return response
  }, {
    headers: {
      'content-type': 'application/json'
    }
  }).persist()
}
