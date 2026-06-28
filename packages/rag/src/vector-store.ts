import type { Metadata } from './document'

export interface QueryResult {
  id: string
  score: number
  metadata?: Metadata
}

export interface UpsertArgs {
  ids: string[]
  vectors: number[][]
  metadata?: Metadata[]
}

export interface QueryArgs {
  queryVector: number[]
  topK: number
  filter?: Metadata
}

/** A pluggable vector index. Store packages implement this same interface. */
export interface VectorStore {
  upsert(args: UpsertArgs): Promise<void>
  query(args: QueryArgs): Promise<QueryResult[]>
  delete?(ids: string[]): Promise<void>
}

interface Entry {
  vector: number[]
  metadata?: Metadata
}

/** A dependency-free vector store that ranks by cosine similarity. */
export class InMemoryVectorStore implements VectorStore {
  private readonly entries = new Map<string, Entry>()

  async upsert({ ids, vectors, metadata }: UpsertArgs): Promise<void> {
    if (ids.length !== vectors.length) {
      throw new Error('ids and vectors must have the same length')
    }
    for (let i = 0; i < ids.length; i++) {
      this.entries.set(ids[i]!, { vector: vectors[i]!, metadata: metadata?.[i] })
    }
  }

  async query({ queryVector, topK, filter }: QueryArgs): Promise<QueryResult[]> {
    const results: QueryResult[] = []
    for (const [id, entry] of this.entries) {
      if (filter && !matchesFilter(entry.metadata, filter)) continue
      results.push({ id, score: cosineSimilarity(queryVector, entry.vector), metadata: entry.metadata })
    }
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) this.entries.delete(id)
  }

  /** Number of vectors currently indexed. */
  get size(): number {
    return this.entries.size
  }
}

/** Shallow equality of every key present in `filter`. */
function matchesFilter(metadata: Metadata | undefined, filter: Metadata): boolean {
  if (!metadata) return false
  for (const [key, value] of Object.entries(filter)) {
    if (metadata[key] !== value) return false
  }
  return true
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < len; i++) {
    const x = a[i]!
    const y = b[i]!
    dot += x * y
    normA += x * x
    normB += y * y
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
