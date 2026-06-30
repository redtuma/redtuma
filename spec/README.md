# @redtuma/spec — behavioral conformance suite

This package asserts the **observable contract** of Redtuma's public API. It
imports the built `@redtuma/*` packages exactly as a consumer would (never from
`../src`), so a green run means the *published* surface behaves as documented —
the same quality gate strategy a drop-in framework uses to prove compatibility.

## Provenance (clean-room)

Every spec here is authored from Redtuma's own public types and `ARCHITECTURE.md`
contract, plus black-box observation of the running code. No third-party test
files were copied or adapted. See [`CLEANROOM.md`](../CLEANROOM.md).

## Layout

- `contract/*.spec.ts` — one file per public capability (agent, tools,
  workflows, message-list, model routing, store, runtime context, registry,
  and the export surface itself).
- `src/mock-model.ts` — deterministic `LanguageModel` fakes (no network, no
  keys) built on the AI SDK's `MockLanguageModelV1`.
- `src/store-conformance.ts` — a reusable `runStoreConformance(name, makeStore)`
  any `Store` adapter (pg, libsql, …) can run to prove it satisfies the same
  contract as `InMemoryStore`.

## Run

```bash
pnpm --filter @redtuma/spec test     # turbo builds @redtuma/core first
```
