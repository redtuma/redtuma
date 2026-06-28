/** Arbitrary metadata attached to a document or chunk. */
export type Metadata = Record<string, unknown>

/** A single piece of a document produced by {@link MDocument.chunk}. */
export interface Chunk {
  text: string
  metadata: Metadata
}

/** Supported chunking strategies. */
export type ChunkStrategy = 'recursive' | 'character' | 'token'

export interface ChunkOptions {
  strategy?: ChunkStrategy
  /** Target chunk size. Characters for `character`/`recursive`, ~tokens for `token`. */
  size?: number
  /** Amount of trailing context shared between adjacent chunks (same unit as `size`). */
  overlap?: number
}

const DEFAULT_SIZE = 512
const DEFAULT_OVERLAP = 50
/** Rough heuristic: one token is approximately four characters of English text. */
const CHARS_PER_TOKEN = 4

/** Separators tried, in priority order, by the recursive splitter. */
const RECURSIVE_SEPARATORS = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', '']

/**
 * A document loaded into Chituma for retrieval. Construct from raw text and split
 * into {@link Chunk}s ready for embedding.
 */
export class MDocument {
  readonly text: string
  readonly metadata: Metadata

  constructor(text: string, metadata: Metadata = {}) {
    this.text = text
    this.metadata = metadata
  }

  static fromText(text: string, metadata: Metadata = {}): MDocument {
    return new MDocument(text, metadata)
  }

  /**
   * Construct from Markdown. The raw Markdown is preserved as the document text;
   * the recursive chunker naturally respects its paragraph/heading boundaries.
   */
  static fromMarkdown(md: string, metadata: Metadata = {}): MDocument {
    return new MDocument(md, { ...metadata, format: 'markdown' })
  }

  chunk(opts: ChunkOptions = {}): Chunk[] {
    const strategy = opts.strategy ?? 'recursive'
    const size = opts.size ?? DEFAULT_SIZE
    const overlap = opts.overlap ?? DEFAULT_OVERLAP
    if (size <= 0) throw new Error('chunk size must be > 0')
    if (overlap < 0 || overlap >= size) {
      throw new Error('chunk overlap must be >= 0 and < size')
    }

    let pieces: string[]
    switch (strategy) {
      case 'character':
        pieces = chunkCharacter(this.text, size, overlap)
        break
      case 'token':
        pieces = chunkCharacter(this.text, size * CHARS_PER_TOKEN, overlap * CHARS_PER_TOKEN)
        break
      case 'recursive':
        pieces = chunkRecursive(this.text, size, overlap)
        break
      default:
        throw new Error(`unknown chunk strategy: ${String(strategy)}`)
    }

    return pieces.map((text, index) => ({
      text,
      metadata: { ...this.metadata, chunkIndex: index },
    }))
  }
}

/** Fixed-width sliding window over the raw characters. */
function chunkCharacter(text: string, size: number, overlap: number): string[] {
  if (text.length === 0) return []
  if (text.length <= size) return [text]
  const step = Math.max(1, size - overlap)
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += step) {
    chunks.push(text.slice(i, i + size))
    if (i + size >= text.length) break
  }
  return chunks
}

/**
 * Split on the highest-priority separator present, recursing into any piece that
 * is still too large, then greedily pack pieces up to `size` with `overlap`.
 * Faithful to the LangChain recursive-character algorithm.
 */
function chunkRecursive(
  text: string,
  size: number,
  overlap: number,
  separators: string[] = RECURSIVE_SEPARATORS,
): string[] {
  if (text.length === 0) return []

  let separator = separators[separators.length - 1] ?? ''
  let remaining: string[] = []
  for (let i = 0; i < separators.length; i++) {
    const sep = separators[i]!
    if (sep === '') {
      separator = sep
      break
    }
    if (text.includes(sep)) {
      separator = sep
      remaining = separators.slice(i + 1)
      break
    }
  }

  const splits = separator === '' ? Array.from(text) : text.split(separator)
  const finalChunks: string[] = []
  let good: string[] = []

  const flush = () => {
    if (good.length) {
      finalChunks.push(...mergeSplits(good, separator, size, overlap))
      good = []
    }
  }

  for (const piece of splits) {
    if (piece.length < size) {
      good.push(piece)
    } else {
      flush()
      if (remaining.length === 0) {
        finalChunks.push(piece)
      } else {
        finalChunks.push(...chunkRecursive(piece, size, overlap, remaining))
      }
    }
  }
  flush()

  return finalChunks.filter((c) => c.length > 0)
}

/** Greedily merge small splits into chunks bounded by `size`, sharing `overlap`. */
function mergeSplits(splits: string[], separator: string, size: number, overlap: number): string[] {
  const sepLen = separator.length
  const docs: string[] = []
  const current: string[] = []
  let total = 0

  const joinedLen = () => total + Math.max(0, current.length - 1) * sepLen

  for (const piece of splits) {
    if (joinedLen() + (current.length ? sepLen : 0) + piece.length > size && current.length > 0) {
      docs.push(current.join(separator))
      // Drop from the front until we are back under the overlap budget and can fit the next piece.
      while (
        current.length > 0 &&
        (total > overlap || joinedLen() + (current.length ? sepLen : 0) + piece.length > size)
      ) {
        total -= current[0]!.length
        current.shift()
      }
    }
    current.push(piece)
    total += piece.length
  }

  if (current.length > 0) docs.push(current.join(separator))
  return docs.map((d) => d.trim()).filter((d) => d.length > 0)
}
