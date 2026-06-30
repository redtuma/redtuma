import { DocArticle, H1, H2, Lead, P, C, Code, PrevNext } from '@/components/doc'

export const metadata = { title: 'Observability — Redtuma' }

export default function Observability() {
  return (
    <DocArticle>
      <H1>Observability</H1>
      <Lead>
        Trace agent and workflow execution with OpenTelemetry. A no-op tracer is used by default, so
        instrumentation is free until you wire an exporter.
      </Lead>

      <H2 id="instrument">Instrument an agent</H2>
      <Code title="observability.ts">{`import { instrumentAgent, withSpan } from '@redtuma/observability'

instrumentAgent(agent) // generate/stream now emit spans

await withSpan('my-task', async () => {
  // your own traced work
})`}</Code>

      <H2 id="export">Exporters</H2>
      <P>
        Point the tracer at any OpenTelemetry-compatible backend (Jaeger, Honeycomb, Grafana Tempo,
        …) by configuring the OTel SDK in your app. Redtuma emits spans for agent calls and workflow
        steps; the rest is standard OTel.
      </P>

      <H2 id="telemetry">Registry telemetry</H2>
      <P>
        Pass <C>telemetry</C> to the <C>Redtuma</C> registry to share a tracer across every registered
        agent and workflow.
      </P>

      <PrevNext current="/docs/observability" />
    </DocArticle>
  )
}
