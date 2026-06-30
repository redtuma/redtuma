import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Deployment — Redtuma' }

export default function Deployment() {
  return (
    <DocArticle>
      <H1>Deployment</H1>
      <Lead>
        Expose your agents and workflows over HTTP with the deployer. It builds a Hono app that runs
        on Node, Bun, and the edge.
      </Lead>

      <H2 id="routes">The HTTP server</H2>
      <Code title="server.ts">{`import { serve } from '@hono/node-server'
import { createHonoServer } from '@redtuma/deployer'

serve({ fetch: createHonoServer(redtuma).fetch, port: 3000 })`}</Code>
      <P>Registered components are exposed as JSON routes:</P>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-zinc-400">
        <li><C>GET /api/agents</C> — list agents</li>
        <li><C>POST /api/agents/:id/generate</C> — run an agent</li>
        <li><C>POST /api/agents/:id/stream</C> — stream a response</li>
        <li><C>POST /api/workflows/:id/run</C> and <C>/resume</C> — run and resume workflows</li>
      </ul>

      <H2 id="edge">Edge runtimes</H2>
      <P>
        On Workers or other edge runtimes, export the fetch handler directly — Hono runs natively.
      </P>
      <Code>{`import { toFetchHandler } from '@redtuma/deployer'

export default { fetch: toFetchHandler(redtuma) }`}</Code>

      <H2 id="durable">Durable workflow state</H2>
      <P>
        When the <C>Redtuma</C> instance has a <a href="/docs/memory" className="text-ember-300 hover:underline">Store</a>{' '}
        configured, suspended workflow runs are persisted and can be resumed on any instance — so
        human-in-the-loop flows survive restarts and work across stateless isolates.
      </P>

      <Callout title="One-command edge deploy">
        For Cloudflare Workers with Durable Object memory, see the{' '}
        <a href="/docs/cloudflare" className="text-ember-300 hover:underline">Cloudflare</a> guide.
      </Callout>

      <PrevNext current="/docs/deployment" />
    </DocArticle>
  )
}
