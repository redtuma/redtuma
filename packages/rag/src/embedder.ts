import { embedMany, type EmbeddingModel } from 'ai'

/** Produces a dense vector for each input text. */
export interface Embedder {
  embed(texts: string[]): Promise<number[][]>
}

/**
 * Wrap a Vercel AI SDK embedding model as an {@link Embedder}. Uses `embedMany`
 * so a batch of texts is embedded in a single request.
 */
export function aiEmbedder(model: EmbeddingModel<string>): Embedder {
  return {
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return []
      const { embeddings } = await embedMany({ model, values: texts })
      return embeddings
    },
  }
}
