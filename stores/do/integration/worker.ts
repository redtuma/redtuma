// Self-testing Worker that runs DurableObjectStore inside a real Durable Object.
// Bundled and executed by workerd via `wrangler dev` — see verify.mjs / README.
import { RedtumaMemoryObject, durableObjectStoreClient } from '../src/index'

export class Memory extends RedtumaMemoryObject {
  // Cloudflare's DurableObjectStorage is a structural superset of KVStorage.
  constructor(state: { storage: unknown }) {
    super(state.storage as never)
  }
}

interface Env {
  MEMORY: {
    idFromName(name: string): unknown
    get(id: unknown): { fetch(request: Request): Promise<Response> }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const threadId = new URL(request.url).searchParams.get('t') ?? 'default'
    const store = durableObjectStoreClient(env.MEMORY.get(env.MEMORY.idFromName(threadId)))

    await store.saveThread({ id: threadId, resourceId: 'r1', createdAt: new Date(), updatedAt: new Date() })
    await store.saveMessages([
      { id: 'm1', role: 'user', content: 'a', createdAt: new Date(), threadId, resourceId: 'r1' },
      { id: 'm2', role: 'assistant', content: 'b', createdAt: new Date(), threadId, resourceId: 'r1' },
      { id: 'm3', role: 'user', content: 'c', createdAt: new Date(), threadId, resourceId: 'r1' },
    ])

    const thread = await store.getThread(threadId)
    const all = await store.getMessages({ threadId })
    const last2 = await store.getMessages({ threadId, last: 2 })
    await store.persistSnapshot('run:1', { step: 'gate', cursor: 5 })
    const snap = await store.loadSnapshot('run:1')

    return Response.json({
      ok: true,
      threadFound: thread?.id === threadId,
      ids: all.map((m) => m.id),
      last2: last2.map((m) => m.id),
      snap,
    })
  },
}
