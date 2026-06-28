import { describe, expect, it } from 'vitest'
import { createRag, createRagTool, InMemoryVectorStore, MDocument } from '../src/index'
import { RuntimeContext } from '@chituma/core'
import { fakeEmbedder } from './fake-embedder'

const DOCS = [
  'Cats are small domesticated felines that purr and chase mice.',
  'The TypeScript compiler checks types and emits JavaScript modules.',
  'Mountains form through tectonic plate collisions over millions of years.',
]

describe('createRag', () => {
  it('indexes documents and retrieves the most relevant chunk', async () => {
    const rag = createRag({ embedder: fakeEmbedder, vector: new InMemoryVectorStore() })
    await rag.index(DOCS, { strategy: 'character', size: 200, overlap: 0 })

    const { chunks } = await rag.query('What do typescript compilers emit, modules?', { topK: 1 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.text).toContain('TypeScript compiler')
    expect(chunks[0]!.score).toBeGreaterThan(0)
  })

  it('accepts MDocument instances and preserves chunk metadata', async () => {
    const rag = createRag({ embedder: fakeEmbedder, vector: new InMemoryVectorStore() })
    await rag.index([MDocument.fromText(DOCS[0]!, { topic: 'animals' })], {
      strategy: 'character',
      size: 200,
    })
    const { chunks } = await rag.query('purring felines chasing mice', { topK: 1 })
    expect(chunks[0]!.metadata?.topic).toBe('animals')
    // the internal text key must not leak into returned metadata
    expect(chunks[0]!.metadata).not.toHaveProperty('__text')
  })
})

describe('createRagTool', () => {
  it('produces a valid rag-search ToolAction whose execute returns chunks', async () => {
    const rag = createRag({ embedder: fakeEmbedder, vector: new InMemoryVectorStore() })
    await rag.index(DOCS, { strategy: 'character', size: 200, overlap: 0 })

    const tool = createRagTool(rag)
    expect(tool.id).toBe('rag-search')
    expect(typeof tool.execute).toBe('function')

    const result = (await tool.execute({
      context: { query: 'tectonic mountains forming over years' },
      runtimeContext: new RuntimeContext(),
    })) as { chunks: { text: string }[] }

    expect(result.chunks.length).toBeGreaterThan(0)
    expect(result.chunks[0]!.text).toContain('Mountains')
  })

  it('honours the topK input', async () => {
    const rag = createRag({ embedder: fakeEmbedder, vector: new InMemoryVectorStore() })
    await rag.index(DOCS, { strategy: 'character', size: 200, overlap: 0 })
    const tool = createRagTool(rag)

    const result = (await tool.execute({
      context: { query: 'anything', topK: 2 },
      runtimeContext: new RuntimeContext(),
    })) as { chunks: unknown[] }
    expect(result.chunks).toHaveLength(2)
  })
})
