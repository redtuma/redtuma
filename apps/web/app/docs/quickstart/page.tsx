import { Code, H2 } from '@/components/Code'

export const metadata = { title: 'Quickstart — Chituma' }

export default function Quickstart() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-4xl font-bold text-white">Quickstart</h1>
      <p className="mt-4 text-lg leading-relaxed text-zinc-400">
        Build a streaming, tool-calling agent in a few minutes.
      </p>

      <H2 id="install">1. Create a project</H2>
      <Code>{`npm create chituma@latest my-agent
cd my-agent
npm install`}</Code>

      <H2 id="key">2. Add your model key</H2>
      <p className="text-zinc-400">Chituma reads provider keys from the environment.</p>
      <Code>{`export ANTHROPIC_API_KEY=sk-ant-...`}</Code>

      <H2 id="agent">3. Define an agent</H2>
      <Code>{`import { Chituma } from '@chituma/core'
import { Agent } from '@chituma/core/agent'
import { createTool } from '@chituma/core/tools'
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

export const chituma = new Chituma({ agents: { assistant: agent } })`}</Code>

      <H2 id="run">4. Run it</H2>
      <Code>{`const res = await agent.generate('What is the weather in Taipei?')
console.log(res.text)

// or stream
const stream = await agent.stream('And London?')
for await (const chunk of stream.textStream) process.stdout.write(chunk)`}</Code>

      <H2 id="serve">5. Serve over HTTP</H2>
      <Code>{`import { serve } from '@hono/node-server'
import { createHonoServer } from '@chituma/deployer'

serve({ fetch: createHonoServer(chituma).fetch, port: 3000 })`}</Code>

      <p className="mt-10 text-zinc-400">
        That's it — you now have a production-ready agent with tools, streaming and an HTTP API.
      </p>
    </article>
  )
}
