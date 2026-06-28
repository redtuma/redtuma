import { describe, it, expect } from 'vitest'
import { InMemoryStore } from '../src/store'
import { MessageList } from '../src/message-list'

describe('MessageList', () => {
  it('normalizes strings and core messages', () => {
    const list = new MessageList({ threadId: 't1' })
    list.add('hello')
    list.add({ role: 'assistant', content: 'hi' })
    const core = list.toCore()
    expect(core).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ])
    expect(list.all()[0]!.threadId).toBe('t1')
  })
})

describe('InMemoryStore', () => {
  it('stores threads and messages', async () => {
    const store = new InMemoryStore()
    await store.saveThread({
      id: 't1',
      resourceId: 'r1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await store.saveMessages([
      { id: 'm1', role: 'user', content: 'a', createdAt: new Date(), threadId: 't1' },
      { id: 'm2', role: 'assistant', content: 'b', createdAt: new Date(), threadId: 't1' },
    ])
    expect(await store.getMessages({ threadId: 't1' })).toHaveLength(2)
    expect(await store.getMessages({ threadId: 't1', last: 1 })).toHaveLength(1)
    expect((await store.getThreadsByResourceId('r1'))[0]!.id).toBe('t1')
  })

  it('round-trips snapshots and resources', async () => {
    const store = new InMemoryStore()
    await store.persistSnapshot('k', { a: 1 })
    expect(await store.loadSnapshot('k')).toEqual({ a: 1 })
    await store.saveResource({ id: 'r1', workingMemory: 'notes' })
    expect((await store.getResource('r1'))?.workingMemory).toBe('notes')
  })
})
