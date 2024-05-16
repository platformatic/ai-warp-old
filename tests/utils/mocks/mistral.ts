import { MOCK_AGENT, MOCK_CONTENT_RESPONSE, MOCK_STREAMING_CONTENT_CHUNKS, establishMockAgent } from './base.js'

export let chatHistoryProvided = false

export function resetMistralMock (): void {
  chatHistoryProvided = false
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

  const pool = MOCK_AGENT.get('https://api.mistral.ai')
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
