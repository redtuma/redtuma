# @redtuma/store-do

Edge-native agent memory for Redtuma, backed by a **Cloudflare Durable Object**.
No external database: each conversation thread lives in its own strongly
consistent, co-located DO instance that hibernates when idle and wakes on the
next request — the natural home for agent state and human-in-the-loop workflows.

It implements the standard Redtuma [`Store`](../../packages/core/src/store/index.ts)
interface, so anything that takes a `Store` (memory, workflow snapshots) works
unchanged.

## Install

```bash
pnpm add @redtuma/store-do
```

## Define the Durable Object

```ts
// src/memory.ts
import { RedtumaMemoryObject, type KVStorage } from '@redtuma/store-do'

export class Memory extends RedtumaMemoryObject {
  constructor(state: DurableObjectState) {
    super(state.storage as unknown as KVStorage)
  }
}
```

## Use it from a Worker

```ts
// src/worker.ts
import { Agent } from '@redtuma/core'
import { durableObjectStoreClient } from '@redtuma/store-do'
export { Memory } from './memory'

interface Env {
  MEMORY: DurableObjectNamespace
  ANTHROPIC_API_KEY: string
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { threadId, message } = await req.json<{ threadId: string; message: string }>()

    // One Durable Object per thread → strongly consistent per-conversation memory.
    const stub = env.MEMORY.get(env.MEMORY.idFromName(threadId))
    const store = durableObjectStoreClient(stub)

    const agent = new Agent({
      id: 'assistant',
      instructions: 'You are helpful.',
      model: 'anthropic/claude-opus-4-8',
    })

    // Persist this turn, then answer using prior history from the DO.
    await store.saveThread({
      id: threadId, resourceId: 'user', createdAt: new Date(), updatedAt: new Date(),
    })
    const history = await store.getMessages({ threadId, last: 20 })
    const res = await agent.generate([
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ])

    await store.saveMessages([
      { id: crypto.randomUUID(), role: 'user', content: message, createdAt: new Date(), threadId, resourceId: 'user' },
      { id: crypto.randomUUID(), role: 'assistant', content: res.text, createdAt: new Date(), threadId, resourceId: 'user' },
    ])
    return Response.json({ text: res.text })
  },
}
```

See [`wrangler.example.toml`](./wrangler.example.toml) for the binding + migration.

## Local development & testing

`MemoryKVStorage` mirrors the DO storage semantics (structured-clone writes,
lexicographic key ordering) with no Workers runtime — ideal for unit tests and
local runs:

```ts
import { DurableObjectStore, MemoryKVStorage } from '@redtuma/store-do'
const store = new DurableObjectStore(new MemoryKVStorage())
```

This adapter passes the shared `runStoreConformance` suite — the same contract
the reference `InMemoryStore` satisfies.

## API

- `DurableObjectStore(storage: KVStorage)` — the `Store` implementation.
- `MemoryKVStorage` — in-memory `KVStorage` for dev/test.
- `RedtumaMemoryObject` — base Durable Object class exposing the store over JSON-RPC.
- `durableObjectStoreClient(fetcher)` — a `Store` that forwards to a DO stub.
