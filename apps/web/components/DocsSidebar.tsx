'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DOCS_NAV } from '@/lib/docs-nav'

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-24 space-y-8 text-sm">
      {DOCS_NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">{g.group}</p>
          <ul className="space-y-1.5">
            {g.items.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={
                      active
                        ? 'block border-l-2 border-ember-500 -ml-px pl-3 font-medium text-white'
                        : 'block border-l-2 border-transparent -ml-px pl-3 text-zinc-400 hover:text-white'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
