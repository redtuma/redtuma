import { MDocument, type ChunkOptions, type Metadata } from './document'
import type { Embedder } from './embedder'
import type { VectorStore } from './vector-store'

/** Key under which a chunk's raw text is stored in vector metadata. */
const TEXT_KEY = '__text'

export interface RagConfig {
  embedder: Embedder
  vector: VectorStore
  /** Default chunking applied by {@link RagPipeline.index} unless overridden. */
  chunkOptions?: ChunkOptions
}

export interface IndexOptions extends ChunkOptions {
  /** Prefix for generated chunk ids; defaults to `doc`. */
  idPrefix?: string
}

export interface RetrievedChunk {
  text: string
  score: number
  metadata?: Metadata
}

export interface QueryOptions {
  topK?: number
  filter?: Metadata
}

const DEFAULT_TOP_K = 5

/** Chunk → embed → upsert on `index`, embed → query on `query`. */
export class RagPipeline {
  private readonly embedder: Embedder
  private readonly vector: VectorStore
  private readonly chunkOptions: ChunkOptions
  private counter = 0

  constructor(config: RagConfig) {
    this.embedder = config.embedder
    this.vector = config.vector
    this.chunkOptions = config.chunkOptions ?? {}
  }

  async index(documents: MDocument[] | string[], opts: IndexOptions = {}): Promise<void> {
    const { idPrefix = 'doc', ...chunkOpts } = opts
    const merged: ChunkOptions = { ...this.chunkOptions, ...chunkOpts }

    const docs = documents.map((d) => (typeof d === 'string' ? MDocument.fromText(d) : d))
    const chunks = docs.flatMap((doc) => doc.chunk(merged))
    if (chunks.length === 0) return

    const vectors = await this.embedder.embed(chunks.map((c) => c.text))
    const ids = chunks.map(() => `${idPrefix}-${this.counter++}`)
    const metadata: Metadata[] = chunks.map((c) => ({ ...c.metadata, [TEXT_KEY]: c.text }))

    await this.vector.upsert({ ids, vectors, metadata })
  }

  async query(text: string, opts: QueryOptions = {}): Promise<{ chunks: RetrievedChunk[] }> {
    const topK = opts.topK ?? DEFAULT_TOP_K
    const [queryVector] = await this.embedder.embed([text])
    if (!queryVector) return { chunks: [] }

    const results = await this.vector.query({ queryVector, topK, filter: opts.filter })
    const chunks = results.map((r) => {
      const { [TEXT_KEY]: rawText, ...rest } = r.metadata ?? {}
      return {
        text: typeof rawText === 'string' ? rawText : '',
        score: r.score,
        metadata: rest,
      }
    })
    return { chunks }
  }
}

/** Create a {@link RagPipeline} from an embedder and vector store. */
export function createRag(config: RagConfig): RagPipeline {
  return new RagPipeline(config)
}
