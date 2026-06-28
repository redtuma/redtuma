/** Inline starter-project templates used by `chituma create`. */

export function templateFiles(projectName: string): Record<string, string> {
  return {
    'package.json': `${JSON.stringify(
      {
        name: projectName,
        version: '0.0.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'chituma dev',
          start: 'node --experimental-strip-types src/index.ts',
        },
        dependencies: {
          '@ai-sdk/anthropic': '^1.2.0',
          '@chituma/core': 'latest',
          chituma: 'latest',
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

    'src/index.ts': `import { Chituma } from '@chituma/core'
import { Agent } from '@chituma/core/agent'
import { createTool } from '@chituma/core/tools'
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

// The CLI's \`chituma dev\` looks for this exported \`chituma\` instance.
export const chituma = new Chituma({ agents: { assistant: agent } })
`,

    'README.md': `# ${projectName}

A Chituma project. Get started:

\`\`\`bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev            # serve the agent over HTTP
\`\`\`

Then POST to \`http://localhost:3000/api/agents/assistant/generate\`.
`,
  }
}
