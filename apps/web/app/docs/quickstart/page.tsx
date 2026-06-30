import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Quickstart — Redtuma' }

export default function Quickstart() {
  return (
    <DocArticle>
      <H1>Quickstart</H1>
      <Lead>Build a streaming, tool-calling agent and serve it over HTTP in a few minutes.</Lead>

      <H2 id="create">1. Create a project</H2>
      <Code title="Terminal">{`npm create redtuma@latest my-agent
cd my-agent
npm install`}</Code>

      <H2 id="key">2. Add your model key</H2>
      <P>Redtuma reads provider keys from the environment.</P>
      <Code title="Terminal">{`export ANTHROPIC_API_KEY=sk-ant-...`}</Code>

      <H2 id="agent">3. Define an agent</H2>
      <Code title="src/index.ts">{`import { Redtuma } from '@redtuma/core'
import { Agent } from '@redtuma/core/agent'
import { createTool } from '@redtuma/core/tools'
import { z } from 'zod'

const getWeather = createTool({
  id: 'get-weather',
  description: 'Get weather for a city',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ context }) => ({ tempC: 21, city: context.city }),
})

export const agent = new Agent({
  id: 'assistant',
  instructions: 'You are a concise weather assistant.',
  model: 'anthropic/claude-opus-4-8',
  tools: { getWeather },
})

export const redtuma = new Redtuma({ agents: { assistant: agent } })`}</Code>

      <H2 id="run">4. Run it</H2>
      <Code title="generate / stream">{`const res = await agent.generate('What is the weather in Taipei?')
console.log(res.text)

// or stream tokens
const stream = await agent.stream('And London?')
for await (const chunk of stream.textStream) process.stdout.write(chunk)`}</Code>

      <H2 id="serve">5. Serve over HTTP</H2>
      <P>
        <C>createHonoServer</C> exposes every registered agent and workflow as JSON routes such as{' '}
        <C>POST /api/agents/:id/generate</C>.
      </P>
      <Code title="src/server.ts">{`import { serve } from '@hono/node-server'
import { createHonoServer } from '@redtuma/deployer'
import { redtuma } from './index'

serve({ fetch: createHonoServer(redtuma).fetch, port: 3000 })`}</Code>
      <Code title="Terminal">{`curl -X POST http://localhost:3000/api/agents/assistant/generate \\
  -H 'content-type: application/json' \\
  -d '{ "input": "Weather in Taipei?" }'`}</Code>

      <Callout title="Going to the edge?">
        Scaffold with <C>--template cloudflare</C> to get a Worker with Durable Object memory and a
        one-command <C>wrangler deploy</C>. See <a href="/docs/cloudflare" className="text-ember-300 hover:underline">Cloudflare</a>.
      </Callout>

      <PrevNext current="/docs/quickstart" />
    </DocArticle>
  )
}
