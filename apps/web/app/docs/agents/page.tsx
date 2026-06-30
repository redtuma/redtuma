import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Agents — Redtuma' }

export default function Agents() {
  return (
    <DocArticle>
      <H1>Agents</H1>
      <Lead>
        An agent combines a model, instructions and tools. Call <C>generate</C> for a complete
        response or <C>stream</C> to stream tokens. The tool-calling loop runs for you.
      </Lead>

      <H2 id="define">Defining an agent</H2>
      <Code title="agent.ts">{`import { Agent } from '@redtuma/core/agent'

const agent = new Agent({
  id: 'assistant',
  name: 'Assistant',
  instructions: 'You are concise and helpful.',
  model: 'anthropic/claude-opus-4-8',
  tools: { /* ... */ },
})`}</Code>
      <P>
        <C>model</C> is a <C>{`'provider/model'`}</C> string, an AI SDK <C>LanguageModel</C>, or a{' '}
        <a href="/docs/model-routing" className="text-ember-300 hover:underline">tiered routing policy</a>.
      </P>

      <H2 id="generate">generate</H2>
      <P>Returns the text plus tool calls, usage, finish reason and the raw response.</P>
      <Code>{`const res = await agent.generate('What is the weather in Taipei?')

res.text         // the model's answer
res.toolCalls    // tools the model invoked
res.usage        // { promptTokens, completionTokens, totalTokens }
res.finishReason`}</Code>

      <H2 id="stream">stream</H2>
      <Code>{`const result = await agent.stream('Tell me a short story.')
for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}`}</Code>

      <H2 id="structured">Structured output</H2>
      <P>Pass a Zod schema as <C>output</C> to get a validated object back.</P>
      <Code>{`import { z } from 'zod'

const res = await agent.generate('Extract the city and temp.', {
  output: z.object({ city: z.string(), tempC: z.number() }),
})

res.object // { city: 'Taipei', tempC: 30 }`}</Code>

      <H2 id="dynamic">Dynamic instructions</H2>
      <P>Instructions can be a function of the per-call runtime context.</P>
      <Code>{`const agent = new Agent({
  id: 'greeter',
  instructions: ({ runtimeContext }) =>
    \`Greet the user by name: \${runtimeContext.get('name') ?? 'there'}.\`,
  model: 'anthropic/claude-opus-4-8',
})`}</Code>

      <H2 id="registry">The Redtuma registry</H2>
      <P>
        Register agents on a <C>Redtuma</C> instance to share storage, memory, logging and telemetry,
        and to serve them over HTTP.
      </P>
      <Code>{`import { Redtuma } from '@redtuma/core'

const redtuma = new Redtuma({ agents: { assistant: agent } })
redtuma.getAgent('assistant')`}</Code>

      <Callout>
        Give an agent <a href="/docs/memory" className="text-ember-300 hover:underline">memory</a> to
        persist conversations, or wire <a href="/docs/tools" className="text-ember-300 hover:underline">tools</a>{' '}
        so it can take actions.
      </Callout>

      <PrevNext current="/docs/agents" />
    </DocArticle>
  )
}
