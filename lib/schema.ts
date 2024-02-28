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
