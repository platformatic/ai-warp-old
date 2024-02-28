import OpenAI from 'openai'
import { AiProvider, NoContentError } from './provider'

export class OpenAiProvider implements AiProvider {
  model: string
  client: OpenAI

  constructor (model: string, apiKey: string) {
    this.model = model
    this.client = new OpenAI({ apiKey })
  }

  async ask (prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    if (response.choices.length === 0) {
      // TODO: figure out error handling strategy
      throw new NoContentError('OpenAI')
    }

    const { content } = response.choices[0].message
    if (content === null) {
      throw new NoContentError('OpenAI')
    }

    return content
  }
}
