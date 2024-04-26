/* eslint-disable @typescript-eslint/no-floating-promises */
import { it } from 'node:test'
import assert from 'node:assert'
import fastifyPlugin from 'fastify-plugin'
import { AiWarpConfig } from '../../config.js'
import { buildAiWarpApp } from '../utils/stackable.js'
import { authConfig, createToken } from '../utils/auth.js'

const aiProvider: AiWarpConfig['aiProvider'] = {
  openai: {
    model: 'gpt-3.5-turbo',
    apiKey: ''
  }
}

it('calls ai.rateLimiting.max callback', async () => {
  const [app, port] = await buildAiWarpApp({ aiProvider })

  try {
    const expectedMax = 100
    let callbackCalled = false
    await app.register(fastifyPlugin(async () => {
      app.ai.rateLimiting.max = () => {
        callbackCalled = true
        return expectedMax
      }
    }))

    await app.start()

    const res = await fetch(`http://localhost:${port}`)
    assert.strictEqual(callbackCalled, true)
    assert.strictEqual(res.headers.get('x-ratelimit-limit'), `${expectedMax}`)
  } finally {
    await app.close()
  }
})

it('calls ai.rateLimiting.allowList callback', async () => {
  const [app, port] = await buildAiWarpApp({ aiProvider })

  try {
    let callbackCalled = false
    app.register(fastifyPlugin(async () => {
      app.ai.rateLimiting.allowList = () => {
        callbackCalled = true
        return true
      }
    }))

    await app.start()

    await fetch(`http://localhost:${port}`)
    assert.strictEqual(callbackCalled, true)
  } finally {
    await app.close()
  }
})

it('calls ai.rateLimiting.onBanReach callback', async () => {
  const [app, port] = await buildAiWarpApp({
    aiProvider,
    rateLimiting: {
      max: 0,
      ban: 0
    }
  })

  try {
    let onBanReachCalled = false
    let errorResponseBuilderCalled = false
    app.register(fastifyPlugin(async () => {
      app.ai.rateLimiting.onBanReach = () => {
        onBanReachCalled = true
      }

      app.ai.rateLimiting.errorResponseBuilder = () => {
        errorResponseBuilderCalled = true
        return { error: 'rate limited' }
      }
    }))

    await app.start()

    await fetch(`http://localhost:${port}`)
    assert.strictEqual(onBanReachCalled, true)
    assert.strictEqual(errorResponseBuilderCalled, true)
  } finally {
    await app.close()
  }
})

it('calls ai.rateLimiting.keyGenerator callback', async () => {
  const [app, port] = await buildAiWarpApp({ aiProvider })

  try {
    let callbackCalled = false
    app.register(fastifyPlugin(async () => {
      app.ai.rateLimiting.keyGenerator = (req) => {
        callbackCalled = true
        return req.ip
      }
    }))

    await app.start()

    await fetch(`http://localhost:${port}`)
    assert.strictEqual(callbackCalled, true)
  } finally {
    await app.close()
  }
})

it('calls ai.rateLimiting.errorResponseBuilder callback', async () => {
  const [app, port] = await buildAiWarpApp({ aiProvider })

  try {
    let callbackCalled = false
    app.register(fastifyPlugin(async () => {
      app.ai.rateLimiting.max = () => 0
      app.ai.rateLimiting.errorResponseBuilder = () => {
        callbackCalled = true
        return { error: 'rate limited' }
      }
    }))

    await app.start()

    await fetch(`http://localhost:${port}`)
    assert.strictEqual(callbackCalled, true)
  } finally {
    await app.close()
  }
})

it('uses the max for a specific claim', async () => {
  const [app, port] = await buildAiWarpApp({
    aiProvider,
    rateLimiting: {
      maxByClaims: [
        {
          claim: 'rateLimitMax',
          claimValue: '10',
          max: 10
        },
        {
          claim: 'rateLimitMax',
          claimValue: '100',
          max: 100
        }
      ]
    },
    auth: authConfig
  })

  try {
    await app.start()

    let res = await fetch(`http://localhost:${port}`, {
      headers: {
        Authorization: `Bearer ${createToken({ rateLimitMax: '10' })}`
      }
    })
    assert.strictEqual(res.headers.get('x-ratelimit-limit'), '10')

    res = await fetch(`http://localhost:${port}`, {
      headers: {
        Authorization: `Bearer ${createToken({ rateLimitMax: '100' })}`
      }
    })
    assert.strictEqual(res.headers.get('x-ratelimit-limit'), '100')
  } finally {
    await app.close()
  }
})
