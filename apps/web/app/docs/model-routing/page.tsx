import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Model routing — Redtuma' }

export default function ModelRouting() {
  return (
    <DocArticle>
      <H1>Model routing</H1>
      <Lead>
        Adaptive, cost-aware routing: try a cheap model first and escalate to a stronger one only when
        the result isn&apos;t good enough. You pay for the big model only when you need it.
      </Lead>

      <H2 id="basic">A model string</H2>
      <P>
        The simplest model is a <C>{`'provider/model'`}</C> string. The prefix selects the provider
        package, imported lazily.
      </P>
      <Code>{`model: 'anthropic/claude-opus-4-8'
model: 'openai/gpt-4o'`}</Code>

      <H2 id="tiered">Tiered routing</H2>
      <P>
        Wrap a list of tiers with <C>tieredModel</C>. Each tier has an <C>accept</C> predicate that
        decides whether its result is good enough; if not, Redtuma escalates to the next tier. The
        last tier is always accepted.
      </P>
      <Code title="routing.ts">{`import { Agent } from '@redtuma/core/agent'
import { tieredModel } from '@redtuma/core'

const agent = new Agent({
  id: 'assistant',
  instructions: 'Answer the question.',
  model: tieredModel({
    tiers: [
      {
        model: 'anthropic/claude-haiku-4-5',
        accept: (r) => r.text.length > 0 && !r.text.includes('I cannot'),
      },
      { model: 'anthropic/claude-opus-4-8' }, // fallback, always accepted
    ],
    onEscalate: ({ from, to }) => console.log(\`escalated \${from} -> \${to}\`),
  }),
})`}</Code>

      <H2 id="result">Inspecting the decision</H2>
      <P>
        When a tiered policy chose the result, <C>generate</C> reports which tier won and how many
        attempts it took.
      </P>
      <Code>{`const res = await agent.generate('Summarize this.')
res.routing // { tier: 0, attempts: 1 }  — the cheap tier was enough
            // { tier: 1, attempts: 2 }  — escalated to the strong model`}</Code>

      <H2 id="predicates">Good accept predicates</H2>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-zinc-400">
        <li>Reject empty output or refusals.</li>
        <li>Reject when structured output fails to parse / validate.</li>
        <li>Gate on a confidence score your tool returns.</li>
        <li>Gate on length, format, or required keywords.</li>
      </ul>

      <Callout title="Streaming">
        Because a stream can&apos;t be judged before it commits, <C>stream</C> uses the cheapest tier.
        Adaptive escalation applies to <C>generate</C>.
      </Callout>

      <PrevNext current="/docs/model-routing" />
    </DocArticle>
  )
}
