# Chituma (赤兔马)

The modern TypeScript framework for AI-powered applications and agents.

Chituma gives you the high-level primitives for production AI — **agents** that
reason and call tools, **workflows** for multi-step orchestration, **memory**,
**RAG**, **observability**, and **MCP** — on top of the
[Vercel AI SDK](https://sdk.vercel.ai). It is a clean-room TypeScript
reimplementation of the [Mastra](https://mastra.ai) API surface.

```ts
import { Chituma } from '@chituma/core'
import { Agent } from '@chituma/core/agent'
import { createTool } from '@chituma/core/tools'
import { z } from 'zod'

const weather = createTool({
  id: 'get-weather',
  description: 'Get the current weather for a city',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ context }) => ({ tempC: 21, city: context.city }),
})

const agent = new Agent({
  id: 'assistant',
  name: 'Assistant',
  instructions: 'You are a concise, helpful assistant.',
  model: 'anthropic/claude-opus-4-8',
  tools: { weather },
})

export const chituma = new Chituma({ agents: { assistant: agent } })

const res = await agent.generate('What is the weather in Taipei?')
console.log(res.text)
```

## Packages

| Package | Description |
| --- | --- |
| `@chituma/core` | `Chituma` registry, `Agent`, tools, model routing, workflows engine |
| `@chituma/memory` | working / semantic / observational memory |
| `@chituma/rag` | chunking, embeddings, retrieval |
| `@chituma/observability` | OpenTelemetry tracing |
| `@chituma/mcp` | Model Context Protocol client + server |
| `@chituma/deployer` | server adapters + deploy targets |
| `@chituma/store-*` | storage & vector adapters (inmemory, libsql, pg, …) |

## Development

```bash
pnpm install
pnpm build      # turbo build all packages
pnpm test       # vitest across the workspace
pnpm typecheck
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design source-of-truth.

Licensed under [Apache-2.0](./LICENSE). See [NOTICE](./NOTICE).
