import { Nav, Footer } from '@/components/site'
import { DocsSidebar } from '@/components/DocsSidebar'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
        <aside className="hidden w-56 shrink-0 lg:block">
          <DocsSidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </>
  )
}
