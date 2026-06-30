import { describe, it, expect } from 'vitest'
import { Agent } from '@redtuma/core'
import { z } from 'zod'
import { textModel, objectModel, streamingModel } from '../src/mock-model'

describe('Agent.generate', () => {
  it('returns the documented GenerateResult shape', async () => {
    const agent = new Agent({ id: 'a', instructions: 'be helpful', model: textModel('hi there') })
    const res = await agent.generate('hello')

    expect(res.text).toBe('hi there')
    expect(Array.isArray(res.toolCalls)).toBe(true)
    expect(Array.isArray(res.toolResults)).toBe(true)
    expect(Array.isArray(res.steps)).toBe(true)
    expect(res.usage).toEqual({
      promptTokens: expect.any(Number),
      completionTokens: expect.any(Number),
      totalTokens: expect.any(Number),
    })
    expect(res.usage.totalTokens).toBe(res.usage.promptTokens + res.usage.completionTokens)
    expect(typeof res.finishReason).toBe('string')
    expect('response' in res).toBe(true)
  })

  it('resolves dynamic instructions from runtime context', async () => {
    const agent = new Agent({
      id: 'dyn',
      instructions: ({ runtimeContext }) => `Hello ${runtimeContext.get('name') ?? 'world'}`,
      model: textModel('ok'),
    })
    const res = await agent.generate('hi')
    expect(res.text).toBe('ok')
  })

  it('returns a validated object when `output` is set', async () => {
    const schema = z.object({ city: z.string(), temp: z.number() })
    const agent = new Agent({ id: 'struct', instructions: 'x', model: objectModel({ city: 'Taipei', temp: 30 }) })
    const res = await agent.generate('weather?', { output: schema })
    expect(res.object).toEqual({ city: 'Taipei', temp: 30 })
    expect(() => schema.parse(res.object)).not.toThrow()
  })

  it('defaults name to id', () => {
    expect(new Agent({ id: 'x', instructions: 'i', model: textModel('y') }).name).toBe('x')
    expect(new Agent({ id: 'x', name: 'Bot', instructions: 'i', model: textModel('y') }).name).toBe('Bot')
  })
})

describe('Agent memory integration', () => {
  it('recalls context and persists the user + assistant turn', async () => {
    const saved: { role: string }[] = []
    const agent = new Agent({
      id: 'mem',
      instructions: 'base',
      model: textModel('answer'),
      memory: {
        rememberMessages: async () => ({
          messages: [{ role: 'user', content: 'earlier' }],
          systemContext: 'recalled context',
        }),
        saveMessages: async ({ messages }) => {
          saved.push(...messages)
        },
      },
    })
    const res = await agent.generate('now', { memory: { thread: 't1', resource: 'r1' } })
    expect(res.text).toBe('answer')
    expect(saved.map((m) => m.role)).toEqual(['user', 'assistant'])
  })

  it('does not touch memory when no scope is provided', async () => {
    let called = false
    const agent = new Agent({
      id: 'mem2',
      instructions: 'base',
      model: textModel('answer'),
      memory: {
        rememberMessages: async () => {
          called = true
          return { messages: [] }
        },
        saveMessages: async () => {},
      },
    })
    await agent.generate('hi')
    expect(called).toBe(false)
  })
})

describe('Agent.stream', () => {
  it('exposes an async textStream that yields the full text', async () => {
    const agent = new Agent({ id: 's', instructions: 'x', model: streamingModel(['Hel', 'lo']) })
    const result = await agent.stream('hi')
    let acc = ''
    for await (const delta of result.textStream) acc += delta
    expect(acc).toBe('Hello')
  })
})
