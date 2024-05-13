import { ReadableStream } from 'node:stream/web'
import createError from '@fastify/error'

export type ChatHistory = Array<{ prompt: string, response: string }>

export type StreamChunkCallback = (response: string) => Promise<string>

export interface AiProvider {
  ask: (prompt: string, chatHistory?: ChatHistory) => Promise<string>
  askStream: (prompt: string, chunkCallback?: StreamChunkCallback, chatHistory?: ChatHistory) => Promise<ReadableStream>
}

export const NoContentError = createError<[string]>('NO_CONTENT', '%s didn\'t return any content')
