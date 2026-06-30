import type { Agent } from '@redtuma/core'
import { RuntimeContext, createTool } from '@redtuma/core'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { MCPClient } from '../src/client'
import { MCPServer } from '../src/server'

const echoTool = createTool({
  id: 'echo',
  description: 'Echo the provided text back.',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({ text: z.string() }),
  execute: async ({ context }) => ({ text: context.text }),
})

describe('MCPServer + MCPClient over in-memory transport', () => {
  it('exposes a ToolAction as a remote tool the client can list and call', async () => {
    const server = new MCPServer({ tools: { echo: echoTool } })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)

    const client = new MCPClient({ servers: { local: { transport: clientTransport } } })
    const tools = await client.getTools()

    expect(Object.keys(tools)).toContain('local_echo')
    const echo = tools.local_echo
    expect(echo?.id).toBe('local_echo')
    expect(echo?.description).toBe('Echo the provided text back.')

    const result = await echo!.execute({
      context: { text: 'hello world' },
      runtimeContext: new RuntimeContext(),
    })
    expect(result).toEqual({ text: 'hello world' })

    await client.disconnect()
    await server.close()
  })

  it('exposes an Agent as an ask_<name> tool', async () => {
    // Minimal Agent stub: MCPServer only calls generate() and reads .text,
    // so we avoid pulling the `ai` package into this offline test.
    const agent = {
      id: 'helper',
      name: 'helper',
      async generate(input: string) {
        return { text: `echo:${input}` }
      },
    } as unknown as Agent

    const server = new MCPServer({ agents: { helper: agent } })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)

    const client = new MCPClient({ servers: { ai: { transport: clientTransport } } })
    const tools = await client.getTools()

    expect(Object.keys(tools)).toContain('ai_ask_helper')
    const ask = tools.ai_ask_helper
    const out = await ask!.execute({
      context: { prompt: 'ping' },
      runtimeContext: new RuntimeContext(),
    })
    expect(out).toBe('echo:ping')

    await client.disconnect()
    await server.close()
  })
})
