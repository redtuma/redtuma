import { describe, it, expect } from 'vitest'
import { createTool, isToolAction, toAISDKTool, buildToolset, RuntimeContext } from '@redtuma/core'
import { z } from 'zod'

// A concretely-typed tool must pass straight into toAISDKTool/buildToolset
// without an explicit AnyToolAction annotation (regression guard for the
// toAISDKTool signature).
const add = createTool({
  id: 'add',
  description: 'Add two numbers',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  execute: async ({ context }) => context.a + context.b,
})

describe('createTool / isToolAction', () => {
  it('produces a ToolAction with the documented fields', () => {
    expect(add.id).toBe('add')
    expect(add.description).toBe('Add two numbers')
    expect(typeof add.execute).toBe('function')
    expect(add.inputSchema).toBeDefined()
  })

  it('recognises tool actions and rejects plain objects', () => {
    expect(isToolAction(add)).toBe(true)
    expect(isToolAction({ id: 'x' })).toBe(false)
    expect(isToolAction(null)).toBe(false)
    expect(isToolAction(() => {})).toBe(false)
  })

  it('validates and runs execute with the parsed context', async () => {
    const out = await add.execute({ context: { a: 2, b: 3 }, runtimeContext: new RuntimeContext() })
    expect(out).toBe(5)
  })
})

describe('toAISDKTool / buildToolset', () => {
  it('adapts a ToolAction to the AI SDK tool shape', async () => {
    const aiTool = toAISDKTool(add, new RuntimeContext())
    expect(aiTool.description).toBe('Add two numbers')
    expect(aiTool.parameters).toBeDefined()
    expect(typeof aiTool.execute).toBe('function')
    const out = await aiTool.execute!(
      { a: 4, b: 6 },
      { toolCallId: '1', messages: [], abortSignal: undefined },
    )
    expect(out).toBe(10)
  })

  it('builds a toolset, adapting redtuma tools and passing AI SDK tools through', () => {
    const passthrough = { description: 'raw', parameters: z.object({}), execute: async () => 'ok' }
    const set = buildToolset({ add, passthrough }, new RuntimeContext())
    expect(set && Object.keys(set).sort()).toEqual(['add', 'passthrough'])
    expect(set!.passthrough).toBe(passthrough)
  })

  it('returns undefined for an undefined toolset', () => {
    expect(buildToolset(undefined, new RuntimeContext())).toBeUndefined()
  })
})
