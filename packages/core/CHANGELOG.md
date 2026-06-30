# @redtuma/core

## 0.2.0

### Minor Changes

- Adaptive tiered model routing: `tieredModel({ tiers })` + `isModelRouter`.
  `Agent.generate` tries tiers cheapest-first and escalates to a stronger model
  only when a tier's `accept(result)` gate rejects the output; the chosen tier is
  reported on `result.routing`. Streaming uses the cheapest tier.
- Durable workflow resume: `Run.getSnapshot()` / `Run.restore(snapshot)` and the
  exported `RunSnapshot` type, so a suspended run can be persisted and resumed on
  another instance.

### Patch Changes

- `toAISDKTool` now accepts `AnyToolAction`, so a concretely-typed tool passes
  without an explicit annotation.

## 0.1.0

### Minor Changes

- c264d3f: Initial release of `@redtuma/core`: the `Redtuma` registry, `Agent`
  (`generate`/`stream` on the Vercel AI SDK), `createTool`, `provider/model`
  routing, `MessageList`, the in-memory `Store`, and the workflow engine
  (`createWorkflow`/`createStep` with `then`/`branch`/`parallel`/`dountil`/`foreach`
  and suspend/resume).
