import { AiProvider, NoContentError } from './provider'

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
      const MistralClient = await import('@mistralai/mistralai')
      this.client = new MistralClient.default(this.apiKey)
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
