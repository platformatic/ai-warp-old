import { ReadableStream, ReadableByteStreamController, UnderlyingByteSource } from 'stream/web'
import { AiProvider, NoContentError, StreamChunkCallback } from './provider'
import { AiStreamEvent, encodeEvent } from './event'

// @ts-expect-error
type AzureEventStream<T> = import('@azure/openai').EventStream<T>
// @ts-expect-error
type AzureChatCompletions = import('@azure/openai').ChatCompletions

type AzureStreamResponse = AzureEventStream<AzureChatCompletions>

class AzureByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  response: AzureStreamResponse
  reader?: ReadableStreamDefaultReader<AzureChatCompletions>
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
  endpoint: string
  deploymentName: string
  apiKey: string
  // @ts-expect-error typescript doesn't like this type import even though
  //  it's fine in the Mistral client?
  client?: import('@azure/openai').OpenAIClient = undefined
  allowInsecureConnections: boolean

  constructor ({ endpoint, apiKey, deploymentName, allowInsecureConnections }: AzureProviderCtorOptions) {
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.deploymentName = deploymentName
    this.allowInsecureConnections = allowInsecureConnections ?? false
  }

  async ask (prompt: string): Promise<string> {
    if (this.client === undefined) {
      const { OpenAIClient, AzureKeyCredential } = await import('@azure/openai')
      this.client = new OpenAIClient(
        this.endpoint,
        new AzureKeyCredential(this.apiKey),
        {
          allowInsecureConnection: this.allowInsecureConnections
        }
      )
    }

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
    if (this.client === undefined) {
      const { OpenAIClient, AzureKeyCredential } = await import('@azure/openai')
      this.client = new OpenAIClient(
        this.endpoint,
        new AzureKeyCredential(this.apiKey),
        {
          allowInsecureConnection: this.allowInsecureConnections
        }
      )
    }

    const response = await this.client.streamChatCompletions(this.deploymentName, [
      { role: 'user', content: prompt }
    ])

    return new ReadableStream(new AzureByteSource(response, chunkCallback))
  }
}
