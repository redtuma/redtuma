import Link from 'next/link'
import { Nav, Footer } from '@/components/site'

const NAV = [
  { group: 'Getting started', items: [['Introduction', '/docs'], ['Quickstart', '/docs/quickstart']] },
  {
    group: 'Core concepts',
    items: [
      ['Agents', '/docs#agents'],
      ['Tools', '/docs#tools'],
      ['Workflows', '/docs#workflows'],
      ['Memory', '/docs#memory'],
    ],
  },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-8 text-sm">
            {NAV.map((g) => (
              <div key={g.group}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {g.group}
                </p>
                <ul className="space-y-2">
                  {g.items.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href!} className="text-zinc-400 hover:text-white">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <main className="prose-invert min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </>
  )
}
