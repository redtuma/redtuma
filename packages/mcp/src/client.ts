import type { ToolAction } from '@chituma/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { z } from 'zod'

/** Connect to a remote MCP server over HTTP (StreamableHTTP). */
export interface HttpServerSpec {
  url: string
}

/** Spawn a local MCP server over stdio. */
export interface StdioServerSpec {
  command: string
  args?: string[]
  env?: Record<string, string>
}

/** Use an already-constructed transport (e.g. the in-memory pair in tests). */
export interface TransportServerSpec {
  transport: Transport
}

export type ServerSpec = HttpServerSpec | StdioServerSpec | TransportServerSpec

export interface MCPClientConfig {
  servers: Record<string, ServerSpec>
  /** Client identity advertised to servers. */
  name?: string
  version?: string
}

function isTransportSpec(spec: ServerSpec): spec is TransportServerSpec {
  return 'transport' in spec && spec.transport != null
}

function isStdioSpec(spec: ServerSpec): spec is StdioServerSpec {
  return 'command' in spec && typeof spec.command === 'string'
}

function createTransport(spec: ServerSpec): Transport {
  if (isTransportSpec(spec)) return spec.transport
  if (isStdioSpec(spec)) {
    return new StdioClientTransport({
      command: spec.command,
      args: spec.args,
      env: spec.env,
    })
  }
  return new StreamableHTTPClientTransport(new URL(spec.url))
}

interface ToolResultContent {
  type: string
  text?: string
  [k: string]: unknown
}

/** Extract the meaningful payload from an MCP `callTool` result. */
function unwrapToolResult(result: unknown): unknown {
  const r = result as { structuredContent?: unknown; content?: unknown }
  if (r.structuredContent !== undefined) return r.structuredContent
  const content = Array.isArray(r.content) ? (r.content as ToolResultContent[]) : []
  const textParts = content
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text as string)
  if (textParts.length > 0) return textParts.join('\n')
  return content
}

/**
 * Connects to one or more MCP servers and exposes their tools as Chituma
 * {@link ToolAction}s. Tool ids are namespaced `${serverName}_${toolName}`.
 */
export class MCPClient {
  private readonly servers: Record<string, ServerSpec>
  private readonly name: string
  private readonly version: string
  private readonly clients = new Map<string, Client>()

  constructor(config: MCPClientConfig) {
    this.servers = config.servers
    this.name = config.name ?? 'chituma-mcp-client'
    this.version = config.version ?? '0.0.1'
  }

  /** Connect to `serverName` (idempotent) and return its live client. */
  private async getClient(serverName: string): Promise<Client> {
    const existing = this.clients.get(serverName)
    if (existing) return existing

    const spec = this.servers[serverName]
    if (!spec) throw new Error(`Unknown MCP server: ${serverName}`)

    const client = new Client({ name: this.name, version: this.version })
    await client.connect(createTransport(spec))
    this.clients.set(serverName, client)
    return client
  }

  /**
   * Connect to every configured server, list its tools, and adapt each into a
   * Chituma {@link ToolAction}. Input is validated loosely as a passthrough
   * object so the remote server remains the source of truth for its schema.
   */
  async getTools(): Promise<Record<string, ToolAction>> {
    const tools: Record<string, ToolAction> = {}

    for (const serverName of Object.keys(this.servers)) {
      const client = await this.getClient(serverName)
      const { tools: remoteTools } = await client.listTools()

      for (const remote of remoteTools) {
        const id = `${serverName}_${remote.name}`
        const toolName = remote.name
        tools[id] = {
          id,
          description: remote.description ?? `MCP tool ${toolName} from ${serverName}`,
          inputSchema: z.object({}).passthrough(),
          execute: async ({ context }) => {
            const result = await client.callTool({
              name: toolName,
              arguments: (context ?? {}) as Record<string, unknown>,
            })
            return unwrapToolResult(result)
          },
        }
      }
    }

    return tools
  }

  /** Close all open client connections. */
  async disconnect(): Promise<void> {
    const open = [...this.clients.values()]
    this.clients.clear()
    await Promise.all(open.map((c) => c.close()))
  }
}
