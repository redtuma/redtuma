import Link from 'next/link'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-md gradient-ember text-sm font-bold text-white">
        赤
      </span>
      <span className="text-white">redtuma</span>
    </span>
  )
}

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-800/70 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#use-cases" className="hover:text-white">Use cases</a>
          <Link href="/docs" className="hover:text-white">Docs</Link>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/redtuma-ai/redtuma"
            className="text-sm text-zinc-400 hover:text-white"
          >
            GitHub
          </a>
          <Link
            href="/docs/quickstart"
            className="rounded-lg gradient-ember px-4 py-2 text-sm font-medium text-white"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-ink-800 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <Logo />
        <p className="text-sm text-zinc-500">
          Apache-2.0 · Built on the Vercel AI SDK · 赤兔马
        </p>
        <div className="flex gap-6 text-sm text-zinc-400">
          <Link href="/docs" className="hover:text-white">Docs</Link>
          <a href="https://github.com/redtuma-ai/redtuma" className="hover:text-white">GitHub</a>
        </div>
      </div>
    </footer>
  )
}
