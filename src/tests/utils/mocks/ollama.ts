import { MOCK_AGENT, MOCK_CONTENT_RESPONSE, MOCK_STREAMING_CONTENT_CHUNKS, establishMockAgent } from './base.js'

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

  const pool = MOCK_AGENT.get(OLLAMA_MOCK_HOST)
  pool.intercept({
    path: '/api/chat',
    method: 'POST'
  }).reply(200, (opts: any) => {
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
