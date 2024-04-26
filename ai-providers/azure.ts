import { ReadableStream, ReadableByteStreamController, UnderlyingByteSource } from 'stream/web'
import { AiProvider, NoContentError, StreamChunkCallback } from './provider.js'
import { AiStreamEvent, encodeEvent } from './event.js'
import { AzureKeyCredential, ChatCompletions, EventStream, OpenAIClient } from '@azure/openai'

type AzureStreamResponse = EventStream<ChatCompletions>

class AzureByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  response: AzureStreamResponse
  reader?: ReadableStreamDefaultReader<ChatCompletions>
  chunkCallback?: StreamChunkCallback

  constructor (response: AzureStreamResponse, chunkCallback?: StreamChunkCallback) {
    this.response = response
    this.chunkCallback = chunkCallback
  }

  start (): void {
    this.reader = this.response.getReader()
  }

  async pull (controller: ReadableByteStreamController): Promise<void> {
    // start() defines this.reader and is called before this
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { done, value } = await this.reader!.read()

    if (done !== undefined && done) {
      controller.close()
      return
    }

    if (value.choices.length === 0) {
      const error = new NoContentError('Azure OpenAI')

      const eventData: AiStreamEvent = {
        event: 'error',
        data: error
      }
      controller.enqueue(encodeEvent(eventData))
      controller.close()

      return
    }

    const { delta } = value.choices[0]
    if (delta === undefined || delta.content === null) {
      const error = new NoContentError('Azure OpenAI')

      const eventData: AiStreamEvent = {
        event: 'error',
        data: error
      }
      controller.enqueue(encodeEvent(eventData))
      controller.close()

      return
    }

    let response = delta.content
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

interface AzureProviderCtorOptions {
  endpoint: string
  apiKey: string
  deploymentName: string
  allowInsecureConnections?: boolean
}

export class AzureProvider implements AiProvider {
  deploymentName: string
  client: OpenAIClient

  constructor ({ endpoint, apiKey, deploymentName, allowInsecureConnections }: AzureProviderCtorOptions) {
    this.deploymentName = deploymentName

    this.client = new OpenAIClient(
      endpoint,
      new AzureKeyCredential(apiKey),
      {
        allowInsecureConnection: allowInsecureConnections
      }
    )
  }

  async ask (prompt: string): Promise<string> {
    const { choices } = await this.client.getChatCompletions(this.deploymentName, [
      { role: 'user', content: prompt }
    ])

    if (choices.length === 0) {
      throw new NoContentError('Azure OpenAI')
    }

    const { message } = choices[0]
    if (message === undefined || message.content === null) {
      throw new NoContentError('Azure OpenAI')
    }

    return message.content
  }

  async askStream (prompt: string, chunkCallback?: StreamChunkCallback | undefined): Promise<ReadableStream> {
    const response = await this.client.streamChatCompletions(this.deploymentName, [
      { role: 'user', content: prompt }
    ])

    return new ReadableStream(new AzureByteSource(response, chunkCallback))
  }
}
