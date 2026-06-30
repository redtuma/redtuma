import { DocArticle, H1, H2, Lead, P, C, Code, PrevNext } from '@/components/doc'

export const metadata = { title: 'RAG — Redtuma' }

export default function Rag() {
  return (
    <DocArticle>
      <H1>RAG</H1>
      <Lead>
        Retrieval-augmented generation: chunk documents, embed them, store the vectors, and retrieve
        the most relevant context for a query.
      </Lead>

      <H2 id="chunk">Chunk & embed</H2>
      <Code title="rag.ts">{`import { MDocument } from '@redtuma/rag'

const doc = MDocument.fromText(longText)
const chunks = doc.chunk({ strategy: 'recursive', size: 512, overlap: 64 })

const embedded = await embed(chunks, embedder)`}</Code>

      <H2 id="store">Store & query</H2>
      <P>
        Vector stores share a common <C>VectorStore</C> interface (<C>upsert</C> / <C>query</C> /{' '}
        <C>delete</C>). Query by an embedded vector to get the top matches.
      </P>
      <Code>{`await vector.upsert(embedded)

const matches = await vector.query({ queryVector, topK: 5 })`}</Code>

      <H2 id="tool">As an agent tool</H2>
      <P>Expose retrieval as a tool so the agent can pull context on demand.</P>
      <Code>{`const agent = new Agent({
  id: 'researcher',
  instructions: 'Answer using retrieved context only.',
  model: 'anthropic/claude-opus-4-8',
  tools: { search: ragTool },
})`}</Code>

      <PrevNext current="/docs/rag" />
    </DocArticle>
  )
}
