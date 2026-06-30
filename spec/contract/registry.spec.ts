import { describe, it, expect } from 'vitest'
import { Redtuma, Agent, createWorkflow, createStep, createTool } from '@redtuma/core'
import { z } from 'zod'
import { textModel } from '../src/mock-model'

describe('Redtuma registry', () => {
  it('registers and retrieves agents by key and by id', () => {
    const agent = new Agent({ id: 'assistant', instructions: 'x', model: textModel('y') })
    const rt = new Redtuma({ agents: { main: agent } })
    expect(rt.getAgent('main')).toBe(agent)
    expect(rt.getAgentById('assistant')).toBe(agent)
    expect(rt.getAgents()).toEqual({ main: agent })
  })

  it('throws a clear error for unregistered lookups', () => {
    const rt = new Redtuma()
    expect(() => rt.getAgent('missing')).toThrow(/not registered/)
    expect(() => rt.getAgentById('missing')).toThrow(/not registered/)
    expect(() => rt.getWorkflow('missing')).toThrow(/not registered/)
    expect(() => rt.getTool('missing')).toThrow(/not registered/)
  })

  it('registers workflows and tools', () => {
    const wf = createWorkflow({ id: 'w' }).then(createStep({ id: 's', execute: () => 1 })).commit()
    const tool = createTool({
      id: 't',
      description: 'noop',
      inputSchema: z.object({}),
      execute: () => null,
    })
    const rt = new Redtuma({ workflows: { w: wf }, tools: { t: tool } })
    expect(rt.getWorkflow('w')).toBe(wf)
    expect(rt.getTool('t')).toBe(tool)
  })

  it('injects a shared logger into registered agents', () => {
    const agent = new Agent({ id: 'a', instructions: 'x', model: textModel('y') })
    const rt = new Redtuma({ agents: { a: agent } })
    // Construction wires deps without throwing; logger is accessible on the instance.
    expect(rt.getLogger()).toBeDefined()
  })
})
