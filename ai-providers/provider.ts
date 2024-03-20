import { ReadableStream } from 'node:stream/web'
import createError from '@fastify/error'

export type StreamErrorCallback = (error: Error) => void

export interface AiProvider {
  ask: (prompt: string, stream: boolean, streamErrorCallback?: StreamErrorCallback) => Promise<string | ReadableStream>
}

export const NoContentError = createError<[string]>('NO_CONTENT', '%s didn\'t return any content')
