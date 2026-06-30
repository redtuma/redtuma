import { DocArticle, H1, H2, Lead, P, C, Code, Callout, PrevNext } from '@/components/doc'

export const metadata = { title: 'Cloudflare (edge) — Redtuma' }

export default function Cloudflare() {
  return (
    <DocArticle>
      <H1>Cloudflare (edge)</H1>
      <Lead>
        Run agents on Cloudflare Workers with memory in a Durable Object — one instance per
        conversation, strongly consistent, with no external database.
      </Lead>

      <H2 id="scaffold">Scaffold</H2>
      <Code title="Terminal">{`npm create redtuma@latest my-agent -- --template cloudflare`}</Code>
      <P>You get a Worker, a Durable Object, and a <C>wrangler.toml</C> wired together.</P>

      <H2 id="do">The memory Durable Object</H2>
      <Code title="src/memory.ts">{`import { RedtumaMemoryObject, type KVStorage } from '@redtuma/store-do'

export class Memory extends RedtumaMemoryObject {
  constructor(state: DurableObjectState) {
    super(state.storage as unknown as KVStorage)
  }
}`}</Code>

      <H2 id="worker">The Worker</H2>
      <P>
        Get a per-thread Durable Object and use <C>durableObjectStoreClient</C> as a standard{' '}
        <C>Store</C>. On Workers, create the provider with the secret from <C>env</C>.
      </P>
      <Code title="src/worker.ts">{`import { Agent } from '@redtuma/core'
import { createAnthropic } from '@ai-sdk/anthropic'
import { durableObjectStoreClient } from '@redtuma/store-do'
export { Memory } from './memory'

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { threadId, message } = await req.json()

    const stub = env.MEMORY.get(env.MEMORY.idFromName(threadId))
    const store = durableObjectStoreClient(stub)

    const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
    const agent = new Agent({
      id: 'assistant',
      instructions: 'You are concise and helpful.',
      model: anthropic('claude-opus-4-8'),
    })

    const history = await store.getMessages({ threadId, last: 20 })
    const res = await agent.generate([
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ])
    // ...persist the new turn with store.saveMessages(...)
    return Response.json({ text: res.text })
  },
}`}</Code>

      <H2 id="config">wrangler.toml</H2>
      <Code title="wrangler.toml">{`name = "my-agent"
main = "src/worker.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[[durable_objects.bindings]]
name = "MEMORY"
class_name = "Memory"

[[migrations]]
tag = "v1"
new_classes = ["Memory"]`}</Code>

      <H2 id="deploy">Deploy</H2>
      <Code title="Terminal">{`npx wrangler secret put ANTHROPIC_API_KEY
npm run deploy`}</Code>

      <Callout title="Why a Durable Object?">
        A DO is a strongly consistent, single-instance object with built-in storage that hibernates
        when idle and wakes on the next request — the natural home for one conversation&apos;s memory
        and for suspend/resume workflow state.
      </Callout>

      <PrevNext current="/docs/cloudflare" />
    </DocArticle>
  )
}
