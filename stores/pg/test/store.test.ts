import { PGlite } from '@electric-sql/pglite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChitumaMessage, Thread } from '@chituma/core'
import { PgStore } from '../src/index'

function makeStore(): PgStore {
  return new PgStore({ client: new PGlite() })
}

function thread(over: Partial<Thread> = {}): Thread {
  const now = new Date()
  return {
    id: 't1',
    resourceId: 'r1',
    title: 'Hello',
    metadata: { foo: 'bar' },
    createdAt: now,
    updatedAt: now,
    ...over,
  }
}

function message(over: Partial<ChitumaMessage> = {}): ChitumaMessage {
  return {
    id: 'm1',
    role: 'user',
    content: 'hi',
    createdAt: new Date(),
    threadId: 't1',
    resourceId: 'r1',
    ...over,
  }
}

describe('PgStore (PGlite)', () => {
  let store: PgStore

  beforeEach(() => {
    store = makeStore()
  })

  it('auto-inits on a fresh db', async () => {
    // No explicit init() — first call should create tables and not throw.
    const got = await store.getThread('missing')
    expect(got).toBeNull()
  })

  describe('threads', () => {
    it('saves and gets a thread, reviving Date and JSON', async () => {
      const t = thread()
      const saved = await store.saveThread(t)
      expect(saved).toEqual(t)

      const got = await store.getThread('t1')
      expect(got).not.toBeNull()
      expect(got!.id).toBe('t1')
      expect(got!.resourceId).toBe('r1')
      expect(got!.title).toBe('Hello')
      expect(got!.metadata).toEqual({ foo: 'bar' })
      expect(got!.createdAt).toBeInstanceOf(Date)
      expect(got!.updatedAt).toBeInstanceOf(Date)
      expect(got!.createdAt.getTime()).toBe(t.createdAt.getTime())
    })

    it('upserts on conflicting id', async () => {
      await store.saveThread(thread())
      await store.saveThread(thread({ title: 'Updated' }))
      const got = await store.getThread('t1')
      expect(got!.title).toBe('Updated')
    })

    it('gets threads by resourceId', async () => {
      await store.saveThread(thread({ id: 't1', resourceId: 'r1' }))
      await store.saveThread(thread({ id: 't2', resourceId: 'r1' }))
      await store.saveThread(thread({ id: 't3', resourceId: 'r2' }))

      const forR1 = await store.getThreadsByResourceId('r1')
      expect(forR1.map((t) => t.id).sort()).toEqual(['t1', 't2'])

      const forR2 = await store.getThreadsByResourceId('r2')
      expect(forR2.map((t) => t.id)).toEqual(['t3'])
    })

    it('handles a thread with no metadata/title', async () => {
      await store.saveThread(
        thread({ id: 'bare', title: undefined, metadata: undefined }),
      )
      const got = await store.getThread('bare')
      expect(got!.title).toBeUndefined()
      expect(got!.metadata).toBeUndefined()
    })

    it('deleteThread cascades messages', async () => {
      await store.saveThread(thread())
      await store.saveMessages([
        message({ id: 'm1' }),
        message({ id: 'm2' }),
      ])
      expect((await store.getMessages({ threadId: 't1' })).length).toBe(2)

      await store.deleteThread('t1')
      expect(await store.getThread('t1')).toBeNull()
      expect(await store.getMessages({ threadId: 't1' })).toEqual([])
    })
  })

  describe('messages', () => {
    beforeEach(async () => {
      await store.saveThread(thread())
    })

    it('saves messages and returns them in createdAt asc order', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z')
      await store.saveMessages([
        message({ id: 'b', createdAt: new Date(t0.getTime() + 2000) }),
        message({ id: 'a', createdAt: new Date(t0.getTime() + 1000) }),
        message({ id: 'c', createdAt: new Date(t0.getTime() + 3000) }),
      ])
      const got = await store.getMessages({ threadId: 't1' })
      expect(got.map((m) => m.id)).toEqual(['a', 'b', 'c'])
    })

    it('preserves insertion order as a tiebreak on equal createdAt', async () => {
      const same = new Date('2026-01-01T00:00:00Z')
      await store.saveMessages([
        message({ id: 'x', createdAt: same }),
        message({ id: 'y', createdAt: same }),
        message({ id: 'z', createdAt: same }),
      ])
      const got = await store.getMessages({ threadId: 't1' })
      expect(got.map((m) => m.id)).toEqual(['x', 'y', 'z'])
    })

    it('applies the `last` window over the most recent messages', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z')
      await store.saveMessages(
        [1, 2, 3, 4, 5].map((n) =>
          message({ id: `m${n}`, createdAt: new Date(t0.getTime() + n * 1000) }),
        ),
      )
      const got = await store.getMessages({ threadId: 't1', last: 2 })
      expect(got.map((m) => m.id)).toEqual(['m4', 'm5'])
    })

    it('round-trips array content (CoreMessage parts) as JSON', async () => {
      const content = [
        { type: 'text', text: 'hello' },
        { type: 'text', text: 'world' },
      ] as ChitumaMessage['content']
      await store.saveMessages([message({ id: 'arr', content })])
      const [got] = await store.getMessages({ threadId: 't1' })
      expect(got!.content).toEqual(content)
      expect(got!.createdAt).toBeInstanceOf(Date)
    })

    it('ignores messages without a threadId', async () => {
      await store.saveMessages([message({ id: 'orphan', threadId: undefined })])
      const got = await store.getMessages({ threadId: 't1' })
      expect(got).toEqual([])
    })

    it('returns [] for an empty batch', async () => {
      const res = await store.saveMessages([])
      expect(res).toEqual([])
    })
  })

  describe('resources', () => {
    it('returns null for a missing resource', async () => {
      expect(await store.getResource('nope')).toBeNull()
    })

    it('upserts and gets a resource', async () => {
      await store.saveResource({
        id: 'r1',
        workingMemory: 'remember this',
        metadata: { a: 1 },
      })
      let got = await store.getResource('r1')
      expect(got).toEqual({
        id: 'r1',
        workingMemory: 'remember this',
        metadata: { a: 1 },
      })

      await store.saveResource({ id: 'r1', workingMemory: 'updated' })
      got = await store.getResource('r1')
      expect(got!.workingMemory).toBe('updated')
      expect(got!.metadata).toBeUndefined()
    })
  })

  describe('snapshots', () => {
    it('returns null for a missing snapshot', async () => {
      expect(await store.loadSnapshot('missing')).toBeNull()
    })

    it('round-trips an object snapshot and upserts', async () => {
      const value = { step: 'a', nested: { count: 2 }, items: [1, 2, 3] }
      await store.persistSnapshot('wf:1', value)
      expect(await store.loadSnapshot('wf:1')).toEqual(value)

      await store.persistSnapshot('wf:1', { step: 'b' })
      expect(await store.loadSnapshot('wf:1')).toEqual({ step: 'b' })
    })
  })
})
