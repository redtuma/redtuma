# Redtuma Architecture (source-of-truth)

This document is the canonical design reference. Read it before implementing any
package. It mirrors the Mastra API surface (clean-room) on the Vercel AI SDK.

## Principles

1. **Reimplement, don't wrap.** We own the Agent loop, memory, and workflow
   engine. We delegate only raw model/tool calls + streaming to the AI SDK (`ai`).
2. **AI SDK is the foundation.** `generateText` / `streamText` / `tool` / `embed`
   from `ai`, with provider packages `@ai-sdk/anthropic`, `@ai-sdk/openai`.
3. **Keep generic primitive names** (`Agent`, `createTool`, `createWorkflow`),
   rename only the brand registry: `Mastra` → `Redtuma`, scope `@redtuma/*`.
4. **Everything is registrable** on the central `Redtuma` instance and shares its
   config (storage, memory, telemetry, logger).

## Model routing

A model is either a plain string `'provider/model'` or an AI SDK `LanguageModel`.
`resolveModel(config)` in `@redtuma/core/llm` maps the prefix to a provider:

- `anthropic/*` → `@ai-sdk/anthropic`
- `openai/*` → `@ai-sdk/openai`

Unknown providers throw a clear error listing supported prefixes. Provider
packages are optional peer deps, imported lazily so installing only one works.

## @redtuma/core

### `Redtuma` (registry/orchestrator)
```ts
new Redtuma({
  agents?: Record<string, Agent>
  workflows?: Record<string, Workflow>
  tools?: Record<string, ToolAction>
  storage?: Store
  memory?: Memory
  logger?: Logger
  telemetry?: TelemetryConfig
})
```
On construction it injects shared deps (logger, storage, memory, telemetry) into
each registered component via `__register(deps)`. Accessors: `getAgent(id)`,
`getAgentById(id)`, `getWorkflow(id)`, `getTool(id)`, `getAgents()`.

### `Agent`
```ts
new Agent({
  id: string
  name?: string
  instructions: string | (ctx) => string | Promise<string>
  model: ModelConfig                       // 'provider/model' | LanguageModel
  tools?: Record<string, ToolAction>
  memory?: Memory
  defaultGenerateOptions?: Partial<GenerateOptions>
})
```
Methods:
- `generate(input, options?) → { text, toolCalls, toolResults, steps, usage, finishReason, response }`
- `stream(input, options?) → { textStream, fullStream, text(Promise), toolCalls, usage, ... }`

`input` is a string or `CoreMessage[]`. Options: `{ maxSteps?, temperature?,
output?/structuredOutput? (zod), toolChoice?, memory?: { thread, resource },
abortSignal?, telemetry? }`. Tool-calling loop runs via the AI SDK's `maxSteps`
(multi-step) — we assemble messages (system from instructions + memory recall +
history + input), call the SDK, persist new messages to memory.

### Tools
```ts
createTool({
  id, description,
  inputSchema: ZodSchema, outputSchema?: ZodSchema,
  execute: ({ context, runtimeContext, abortSignal }) => Promise<output>
}) → ToolAction
```
`toAISDKTool(tool)` adapts a `ToolAction` to the AI SDK `tool()` shape
(`parameters`, `execute`). Redtuma tools and raw AI SDK tools both accepted.

### MessageList
Normalizes strings / `CoreMessage` / persisted `RedtumaMessage`s into a
canonical `RedtumaMessage[]` (`{ id, role, content, createdAt, threadId,
resourceId }`). API: `.add(input, role = 'user')` (chainable), `.all()`
(→ `RedtumaMessage[]`, a copy), `.toCore()` (→ AI SDK `CoreMessage[]`, drops
redtuma-only metadata), and `.length`.

### Workflows (engine lives in core, may re-export from @redtuma/workflows)
```ts
createWorkflow({ id, inputSchema, outputSchema })
  .then(step).branch([[cond, step]]).parallel([...]).dountil(step, cond)
  .foreach(step).map(fn).commit()
createStep({ id, inputSchema, outputSchema, execute, resumeSchema?, suspendSchema? })
```
`run = workflow.createRun()`; `run.start({ inputData })` → `{ status:
'success'|'suspended'|'failed', result?, suspended?, steps }`; `run.resume({
step, resumeData })`. Default in-memory execution engine; pluggable later.

## @redtuma/store-* (Store interface)
```ts
interface Store {
  // threads
  saveThread / getThread / getThreadsByResourceId / deleteThread
  // messages
  saveMessages / getMessages({ threadId, last?, ... })
  // working memory / resources
  getResource / saveResource
  // generic kv for workflow snapshots
  persistSnapshot / loadSnapshot
}
```
`InMemoryStore` ships in `@redtuma/core` (default). `@redtuma/store-libsql`,
`@redtuma/store-pg`, and `@redtuma/store-do` implement the same interface.
Adapters prove parity by running `runStoreConformance` (from `@redtuma/spec`)
against their own factory.

### @redtuma/store-do (edge-native memory)
`DurableObjectStore` persists the `Store` in a single Cloudflare Durable
Object's key/value storage — one DO instance per conversation thread, so memory
is co-located, strongly consistent, hibernates when idle, and needs no external
database. It depends only on a minimal `KVStorage` interface (a structural
subset of `DurableObjectStorage`), so `MemoryKVStorage` can stand in for local
dev/test. `RedtumaMemoryObject` is the base DO class (exposes the store over a
JSON-RPC `fetch`); `durableObjectStoreClient(stub)` is the `Store` a Worker uses
to drive it. This is Redtuma's edge-native bet: first-class Workers deployment
with memory as a Durable Object, not a bolted-on Node adapter.

## @redtuma/memory
```ts
new Memory({ storage?, vector?, embedder?, options?: {
  lastMessages?: number,           // recent history window
  semanticRecall?: boolean | { topK, messageRange },
  workingMemory?: { enabled, template? },
  observational?: { enabled }      // background summarization
}})
```
`rememberMessages({ threadId, resourceId, vectorMessageSearch })` returns
`{ messages, systemContext }` to splice into the agent prompt. Saves messages +
embeddings on each turn.

## @redtuma/rag
`MDocument.chunk({ strategy, size, overlap })`, `embed(chunks, embedder)`,
`vector.query({ queryVector, topK })`. Vector stores share a `VectorStore`
interface (upsert/query/delete) implemented by store packages.

## @redtuma/observability
OpenTelemetry tracer wiring; `withSpan(name, fn)` helpers; instruments
`agent.generate/stream` and workflow steps. No-op tracer by default.

## @redtuma/mcp
`MCPClient({ servers })` exposes remote MCP tools as `ToolAction`s;
`MCPServer({ tools, agents })` serves local tools over MCP.

## @redtuma/deployer
`createHonoServer(redtuma)` exposes REST routes (`/api/agents/:id/generate`,
`/stream`, workflow run/resume). Deploy targets: Node, Bun, Cloudflare Workers.

## Conventions
- ESM-only, `type: module`. Build with `tsdown` → `dist/` (+ `.d.ts`).
- Subpath exports (`@redtuma/core/agent`, `/tools`, `/workflows`).
- Tests: `vitest`, colocated `*.test.ts`. Ported conformance specs under `spec/`.
- No secrets in code; providers read `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`.
