import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'stream/web'
import { Ollama, ChatResponse, Message } from 'ollama'
import type { AbortableAsyncIterator } from 'ollama/src/utils.js'
import { AiProvider, ChatHistory, StreamChunkCallback } from './provider.js'
import { AiStreamEvent, encodeEvent } from './event.js'

type OllamaStreamResponse = AbortableAsyncIterator<ChatResponse>

class OllamaByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  response: OllamaStreamResponse
  chunkCallback?: StreamChunkCallback

  constructor (response: OllamaStreamResponse, chunkCallback?: StreamChunkCallback) {
    this.response = response
    this.chunkCallback = chunkCallback
  }

  async pull (controller: ReadableByteStreamController): Promise<void> {
    for await (const { done, message } of this.response) {
      let response = message.content
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

      if (done !== undefined && done) {
        controller.close()
        return
      }
    }
  }
}

interface OllamaProviderCtorOptions {
  host: string
  model: string
}

export class OllamaProvider implements AiProvider {
  model: string
  client: Ollama

  constructor ({ host, model }: OllamaProviderCtorOptions) {
    this.model = model
    this.client = new Ollama({ host })
  }

  async ask (prompt: string, chatHistory?: ChatHistory): Promise<string> {
    const response = await this.client.chat({
      model: this.model,
      messages: [
        ...this.chatHistoryToMessages(chatHistory),
        { role: 'user', content: prompt }
      ]
    })

    return response.message.content
  }

  async askStream (prompt: string, chunkCallback?: StreamChunkCallback, chatHistory?: ChatHistory): Promise<ReadableStream> {
    const response = await this.client.chat({
      model: this.model,
      messages: [
        ...this.chatHistoryToMessages(chatHistory),
        { role: 'user', content: prompt }
      ],
      stream: true
    })

    // @ts-expect-error polyfill type mismatch
    return new ReadableStream(new OllamaByteSource(response, chunkCallback))
  }

  private chatHistoryToMessages (chatHistory?: ChatHistory): Message[] {
    if (chatHistory === undefined) {
      return []
    }

    const messages: Message[] = []
    for (const previousInteraction of chatHistory) {
      messages.push({ role: 'user', content: previousInteraction.prompt })
      messages.push({ role: 'assistant', content: previousInteraction.response })
    }

    return messages
  }
}
