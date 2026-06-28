import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chituma — the TypeScript framework for AI agents',
  description:
    'Chituma (赤兔马) is the modern TypeScript framework for AI-powered applications and agents: agents, workflows, memory, RAG, observability and MCP, built on the Vercel AI SDK.',
  metadataBase: new URL('https://chituma.ai'),
  openGraph: {
    title: 'Chituma — the TypeScript framework for AI agents',
    description: 'Agents, workflows, memory, RAG, observability and MCP in TypeScript.',
    url: 'https://chituma.ai',
    siteName: 'Chituma',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
