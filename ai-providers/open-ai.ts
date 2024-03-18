import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'node:stream/web'
import OpenAI from 'openai'
import { AiProvider, NoContentError } from './provider'
import { Stream } from 'openai/streaming'
import { ReadableStream as ReadableStreamPolyfill } from 'web-streams-polyfill';

class OpenAiByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  polyfillStream: ReadableStreamPolyfill

  constructor(polyfillStream: ReadableStreamPolyfill) {
    this.polyfillStream = polyfillStream
  }

  start (controller: ReadableByteStreamController): void {
    const reader = this.polyfillStream.getReader()
    function push(): void {
      reader.read().then(({ done, value }) => {
        if (done !== undefined && done) {
          controller.close()
          return
        }

        if (!(value instanceof Uint8Array)) {
          throw new Error('value not a uint8array')
        }

        const jsonString = Buffer.from(value).toString('utf8')
        const json = JSON.parse(jsonString)

        const content = json.choices[0].delta.content
        if (content !== undefined && content.length > 0) {
          const buffer = new ArrayBuffer(content.length * 2)
          const view = new Uint16Array(buffer)
          for (let i = 0; i < content.length; i++) {
            view[i] = content.charCodeAt(i)
          }

          controller.enqueue(view)
        }

        push()
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

  async ask (prompt: string, stream: boolean): Promise<string | ReadableStream> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream
    })
    if (response instanceof Stream) {
      return new ReadableStream(new OpenAiByteSource(response.toReadableStream()))
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
