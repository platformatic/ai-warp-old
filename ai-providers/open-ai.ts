import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'node:stream/web'
import OpenAI from 'openai'
import { AiProvider, NoContentError, StreamChunkCallback } from './provider'
import { ReadableStream as ReadableStreamPolyfill } from 'web-streams-polyfill'
import { fetch } from 'undici'
import { ChatCompletionChunk } from 'openai/resources/index.mjs'
import { AiStreamEvent, encodeEvent } from './event'
import createError from '@fastify/error'

const InvalidTypeError = createError<string>('DESERIALIZING_ERROR', 'Deserializing error: %s', 500)

class OpenAiByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  polyfillStream: ReadableStreamPolyfill
  reader?: ReadableStreamDefaultReader
  chunkCallback?: StreamChunkCallback

  constructor (polyfillStream: ReadableStreamPolyfill, chunkCallback?: StreamChunkCallback) {
    this.polyfillStream = polyfillStream
    this.chunkCallback = chunkCallback
  }

  start (): void {
    this.reader = this.polyfillStream.getReader()
  }

  async pull (controller: ReadableByteStreamController): Promise<void> {
    // start() defines this.reader and is called before this
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { done, value } = await this.reader!.read()

    if (done !== undefined && done) {
      controller.close()
      return
    }

    if (!(value instanceof Uint8Array)) {
      // This really shouldn't happen but just in case + typescript likes
      const error = new InvalidTypeError('OpenAI stream value not a Uint8Array')

      const eventData: AiStreamEvent = {
        event: 'error',
        data: error
      }
      controller.enqueue(encodeEvent(eventData))
      controller.close()

      return
    }

    const jsonString = Buffer.from(value).toString('utf8')
    const chunk: ChatCompletionChunk = JSON.parse(jsonString)

    if (chunk.choices.length === 0) {
      const error = new NoContentError('OpenAI stream')

      const eventData: AiStreamEvent = {
        event: 'error',
        data: error
      }
      controller.enqueue(encodeEvent(eventData))
      controller.close()

      return
    }

    const { content } = chunk.choices[0].delta

    let response = content ?? ''
    if (this.chunkCallback !== undefined) {
      response = await this.chunkCallback(response)
    }

    const eventData: AiStreamEvent = {
      event: 'content',
      data: {
        response
      }
    }
    controller.enqueue(encodeEvent(eventData))
  }
}

interface OpenAiProviderCtorOptions {
  model: string
  apiKey: string
}

export class OpenAiProvider implements AiProvider {
  model: string
  client: OpenAI

  constructor ({ model, apiKey }: OpenAiProviderCtorOptions) {
    this.model = model
    // @ts-expect-error
    this.client = new OpenAI({ apiKey, fetch })
  }

  async ask (prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: false
    })

    if (response.choices.length === 0) {
      throw new NoContentError('OpenAI')
    }

    const { content } = response.choices[0].message
    if (content === null) {
      throw new NoContentError('OpenAI')
    }

    return content
  }

  async askStream (prompt: string, chunkCallback?: StreamChunkCallback): Promise<ReadableStream> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: true
    })
    return new ReadableStream(new OpenAiByteSource(response.toReadableStream(), chunkCallback))
  }
}
