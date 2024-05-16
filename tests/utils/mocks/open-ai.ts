import { MOCK_AGENT, MOCK_CONTENT_RESPONSE, MOCK_STREAMING_CONTENT_CHUNKS, establishMockAgent } from './base.js'

export let chatHistoryProvided = false

export function resetOpenAiMock (): void {
  chatHistoryProvided = false
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

  const pool = MOCK_AGENT.get('https://api.openai.com')
  pool.intercept({
    path: '/v1/chat/completions',
    method: 'POST'
  }).reply(200, (opts: any) => {
    if (typeof opts.body !== 'string') {
      throw new Error(`body is not a string (${typeof opts.body})`)
    }

    const body = JSON.parse(opts.body)
    if (body.messages.length > 1) {
      chatHistoryProvided = true
    }

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
