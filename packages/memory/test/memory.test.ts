import { describe, expect, it } from 'vitest'
import { Agent, InMemoryStore } from '@redtuma/core'
import type { CoreMessage } from '@redtuma/core'
import { MockLanguageModelV1 } from 'ai/test'
import { Memory, type Embedder, type VectorStore } from '../src/index'

/** Deterministic bag-of-words embedder: shared words → similar vectors. */
class FakeEmbedder implements Embedder {
  constructor(private readonly dim = 64) {}
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedOne(t))
  }
  private embedOne(text: string): number[] {
    const v = new Array<number>(this.dim).fill(0)
    for (const word of text.toLowerCase().split(/\W+/).filter(Boolean)) {
      let h = 0
      for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) >>> 0
      v[h % this.dim] += 1
    }
    return v
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    dot += av * bv
    na += av * av
    nb += bv * bv
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/** In-memory cosine-similarity vector store. */
class FakeVectorStore implements VectorStore {
  private items: { id: string; vector: number[]; metadata?: Record<string, unknown> }[] = []
  async upsert(args: {
    ids: string[]
    vectors: number[][]
    metadata?: Record<string, unknown>[]
  }): Promise<void> {
    args.ids.forEach((id, i) => {
      const entry = {
        id,
        vector: args.vectors[i] ?? [],
        ...(args.metadata?.[i] ? { metadata: args.metadata[i] } : {}),
      }
      const idx = this.items.findIndex((it) => it.id === id)
      if (idx >= 0) this.items[idx] = entry
      else this.items.push(entry)
    })
  }
  async query(args: {
    queryVector: number[]
    topK: number
  }): Promise<{ id: string; score: number; metadata?: Record<string, unknown> }[]> {
    return this.items
      .map((it) => ({ id: it.id, score: cosine(args.queryVector, it.vector), metadata: it.metadata }))
      .sort((a, b) => b.score - a.score)
      .slice(0, args.topK)
  }
}

function text(content: CoreMessage['content']): string {
  if (typeof content === 'string') return content
  return JSON.stringify(content)
}

describe('Memory basics', () => {
  it('saves user+assistant and recalls them within the window', async () => {
    const memory = new Memory()
    await memory.saveMessages({
      threadId: 't',
      resourceId: 'r',
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi there' },
      ],
    })

    const { messages } = await memory.rememberMessages({ threadId: 't', resourceId: 'r' })
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ role: 'user', content: 'hello' })
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'hi there' })
  })

  it('truncates to the lastMessages window', async () => {
    const memory = new Memory({ options: { lastMessages: 2 } })
    for (let i = 0; i < 3; i++) {
      await memory.saveMessages({
        threadId: 't',
        resourceId: 'r',
        messages: [
          { role: 'user', content: `q${i}` },
          { role: 'assistant', content: `a${i}` },
        ],
      })
    }

    const { messages } = await memory.rememberMessages({ threadId: 't', resourceId: 'r' })
    expect(messages).toHaveLength(2)
    expect(messages.map((m) => text(m.content))).toEqual(['q2', 'a2'])
  })
})

describe('semantic recall', () => {
  it('surfaces a similar prior message outside the recent window', async () => {
    const memory = new Memory({
      embedder: new FakeEmbedder(),
      vector: new FakeVectorStore(),
      options: { lastMessages: 2, semanticRecall: { topK: 3 } },
    })

    await memory.saveMessages({
      threadId: 't',
      resourceId: 'r',
      messages: [
        { role: 'user', content: 'my favorite color is blue' },
        { role: 'assistant', content: 'noted, that is a nice shade' },
      ],
    })
    await memory.saveMessages({
      threadId: 't',
      resourceId: 'r',
      messages: [
        { role: 'user', content: 'lets talk about cooking pasta' },
        { role: 'assistant', content: 'pasta is delicious' },
      ],
    })
    await memory.saveMessages({
      threadId: 't',
      resourceId: 'r',
      messages: [
        { role: 'user', content: 'what is my favorite color' },
        { role: 'assistant', content: 'let me check' },
      ],
    })

    const { messages } = await memory.rememberMessages({ threadId: 't', resourceId: 'r' })
    const texts = messages.map((m) => text(m.content))
    // The recent window is the last 2 messages; semantic recall should pull in
    // the older "favorite color is blue" message.
    expect(texts.some((t) => t.includes('blue'))).toBe(true)
    expect(texts).toContain('what is my favorite color')
  })

  it('does not index or recall when semantic recall is disabled', async () => {
    const vector = new FakeVectorStore()
    const memory = new Memory({ embedder: new FakeEmbedder(), vector })
    await memory.saveMessages({
      threadId: 't',
      resourceId: 'r',
      messages: [{ role: 'user', content: 'something' }],
    })
    const hits = await vector.query({ queryVector: new Array(64).fill(1), topK: 5 })
    expect(hits).toHaveLength(0)
  })
})

describe('working memory', () => {
  it('includes working memory in systemContext', async () => {
    const memory = new Memory({ options: { workingMemory: { enabled: true } } })
    await memory.updateWorkingMemory('r', 'User name is Alice.')

    const { systemContext } = await memory.rememberMessages({ threadId: 't', resourceId: 'r' })
    expect(systemContext).toBeDefined()
    expect(systemContext).toContain('Working Memory')
    expect(systemContext).toContain('Alice')

    expect(await memory.getWorkingMemory('r')).toBe('User name is Alice.')
  })

  it('falls back to a template before working memory is set', async () => {
    const memory = new Memory({
      options: { workingMemory: { enabled: true, template: '# Profile\n- name:' } },
    })
    const { systemContext } = await memory.rememberMessages({ threadId: 't', resourceId: 'r' })
    expect(systemContext).toContain('# Profile')
  })
})

describe('observational memory', () => {
  it('compresses older turns into systemContext once over threshold', async () => {
    const memory = new Memory({
      options: { lastMessages: 2, observational: { enabled: true, threshold: 2 } },
    })
    for (let i = 0; i < 3; i++) {
      await memory.saveMessages({
        threadId: 't',
        resourceId: 'r',
        messages: [
          { role: 'user', content: `question ${i}` },
          { role: 'assistant', content: `answer ${i}` },
        ],
      })
    }

    const { systemContext } = await memory.rememberMessages({ threadId: 't', resourceId: 'r' })
    expect(systemContext).toBeDefined()
    expect(systemContext).toContain('Observations')
    expect(systemContext).toContain('question 0')
  })
})

describe('AgentMemory integration', () => {
  it('works as Agent memory and persists the turn', async () => {
    const model = new MockLanguageModelV1({
      doGenerate: async () => ({
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: 'stop',
        usage: { promptTokens: 1, completionTokens: 1 },
        text: 'hello back',
      }),
    })

    const storage = new InMemoryStore()
    const memory = new Memory({ storage })
    const agent = new Agent({ id: 'a', instructions: 'be nice', model, memory })

    const res = await agent.generate('hi', { memory: { thread: 't', resource: 'r' } })
    expect(res.text).toBe('hello back')

    const saved = await storage.getMessages({ threadId: 't' })
    expect(saved).toHaveLength(2)
    expect(saved[0]).toMatchObject({ role: 'user', content: 'hi' })
    expect(saved[1]).toMatchObject({ role: 'assistant', content: 'hello back' })

    const { messages } = await memory.rememberMessages({ threadId: 't', resourceId: 'r' })
    expect(messages).toHaveLength(2)
  })
})
