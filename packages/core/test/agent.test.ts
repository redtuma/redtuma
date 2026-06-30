import { describe, it, expect } from 'vitest'
import { MockLanguageModelV1 } from 'ai/test'
import { Agent } from '../src/agent'
import { Redtuma } from '../src/redtuma'

function mockModel(text: string) {
  return new MockLanguageModelV1({
    doGenerate: async () => ({
      text,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  })
}

describe('Agent', () => {
  it('generates text from a model', async () => {
    const agent = new Agent({
      id: 'assistant',
      instructions: 'You are helpful.',
      model: mockModel('Hello from redtuma') as never,
    })
    const res = await agent.generate('Hi')
    expect(res.text).toBe('Hello from redtuma')
    expect(res.usage.totalTokens).toBe(15)
  })

  it('resolves dynamic instructions', async () => {
    const agent = new Agent({
      id: 'dyn',
      instructions: ({ runtimeContext }) => `Hello ${runtimeContext.get('name') ?? 'world'}`,
      model: mockModel('ok') as never,
    })
    const res = await agent.generate('hi')
    expect(res.text).toBe('ok')
  })

  it('integrates memory recall and persistence', async () => {
    const saved: unknown[] = []
    const agent = new Agent({
      id: 'mem',
      instructions: 'base',
      model: mockModel('answer') as never,
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
    expect(saved).toHaveLength(2) // user + assistant
  })
})

describe('Redtuma registry', () => {
  it('registers and retrieves agents', () => {
    const agent = new Agent({ id: 'a1', instructions: 'x', model: mockModel('y') as never })
    const redtuma = new Redtuma({ agents: { a1: agent } })
    expect(redtuma.getAgent('a1')).toBe(agent)
    expect(redtuma.getAgentById('a1')).toBe(agent)
    expect(() => redtuma.getAgent('missing')).toThrow(/not registered/)
  })
})
