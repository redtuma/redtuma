import { DocArticle, H1, H2, Lead, P, C, Code, PrevNext } from '@/components/doc'

export const metadata = { title: 'MCP — Redtuma' }

export default function Mcp() {
  return (
    <DocArticle>
      <H1>MCP</H1>
      <Lead>
        The Model Context Protocol lets agents use tools served by other processes — and lets you
        expose your own tools to any MCP client.
      </Lead>

      <H2 id="client">Consume remote tools</H2>
      <P>
        <C>MCPClient</C> connects to one or more MCP servers and surfaces their tools as Redtuma{' '}
        <C>ToolAction</C>s you can hand to an agent.
      </P>
      <Code title="mcp.ts">{`import { MCPClient } from '@redtuma/mcp'

const mcp = new MCPClient({
  servers: {
    filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] },
  },
})

const tools = await mcp.getTools()

const agent = new Agent({
  id: 'assistant',
  instructions: '...',
  model: 'anthropic/claude-opus-4-8',
  tools,
})`}</Code>

      <H2 id="server">Serve your tools</H2>
      <P>Expose your own tools (and agents) over MCP with <C>MCPServer</C>.</P>
      <Code>{`import { MCPServer } from '@redtuma/mcp'

const server = new MCPServer({ tools: { getWeather } })
await server.start()`}</Code>

      <PrevNext current="/docs/mcp" />
    </DocArticle>
  )
}
