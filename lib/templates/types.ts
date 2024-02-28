export function generateGlobalTypesFile (npmPackageName: string): string {
  return `import { FastifyInstance } from 'fastify'
import { AiWarpConfig, PlatformaticApp } from '${npmPackageName}'
  
declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<AiWarpConfig>
  }
}
`
}
