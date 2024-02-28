import MistralClient from '@mistralai/mistralai'
import { AiProvider, NoContentError } from './provider'

export class MistralProvider implements AiProvider {
  model: string
  client: MistralClient

  constructor (model: string, apiKey: string) {
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
}
