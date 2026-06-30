import { describe, it, expect } from 'vitest'
import { RuntimeContext } from '@redtuma/core'

describe('RuntimeContext', () => {
  it('get/set/has round-trips values', () => {
    const ctx = new RuntimeContext<Record<string, unknown>>()
    expect(ctx.has('name')).toBe(false)
    ctx.set('name', 'redtuma')
    expect(ctx.get('name')).toBe('redtuma')
    expect(ctx.has('name')).toBe(true)
  })

  it('returns undefined for missing keys', () => {
    expect(new RuntimeContext<Record<string, unknown>>().get('nope')).toBeUndefined()
  })

  it('seeds from an initial record', () => {
    const ctx = new RuntimeContext({ region: 'edge' })
    expect(ctx.get('region')).toBe('edge')
  })
})
