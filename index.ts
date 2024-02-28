import { platformaticService, Stackable } from '@platformatic/service'
import { schema } from './lib/schema'
import { Generator } from './lib/generator'
import { AiWarpConfig } from './config'

const stackable: Stackable<AiWarpConfig> = async function (fastify, opts) {
  await fastify.register(platformaticService, opts)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await fastify.register(require('./plugins/warp'), opts)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await fastify.register(require('./plugins/api'), opts)

  // TODO: front end
}

stackable.configType = 'ai-warp-app'
stackable.schema = schema
stackable.Generator = Generator
stackable.configManagerConfig = {
  schema,
  envWhitelist: ['PORT', 'HOSTNAME'],
  allowToWatch: ['.env'],
  schemaOptions: {
    useDefaults: true,
    coerceTypes: true,
    allErrors: true,
    strict: false
  },
  async transformConfig () {}
}

// break Fastify encapsulation
// @ts-expect-error
stackable[Symbol.for('skip-override')] = true

export default stackable
export { Generator, schema }
