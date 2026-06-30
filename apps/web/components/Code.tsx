'use client'

import { useState } from 'react'

export function Code({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="group my-5 overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
      {title && (
        <div className="border-b border-ink-800 px-4 py-2 font-mono text-xs text-zinc-500">{title}</div>
      )}
      <div className="relative">
        <button
          onClick={copy}
          className="absolute right-3 top-3 rounded-md border border-ink-700 bg-ink-950/80 px-2 py-1 text-xs text-zinc-400 opacity-0 transition hover:text-white group-hover:opacity-100"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <pre className="overflow-x-auto p-5 text-sm leading-relaxed text-zinc-300">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  )
}

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 text-2xl font-semibold text-white">
      {children}
    </h2>
  )
}
