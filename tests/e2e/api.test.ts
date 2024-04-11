/* eslint-disable @typescript-eslint/no-floating-promises */
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert'
import { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { MOCK_CONTENT_RESPONSE, OLLAMA_MOCK_HOST, buildExpectedStreamBodyString } from '../utils/mocks'
import { AiWarpConfig } from '../../config'
import { buildAiWarpApp } from '../utils/stackable'

const expectedStreamBody = buildExpectedStreamBodyString()

interface Provider {
  name: string
  config: AiWarpConfig['aiProvider']
}

const providers: Provider[] = [
  {
    name: 'OpenAI',
    config: {
      openai: {
        model: 'gpt-3.5-turbo',
        apiKey: ''
      }
    }
  },
  {
    name: 'Ollama',
    config: {
      ollama: {
        host: OLLAMA_MOCK_HOST,
        model: 'some-model'
      }
    }
  },
  {
    name: 'Mistral',
    config: {
      mistral: {
        model: 'open-mistral-7b',
        apiKey: ''
      }
    }
  }
]

// Test the prompt and stream endpoint for each provider
for (const { name, config } of providers) {
  describe(name, () => {
    let app: FastifyInstance
    let port: number
    let chunkCallbackCalled = false
    before(async () => {
      [app, port] = await buildAiWarpApp({ aiProvider: config })

      await app.register(fastifyPlugin(async () => {
        app.ai.preResponseChunkCallback = (_, response) => {
          chunkCallbackCalled = true
          return response
        }
      }))

      await app.start()
    })

    after(async () => {
      await app.close()
    })

    it('/api/v1/prompt returns expected response', async () => {
      const res = await fetch(`http://localhost:${port}/api/v1/prompt`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'asd'
        })
      })
      assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8')

      const body = await res.json()
      assert.strictEqual(body.response, MOCK_CONTENT_RESPONSE)
    })

    it('/api/v1/stream returns expected response', async () => {
      assert.strictEqual(chunkCallbackCalled, false)

      const res = await fetch(`http://localhost:${port}/api/v1/stream`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'asd'
        })
      })
      assert.strictEqual(res.headers.get('content-type'), 'text/event-stream')

      assert.strictEqual(chunkCallbackCalled, true)

      assert.notStrictEqual(res.body, undefined)

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const reader = res.body!.getReader()

      let body = ''
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done !== undefined && done) {
          break
        }

        body += decoder.decode(value)
      }

      assert.strictEqual(body, expectedStreamBody)
    })
  })
}

it('calls the preResponseCallback', async () => {
  const [app, port] = await buildAiWarpApp({
    aiProvider: {
      openai: {
        model: 'gpt-3.5-turbo',
        apiKey: ''
      }
    }
  })

  let callbackCalled = false
  await app.register(fastifyPlugin(async () => {
    app.ai.preResponseCallback = (_, response) => {
      callbackCalled = true
      return response + ' modified'
    }
  }))

  await app.start()

  const res = await fetch(`http://localhost:${port}/api/v1/prompt`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      prompt: 'asd'
    })
  })

  assert.strictEqual(callbackCalled, true)

  const body = await res.json()
  assert.strictEqual(body.response, `${MOCK_CONTENT_RESPONSE} modified`)

  await app.close()
})
