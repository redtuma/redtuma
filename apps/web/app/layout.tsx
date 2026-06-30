import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Redtuma — the TypeScript framework for AI agents',
  description:
    'Redtuma (赤兔马) is the modern TypeScript framework for AI-powered applications and agents: agents, workflows, memory, RAG, observability and MCP, built on the Vercel AI SDK.',
  metadataBase: new URL('https://redtuma.ai'),
  openGraph: {
    title: 'Redtuma — the TypeScript framework for AI agents',
    description: 'Agents, workflows, memory, RAG, observability and MCP in TypeScript.',
    url: 'https://redtuma.ai',
    siteName: 'Redtuma',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
