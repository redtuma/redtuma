import { describe, it, expect } from 'vitest'
import { MessageList } from '@redtuma/core'

describe('MessageList normalization', () => {
  it('wraps a bare string as a user message', () => {
    const list = new MessageList()
    list.add('hi')
    expect(list.length).toBe(1)
    expect(list.toCore()).toEqual([{ role: 'user', content: 'hi' }])
  })

  it('honors an explicit role', () => {
    const list = new MessageList()
    list.add('you are helpful', 'system')
    expect(list.toCore()).toEqual([{ role: 'system', content: 'you are helpful' }])
  })

  it('accepts an array of CoreMessages preserving order and roles', () => {
    const list = new MessageList()
    list.add([
      { role: 'assistant', content: 'a' },
      { role: 'user', content: 'b' },
    ])
    expect(list.length).toBe(2)
    expect(list.toCore()).toEqual([
      { role: 'assistant', content: 'a' },
      { role: 'user', content: 'b' },
    ])
  })

  it('stamps canonical metadata (id + createdAt) on each message', () => {
    const list = new MessageList()
    list.add('hi')
    const [msg] = list.all()
    expect(msg!.id).toMatch(/^msg_/)
    expect(msg!.createdAt).toBeInstanceOf(Date)
    expect(msg!.role).toBe('user')
  })

  it('all() returns a copy, not the internal array', () => {
    const list = new MessageList()
    list.add('hi')
    const snapshot = list.all()
    snapshot.pop()
    expect(list.length).toBe(1)
  })

  it('drops redtuma-only metadata in toCore()', () => {
    const list = new MessageList()
    list.add('hi')
    const core = list.toCore()
    expect(Object.keys(core[0]!).sort()).toEqual(['content', 'role'])
  })
})
