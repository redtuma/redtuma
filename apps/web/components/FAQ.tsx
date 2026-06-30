'use client'

import { useState } from 'react'

const QA: { q: string; a: string }[] = [
  {
    q: 'What is Redtuma?',
    a: 'Redtuma (赤兔马) is a TypeScript framework for building AI agents and applications. It provides agents, workflows, memory, RAG, observability and MCP support on top of the Vercel AI SDK.',
  },
  {
    q: 'How is it different from calling a model directly?',
    a: 'Redtuma adds the higher-level pieces you need in production: a tool-calling agent loop, durable multi-step workflows with suspend/resume, persistent memory and semantic recall, retrieval, and tracing — so you are not rebuilding them per project.',
  },
  {
    q: 'Which models does it support?',
    a: 'Any model the Vercel AI SDK supports. Use a "provider/model" string like "anthropic/claude-opus-4-8" or "openai/gpt-5.5", or pass an AI SDK model instance directly.',
  },
  {
    q: 'Where can I deploy it?',
    a: 'Anywhere Node, Bun, Deno or Cloudflare Workers runs. The deployer package exposes your agents and workflows over HTTP via Hono, with a fetch handler for edge runtimes.',
  },
  {
    q: 'Is it open source?',
    a: 'Yes — Redtuma is Apache-2.0 licensed.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="mx-auto max-w-3xl divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-900/50">
      {QA.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between px-6 py-5 text-left"
          >
            <span className="font-medium text-white">{item.q}</span>
            <span className="ml-4 text-ember-400">{open === i ? '–' : '+'}</span>
          </button>
          {open === i && <p className="px-6 pb-5 leading-relaxed text-zinc-400">{item.a}</p>}
        </div>
      ))}
    </div>
  )
}
