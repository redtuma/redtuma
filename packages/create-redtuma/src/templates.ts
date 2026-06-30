/** Inline starter-project templates for `npm create redtuma`. */

export type TemplateName = 'default' | 'cloudflare'

export const TEMPLATES: readonly TemplateName[] = ['default', 'cloudflare']

export function isTemplateName(value: string): value is TemplateName {
  return (TEMPLATES as readonly string[]).includes(value)
}

/** Files for the selected template, keyed by project-relative path. */
export function templateFiles(
  projectName: string,
  template: TemplateName = 'default',
): Record<string, string> {
  return template === 'cloudflare' ? cloudflareTemplate(projectName) : defaultTemplate(projectName)
}

function defaultTemplate(projectName: string): Record<string, string> {
  return {
    'package.json': `${JSON.stringify(
      {
        name: projectName,
        version: '0.0.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'redtuma dev',
          start: 'node --experimental-strip-types src/index.ts',
        },
        dependencies: {
          '@ai-sdk/anthropic': '^1.2.0',
          '@redtuma/core': 'latest',
          redtuma: 'latest',
          zod: '^3.24.0',
        },
      },
      null,
      2,
    )}\n`,

    '.env.example': 'ANTHROPIC_API_KEY=sk-ant-...\n',

    '.gitignore': 'node_modules/\n.env\ndist/\n',

    'tsconfig.json': `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ['src'],
      },
      null,
      2,
    )}\n`,

    'src/index.ts': `import { Redtuma } from '@redtuma/core'
import { Agent } from '@redtuma/core/agent'
import { createTool } from '@redtuma/core/tools'
import { z } from 'zod'

const getWeather = createTool({
  id: 'get-weather',
  description: 'Get the current weather for a city.',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ context }) => ({ city: context.city, tempC: 21 }),
})

export const agent = new Agent({
  id: 'assistant',
  name: 'Assistant',
  instructions: 'You are a concise, helpful assistant.',
  model: 'anthropic/claude-opus-4-8',
  tools: { getWeather },
})

// \`redtuma dev\` looks for this exported \`redtuma\` instance.
export const redtuma = new Redtuma({ agents: { assistant: agent } })
`,

    'README.md': `# ${projectName}

A Redtuma project. Get started:

\`\`\`bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev            # serve the agent over HTTP
\`\`\`

Then POST to \`http://localhost:3000/api/agents/assistant/generate\`.
`,
  }
}

function cloudflareTemplate(projectName: string): Record<string, string> {
  return {
    'package.json': `${JSON.stringify(
      {
        name: projectName,
        version: '0.0.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'wrangler dev',
          deploy: 'wrangler deploy',
          typecheck: 'tsc --noEmit',
        },
        dependencies: {
          '@ai-sdk/anthropic': '^1.2.0',
          '@redtuma/core': 'latest',
          '@redtuma/store-do': 'latest',
          zod: '^3.24.0',
        },
        devDependencies: {
          '@cloudflare/workers-types': 'latest',
          typescript: '^5.7.0',
          wrangler: 'latest',
        },
      },
      null,
      2,
    )}\n`,

    'wrangler.toml': `name = "${projectName}"
main = "src/worker.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

# Agent memory lives in a Durable Object — one instance per conversation thread.
[[durable_objects.bindings]]
name = "MEMORY"
class_name = "Memory"

[[migrations]]
tag = "v1"
new_classes = ["Memory"]
`,

    '.dev.vars.example': 'ANTHROPIC_API_KEY=sk-ant-...\n',

    '.gitignore': 'node_modules/\n.dev.vars\n.wrangler/\ndist/\n',

    'tsconfig.json': `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          noEmit: true,
          types: ['@cloudflare/workers-types'],
        },
        include: ['src'],
      },
      null,
      2,
    )}\n`,

    'src/memory.ts': `import { RedtumaMemoryObject, type KVStorage } from '@redtuma/store-do'

/** Durable Object that stores one conversation thread's memory. */
export class Memory extends RedtumaMemoryObject {
  constructor(state: DurableObjectState) {
    super(state.storage as unknown as KVStorage)
  }
}
`,

    'src/worker.ts': `import { Agent } from '@redtuma/core'
import { createAnthropic } from '@ai-sdk/anthropic'
import { durableObjectStoreClient } from '@redtuma/store-do'

export { Memory } from './memory'

interface Env {
  MEMORY: DurableObjectNamespace
  ANTHROPIC_API_KEY: string
}

interface ChatRequest {
  threadId?: string
  message: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('POST JSON { "threadId": "...", "message": "..." }\\n', { status: 405 })
    }

    const { threadId = 'default', message } = (await request.json()) as ChatRequest
    if (!message) return Response.json({ error: 'message is required' }, { status: 400 })

    // One Durable Object per thread → strongly consistent per-conversation memory.
    const stub = env.MEMORY.get(env.MEMORY.idFromName(threadId))
    const store = durableObjectStoreClient(stub)

    const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
    const agent = new Agent({
      id: 'assistant',
      instructions: 'You are a concise, helpful assistant.',
      model: anthropic('claude-opus-4-8'),
    })

    await store.saveThread({
      id: threadId,
      resourceId: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const history = await store.getMessages({ threadId, last: 20 })
    const res = await agent.generate([
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ])

    await store.saveMessages([
      { id: crypto.randomUUID(), role: 'user', content: message, createdAt: new Date(), threadId, resourceId: 'user' },
      { id: crypto.randomUUID(), role: 'assistant', content: res.text, createdAt: new Date(), threadId, resourceId: 'user' },
    ])

    return Response.json({ text: res.text })
  },
}
`,

    'README.md': `# ${projectName}

A Redtuma agent on **Cloudflare Workers**, with conversation memory in a
**Durable Object** — no external database.

## Deploy

\`\`\`bash
npm install
npx wrangler secret put ANTHROPIC_API_KEY   # paste your key
npm run deploy
\`\`\`

## Local dev

\`\`\`bash
cp .dev.vars.example .dev.vars              # add your ANTHROPIC_API_KEY
npm run dev
\`\`\`

Then POST a message (memory persists per \`threadId\`):

\`\`\`bash
curl -X POST http://localhost:8787 \\
  -H 'content-type: application/json' \\
  -d '{ "threadId": "demo", "message": "Hello!" }'
\`\`\`
`,
  }
}
