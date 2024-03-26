import { schema } from '@platformatic/service'

const aiWarpSchema = {
  ...schema.schema,
  $id: 'ai-warp',
  title: 'Ai Warp Config',
  properties: {
    ...schema.schema.properties,
    module: { type: 'string' },
    aiProvider: {
      type: 'object',
      oneOf: [
        {
          properties: {
            openai: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  enum: [
                    'gpt-3.5-turbo',
                    'gpt-4'
                    // TODO: fill
                  ]
                },
                apiKey: { type: 'string' }
              },
              required: ['model', 'apiKey'],
              additionalProperties: false
            }
          },
          required: ['openai'],
          additionalProperties: false
        },
        {
          properties: {
            mistral: {
              type: 'object',
              properties: {
                model: {
                  type: 'string',
                  enum: [
                    'mistral-tiny'
                    // TODO: fill
                  ]
                },
                apiKey: { type: 'string' }
              },
              required: ['model', 'apiKey'],
              additionalProperties: false
            }
          },
          required: ['mistral'],
          additionalProperties: false
        }
      ]
    },
    promptDecorators: {
      type: 'object',
      properties: {
        prefix: { type: 'string' },
        suffix: { type: 'string' }
      },
      additionalProperties: false
    },
    auth: {
      type: 'object',
      properties: {
        required: {
          type: 'boolean',
          description: 'If true, any unauthenticated requests will be blocked',
          default: false
        },
        // Pulled from https://github.com/platformatic/fastify-user/blob/c7480cef408ea4202087eeb0892730650480c45b/index.d.ts
        jwt: {
          type: 'object',
          properties: {
            jwks: {
              oneOf: [
                { type: 'boolean' },
                {
                  type: 'object',
                  properties: {
                    max: { type: 'number' },
                    ttl: { type: 'number' },
                    issuersWhitelist: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    providerDiscovery: { type: 'boolean' },
                    jwksPath: { type: 'string' },
                    timeout: { type: 'number' }
                  }
                }
              ]
            },
            // Pulled from https://github.com/fastify/fastify-jwt/blob/77721ccfc9f0ccf1daf477a768eb42827ba48a23/types/jwt.d.ts#L133
            secret: {
              oneOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    public: { type: 'string' },
                    private: { type: 'string' }
                  },
                  required: ['public']
                }
              ]
            },
            decode: {
              type: 'object',
              properties: {
                complete: { type: 'boolean' },
                // Typo purposeful https://github.com/nearform/fast-jwt/blob/bf0872fb797b60b9e0ffa7f8feb27cdb27a027e6/src/index.d.ts#L116
                checkTyp: { type: 'string' }
              }
            },
            sign: {
              type: 'object',
              properties: {
                expiresIn: {
                  oneOf: [
                    { type: 'number' },
                    { type: 'string' }
                  ]
                },
                notBefore: {
                  oneOf: [
                    { type: 'number' },
                    { type: 'string' }
                  ]
                },
                key: { type: 'string' }
              },
              requires: ['expiresIn', 'notBefore']
            },
            verify: {
              type: 'object',
              properties: {
                maxAge: {
                  oneOf: [
                    { type: 'number' },
                    { type: 'string' }
                  ]
                },
                onlyCookie: { type: 'boolean' },
                key: { type: 'string' }
              },
              required: ['maxAge', 'onlyCookie']
            },
            cookie: {
              type: 'object',
              properties: {
                cookieName: { type: 'string' },
                signed: { type: 'boolean' }
              },
              required: ['cookieName', 'signed']
            },
            messages: {
              type: 'object',
              properties: {
                badRequestErrorMessage: { type: 'string' },
                badCookieRequestErrorMessage: { type: 'string' },
                noAuthorizationInHeaderMessage: { type: 'string' },
                noAuthorizationInCookieMessage: { type: 'string' },
                authorizationTokenExpiredMessage: { type: 'string' },
                authorizationTokenInvalid: { type: 'string' },
                authorizationTokenUntrusted: { type: 'string' },
                authorizationTokenUnsigned: { type: 'string' }
              }
            },
            jwtDecode: { type: 'string' },
            namespace: { type: 'string' },
            jwtVerify: { type: 'string' },
            jwtSign: { type: 'string' },
            decoratorName: { type: 'string' }
          },
          required: ['secret']
        },
        webhook: {
          type: 'object',
          properties: {
            url: { type: 'string' }
          },
          required: ['url']
        }
      }
    },
    rateLimiting: {
      type: 'object',
      properties: {
        // Pulled from https://github.com/fastify/fastify-rate-limit/blob/master/types/index.d.ts#L81
        max: { type: 'number' },
        maxByClaims: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              claim: { type: 'string' },
              claimValue: { type: 'string' },
              max: { type: 'number' }
            },
            additionalProperties: false,
            required: ['claim', 'claimValue', 'max']
          }
        },
        timeWindow: {
          oneOf: [
            { type: 'number' },
            { type: 'string' }
          ]
        },
        hook: {
          type: 'string',
          enum: [
            'onRequest',
            'preParsing',
            'preValidation',
            'preHandler'
          ]
        },
        cache: { type: 'number' },
        allowList: {
          type: 'array',
          items: { type: 'string' }
        },
        continueExceeding: { type: 'boolean' },
        skipOnError: { type: 'boolean' },
        ban: { type: 'number' },
        enableDraftSpec: { type: 'boolean' }
      }
    }
  },
  required: [
    'aiProvider'
  ]
}

export { aiWarpSchema as schema }

if (require.main === module) {
  console.log(JSON.stringify(aiWarpSchema, null, 2))
}
