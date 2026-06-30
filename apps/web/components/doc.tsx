import Link from 'next/link'
import { Code, H2 } from './Code'
import { DOCS_ORDER } from '@/lib/docs-nav'

export { Code, H2 }

export function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-4xl font-bold tracking-tight text-white">{children}</h1>
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-lg leading-relaxed text-zinc-400">{children}</p>
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 leading-relaxed text-zinc-400">{children}</p>
}

export function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[0.85em] text-ember-300">{children}</code>
}

export function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-zinc-400">{children}</ul>
}

export function Callout({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-ember-600/40 bg-ember-500/[0.06] p-5">
      {title && <p className="mb-1 font-semibold text-ember-300">{title}</p>}
      <div className="text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  )
}

export function DocArticle({ children }: { children: React.ReactNode }) {
  return <article className="max-w-3xl pb-4">{children}</article>
}

/** Previous / next links computed from the flat docs order. */
export function PrevNext({ current }: { current: string }) {
  const i = DOCS_ORDER.findIndex((d) => d.href === current)
  const prev = i > 0 ? DOCS_ORDER[i - 1] : undefined
  const next = i >= 0 && i < DOCS_ORDER.length - 1 ? DOCS_ORDER[i + 1] : undefined

  return (
    <div className="mt-16 flex items-center justify-between border-t border-ink-800 pt-6 text-sm">
      {prev ? (
        <Link href={prev.href} className="text-zinc-400 hover:text-white">
          ← {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="text-zinc-400 hover:text-white">
          {next.label} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  )
}
