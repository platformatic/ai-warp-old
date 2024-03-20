import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'node:stream/web'
import { ChatCompletionResponseChunk } from '@mistralai/mistralai'
import { AiProvider, NoContentError, StreamErrorCallback } from './provider'

type MistralStreamResponse = AsyncGenerator<ChatCompletionResponseChunk, void, unknown>

class MistralByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  response: MistralStreamResponse
  errorCallback?: StreamErrorCallback

  constructor (response: MistralStreamResponse, errorCallback?: StreamErrorCallback) {
    this.response = response
  }

  start (controller: ReadableByteStreamController): void {
    const errorCallback = this.errorCallback
    function push (response: MistralStreamResponse): void {
      response.next().then(({ done, value }) => {
        if (done !== undefined && done) {
          controller.close()
          return
        }

        if (value.choices.length === 0) {
          const error = new NoContentError('Mistral (Stream)')
          if (errorCallback !== undefined) {
            errorCallback(error)
            return
          } else {
            throw error
          }
        }

        const { content } = value.choices[0].delta
        if (content !== undefined && content.length > 0) {
          const buffer = new ArrayBuffer(content.length * 2)
          const view = new Uint16Array(buffer)
          for (let i = 0; i < content.length; i++) {
            view[i] = content.charCodeAt(i)
          }

          controller.enqueue(view)
        }

        push(response)
      }).catch(err => {
        throw err
      })
    }

    push(this.response)
  }
}

export class MistralProvider implements AiProvider {
  model: string
  apiKey: string
  client?: import('@mistralai/mistralai').default = undefined

  constructor (model: string, apiKey: string) {
    this.model = model
    this.apiKey = apiKey
  }

  async ask (prompt: string, stream: boolean): Promise<string | ReadableStream> {
    if (this.client === undefined) {
      const { default: MistralClient } = await import('@mistralai/mistralai')
      this.client = new MistralClient(this.apiKey)
    }

    if (stream) {
      const response = this.client.chatStream({
        model: this.model,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
      // TODO: ReadableStream.from might be better, try when it lands in Node
      return new ReadableStream(new MistralByteSource(response))
    }

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    if (response.choices.length === 0) {
      throw new NoContentError('Mistral')
    }

    return response.choices[0].message.content
  }
}
