import { describe, expect, it } from 'vitest'
import type { ChitumaMessage, Resource, Thread } from '@chituma/core'
import { LibSQLStore } from '../src/index'

function freshStore(): LibSQLStore {
  // Real embedded in-memory libSQL database — no network, no setup.
  return new LibSQLStore({ url: ':memory:' })
}

function thread(over: Partial<Thread> = {}): Thread {
  const now = new Date('2026-01-01T00:00:00.000Z')
  return {
    id: 't1',
    resourceId: 'r1',
    title: 'Greeting',
    metadata: { topic: 'demo' },
    createdAt: now,
    updatedAt: now,
    ...over,
  }
}

function message(over: Partial<ChitumaMessage> = {}): ChitumaMessage {
  return {
    id: 'm1',
    role: 'user',
    content: 'hello',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    threadId: 't1',
    resourceId: 'r1',
    ...over,
  }
}

describe('LibSQLStore', () => {
  it('auto-inits tables on first use without manual setup', async () => {
    const store = freshStore()
    // No init() called explicitly; the first read should just work.
    expect(await store.getThread('nope')).toBeNull()
    expect(await store.getMessages({ threadId: 'nope' })).toEqual([])
    expect(await store.getResource('nope')).toBeNull()
    expect(await store.loadSnapshot('nope')).toBeNull()
  })

  it('saves, gets, and reuses an existing client', async () => {
    const store = freshStore()
    const saved = await store.saveThread(thread())
    expect(saved.id).toBe('t1')

    const got = await store.getThread('t1')
    expect(got).not.toBeNull()
    expect(got?.title).toBe('Greeting')
    expect(got?.metadata).toEqual({ topic: 'demo' })
    expect(got?.createdAt).toBeInstanceOf(Date)
    expect(got?.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('upserts a thread on conflicting id', async () => {
    const store = freshStore()
    await store.saveThread(thread())
    await store.saveThread(thread({ title: 'Renamed', metadata: undefined }))

    const got = await store.getThread('t1')
    expect(got?.title).toBe('Renamed')
    expect(got?.metadata).toBeUndefined()
  })

  it('lists threads by resourceId', async () => {
    const store = freshStore()
    await store.saveThread(thread({ id: 'a', resourceId: 'r1' }))
    await store.saveThread(thread({ id: 'b', resourceId: 'r1' }))
    await store.saveThread(thread({ id: 'c', resourceId: 'r2' }))

    const r1 = await store.getThreadsByResourceId('r1')
    expect(r1.map((t) => t.id).sort()).toEqual(['a', 'b'])
    const r2 = await store.getThreadsByResourceId('r2')
    expect(r2.map((t) => t.id)).toEqual(['c'])
  })

  it('deletes a thread and cascades its messages', async () => {
    const store = freshStore()
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

  it('saves messages and returns them ordered by createdAt asc', async () => {
    const store = freshStore()
    await store.saveThread(thread())
    await store.saveMessages([
      message({ id: 'm3', createdAt: new Date('2026-01-01T00:00:03.000Z') }),
      message({ id: 'm1', createdAt: new Date('2026-01-01T00:00:01.000Z') }),
      message({ id: 'm2', createdAt: new Date('2026-01-01T00:00:02.000Z') }),
    ])

    const all = await store.getMessages({ threadId: 't1' })
    expect(all.map((m) => m.id)).toEqual(['m1', 'm2', 'm3'])
    expect(all[0]?.createdAt).toBeInstanceOf(Date)
  })

  it('returns the last N messages with `last`, still ascending', async () => {
    const store = freshStore()
    await store.saveThread(thread())
    await store.saveMessages(
      [1, 2, 3, 4, 5].map((n) =>
        message({
          id: `m${n}`,
          createdAt: new Date(`2026-01-01T00:00:0${n}.000Z`),
        }),
      ),
    )

    const last2 = await store.getMessages({ threadId: 't1', last: 2 })
    expect(last2.map((m) => m.id)).toEqual(['m4', 'm5'])
  })

  it('round-trips rich message content (parts array)', async () => {
    const store = freshStore()
    await store.saveThread(thread())
    const content = [{ type: 'text', text: 'hi' }] as ChitumaMessage['content']
    await store.saveMessages([message({ id: 'rich', content })])

    const [got] = await store.getMessages({ threadId: 't1' })
    expect(got?.content).toEqual(content)
  })

  it('upserts and gets a resource', async () => {
    const store = freshStore()
    const res: Resource = {
      id: 'r1',
      workingMemory: 'remember this',
      metadata: { a: 1 },
    }
    await store.saveResource(res)
    expect(await store.getResource('r1')).toEqual(res)

    await store.saveResource({ id: 'r1', workingMemory: 'updated' })
    const updated = await store.getResource('r1')
    expect(updated?.workingMemory).toBe('updated')
    expect(updated?.metadata).toBeUndefined()
  })

  it('round-trips a snapshot object value and upserts it', async () => {
    const store = freshStore()
    const value = { step: 'a', nested: { count: 2 }, list: [1, 2, 3] }
    await store.persistSnapshot('wf:run1', value)
    expect(await store.loadSnapshot('wf:run1')).toEqual(value)

    await store.persistSnapshot('wf:run1', { step: 'b' })
    expect(await store.loadSnapshot('wf:run1')).toEqual({ step: 'b' })
  })

  it('accepts an externally supplied client', async () => {
    const { createClient } = await import('@libsql/client')
    const client = createClient({ url: ':memory:' })
    const store = new LibSQLStore({ client })
    await store.saveThread(thread())
    expect((await store.getThread('t1'))?.id).toBe('t1')
  })
})
