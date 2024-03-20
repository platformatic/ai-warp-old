import { FastifyError } from 'fastify'
import fastJson from 'fast-json-stringify'

const stringifyEventData = fastJson({
  title: 'Stream Event Data',
  type: 'object',
  properties: {
    // Success
    response: { type: 'string' },
    // Error
    code: { type: 'string' },
    message: { type: 'string' }
  }
})

export interface AiStreamEventContent {
  response: string
}

export type AiStreamEvent = {
  event: 'content'
  data: AiStreamEventContent
} | {
  event: 'error'
  data: FastifyError
}

/**
 * Encode an event to the Event Stream format
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format
 */
export function encodeEvent ({ event, data }: AiStreamEvent): Uint8Array {
  const jsonString = stringifyEventData(data)
  const eventString = `event: ${event}\ndata: ${jsonString}\n\n`

  return new TextEncoder().encode(eventString)
}
