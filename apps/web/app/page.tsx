import Link from 'next/link'
import { CopyButton } from '@/components/CopyButton'
import { FeatureTabs } from '@/components/FeatureTabs'
import { FAQ } from '@/components/FAQ'
import { Nav, Footer } from '@/components/site'

const INSTALL = 'npm create redtuma@latest'

const CUSTOMERS = ['Replit', 'Sanity', 'SoftBank', 'Vercel', 'Resend', 'Browserbase', 'Cloudflare', 'Neon']

const USE_CASES = [
  {
    title: 'Internal agents',
    body: 'Automate operations, data lookups and back-office tasks with agents wired to your internal tools.',
  },
  {
    title: 'Customer-facing agents',
    body: 'Ship support and concierge experiences with memory, guardrails and streaming responses.',
  },
  {
    title: 'Developer platforms',
    body: 'Expose agents and workflows over HTTP and let your users build on top of them.',
  },
]

const PILLARS = [
  { k: 'Agents', d: 'Tool-calling loop, structured output' },
  { k: 'Workflows', d: 'Branch, parallel, loops, suspend/resume' },
  { k: 'Memory', d: 'Working, semantic & observational' },
  { k: 'RAG', d: 'Chunk, embed, retrieve' },
  { k: 'Observability', d: 'OpenTelemetry tracing' },
  { k: 'MCP', d: 'Client & server' },
]

export default function Home() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full gradient-ember opacity-20 blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-4 py-1.5 text-xs text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-ember-400" />
            The TypeScript framework for AI agents
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Build production <span className="text-gradient">AI agents</span>
            <br />
            in TypeScript
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Redtuma gives you agents, workflows, memory, RAG, observability and MCP — the
            high-level primitives for real AI applications, on top of the Vercel AI SDK.
          </p>

          <div className="mx-auto mt-10 flex max-w-md items-center gap-3 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-left font-mono text-sm text-zinc-300 glow">
            <span className="text-ember-400">$</span>
            <span className="flex-1">{INSTALL}</span>
            <CopyButton text={INSTALL} />
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/docs/quickstart" className="rounded-lg gradient-ember px-6 py-3 font-medium text-white">
              Get started
            </Link>
            <Link href="/docs" className="rounded-lg border border-ink-600 px-6 py-3 font-medium text-zinc-200 hover:border-zinc-400">
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Customers */}
      <section className="border-y border-ink-800 py-10">
        <p className="mb-8 text-center text-xs uppercase tracking-widest text-zinc-500">
          Trusted by teams building with AI
        </p>
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-marquee gap-12 px-6 text-lg font-semibold text-zinc-600">
            {[...CUSTOMERS, ...CUSTOMERS].map((c, i) => (
              <span key={i} className="whitespace-nowrap">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.k} className="rounded-xl border border-ink-700 bg-ink-900/50 p-6 transition hover:border-ember-600">
              <h3 className="text-lg font-semibold text-white">{p.k}</h3>
              <p className="mt-2 text-sm text-zinc-400">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature tabs */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
          Everything you need, batteries included
        </h2>
        <p className="mx-auto mb-14 max-w-2xl text-center text-zinc-400">
          One coherent framework instead of a dozen glued-together libraries.
        </p>
        <FeatureTabs />
      </section>

      {/* Use cases */}
      <section id="use-cases" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-14 text-center text-3xl font-bold text-white sm:text-4xl">
          Built for every kind of agent
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {USE_CASES.map((u) => (
            <div key={u.title} className="rounded-2xl border border-ink-700 bg-ink-900/50 p-8">
              <h3 className="text-xl font-semibold text-white">{u.title}</h3>
              <p className="mt-3 leading-relaxed text-zinc-400">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-900 p-12 text-center">
          <div className="pointer-events-none absolute inset-0 gradient-ember opacity-[0.07]" />
          <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
            Ship your first agent today
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">
            Scaffold a project, point it at a model, and you have a streaming, tool-calling
            agent in minutes.
          </p>
          <div className="relative mx-auto mt-8 flex max-w-md items-center gap-3 rounded-xl border border-ink-700 bg-ink-950 px-4 py-3 text-left font-mono text-sm text-zinc-300">
            <span className="text-ember-400">$</span>
            <span className="flex-1">{INSTALL}</span>
            <CopyButton text={INSTALL} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-14 text-center text-3xl font-bold text-white sm:text-4xl">
          Frequently asked questions
        </h2>
        <FAQ />
      </section>

      <Footer />
    </>
  )
}
