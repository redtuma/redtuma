# redtuma

## 0.1.2

### Patch Changes

- Republish: fix `workspace:*` dependency specifiers that leaked into the 0.1.1 tarball (must be published via pnpm/changesets so they resolve to real versions).

## 0.1.1

### Patch Changes

- Report the real package version from `--version`/`--help` instead of a hardcoded `0.0.1` (now read dynamically from package.json).

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
- Updated dependencies [c264d3f]
  - @redtuma/deployer@0.1.0
  - @redtuma/core@0.1.0
