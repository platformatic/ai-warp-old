import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'node:stream/web'
import MistralClient, { ChatCompletionResponseChunk } from '@platformatic/mistral-client'
import { AiProvider, NoContentError, StreamChunkCallback } from './provider.js'
import { AiStreamEvent, encodeEvent } from './event.js'

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

interface MistralProviderCtorOptions {
  model: string
  apiKey: string
}

export class MistralProvider implements AiProvider {
  model: string
  client: MistralClient

  constructor ({ model, apiKey }: MistralProviderCtorOptions) {
    this.model = model
    this.client = new MistralClient(apiKey)
  }

  async ask (prompt: string): Promise<string> {
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
    const response = this.client.chatStream({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
    return new ReadableStream(new MistralByteSource(response, chunkCallback))
  }
}
