export interface DocLink {
  label: string
  href: string
}

export interface DocGroup {
  group: string
  items: DocLink[]
}

export const DOCS_NAV: DocGroup[] = [
  {
    group: 'Getting started',
    items: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Installation', href: '/docs/installation' },
      { label: 'Quickstart', href: '/docs/quickstart' },
    ],
  },
  {
    group: 'Core concepts',
    items: [
      { label: 'Agents', href: '/docs/agents' },
      { label: 'Tools', href: '/docs/tools' },
      { label: 'Workflows', href: '/docs/workflows' },
      { label: 'Memory', href: '/docs/memory' },
      { label: 'Model routing', href: '/docs/model-routing' },
    ],
  },
  {
    group: 'Retrieval & integrations',
    items: [
      { label: 'RAG', href: '/docs/rag' },
      { label: 'MCP', href: '/docs/mcp' },
    ],
  },
  {
    group: 'Deploy & operate',
    items: [
      { label: 'Deployment', href: '/docs/deployment' },
      { label: 'Cloudflare (edge)', href: '/docs/cloudflare' },
      { label: 'Observability', href: '/docs/observability' },
    ],
  },
]

/** Flattened page order, used for prev/next navigation. */
export const DOCS_ORDER: DocLink[] = DOCS_NAV.flatMap((g) => g.items)
