import createError from '@fastify/error'

export interface AiProvider {
  ask: (prompt: string) => Promise<string>
}

export const NoContentError = createError<[string]>('NO_CONTENT', '%s didn\'t return any content')
