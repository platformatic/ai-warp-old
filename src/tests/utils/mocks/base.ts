import { MockAgent, setGlobalDispatcher } from 'undici'

export const MOCK_CONTENT_RESPONSE = 'asd123'

export const MOCK_STREAMING_CONTENT_CHUNKS = [
  'chunk1',
  'chunk2',
  'chunk3'
]

/**
 * @returns The full body that should be returned from the stream endpoint
 */
export function buildExpectedStreamBodyString (): string {
  let body = ''
  for (const chunk of MOCK_STREAMING_CONTENT_CHUNKS) {
    body += `event: content\ndata: {"response":"${chunk}"}\n\n`
  }
  return body
}

export const MOCK_AGENT = new MockAgent()

let isMockAgentEstablished = false
export function establishMockAgent (): void {
  if (isMockAgentEstablished) {
    return
  }
  setGlobalDispatcher(MOCK_AGENT)
  isMockAgentEstablished = true
}
