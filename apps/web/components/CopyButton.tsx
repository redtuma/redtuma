'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="shrink-0 rounded-md border border-ink-600 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-ember-500 hover:text-white"
      aria-label="Copy to clipboard"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
