import { describe, it, expect } from 'vitest'
import { RedtumaMemoryObject, MemoryKVStorage, durableObjectStoreClient } from '../src'

// A concrete DO over in-memory storage; the client talks to it via fetch RPC,
// exercising the full Worker -> Durable Object path without the CF runtime.
class TestMemoryObject extends RedtumaMemoryObject {}

describe('Durable Object memory RPC', () => {
  it('round-trips threads and messages through fetch', async () => {
    const object = new TestMemoryObject(new MemoryKVStorage())
    const store = durableObjectStoreClient({ fetch: (req) => object.fetch(req) })

    await store.saveThread({ id: 't1', resourceId: 'r1', createdAt: new Date(), updatedAt: new Date() })
    expect(await store.getThread('t1')).toMatchObject({ id: 't1', resourceId: 'r1' })

    await store.saveMessages([
      { id: 'm1', role: 'user', content: 'hello', createdAt: new Date(), threadId: 't1', resourceId: 'r1' },
      { id: 'm2', role: 'assistant', content: 'hi', createdAt: new Date(), threadId: 't1', resourceId: 'r1' },
    ])
    const messages = await store.getMessages({ threadId: 't1' })
    expect(messages.map((m) => m.id)).toEqual(['m1', 'm2'])
  })

  it('persists and loads workflow snapshots', async () => {
    const object = new TestMemoryObject(new MemoryKVStorage())
    const store = durableObjectStoreClient({ fetch: (req) => object.fetch(req) })

    await store.persistSnapshot('run:42', { step: 'gate', cursor: 3 })
    expect(await store.loadSnapshot('run:42')).toEqual({ step: 'gate', cursor: 3 })
    expect(await store.loadSnapshot('missing')).toBeNull()
  })

  it('rejects unknown methods', async () => {
    const object = new TestMemoryObject(new MemoryKVStorage())
    const res = await object.fetch(
      new Request('https://redtuma-memory/rpc', {
        method: 'POST',
        body: JSON.stringify({ method: 'dropDatabase', args: [] }),
      }),
    )
    expect(res.status).toBe(400)
  })
})
