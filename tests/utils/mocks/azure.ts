import { Server, createServer } from 'node:http'
import { MOCK_CONTENT_RESPONSE, MOCK_STREAMING_CONTENT_CHUNKS } from './base'

export const AZURE_MOCK_HOST = 'http://127.0.0.1:41435'

export const AZURE_DEPLOYMENT_NAME = 'some-deployment'

/**
 * @see https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#chat-completions
 */
export function mockAzure (): Server {
  // The Azure client doesn't use undici's fetch and there's no option to pass
  //  it in like the other providers' clients unfortunately, so let's create an
  //  actual server
  const server = createServer((req, res) => {
    if (req.url !== '/openai/deployments/some-deployment/chat/completions?api-version=2024-03-01-preview') {
      res.end()
      throw new Error(`unsupported url or api version: ${req.url ?? ''}`)
    }

    let bodyString = ''
    req.on('data', (chunk: string) => {
      bodyString += chunk
    })
    req.on('end', () => {
      const body: { stream: boolean } = JSON.parse(bodyString)

      if (body.stream) {
        res.setHeader('content-type', 'text/event-stream')

        for (let i = 0; i < MOCK_STREAMING_CONTENT_CHUNKS.length; i++) {
          res.write('data: ')
          res.write(JSON.stringify({
            id: 'chatcmpl-6v7mkQj980V1yBec6ETrKPRqFjNw9',
            object: 'chat.completion',
            created: 1679072642,
            model: 'gpt-35-turbo',
            usage: {
              prompt_tokens: 58,
              completion_tokens: 68,
              total_tokens: 126
            },
            choices: [
              {
                delta: {
                  role: 'assistant',
                  content: MOCK_STREAMING_CONTENT_CHUNKS[i]
                },
                finish_reason: i === MOCK_STREAMING_CONTENT_CHUNKS.length ? 'stop' : null,
                index: 0
              }
            ]
          }))
          res.write('\n\n')
        }
        res.write('data: [DONE]\n\n')
      } else {
        res.setHeader('content-type', 'application/json')
        res.write(JSON.stringify({
          id: 'chatcmpl-6v7mkQj980V1yBec6ETrKPRqFjNw9',
          object: 'chat.completion',
          created: 1679072642,
          model: 'gpt-35-turbo',
          usage: {
            prompt_tokens: 58,
            completion_tokens: 68,
            total_tokens: 126
          },
          choices: [
            {
              message: {
                role: 'assistant',
                content: MOCK_CONTENT_RESPONSE
              },
              finish_reason: 'stop',
              index: 0
            }
          ]
        }))
      }

      res.end()
    })
  })
  server.listen(41435)

  return server
}
