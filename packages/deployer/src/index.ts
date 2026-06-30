import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import type {
  Redtuma,
  CoreMessage,
  GenerateOptions,
  Run,
  RunSnapshot,
} from '@redtuma/core'

export interface CreateHonoServerOptions {
  /** Mount all routes under this prefix (e.g. `/api/v1`). */
  basePath?: string
}

interface GenerateBody {
  messages?: CoreMessage[]
  input?: string
  options?: GenerateOptions
}

interface RunBody {
  inputData?: unknown
}

interface ResumeBody {
  runId?: string
  step?: string
  resumeData?: unknown
}

/** Resolve an agent by its `id`, returning undefined instead of throwing. */
function findAgent(redtuma: Redtuma, id: string) {
  try {
    return redtuma.getAgentById(id)
  } catch {
    return undefined
  }
}

/** Resolve a workflow by its `id` (not necessarily its registry key). */
function findWorkflow(redtuma: Redtuma, id: string) {
  return Object.values(redtuma.getWorkflows()).find((wf) => wf.id === id)
}

/**
 * Build a Hono app exposing a Redtuma's agents and workflows over HTTP.
 *
 * Routes (all JSON unless noted):
 * - `GET  /`                              health check
 * - `GET  /api/agents`                    list registered agents
 * - `POST /api/agents/:id/generate`       run `agent.generate`
 * - `POST /api/agents/:id/stream`         stream `agent.stream` as text/plain
 * - `GET  /api/workflows`                 list registered workflows
 * - `POST /api/workflows/:id/run`         start a workflow run
 * - `POST /api/workflows/:id/resume`      resume a suspended run
 */
export function createHonoServer(redtuma: Redtuma, opts: CreateHonoServerOptions = {}): Hono {
  const app = opts.basePath ? new Hono().basePath(opts.basePath) : new Hono()

  // Suspended runs are persisted to the configured Store when one is present, so
  // `/resume` works across instances and restarts (required for stateless edge
  // deploys). Without storage we fall back to an in-process Map (single-instance).
  const runs = new Map<string, Run>()
  const snapshotKey = (workflowId: string, runId: string) => `wf:${workflowId}:run:${runId}`

  app.onError((err, c) => {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
  })

  app.get('/', (c) => c.json({ name: 'redtuma', status: 'ok' }))

  app.get('/api/agents', (c) => {
    const agents = Object.values(redtuma.getAgents()).map((a) => ({ id: a.id, name: a.name }))
    return c.json(agents)
  })

  app.post('/api/agents/:id/generate', async (c) => {
    const agent = findAgent(redtuma, c.req.param('id'))
    if (!agent) return c.json({ error: `Agent "${c.req.param('id')}" not found.` }, 404)

    const body = await c.req.json<GenerateBody>().catch(() => ({}) as GenerateBody)
    const input = body.input ?? body.messages
    if (input === undefined) {
      return c.json({ error: 'Request must include `input` (string) or `messages`.' }, 400)
    }

    const result = await agent.generate(input, body.options)
    return c.json(result)
  })

  app.post('/api/agents/:id/stream', async (c) => {
    const agent = findAgent(redtuma, c.req.param('id'))
    if (!agent) return c.json({ error: `Agent "${c.req.param('id')}" not found.` }, 404)

    const body = await c.req.json<GenerateBody>().catch(() => ({}) as GenerateBody)
    const input = body.input ?? body.messages
    if (input === undefined) {
      return c.json({ error: 'Request must include `input` (string) or `messages`.' }, 400)
    }

    c.header('Content-Type', 'text/plain; charset=utf-8')
    return stream(c, async (s) => {
      const result = await agent.stream(input, body.options)
      for await (const chunk of result.textStream) {
        await s.write(chunk)
      }
    })
  })

  app.get('/api/workflows', (c) => {
    const workflows = Object.values(redtuma.getWorkflows()).map((wf) => ({ id: wf.id }))
    return c.json(workflows)
  })

  app.post('/api/workflows/:id/run', async (c) => {
    const workflow = findWorkflow(redtuma, c.req.param('id'))
    if (!workflow) return c.json({ error: `Workflow "${c.req.param('id')}" not found.` }, 404)

    const body = await c.req.json<RunBody>().catch(() => ({}) as RunBody)
    const run = workflow.createRun()
    const result = await run.start({ inputData: body.inputData })

    // Hand back a runId so a suspended run can be resumed later.
    const runId = globalThis.crypto.randomUUID()
    if (result.status === 'suspended') {
      const storage = redtuma.getStorage()
      if (storage) await storage.persistSnapshot(snapshotKey(workflow.id, runId), run.getSnapshot())
      else runs.set(runId, run)
    }
    return c.json({ ...result, runId })
  })

  app.post('/api/workflows/:id/resume', async (c) => {
    const workflow = findWorkflow(redtuma, c.req.param('id'))
    if (!workflow) return c.json({ error: `Workflow "${c.req.param('id')}" not found.` }, 404)

    const body = await c.req.json<ResumeBody>().catch(() => ({}) as ResumeBody)
    if (!body.runId) return c.json({ error: 'Request must include `runId`.' }, 400)
    if (!body.step) return c.json({ error: 'Request must include `step`.' }, 400)

    const storage = redtuma.getStorage()
    const key = snapshotKey(workflow.id, body.runId)

    let run: Run | undefined
    if (storage) {
      const snapshot = await storage.loadSnapshot<RunSnapshot>(key)
      if (!snapshot) return c.json({ error: `Run "${body.runId}" not found.` }, 404)
      run = workflow.createRun().restore(snapshot)
    } else {
      run = runs.get(body.runId)
      if (!run) return c.json({ error: `Run "${body.runId}" not found.` }, 404)
    }

    const result = await run.resume({ step: body.step, resumeData: body.resumeData })

    if (storage) {
      // Persist the new snapshot if still suspended; otherwise clear it.
      await storage.persistSnapshot(key, result.status === 'suspended' ? run.getSnapshot() : null)
    } else if (result.status !== 'suspended') {
      runs.delete(body.runId)
    }
    return c.json({ ...result, runId: body.runId })
  })

  return app
}

/**
 * Convenience for edge/Workers runtimes: returns the app's `fetch` handler.
 */
export function toFetchHandler(redtuma: Redtuma, opts?: CreateHonoServerOptions) {
  return createHonoServer(redtuma, opts).fetch
}
