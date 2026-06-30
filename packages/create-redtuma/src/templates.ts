/** Inline starter-project templates for `npm create redtuma`. */

export function templateFiles(projectName: string): Record<string, string> {
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
