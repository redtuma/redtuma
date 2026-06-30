import { describe, it, expect } from 'vitest'
import { Agent, tieredModel, isModelRouter } from '@redtuma/core'
import { textModel } from '../src/mock-model'

describe('tieredModel / isModelRouter', () => {
  it('brands a router and detects it (and rejects plain models)', () => {
    const router = tieredModel({ tiers: [{ model: textModel('x') }] })
    expect(isModelRouter(router)).toBe(true)
    expect(isModelRouter('anthropic/claude-opus-4-8')).toBe(false)
    expect(isModelRouter(textModel('x'))).toBe(false)
  })

  it('requires at least one tier', () => {
    expect(() => tieredModel({ tiers: [] })).toThrow(/at least one tier/)
  })
})

describe('Agent adaptive routing', () => {
  it('keeps the cheap tier when accepted — no escalation', async () => {
    let escalated = false
    const agent = new Agent({
      id: 'cheap',
      instructions: 'x',
      model: tieredModel({
        tiers: [
          { model: textModel('GOOD'), accept: (r) => r.text === 'GOOD' },
          { model: textModel('STRONG') },
        ],
        onEscalate: () => {
          escalated = true
        },
      }),
    })
    const res = await agent.generate('hi')
    expect(res.text).toBe('GOOD')
    expect(res.routing).toEqual({ tier: 0, attempts: 1 })
    expect(escalated).toBe(false)
  })

  it('escalates to a stronger tier when the cheap result is rejected', async () => {
    const escalations: { from: number; to: number }[] = []
    const agent = new Agent({
      id: 'escalate',
      instructions: 'x',
      model: tieredModel({
        tiers: [
          { model: textModel('LOW'), accept: (r) => r.text !== 'LOW' },
          { model: textModel('HIGH') },
        ],
        onEscalate: (info) => escalations.push(info),
      }),
    })
    const res = await agent.generate('hi')
    expect(res.text).toBe('HIGH')
    expect(res.routing).toEqual({ tier: 1, attempts: 2 })
    expect(escalations).toEqual([{ from: 0, to: 1 }])
  })

  it('accepts the last tier even if its predicate would reject', async () => {
    const agent = new Agent({
      id: 'last',
      instructions: 'x',
      model: tieredModel({
        tiers: [
          { model: textModel('A'), accept: () => false },
          { model: textModel('B'), accept: () => false },
        ],
      }),
    })
    const res = await agent.generate('hi')
    expect(res.text).toBe('B')
    expect(res.routing).toEqual({ tier: 1, attempts: 2 })
  })
})
