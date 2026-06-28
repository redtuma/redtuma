# @chituma/deployer

## 0.1.0

### Minor Changes

- c264d3f: Initial release of the Chituma framework packages:

  - `@chituma/memory` — working, semantic-recall and observational memory implementing the core `AgentMemory` contract.
  - `@chituma/rag` — `MDocument` chunking, embeddings, `VectorStore` interface + in-memory store, retrieval pipeline and a RAG tool.
  - `@chituma/observability` — OpenTelemetry tracing with `withSpan` and `instrumentAgent`.
  - `@chituma/evals` — deterministic scorers and an `evaluate` harness.
  - `@chituma/mcp` — Model Context Protocol client and server.
  - `@chituma/deployer` — Hono server adapter exposing agents and workflows over HTTP.
  - `@chituma/store-libsql` / `@chituma/store-pg` — libSQL/SQLite and PostgreSQL store adapters.
  - `chituma` — CLI to scaffold projects (`create`), serve (`dev`) and build.

### Patch Changes

- Updated dependencies [c264d3f]
  - @chituma/core@0.1.0
