import { DocArticle, H1, H2, Lead, P, C, Code, PrevNext } from '@/components/doc'

export const metadata = { title: 'Tools — Redtuma' }

export default function Tools() {
  return (
    <DocArticle>
      <H1>Tools</H1>
      <Lead>
        Tools let an agent take actions and fetch data. They&apos;re typed with Zod, so inputs are
        validated before your code runs.
      </Lead>

      <H2 id="create">Creating a tool</H2>
      <Code title="tools.ts">{`import { createTool } from '@redtuma/core/tools'
import { z } from 'zod'

export const getWeather = createTool({
  id: 'get-weather',
  description: 'Get the current weather for a city.',
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ context }) => {
    // context is the validated input
    return { city: context.city, tempC: 21 }
  },
})`}</Code>
      <P>
        The <C>id</C> is the tool name presented to the model, and <C>description</C> tells it when to
        use the tool. Attach tools to an agent under any key:
      </P>
      <Code>{`const agent = new Agent({
  id: 'assistant',
  instructions: '...',
  model: 'anthropic/claude-opus-4-8',
  tools: { getWeather },
})`}</Code>

      <H2 id="context">Execute context</H2>
      <P>
        <C>execute</C> receives the validated <C>context</C>, a per-call <C>runtimeContext</C>, and an{' '}
        <C>abortSignal</C>.
      </P>
      <Code>{`execute: async ({ context, runtimeContext, abortSignal }) => {
  const userId = runtimeContext.get('userId')
  const res = await fetch(url, { signal: abortSignal })
  return res.json()
}`}</Code>

      <H2 id="ai-sdk">AI SDK tools</H2>
      <P>
        Redtuma tools and raw AI SDK tools are both accepted in an agent&apos;s <C>tools</C> map.
        Convert a single Redtuma tool to the AI SDK shape with <C>toAISDKTool</C> when you need it.
      </P>

      <PrevNext current="/docs/tools" />
    </DocArticle>
  )
}
