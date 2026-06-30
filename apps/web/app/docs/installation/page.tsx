import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Installation — Redtuma' }

export default function Installation() {
  return (
    <DocArticle>
      <H1>Installation</H1>
      <Lead>Scaffold a new project, or add Redtuma to an existing TypeScript app.</Lead>

      <H2 id="scaffold">Scaffold a project</H2>
      <P>The fastest way to start. Pick the default template, or the Cloudflare edge template.</P>
      <Code title="Terminal">{`# default (Node) project
npm create redtuma@latest my-agent

# Cloudflare Workers + Durable Object memory
npm create redtuma@latest my-agent -- --template cloudflare`}</Code>

      <H2 id="manual">Add to an existing project</H2>
      <P>
        Install the core package and at least one AI SDK provider. Providers are optional peer deps,
        so install only the ones you use.
      </P>
      <Code title="Terminal">{`npm install @redtuma/core zod
npm install @ai-sdk/anthropic   # and/or @ai-sdk/openai`}</Code>

      <P>Optional packages, added as you need them:</P>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-zinc-400">
        <li><C>@redtuma/memory</C> — persistent memory and semantic recall</li>
        <li><C>@redtuma/rag</C> — chunking, embeddings and retrieval</li>
        <li><C>@redtuma/deployer</C> — expose agents and workflows over HTTP</li>
        <li><C>@redtuma/store-do</C> — Cloudflare Durable Object memory</li>
        <li><C>@redtuma/store-pg</C> / <C>@redtuma/store-libsql</C> — database stores</li>
        <li><C>@redtuma/mcp</C>, <C>@redtuma/observability</C></li>
      </ul>

      <H2 id="requirements">Requirements</H2>
      <P>Node.js 20+. Redtuma is ESM-only and ships its own type definitions.</P>

      <Callout title="API keys">
        Providers read keys from the environment — e.g. <C>ANTHROPIC_API_KEY</C> or{' '}
        <C>OPENAI_API_KEY</C>. On Cloudflare, set them as secrets and pass them to the provider
        explicitly (see <a href="/docs/cloudflare" className="text-ember-300 hover:underline">Cloudflare</a>).
      </Callout>

      <PrevNext current="/docs/installation" />
    </DocArticle>
  )
}
