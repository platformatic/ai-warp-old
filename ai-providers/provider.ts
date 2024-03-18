import { ReadableStream } from 'node:stream/web'
import createError from '@fastify/error'

export type StreamChunkCallback = (response: string) => Promise<string>

export interface AiProvider {
  ask: (prompt: string) => Promise<string>
  askStream: (prompt: string, chunkCallback?: StreamChunkCallback) => Promise<ReadableStream>
}

export const NoContentError = createError<[string]>('NO_CONTENT', '%s didn\'t return any content')
