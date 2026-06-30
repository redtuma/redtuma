import type { Store } from '@redtuma/core/store'
import { DurableObjectStore } from './store'
import type { KVStorage } from './storage'

/** Cloudflare's `DurableObjectStorage` is a structural superset of this. */
export type DurableObjectStorageLike = KVStorage

const STORE_METHODS = new Set<keyof Store>([
  'saveThread',
  'getThread',
  'getThreadsByResourceId',
  'deleteThread',
  'saveMessages',
  'getMessages',
  'getResource',
  'saveResource',
  'persistSnapshot',
  'loadSnapshot',
])

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Base class for a Redtuma memory Durable Object. Each instance owns one
 * conversation's persistent state through a {@link DurableObjectStore}, exposed
 * over a tiny JSON-RPC `fetch` so a Worker can drive it with
 * {@link durableObjectStoreClient}. Subclass it and forward `state.storage`:
 *
 * ```ts
 * export class Memory extends RedtumaMemoryObject {
 *   constructor(state: DurableObjectState) {
 *     super(state.storage as unknown as KVStorage)
 *   }
 * }
 * ```
 */
export class RedtumaMemoryObject {
  protected readonly memory: Store

  constructor(storage: KVStorage) {
    this.memory = new DurableObjectStore(storage)
  }

  async fetch(request: Request): Promise<Response> {
    let body: { method?: string; args?: unknown[] }
    try {
      body = (await request.json()) as { method?: string; args?: unknown[] }
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }

    const method = body.method
    if (!method || !STORE_METHODS.has(method as keyof Store)) {
      return json({ error: `Unknown store method "${String(method)}".` }, 400)
    }

    try {
      const fn = this.memory[method as keyof Store] as (...args: unknown[]) => Promise<unknown>
      const result = await fn.apply(this.memory, body.args ?? [])
      return json({ result })
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) }, 500)
    }
  }
}

/** Anything that can take a `Request` and return a `Response` — e.g. a DO stub. */
export interface Fetcher {
  fetch(request: Request): Promise<Response>
}

/**
 * A {@link Store} whose calls are forwarded to a remote {@link RedtumaMemoryObject}
 * (or any {@link Fetcher}, such as a Durable Object stub) over JSON-RPC. This is
 * what a Worker uses as its agent/memory storage:
 *
 * ```ts
 * const id = env.MEMORY.idFromName(threadId)
 * const store = durableObjectStoreClient(env.MEMORY.get(id))
 * ```
 *
 * Note: values round-trip through JSON, so `Date` fields arrive as ISO strings.
 */
export function durableObjectStoreClient(fetcher: Fetcher): Store {
  const call = async (method: keyof Store, args: unknown[]): Promise<unknown> => {
    const res = await fetcher.fetch(
      new Request('https://redtuma-memory/rpc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ method, args }),
      }),
    )
    const data = (await res.json()) as { result?: unknown; error?: string }
    if (!res.ok || data.error) {
      throw new Error(data.error ?? `Memory store RPC failed (HTTP ${res.status}).`)
    }
    return data.result
  }

  return {
    saveThread: (t) => call('saveThread', [t]) as Promise<never>,
    getThread: (id) => call('getThread', [id]) as Promise<never>,
    getThreadsByResourceId: (rid) => call('getThreadsByResourceId', [rid]) as Promise<never>,
    deleteThread: (id) => call('deleteThread', [id]) as Promise<void>,
    saveMessages: (m) => call('saveMessages', [m]) as Promise<never>,
    getMessages: (a) => call('getMessages', [a]) as Promise<never>,
    getResource: (id) => call('getResource', [id]) as Promise<never>,
    saveResource: (r) => call('saveResource', [r]) as Promise<never>,
    persistSnapshot: (k, v) => call('persistSnapshot', [k, v]) as Promise<void>,
    loadSnapshot: (k) => call('loadSnapshot', [k]) as Promise<never>,
  }
}
