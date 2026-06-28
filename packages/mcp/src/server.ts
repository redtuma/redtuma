import type { Agent, ToolAction } from '@chituma/core'
import { RuntimeContext } from '@chituma/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { z } from 'zod'

export interface MCPServerConfig {
  name?: string
  version?: string
  /** Local tools to expose over MCP. Keys are advisory; the tool id is used. */
  tools?: Record<string, ToolAction>
  /** Agents to expose as `ask_<name>` tools. */
  agents?: Record<string, Agent>
}

type ZodRawShape = Record<string, z.ZodTypeAny>

/**
 * Extract a raw shape (`{ field: zodType }`) from a tool's input schema so the
 * MCP SDK can publish it and parse incoming arguments. Non-object schemas are
 * exposed as a single optional passthrough.
 */
function toRawShape(schema: z.ZodTypeAny): ZodRawShape {
  if (schema instanceof z.ZodObject) {
    return schema.shape as ZodRawShape
  }
  return { input: schema.optional() }
}

/** Coerce an arbitrary tool/agent return value into an MCP CallToolResult. */
function toCallToolResult(value: unknown): CallToolResult {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const result: CallToolResult = {
    content: [{ type: 'text', text: text ?? '' }],
  }
  if (value !== null && typeof value === 'object') {
    result.structuredContent = value as Record<string, unknown>
  }
  return result
}

/**
 * Serves Chituma {@link ToolAction}s (and optionally {@link Agent}s) over the
 * Model Context Protocol. Connect it to any MCP transport via {@link connect}.
 */
export class MCPServer {
  private readonly server: McpServer

  constructor(config: MCPServerConfig = {}) {
    this.server = new McpServer({
      name: config.name ?? 'chituma-mcp-server',
      version: config.version ?? '0.0.1',
    })

    for (const tool of Object.values(config.tools ?? {})) {
      this.registerTool(tool)
    }
    for (const [name, agent] of Object.entries(config.agents ?? {})) {
      this.registerAgent(name, agent)
    }
  }

  private registerTool(tool: ToolAction): void {
    this.server.registerTool(
      tool.id,
      {
        description: tool.description,
        inputSchema: toRawShape(tool.inputSchema),
      },
      async (args: Record<string, unknown>) => {
        const output = await tool.execute({
          context: args,
          runtimeContext: new RuntimeContext(),
        })
        return toCallToolResult(output)
      },
    )
  }

  private registerAgent(name: string, agent: Agent): void {
    this.server.registerTool(
      `ask_${name}`,
      {
        description: `Ask the ${name} agent. Provide a natural-language prompt.`,
        inputSchema: { prompt: z.string() },
      },
      async (args: { prompt: string }) => {
        const result = await agent.generate(args.prompt)
        return toCallToolResult(result.text)
      },
    )
  }

  /** Connect the server to a transport and begin serving requests. */
  async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport)
  }

  /** Close the underlying server connection. */
  async close(): Promise<void> {
    await this.server.close()
  }
}
