import { Code, H2 } from '@/components/Code'

export const metadata = { title: 'Docs — Chituma' }

export default function DocsIndex() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-4xl font-bold text-white">Introduction</h1>
      <p className="mt-4 text-lg leading-relaxed text-zinc-400">
        Chituma is the modern TypeScript framework for AI-powered applications and agents. It
        provides the high-level primitives you need in production — agents, tools, workflows,
        memory, RAG, observability and MCP — on top of the Vercel AI SDK.
      </p>

      <H2 id="agents">Agents</H2>
      <p className="text-zinc-400">
        An agent combines a model, instructions and tools. Call <code>generate</code> for a
        complete response or <code>stream</code> to stream tokens.
      </p>
      <Code>{`import { Agent } from '@chituma/core/agent'

const agent = new Agent({
  id: 'assistant',
  instructions: 'You are concise and helpful.',
  model: 'anthropic/claude-opus-4-8',
})

const { text } = await agent.generate('Hello!')`}</Code>

      <H2 id="tools">Tools</H2>
      <p className="text-zinc-400">Tools are typed with Zod and called by the agent's loop.</p>
      <Code>{`import { createTool } from '@chituma/core/tools'
import { z } from 'zod'

export const getWeather = createTool({
  id: 'get-weather',
  description: 'Get weather for a city',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ context }) => ({ tempC: 21, city: context.city }),
})`}</Code>

      <H2 id="workflows">Workflows</H2>
      <p className="text-zinc-400">
        Compose deterministic, multi-step pipelines with branching, parallelism, loops and
        suspend/resume.
      </p>
      <Code>{`import { createWorkflow, createStep } from '@chituma/core/workflows'

const wf = createWorkflow({ id: 'pipeline' })
  .then(stepA)
  .parallel([stepB, stepC])
  .commit()

const result = await wf.createRun().start({ inputData: {} })`}</Code>

      <H2 id="memory">Memory</H2>
      <p className="text-zinc-400">
        Attach memory for persistent threads, semantic recall and observational summaries.
      </p>
      <Code>{`import { Memory } from '@chituma/memory'
import { LibSQLStore } from '@chituma/store-libsql'

const memory = new Memory({
  storage: new LibSQLStore({ url: 'file:./chituma.db' }),
  options: { lastMessages: 20, semanticRecall: { topK: 5 } },
})`}</Code>
    </article>
  )
}
