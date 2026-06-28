export function Code({ children }: { children: string }) {
  return (
    <pre className="my-5 overflow-x-auto rounded-xl border border-ink-700 bg-ink-900 p-5 text-sm leading-relaxed text-zinc-300">
      <code>{children}</code>
    </pre>
  )
}

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 text-2xl font-semibold text-white">
      {children}
    </h2>
  )
}
