import { ReadableStream, UnderlyingByteSource, ReadableByteStreamController } from 'node:stream/web'
import { ChatCompletionResponseChunk } from '@mistralai/mistralai'
import { AiProvider, NoContentError } from './provider'

type MistralStreamResponse = AsyncGenerator<ChatCompletionResponseChunk, void, unknown>

class MistralByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  response: MistralStreamResponse

  constructor (response: MistralStreamResponse) {
    this.response = response
  }

  start (controller: ReadableByteStreamController): void {
    function push (response: MistralStreamResponse): void {
      response.next().then(({ done, value }) => {
        if (done !== undefined && done) {
          controller.close()
          return
        }

        if (value.choices.length === 0) {
          throw new NoContentError('Mistral (Stream)')
        }

        const choice = value.choices[0]
        if (choice.delta.content === undefined) {
          throw new NoContentError('Mistral (Stream)')
        }

        const content = choice.delta.content

        if (content.length > 0) {
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
