import type { Embedder } from '../src/index'

/**
 * Deterministic, offline embedder for tests. Maps text to a normalized 26-dim
 * letter-frequency vector, so texts that share vocabulary land near each other
 * under cosine similarity.
 */
export const fakeEmbedder: Embedder = {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(toVector)
  },
}

function toVector(text: string): number[] {
  const counts = new Array<number>(26).fill(0)
  for (const ch of text.toLowerCase()) {
    const code = ch.charCodeAt(0) - 97
    if (code >= 0 && code < 26) counts[code]!++
  }
  const norm = Math.sqrt(counts.reduce((sum, c) => sum + c * c, 0))
  if (norm === 0) return counts
  return counts.map((c) => c / norm)
}
