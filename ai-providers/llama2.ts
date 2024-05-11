import { ReadableByteStreamController, ReadableStream, UnderlyingByteSource } from 'stream/web'
import { FastifyLoggerInstance } from 'fastify'
import {
  LLamaChatPromptOptions,
  LlamaChatSession,
  LlamaContext,
  LlamaModel
} from 'node-llama-cpp'
import { AiProvider, ChatHistory, StreamChunkCallback } from './provider.js'
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
  abortController: AbortController

  constructor (session: LlamaChatSession, prompt: string, logger: FastifyLoggerInstance, chunkCallback?: StreamChunkCallback) {
    this.session = session
    this.chunkCallback = chunkCallback
    this.abortController = new AbortController()

    session.prompt(prompt, {
      onToken: this.onToken,
      signal: this.abortController.signal
    }).then(() => {
      this.finished = true
      // Don't close the stream if we still have chunks to send
      if (this.backloggedChunks.getSize() === 0 && this.controller !== undefined) {
        this.controller.close()
      }
    }).catch((err: any) => {
      this.finished = true
      logger.info({ err })
      if (!this.abortController.signal.aborted && this.controller !== undefined) {
        try {
          this.controller.close()
        } catch (err) {
          logger.info({ err })
        }
      }
    })
  }

  cancel (): void {
    this.abortController.abort()
  }

  onToken: LLamaChatPromptOptions['onToken'] = async (chunk) => {
    if (this.controller === undefined) {
      // Stream hasn't started yet, added it to the backlog queue
      this.backloggedChunks.push(chunk)
      return
    }

    try {
      await this.clearBacklog()
      await this.enqueueChunk(chunk)
      // Ignore all errors, we can't do anything about them
      // TODO: Log these errors
    } catch (err) {
      console.error(err)
    }
  }

  private async enqueueChunk (chunk: number[]): Promise<void> {
    if (this.controller === undefined) {
      throw new Error('tried enqueueing chunk before stream started')
    }

    let response = this.session.context.decode(chunk)
    if (this.chunkCallback !== undefined) {
      response = await this.chunkCallback(response)
    }

    if (response === '') {
      response = '\n' // It seems empty chunks are newlines
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
  logger: FastifyLoggerInstance
}

export class Llama2Provider implements AiProvider {
  context: LlamaContext
  logger: FastifyLoggerInstance

  constructor ({ modelPath, logger }: Llama2ProviderCtorOptions) {
    const model = new LlamaModel({ modelPath })
    this.context = new LlamaContext({ model })
    this.logger = logger
  }

  async ask (prompt: string, chatHistory?: ChatHistory): Promise<string> {
    const session = new LlamaChatSession({
      context: this.context,
      conversationHistory: chatHistory
    })
    const response = await session.prompt(prompt)

    return response
  }

  async askStream (prompt: string, chunkCallback?: StreamChunkCallback, chatHistory?: ChatHistory): Promise<ReadableStream> {
    const session = new LlamaChatSession({
      context: this.context,
      conversationHistory: chatHistory
    })

    return new ReadableStream(new Llama2ByteSource(session, prompt, this.logger, chunkCallback))
  }
}
