import esmock from 'esmock'
import { MOCK_CONTENT_RESPONSE, MOCK_STREAMING_CONTENT_CHUNKS } from './base.js'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class LlamaModelMock {}

class LlamaContextMock {
  decode (token: number[]): string {
    const chunkIndex = token[0]
    return MOCK_STREAMING_CONTENT_CHUNKS[chunkIndex]
  }
}

interface PromptOptions {
  onToken: (token: number[]) => void
}

class LlamaChatSessionMock {
  context: LlamaContextMock

  constructor ({ context }: { context: LlamaContextMock }) {
    this.context = context
  }

  async prompt (_: string, options?: PromptOptions): Promise<string> {
    if (options !== undefined) {
      for (let i = 0; i < MOCK_STREAMING_CONTENT_CHUNKS.length; i++) {
        // Send an array with just one element that's the chunk number
        options.onToken([i])
      }
    }

    return MOCK_CONTENT_RESPONSE
  }
}

export async function mockLlama2 (): Promise<any> {
  const llama2Provider = await esmock('../../../ai-providers/llama2.ts', {
    'node-llama-cpp': {
      LlamaModel: LlamaModelMock,
      LlamaContext: LlamaContextMock,
      LlamaChatSession: LlamaChatSessionMock
    }
  })

  return llama2Provider
}
