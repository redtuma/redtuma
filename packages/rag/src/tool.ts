import { createTool } from '@chituma/core'
import { z } from 'zod'
import type { RagPipeline } from './pipeline'

export interface RagToolOptions {
  /** Tool id presented to the model; defaults to `rag-search`. */
  id?: string
  description?: string
  /** Default number of chunks to retrieve. */
  topK?: number
}

/**
 * Wrap a {@link RagPipeline} as a Chituma tool so an Agent can retrieve context.
 * The tool returns the matching chunks with their similarity scores.
 */
export function createRagTool(rag: RagPipeline, opts: RagToolOptions = {}) {
  return createTool({
    id: opts.id ?? 'rag-search',
    description:
      opts.description ?? 'Search the knowledge base and return the most relevant text chunks.',
    inputSchema: z.object({
      query: z.string().describe('Natural-language query to search the knowledge base for.'),
      topK: z.number().int().positive().optional().describe('How many chunks to return.'),
    }),
    outputSchema: z.object({
      chunks: z.array(
        z.object({
          text: z.string(),
          score: z.number(),
          metadata: z.record(z.unknown()).optional(),
        }),
      ),
    }),
    execute: async ({ context }) => {
      const { chunks } = await rag.query(context.query, { topK: context.topK ?? opts.topK })
      return { chunks }
    },
  })
}
