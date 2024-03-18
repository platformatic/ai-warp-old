import { ReadableStream } from 'node:stream/web'
import createError from '@fastify/error'

export interface AiProvider {
  ask: (prompt: string, stream: boolean) => Promise<string | ReadableStream>
}

export const NoContentError = createError<[string]>('NO_CONTENT', '%s didn\'t return any content')
