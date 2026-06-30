import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Memory — Redtuma' }

export default function Memory() {
  return (
    <DocArticle>
      <H1>Memory</H1>
      <Lead>
        Memory gives an agent persistent conversation threads, semantic recall of past messages, and
        working memory — all behind a pluggable storage layer.
      </Lead>

      <H2 id="setup">Setting up memory</H2>
      <Code title="memory.ts">{`import { Memory } from '@redtuma/memory'
import { LibSQLStore } from '@redtuma/store-libsql'

const memory = new Memory({
  storage: new LibSQLStore({ url: 'file:./redtuma.db' }),
  options: {
    lastMessages: 20,                  // recent history window
    semanticRecall: { topK: 5 },       // retrieve relevant past messages
    workingMemory: { enabled: true },  // persistent per-user notes
  },
})

const agent = new Agent({
  id: 'assistant',
  instructions: '...',
  model: 'anthropic/claude-opus-4-8',
  memory,
})`}</Code>

      <H2 id="threads">Threads & resources</H2>
      <P>
        Scope a conversation with a <C>thread</C> (one conversation) and a <C>resource</C> (the user
        or entity it belongs to). Pass them per call:
      </P>
      <Code>{`await agent.generate('Remember my name is Sam.', {
  memory: { thread: 'thread-1', resource: 'user-42' },
})

// later, in the same thread, the agent recalls context
await agent.generate('What is my name?', {
  memory: { thread: 'thread-1', resource: 'user-42' },
})`}</Code>

      <H2 id="stores">Stores</H2>
      <P>All stores implement the same <C>Store</C> interface, so you can swap them freely:</P>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-zinc-400">
        <li><C>InMemoryStore</C> — built into <C>@redtuma/core</C>, great for tests and quick starts</li>
        <li><C>@redtuma/store-libsql</C> — local SQLite file or Turso</li>
        <li><C>@redtuma/store-pg</C> — Postgres</li>
        <li>
          <C>@redtuma/store-do</C> — Cloudflare Durable Object (see{' '}
          <a href="/docs/cloudflare" className="text-ember-300 hover:underline">Cloudflare</a>)
        </li>
      </ul>

      <Callout title="Same contract everywhere">
        Every store passes the same behavioral conformance suite, so memory behaves identically
        whether it&apos;s SQLite on your laptop or a Durable Object at the edge.
      </Callout>

      <PrevNext current="/docs/memory" />
    </DocArticle>
  )
}
