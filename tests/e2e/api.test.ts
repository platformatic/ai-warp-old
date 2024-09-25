/* eslint-disable @typescript-eslint/no-floating-promises */
import { before, after, describe, it } from 'node:test'
import assert from 'node:assert'
import { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { AiWarpConfig } from '../../config.js'
import { buildAiWarpApp } from '../utils/stackable.js'
import { AZURE_DEPLOYMENT_NAME, AZURE_MOCK_HOST, chatHistoryProvided as azureChatHistoryProvided, resetAzureMock } from '../utils/mocks/azure.js'
import { MOCK_CONTENT_RESPONSE, buildExpectedStreamBodyString } from '../utils/mocks/base.js'
import { OLLAMA_MOCK_HOST, chatHistoryProvided as ollamaChatHistoryProvided, resetOllamaMock } from '../utils/mocks/ollama.js'
import { mockAllProviders } from '../utils/mocks/index.js'
import { chatHistoryProvided as openAiChatHistoryProvided, resetOpenAiMock } from '../utils/mocks/open-ai.js'
import { chatHistoryProvided as mistralChatHistoryProvided, resetMistralMock } from '../utils/mocks/mistral.js'
import stackable, { buildStackable } from '../../index.js'
mockAllProviders()

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
    name: 'Azure',
    config: {
      azure: {
        endpoint: AZURE_MOCK_HOST,
        apiKey: 'asd',
        deploymentName: AZURE_DEPLOYMENT_NAME,
        allowInsecureConnections: true
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

it('OpenAI /api/v1/prompt works with chat history', async () => {
  resetOpenAiMock()

  const [app, port] = await buildAiWarpApp({
    aiProvider: {
      openai: {
        model: 'gpt-3.5-turbo',
        apiKey: ''
      }
    }
  })

  await app.start()
  try {
    const res = await fetch(`http://localhost:${port}/api/v1/prompt`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'asd',
        chatHistory: [
          {
            prompt: '',
            response: ''
          }
        ]
      })
    })
    assert.strictEqual(res.status, 200)

    assert.strictEqual(openAiChatHistoryProvided, true)
  } finally {
    app.close()
  }
})

it('Mistral /api/v1/prompt works with chat history', async () => {
  resetMistralMock()

  const [app, port] = await buildAiWarpApp({
    aiProvider: {
      mistral: {
        model: 'mistral-small-latest',
        apiKey: ''
      }
    }
  })

  await app.start()
  try {
    const res = await fetch(`http://localhost:${port}/api/v1/prompt`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'asd',
        chatHistory: [
          {
            prompt: '',
            response: ''
          }
        ]
      })
    })
    assert.strictEqual(res.status, 200)

    assert.strictEqual(mistralChatHistoryProvided, true)
  } finally {
    app.close()
  }
})

it('Ollama /api/v1/prompt works with chat history', async () => {
  resetOllamaMock()

  const [app, port] = await buildAiWarpApp({
    aiProvider: {
      ollama: {
        host: OLLAMA_MOCK_HOST,
        model: 'some-model'
      }
    }
  })

  await app.start()
  try {
    const res = await fetch(`http://localhost:${port}/api/v1/prompt`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'asd',
        chatHistory: [
          {
            prompt: '',
            response: ''
          }
        ]
      })
    })
    assert.strictEqual(res.status, 200)

    assert.strictEqual(ollamaChatHistoryProvided, true)
  } finally {
    app.close()
  }
})

it('Azure /api/v1/prompt works with chat history', async () => {
  resetAzureMock()

  const [app, port] = await buildAiWarpApp({
    aiProvider: {
      azure: {
        endpoint: AZURE_MOCK_HOST,
        apiKey: 'asd',
        deploymentName: AZURE_DEPLOYMENT_NAME,
        allowInsecureConnections: true
      }
    }
  })

  await app.start()
  try {
    const res = await fetch(`http://localhost:${port}/api/v1/prompt`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'asd',
        chatHistory: [
          {
            prompt: '',
            response: ''
          }
        ]
      })
    })
    assert.strictEqual(res.status, 200)

    assert.strictEqual(azureChatHistoryProvided, true)
  } finally {
    app.close()
  }
})

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

it('provides all paths in OpenAPI', async () => {
  const [app, port] = await buildAiWarpApp({
    aiProvider: {
      openai: {
        model: 'gpt-3.5-turbo',
        apiKey: ''
      }
    }
  })

  await app.start()

  const res = await fetch(`http://localhost:${port}/documentation/json`)
  const body = await res.json()

  assert.deepStrictEqual(Object.keys(body.paths), [
    '/api/v1/prompt',
    '/api/v1/stream'
  ])

  await app.close()
})

it('prompt with wrong JSON', async () => {
  const [app, port] = await buildAiWarpApp({
    aiProvider: {
      openai: {
        model: 'gpt-3.5-turbo',
        apiKey: ''
      }
    }
  })

  await app.start()

  const res = await fetch(`http://localhost:${port}/api/v1/prompt`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      prompt: 'asd'
    }).slice(0, 10)
  })

  assert.strictEqual(res.status, 400)

  const body = await res.json()

  assert.deepStrictEqual(body, {
    message: 'Unexpected end of JSON input'
  })

  await app.close()
})

it('buildStackable', async () => {
  const stackable = await buildStackable({
    // @ts-expect-error
    config: {
      server: {
        port: 0,
        forceCloseConnections: true,
        healthCheck: false,
        logger: {
          level: 'silent'
        }
      },
      service: {
        openapi: true
      },
      aiProvider: {
        openai: {
          model: 'gpt-3.5-turbo',
          apiKey: ''
        }
      }
    }
  })

  await stackable.start({})

  // @ts-expect-error
  const res = await stackable.inject('/documentation/json')
  // @ts-expect-error
  const body = JSON.parse(res.body)

  assert.deepStrictEqual(Object.keys(body.paths), [
    '/api/v1/prompt',
    '/api/v1/stream'
  ])

  await stackable.stop()
})

it('stackable.buildStackable', async () => {
  const app = await stackable.buildStackable({
    // @ts-expect-error
    config: {
      server: {
        port: 0,
        forceCloseConnections: true,
        healthCheck: false,
        logger: {
          level: 'silent'
        }
      },
      service: {
        openapi: true
      },
      aiProvider: {
        openai: {
          model: 'gpt-3.5-turbo',
          apiKey: ''
        }
      }
    }
  })

  await app.start({})

  // @ts-expect-error
  const res = await app.inject('/documentation/json')
  // @ts-expect-error
  const body = JSON.parse(res.body)

  assert.deepStrictEqual(Object.keys(body.paths), [
    '/api/v1/prompt',
    '/api/v1/stream'
  ])

  await app.stop()
})
