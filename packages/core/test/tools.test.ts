import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { createTool, isToolAction, buildToolset } from '../src/tools'
import { RuntimeContext } from '../src/types'

describe('tools', () => {
  const weather = createTool({
    id: 'get-weather',
    description: 'Get weather',
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ context }) => ({ tempC: 21, city: context.city }),
  })

  it('creates a tool action', () => {
    expect(isToolAction(weather)).toBe(true)
    expect(weather.id).toBe('get-weather')
  })

  it('executes with typed context', async () => {
    const out = await weather.execute({
      context: { city: 'Taipei' },
      runtimeContext: new RuntimeContext(),
    })
    expect(out).toEqual({ tempC: 21, city: 'Taipei' })
  })

  it('builds an AI SDK toolset', () => {
    const set = buildToolset({ weather }, new RuntimeContext())
    expect(set).toBeDefined()
    expect(Object.keys(set!)).toEqual(['weather'])
    expect(typeof set!.weather!.execute).toBe('function')
  })
})
