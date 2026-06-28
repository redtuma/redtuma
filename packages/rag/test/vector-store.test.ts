import { describe, expect, it } from 'vitest'
import { InMemoryVectorStore, cosineSimilarity } from '../src/index'

describe('cosineSimilarity', () => {
  it('is 1 for identical direction and 0 for orthogonal', () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })
})

describe('InMemoryVectorStore', () => {
  it('returns nearest neighbours by cosine, ranked', async () => {
    const store = new InMemoryVectorStore()
    await store.upsert({
      ids: ['a', 'b', 'c'],
      vectors: [
        [1, 0, 0],
        [0, 1, 0],
        [0.9, 0.1, 0],
      ],
      metadata: [{ tag: 'x' }, { tag: 'y' }, { tag: 'z' }],
    })

    const results = await store.query({ queryVector: [1, 0, 0], topK: 2 })
    expect(results.map((r) => r.id)).toEqual(['a', 'c'])
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score)
    expect(results[0]!.metadata).toEqual({ tag: 'x' })
  })

  it('applies metadata filters', async () => {
    const store = new InMemoryVectorStore()
    await store.upsert({
      ids: ['a', 'b'],
      vectors: [
        [1, 0],
        [1, 0],
      ],
      metadata: [{ lang: 'en' }, { lang: 'fr' }],
    })
    const results = await store.query({ queryVector: [1, 0], topK: 5, filter: { lang: 'fr' } })
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('b')
  })

  it('upsert overwrites and delete removes', async () => {
    const store = new InMemoryVectorStore()
    await store.upsert({ ids: ['a'], vectors: [[1, 0]] })
    await store.upsert({ ids: ['a'], vectors: [[0, 1]], metadata: [{ v: 2 }] })
    expect(store.size).toBe(1)
    const [hit] = await store.query({ queryVector: [0, 1], topK: 1 })
    expect(hit!.metadata).toEqual({ v: 2 })

    await store.delete(['a'])
    expect(store.size).toBe(0)
  })
})
