import { ReadableStream } from 'node:stream/web'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { errorResponseBuilderContext } from '@fastify/rate-limit'
import { expectAssignable } from 'tsd'
import '../../index.js'

expectAssignable<FastifyInstance['ai']['warp']>(async (_: FastifyRequest, _2: string) => '')

expectAssignable<FastifyInstance['ai']['warpStream']>(async (_: FastifyRequest, _2: string) => new ReadableStream())

expectAssignable<FastifyInstance['ai']['preResponseCallback']>((_: FastifyRequest, _2: string) => '')
expectAssignable<FastifyInstance['ai']['preResponseCallback']>(async (_: FastifyRequest, _2: string) => '')

expectAssignable<FastifyInstance['ai']['preResponseChunkCallback']>((_: FastifyRequest, _2: string) => '')
expectAssignable<FastifyInstance['ai']['preResponseChunkCallback']>(async (_: FastifyRequest, _2: string) => '')

expectAssignable<FastifyInstance['ai']['rateLimiting']['max']>((_: FastifyRequest, _2: string) => 0)
expectAssignable<FastifyInstance['ai']['rateLimiting']['max']>(async (_: FastifyRequest, _2: string) => 0)

expectAssignable<FastifyInstance['ai']['rateLimiting']['allowList']>((_: FastifyRequest, _2: string) => true)
expectAssignable<FastifyInstance['ai']['rateLimiting']['allowList']>(async (_: FastifyRequest, _2: string) => true)

expectAssignable<FastifyInstance['ai']['rateLimiting']['onBanReach']>((_: FastifyRequest, _2: string) => {})
expectAssignable<FastifyInstance['ai']['rateLimiting']['onBanReach']>(async (_: FastifyRequest, _2: string) => {})

expectAssignable<FastifyInstance['ai']['rateLimiting']['keyGenerator']>((_: FastifyRequest) => '')
expectAssignable<FastifyInstance['ai']['rateLimiting']['keyGenerator']>((_: FastifyRequest) => 0)
expectAssignable<FastifyInstance['ai']['rateLimiting']['keyGenerator']>(async (_: FastifyRequest) => '')
expectAssignable<FastifyInstance['ai']['rateLimiting']['keyGenerator']>(async (_: FastifyRequest) => 0)

expectAssignable<FastifyInstance['ai']['rateLimiting']['errorResponseBuilder']>((_: FastifyRequest, _2: errorResponseBuilderContext) => { return {} })

expectAssignable<FastifyInstance['ai']['rateLimiting']['onExceeding']>((_: FastifyRequest, _2: string) => {})
expectAssignable<FastifyInstance['ai']['rateLimiting']['onExceeding']>(async (_: FastifyRequest, _2: string) => {})

expectAssignable<FastifyInstance['ai']['rateLimiting']['onExceeded']>((_: FastifyRequest, _2: string) => {})
expectAssignable<FastifyInstance['ai']['rateLimiting']['onExceeded']>(async (_: FastifyRequest, _2: string) => {})
