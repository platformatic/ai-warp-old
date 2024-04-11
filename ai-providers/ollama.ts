import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'stream/web'
import { Ollama, ChatResponse } from 'ollama'
import { AiProvider, StreamChunkCallback } from './provider'
import { AiStreamEvent, encodeEvent } from './event'

type OllamaStreamResponse = AsyncGenerator<ChatResponse>

class OllamaByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  response: OllamaStreamResponse
  chunkCallback?: StreamChunkCallback

  constructor (response: OllamaStreamResponse, chunkCallback?: StreamChunkCallback) {
    this.response = response
    this.chunkCallback = chunkCallback
  }

  async pull (controller: ReadableByteStreamController): Promise<void> {
    const { done, value } = await this.response.next()
    if (done !== undefined && done) {
      controller.close()
      return
    }

    let response = value.message.content
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

export class OllamaProvider implements AiProvider {
  model: string
  client: Ollama

  constructor (host: string, model: string) {
    this.model = model
    this.client = new Ollama({ host })
  }

  async ask (prompt: string): Promise<string> {
    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    return response.message.content
  }

  async askStream (prompt: string, chunkCallback?: StreamChunkCallback | undefined): Promise<ReadableStream> {
    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: true
    })

    return new ReadableStream(new OllamaByteSource(response, chunkCallback))
  }
}
