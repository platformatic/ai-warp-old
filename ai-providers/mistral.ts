import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'node:stream/web'
import { ChatCompletionResponseChunk } from '@mistralai/mistralai'
import { AiProvider, NoContentError, StreamChunkCallback } from './provider'
import { AiStreamEvent, encodeEvent } from './event'

type MistralStreamResponse = AsyncGenerator<ChatCompletionResponseChunk, void, unknown>

class MistralByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  response: MistralStreamResponse
  chunkCallback?: StreamChunkCallback

  constructor (response: MistralStreamResponse, chunkCallback?: StreamChunkCallback) {
    this.response = response
    this.chunkCallback = chunkCallback
  }

  async pull (controller: ReadableByteStreamController): Promise<void> {
    const { done, value } = await this.response.next()
    if (done !== undefined && done) {
      controller.close()
      return
    }

    if (value.choices.length === 0) {
      const error = new NoContentError('Mistral (Stream)')

      const eventData: AiStreamEvent = {
        event: 'error',
        data: error
      }
      controller.enqueue(encodeEvent(eventData))
      controller.close()

      return
    }

    const { content } = value.choices[0].delta

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

export class MistralProvider implements AiProvider {
  model: string
  apiKey: string
  client?: import('@mistralai/mistralai').default = undefined

  constructor (model: string, apiKey: string) {
    this.model = model
    this.apiKey = apiKey
  }

  async ask (prompt: string): Promise<string> {
    if (this.client === undefined) {
      const { default: MistralClient } = await import('@mistralai/mistralai')
      this.client = new MistralClient(this.apiKey)
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

  async askStream (prompt: string, chunkCallback?: StreamChunkCallback): Promise<ReadableStream> {
    if (this.client === undefined) {
      const { default: MistralClient } = await import('@mistralai/mistralai')
      this.client = new MistralClient(this.apiKey)
    }

    const response = this.client.chatStream({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
    return new ReadableStream(new MistralByteSource(response, chunkCallback))
  }
}
