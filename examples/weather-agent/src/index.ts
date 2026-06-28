/**
 * Runnable reference agent. Demonstrates @chituma/core end-to-end:
 * an agent that reasons, calls a tool, and streams a response.
 *
 *   ANTHROPIC_API_KEY=sk-... pnpm --filter @chituma/example-weather-agent start
 */
import { Chituma } from '@chituma/core'
import { Agent } from '@chituma/core/agent'
import { createTool } from '@chituma/core/tools'
import { z } from 'zod'

const getWeather = createTool({
  id: 'get-weather',
  description: 'Get the current weather for a given city.',
  inputSchema: z.object({ city: z.string().describe('City name, e.g. "Taipei"') }),
  outputSchema: z.object({ city: z.string(), tempC: z.number(), condition: z.string() }),
  execute: async ({ context }) => {
    // A real tool would call a weather API here.
    const fake: Record<string, { tempC: number; condition: string }> = {
      Taipei: { tempC: 29, condition: 'humid and partly cloudy' },
      London: { tempC: 14, condition: 'overcast with light rain' },
    }
    const data = fake[context.city] ?? { tempC: 22, condition: 'clear' }
    return { city: context.city, ...data }
  },
})

const agent = new Agent({
  id: 'weather-assistant',
  name: 'Weather Assistant',
  instructions:
    'You are a concise weather assistant. Use the get-weather tool when asked about weather, then answer in one sentence.',
  model: 'anthropic/claude-opus-4-8',
  tools: { getWeather },
})

export const chituma = new Chituma({ agents: { weatherAssistant: agent } })

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Set ANTHROPIC_API_KEY to run this example against a live model.')
    process.exit(1)
  }

  console.log('--- generate() ---')
  const res = await agent.generate('What is the weather in Taipei right now?')
  console.log(res.text)
  console.log('tool calls:', res.toolCalls.length, '| tokens:', res.usage.totalTokens)

  console.log('\n--- stream() ---')
  const stream = await agent.stream('And how about London?')
  for await (const chunk of stream.textStream) process.stdout.write(chunk)
  console.log()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
