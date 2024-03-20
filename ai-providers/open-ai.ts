import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'node:stream/web'
import OpenAI from 'openai'
import { AiProvider, NoContentError, StreamErrorCallback } from './provider'
import { Stream } from 'openai/streaming'
import { ReadableStream as ReadableStreamPolyfill } from 'web-streams-polyfill'
import { ChatCompletionChunk } from 'openai/resources/index.mjs'

class OpenAiByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  polyfillStream: ReadableStreamPolyfill<ChatCompletionChunk>
  errorCallback?: StreamErrorCallback

  constructor (polyfillStream: ReadableStreamPolyfill, errorCallback?: StreamErrorCallback) {
    this.polyfillStream = polyfillStream
    this.errorCallback = errorCallback
  }

  start (controller: ReadableByteStreamController): void {
    const reader = this.polyfillStream.getReader()
    const errorCallback = this.errorCallback
    function push (): void {
      reader.read().then(({ done, value }) => {
        if (done !== undefined && done) {
          controller.close()
          return
        }

        if (!(value instanceof Uint8Array)) {
          const error = new Error('value not a Uint8Array')
          if (errorCallback !== undefined) {
            errorCallback(error)
            return
          } else {
            throw error
          }
        }

        const jsonString = Buffer.from(value).toString('utf8')
        const chunk: ChatCompletionChunk = JSON.parse(jsonString)

        if (chunk.choices.length === 0) {
          const error = new NoContentError('OpenAI (Stream)')
          if (errorCallback !== undefined) {
            errorCallback(error)
            return
          } else {
            throw error
          }
        }

        const { content } = chunk.choices[0].delta
        if (content !== undefined && content !== null && content.length > 0) {
          const buffer = new ArrayBuffer(content.length * 2)
          const view = new Uint16Array(buffer)
          for (let i = 0; i < content.length; i++) {
            view[i] = content.charCodeAt(i)
          }

          controller.enqueue(view)
        }

        push()
      }).catch(err => {
        throw err
      })
    }

    push()
  }
}

export class OpenAiProvider implements AiProvider {
  model: string
  client: OpenAI

  constructor (model: string, apiKey: string) {
    this.model = model
    this.client = new OpenAI({ apiKey })
  }

  async ask (prompt: string, stream: boolean, streamErrorCallback?: StreamErrorCallback): Promise<string | ReadableStream> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream
    })
    if (response instanceof Stream) {
      return new ReadableStream(new OpenAiByteSource(response.toReadableStream(), streamErrorCallback))
    }

    if (response.choices.length === 0) {
      throw new NoContentError('OpenAI')
    }

    const { content } = response.choices[0].message
    if (content === null) {
      throw new NoContentError('OpenAI')
    }

    return content
  }
}
