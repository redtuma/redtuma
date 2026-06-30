# @redtuma/deployer

## 0.2.0

### Minor Changes

- Durable workflow resume: when the `Redtuma` instance has a configured `Store`,
  suspended runs are persisted under `wf:{id}:run:{runId}` and rehydrated on
  `/resume`, so a run started on one instance can be resumed on another (required
  for stateless edge deploys). Falls back to the in-process map when no storage is
  set.

### Patch Changes

- Updated dependency `@redtuma/core` to `0.2.0`.

## 0.1.0

### Minor Changes

- c264d3f: Initial release of the Redtuma framework packages:

  - `@redtuma/memory` — working, semantic-recall and observational memory implementing the core `AgentMemory` contract.
  - `@redtuma/rag` — `MDocument` chunking, embeddings, `VectorStore` interface + in-memory store, retrieval pipeline and a RAG tool.
  - `@redtuma/observability` — OpenTelemetry tracing with `withSpan` and `instrumentAgent`.
  - `@redtuma/evals` — deterministic scorers and an `evaluate` harness.
  - `@redtuma/mcp` — Model Context Protocol client and server.
  - `@redtuma/deployer` — Hono server adapter exposing agents and workflows over HTTP.
  - `@redtuma/store-libsql` / `@redtuma/store-pg` — libSQL/SQLite and PostgreSQL store adapters.
  - `redtuma` — CLI to scaffold projects (`create`), serve (`dev`) and build.

### Patch Changes

- Updated dependencies [c264d3f]
  - @redtuma/core@0.1.0
