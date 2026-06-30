import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Workflows — Redtuma' }

export default function Workflows() {
  return (
    <DocArticle>
      <H1>Workflows</H1>
      <Lead>
        Workflows are deterministic, multi-step pipelines: branching, parallelism, loops, and
        human-in-the-loop suspend/resume — composed from typed steps.
      </Lead>

      <H2 id="steps">Steps and control flow</H2>
      <Code title="workflow.ts">{`import { createWorkflow, createStep } from '@redtuma/core/workflows'

const double = createStep({
  id: 'double',
  execute: ({ inputData }) => (inputData as number) * 2,
})

const wf = createWorkflow({ id: 'pipeline' })
  .then(double)
  .branch([
    [({ inputData }) => inputData > 100, bigStep],
    [() => true, smallStep],
  ])
  .commit()

const result = await wf.createRun().start({ inputData: 21 })
result.status   // 'success' | 'suspended' | 'failed'
result.result   // output of the last step`}</Code>
      <P>
        Builder methods: <C>then</C>, <C>branch</C>, <C>parallel</C>, <C>dountil</C>, <C>foreach</C>,{' '}
        <C>map</C>. Call <C>commit()</C> before running.
      </P>

      <H2 id="suspend">Suspend & resume</H2>
      <P>
        A step can <C>suspend</C> to wait for human input. The run returns <C>suspended</C> with the
        step id, then you <C>resume</C> it with data.
      </P>
      <Code>{`const gate = createStep({
  id: 'approval',
  execute: ({ resumeData, suspend }) => {
    if (resumeData === undefined) suspend({ reason: 'needs approval' })
    return resumeData
  },
})

const run = createWorkflow({ id: 'hitl' }).then(gate).commit().createRun()

const a = await run.start({ inputData: 'x' })  // status: 'suspended'
const b = await run.resume({ step: 'approval', resumeData: { ok: true } })`}</Code>

      <H2 id="durable">Durable resume</H2>
      <P>
        Persist a suspended run and resume it later — even on a different server instance. Snapshots
        round-trip through any <a href="/docs/memory" className="text-ember-300 hover:underline">Store</a>.
      </P>
      <Code>{`const snapshot = run.getSnapshot()        // serializable
await store.persistSnapshot(key, snapshot)

// later, on another instance:
const snap = await store.loadSnapshot(key)
const result = await workflow.createRun().restore(snap).resume({ step, resumeData })`}</Code>

      <Callout>
        When you serve workflows with <a href="/docs/deployment" className="text-ember-300 hover:underline">the deployer</a>{' '}
        and a Store is configured, suspend/resume is persisted automatically — required for stateless
        edge deploys.
      </Callout>

      <PrevNext current="/docs/workflows" />
    </DocArticle>
  )
}
