import { describe, it, expect } from 'vitest'
import type { Store, Thread, RedtumaMessage } from '@redtuma/core'

/**
 * Reusable behavioral contract for any {@link Store} adapter. `@redtuma/store-pg`,
 * `@redtuma/store-libsql`, etc. can each call this to prove they behave like the
 * reference `InMemoryStore`. `makeStore` must return a fresh, empty store.
 */
export function runStoreConformance(name: string, makeStore: () => Store): void {
  const thread = (id: string, resourceId: string): Thread => ({
    id,
    resourceId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const message = (id: string, content: string, threadId: string): RedtumaMessage => ({
    id,
    role: 'user',
    content,
    createdAt: new Date(),
    threadId,
    resourceId: 'r1',
  })

  describe(`Store conformance: ${name}`, () => {
    it('saves and retrieves a thread', async () => {
      const store = makeStore()
      await store.saveThread(thread('t1', 'r1'))
      expect(await store.getThread('t1')).toMatchObject({ id: 't1', resourceId: 'r1' })
    })

    it('returns null for a missing thread', async () => {
      expect(await makeStore().getThread('nope')).toBeNull()
    })

    it('lists threads by resourceId', async () => {
      const store = makeStore()
      await store.saveThread(thread('t1', 'r1'))
      await store.saveThread(thread('t2', 'r1'))
      await store.saveThread(thread('t3', 'r2'))
      const found = await store.getThreadsByResourceId('r1')
      expect(found.map((t) => t.id).sort()).toEqual(['t1', 't2'])
    })

    it('saves and retrieves messages in order', async () => {
      const store = makeStore()
      await store.saveThread(thread('t1', 'r1'))
      await store.saveMessages([
        message('m1', 'a', 't1'),
        message('m2', 'b', 't1'),
        message('m3', 'c', 't1'),
      ])
      const all = await store.getMessages({ threadId: 't1' })
      expect(all.map((m) => m.id)).toEqual(['m1', 'm2', 'm3'])
    })

    it('honors the `last` window', async () => {
      const store = makeStore()
      await store.saveThread(thread('t1', 'r1'))
      await store.saveMessages([
        message('m1', 'a', 't1'),
        message('m2', 'b', 't1'),
        message('m3', 'c', 't1'),
      ])
      const last2 = await store.getMessages({ threadId: 't1', last: 2 })
      expect(last2.map((m) => m.id)).toEqual(['m2', 'm3'])
    })

    it('deletes a thread and its messages', async () => {
      const store = makeStore()
      await store.saveThread(thread('t1', 'r1'))
      await store.saveMessages([message('m1', 'a', 't1')])
      await store.deleteThread('t1')
      expect(await store.getThread('t1')).toBeNull()
      expect(await store.getMessages({ threadId: 't1' })).toEqual([])
    })

    it('saves and retrieves a resource (working memory)', async () => {
      const store = makeStore()
      await store.saveResource({ id: 'r1', workingMemory: 'notes' })
      expect(await store.getResource('r1')).toMatchObject({ id: 'r1', workingMemory: 'notes' })
      expect(await store.getResource('missing')).toBeNull()
    })

    it('persists and loads snapshots, null when absent', async () => {
      const store = makeStore()
      await store.persistSnapshot('k', { a: 1 })
      expect(await store.loadSnapshot('k')).toEqual({ a: 1 })
      expect(await store.loadSnapshot('missing')).toBeNull()
    })
  })
}
