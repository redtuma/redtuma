'use client'

import { useState } from 'react'

interface Feature {
  key: string
  label: string
  title: string
  body: string
  code: string
}

const FEATURES: Feature[] = [
  {
    key: 'agents',
    label: 'Agents',
    title: 'Agents that reason and call tools',
    body: 'Give an agent instructions, a model, and tools. It runs a multi-step tool-calling loop and returns text or structured output.',
    code: `import { Agent } from '@chituma/core/agent'

const agent = new Agent({
  id: 'support',
  instructions: 'You are a helpful support agent.',
  model: 'anthropic/claude-opus-4-8',
  tools: { lookupOrder },
})

const { text } = await agent.generate('Where is order #4012?')`,
  },
  {
    key: 'workflows',
    label: 'Workflows',
    title: 'Deterministic multi-step workflows',
    body: 'Compose steps with a fluent graph API — sequence, branch, parallel, loops — with built-in suspend/resume for human-in-the-loop.',
    code: `import { createWorkflow, createStep } from '@chituma/core/workflows'

const wf = createWorkflow({ id: 'triage' })
  .then(classify)
  .branch([
    [({ inputData }) => inputData.urgent, escalate],
    [() => true, autoReply],
  ])
  .commit()

const run = await wf.createRun().start({ inputData: ticket })`,
  },
  {
    key: 'memory',
    label: 'Memory',
    title: 'Working, semantic & observational memory',
    body: 'Persistent threads, semantic recall over past messages, and observational memory that keeps the context window small.',
    code: `import { Memory } from '@chituma/memory'
import { LibSQLStore } from '@chituma/store-libsql'

const memory = new Memory({
  storage: new LibSQLStore({ url: 'file:./chituma.db' }),
  options: { lastMessages: 20, semanticRecall: { topK: 5 } },
})`,
  },
  {
    key: 'observability',
    label: 'Observability',
    title: 'See exactly what your agents do',
    body: 'OpenTelemetry traces across every agent and workflow step — wire it to any OTLP backend, or print spans in dev.',
    code: `import { instrumentAgent, setTracerProvider } from '@chituma/observability'

setTracerProvider(provider)
const traced = instrumentAgent(agent)

await traced.generate('summarize this thread') // emits spans`,
  },
]

export function FeatureTabs() {
  const [active, setActive] = useState(FEATURES[0]!.key)
  const feature = FEATURES.find((f) => f.key === active)!

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {FEATURES.map((f) => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active === f.key
                ? 'gradient-ember text-white'
                : 'border border-ink-600 text-zinc-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl font-semibold text-white">{feature.title}</h3>
          <p className="mt-4 text-lg leading-relaxed text-zinc-400">{feature.body}</p>
        </div>
        <pre className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-900 p-5 text-sm leading-relaxed text-zinc-300">
          <code>{feature.code}</code>
        </pre>
      </div>
    </div>
  )
}
