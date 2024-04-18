import { ReadableByteStreamController, ReadableStream, UnderlyingByteSource } from 'stream/web'
import {
  LLamaChatPromptOptions,
  LlamaChatSession,
  LlamaContext,
  LlamaModel
} from 'node-llama-cpp'
import { AiProvider, StreamChunkCallback } from './provider.js'
import { AiStreamEvent, encodeEvent } from './event.js'

interface ChunkQueueNode {
  chunk: number[]
  next?: ChunkQueueNode
}

class ChunkQueue {
  private size: number = 0
  private head?: ChunkQueueNode
  private tail?: ChunkQueueNode

  getSize (): number {
    return this.size
  }

  push (chunk: number[]): void {
    this.size++

    const node: ChunkQueueNode = { chunk }
    if (this.head === undefined || this.tail === undefined) {
      this.head = node
      this.tail = node
    } else {
      this.tail.next = node
      this.tail = node
    }
  }

  pop (): number[] | undefined {
    if (this.head === undefined) {
      return undefined
    }

    this.size--

    const chunk = this.head.chunk
    this.head = this.head.next

    if (this.size === 0) {
      this.tail = undefined
    }

    return chunk
  }
}

class Llama2ByteSource implements UnderlyingByteSource {
  type: 'bytes' = 'bytes'
  session: LlamaChatSession
  chunkCallback?: StreamChunkCallback
  backloggedChunks: ChunkQueue = new ChunkQueue()
  finished: boolean = false
  controller?: ReadableByteStreamController

  constructor (session: LlamaChatSession, prompt: string, chunkCallback?: StreamChunkCallback) {
    this.session = session
    this.chunkCallback = chunkCallback

    session.prompt(prompt, {
      onToken: this.onToken
    }).then(() => {
      this.finished = true
      // Don't close the stream if we still have chunks to send
      if (this.backloggedChunks.getSize() === 0 && this.controller !== undefined) {
        this.controller.close()
      }
    }).catch((err: any) => {
      this.finished = true
      if (this.controller !== undefined) {
        this.controller.close()
      }
      throw err
    })
  }

  onToken: LLamaChatPromptOptions['onToken'] = async (chunk) => {
    if (this.controller === undefined) {
      // Stream hasn't started yet, added it to the backlog queue
      this.backloggedChunks.push(chunk)
      return
    }

    await this.clearBacklog()
    await this.enqueueChunk(chunk)
  }

  private async enqueueChunk (chunk: number[]): Promise<void> {
    if (this.controller === undefined) {
      throw new Error('tried enqueueing chunk before stream started')
    }

    let response = this.session.context.decode(chunk)
    if (this.chunkCallback !== undefined) {
      response = await this.chunkCallback(response)
    }

    const eventData: AiStreamEvent = {
      event: 'content',
      data: {
        response
      }
    }
    this.controller.enqueue(encodeEvent(eventData))

    if (this.backloggedChunks.getSize() === 0 && this.finished) {
      this.controller.close()
    }
  }

  async clearBacklog (): Promise<void> {
    if (this.backloggedChunks.getSize() === 0) {
      return
    }

    let backloggedChunk = this.backloggedChunks.pop()
    while (backloggedChunk !== undefined) {
      // Each chunk needs to be sent in order, can't run all of these at once
      await this.enqueueChunk(backloggedChunk)
      backloggedChunk = this.backloggedChunks.pop()
    }
  }

  start (controller: ReadableByteStreamController): void {
    this.controller = controller
    this.clearBacklog().catch(err => {
      throw err
    })
  }
}

interface Llama2ProviderCtorOptions {
  modelPath: string
}

export class Llama2Provider implements AiProvider {
  modelPath: string
  session?: LlamaChatSession

  constructor ({ modelPath }: Llama2ProviderCtorOptions) {
    this.modelPath = modelPath
  }

  async ask (prompt: string): Promise<string> {
    if (this.session === undefined) {
      const model = new LlamaModel({ modelPath: this.modelPath })
      const context = new LlamaContext({ model })
      this.session = new LlamaChatSession({ context })
    }

    const response = await this.session.prompt(prompt)

    return response
  }

  async askStream (prompt: string, chunkCallback?: StreamChunkCallback): Promise<ReadableStream> {
    if (this.session === undefined) {
      const model = new LlamaModel({ modelPath: this.modelPath })
      const context = new LlamaContext({ model })
      this.session = new LlamaChatSession({ context })
    }

    return new ReadableStream(new Llama2ByteSource(this.session, prompt, chunkCallback))
  }
}
