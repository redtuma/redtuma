import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
} from '@opentelemetry/sdk-trace-base'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { Agent } from '@redtuma/core'
import { setTracerProvider, getTracer, withSpan, Telemetry, instrumentAgent } from '../src/index'

let exporter: InMemorySpanExporter
let provider: BasicTracerProvider

beforeEach(() => {
  exporter = new InMemorySpanExporter()
  provider = new BasicTracerProvider()
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
  setTracerProvider(provider)
})

afterEach(async () => {
  await provider.shutdown()
  // Reset the global API so each test registers a fresh provider.
  trace.disable()
})

function findSpan(name: string): ReadableSpan | undefined {
  return exporter.getFinishedSpans().find((s) => s.name === name)
}

// Minimal AI SDK v1 language model. We avoid importing `ai/test` because `ai`
// is not a dependency of this package (it resolves only transitively via
// @redtuma/core's own node_modules at runtime).
function mockModel(text: string) {
  return {
    specificationVersion: 'v1',
    provider: 'mock',
    modelId: 'mock-model',
    defaultObjectGenerationMode: undefined,
    doGenerate: async () => ({
      text,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }
}

describe('getTracer', () => {
  it('returns a tracer from the registered provider', () => {
    expect(getTracer()).toBeDefined()
  })
})

describe('withSpan', () => {
  it('records a span with the given name + attributes and OK status on success', async () => {
    const result = await withSpan('work', () => 42, {
      attributes: { foo: 'bar', n: 3, flag: true },
    })
    expect(result).toBe(42)

    const span = findSpan('work')
    expect(span).toBeDefined()
    expect(span!.attributes).toMatchObject({ foo: 'bar', n: 3, flag: true })
    expect(span!.status.code).toBe(SpanStatusCode.OK)
  })

  it('records the exception + ERROR status and rethrows when fn throws', async () => {
    const boom = new Error('kaboom')
    await expect(
      withSpan('failing', () => {
        throw boom
      }),
    ).rejects.toBe(boom)

    const span = findSpan('failing')
    expect(span).toBeDefined()
    expect(span!.status.code).toBe(SpanStatusCode.ERROR)
    expect(span!.status.message).toBe('kaboom')
    expect(span!.events.some((e) => e.name === 'exception')).toBe(true)
  })

  it('awaits async functions and ends the span', async () => {
    const result = await withSpan('async-work', async () => {
      await Promise.resolve()
      return 'done'
    })
    expect(result).toBe('done')
    expect(findSpan('async-work')).toBeDefined()
  })
})

describe('Telemetry', () => {
  it('traces a named span via trace()', async () => {
    const telemetry = new Telemetry()
    const result = await telemetry.trace('telemetry.op', () => 'ok', { phase: 'test' })
    expect(result).toBe('ok')

    const span = findSpan('telemetry.op')
    expect(span).toBeDefined()
    expect(span!.attributes).toMatchObject({ phase: 'test' })
  })
})

describe('instrumentAgent', () => {
  it('wraps generate in an agent.generate span with the agent.id attribute', async () => {
    const agent = new Agent({
      id: 'assistant',
      instructions: 'You are helpful.',
      model: mockModel('Hello from redtuma') as never,
    })
    const wrapped = instrumentAgent(agent)

    const res = await wrapped.generate('Hi')
    expect(res.text).toBe('Hello from redtuma')

    const span = findSpan('agent.generate')
    expect(span).toBeDefined()
    expect(span!.attributes['agent.id']).toBe('assistant')
    expect(span!.status.code).toBe(SpanStatusCode.OK)
  })

  it('delegates non-instrumented members to the real agent', () => {
    const agent = new Agent({
      id: 'a1',
      instructions: 'x',
      model: mockModel('y') as never,
    })
    const wrapped = instrumentAgent(agent)
    expect(wrapped.id).toBe('a1')
    expect(wrapped.name).toBe('a1')
  })
})
