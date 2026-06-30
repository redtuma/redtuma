import Link from 'next/link'
import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Introduction — Redtuma' }

export default function DocsIndex() {
  return (
    <DocArticle>
      <H1>Introduction</H1>
      <Lead>
        Redtuma is the modern TypeScript framework for AI-powered applications and agents. It gives
        you the high-level primitives you need in production — agents, tools, workflows, memory, RAG,
        observability and MCP — on top of the Vercel AI SDK.
      </Lead>

      <P>
        You own the agent loop, the workflow engine and memory; Redtuma delegates only raw model and
        tool calls to the AI SDK. Everything is plain TypeScript, ESM, and runs on Node, Bun, and the
        edge.
      </P>

      <H2 id="why">What makes it different</H2>
      <P>Two bets set Redtuma apart from a typical agent toolkit:</P>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        <li className="rounded-xl border border-ink-700 bg-ink-900/50 p-5">
          <p className="font-semibold text-white">Edge-native memory</p>
          <p className="mt-2 text-sm text-zinc-400">
            Agent memory and workflow state live in a Cloudflare Durable Object — one per
            conversation, strongly consistent, no external database. Deploy to Workers with one
            command.
          </p>
        </li>
        <li className="rounded-xl border border-ink-700 bg-ink-900/50 p-5">
          <p className="font-semibold text-white">Cost-aware routing</p>
          <p className="mt-2 text-sm text-zinc-400">
            <C>tieredModel</C> tries a cheap model first and escalates to a stronger one only when the
            result isn&apos;t good enough — you pay for the big model only when you need it.
          </p>
        </li>
      </ul>

      <H2 id="primitives">The primitives</H2>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-zinc-400">
        <li>
          <Link href="/docs/agents" className="text-ember-300 hover:underline">Agents</Link> — a model
          + instructions + tools, with <C>generate</C> and <C>stream</C>.
        </li>
        <li>
          <Link href="/docs/tools" className="text-ember-300 hover:underline">Tools</Link> — typed with
          Zod, called by the agent loop.
        </li>
        <li>
          <Link href="/docs/workflows" className="text-ember-300 hover:underline">Workflows</Link> —
          deterministic multi-step pipelines with branching, parallelism, loops and suspend/resume.
        </li>
        <li>
          <Link href="/docs/memory" className="text-ember-300 hover:underline">Memory</Link> —
          persistent threads, semantic recall and working memory.
        </li>
        <li>
          <Link href="/docs/model-routing" className="text-ember-300 hover:underline">Model routing</Link>,{' '}
          <Link href="/docs/rag" className="text-ember-300 hover:underline">RAG</Link>,{' '}
          <Link href="/docs/mcp" className="text-ember-300 hover:underline">MCP</Link>, and{' '}
          <Link href="/docs/observability" className="text-ember-300 hover:underline">observability</Link>.
        </li>
      </ul>

      <H2 id="hello">Hello, agent</H2>
      <Code title="agent.ts">{`import { Agent } from '@redtuma/core/agent'

const agent = new Agent({
  id: 'assistant',
  instructions: 'You are concise and helpful.',
  model: 'anthropic/claude-opus-4-8',
})

const { text } = await agent.generate('Hello!')`}</Code>

      <Callout title="Next">
        Head to the <Link href="/docs/quickstart" className="text-ember-300 hover:underline">Quickstart</Link>{' '}
        to scaffold a project, or <Link href="/docs/installation" className="text-ember-300 hover:underline">install</Link>{' '}
        into an existing app.
      </Callout>

      <PrevNext current="/docs" />
    </DocArticle>
  )
}
