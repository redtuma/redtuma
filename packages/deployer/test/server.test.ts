import { describe, it, expect } from 'vitest'
import { MockLanguageModelV1 } from 'ai/test'
import { Agent, Chituma, createStep, createWorkflow } from '@chituma/core'
import type { LanguageModelV1StreamPart } from 'ai'
import { createHonoServer } from '../src/index'

function streamOf(parts: LanguageModelV1StreamPart[]): ReadableStream<LanguageModelV1StreamPart> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(part)
      controller.close()
    },
  })
}

/** A model that always answers with a fixed reply, no network access. */
function mockModel(): MockLanguageModelV1 {
  return new MockLanguageModelV1({
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 4, completionTokens: 3 },
      text: 'Hello from the mock model',
    }),
    doStream: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      stream: streamOf([
        { type: 'text-delta', textDelta: 'Hello ' },
        { type: 'text-delta', textDelta: 'streamed ' },
        { type: 'text-delta', textDelta: 'mock' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 4, completionTokens: 3 },
        },
      ]),
    }),
  })
}

function buildChituma(): Chituma {
  const greeter = new Agent({
    id: 'greeter',
    name: 'Greeter',
    instructions: 'You greet people.',
    model: mockModel(),
  })

  const increment = createStep({
    id: 'increment',
    execute: ({ inputData }) => ({ value: (inputData as { value: number }).value + 1 }),
  })
  const incWorkflow = createWorkflow({ id: 'inc' }).then(increment).commit()

  const gate = createStep({
    id: 'gate',
    execute: ({ inputData, resumeData, suspend }) => {
      if (resumeData === undefined) return suspend({ reason: 'awaiting approval' })
      return { approved: (resumeData as { approved: boolean }).approved, input: inputData }
    },
  })
  const approvalWorkflow = createWorkflow({ id: 'approval' }).then(gate).commit()

  return new Chituma({
    agents: { greeter },
    workflows: { inc: incWorkflow, approval: approvalWorkflow },
  })
}

describe('createHonoServer', () => {
  it('GET / returns ok', async () => {
    const app = createHonoServer(buildChituma())
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ name: 'chituma', status: 'ok' })
  })

  it('GET /api/agents lists registered agents', async () => {
    const app = createHonoServer(buildChituma())
    const res = await app.request('/api/agents')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 'greeter', name: 'Greeter' }])
  })

  it('POST /api/agents/:id/generate returns the model text', async () => {
    const app = createHonoServer(buildChituma())
    const res = await app.request('/api/agents/greeter/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hi' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { text: string }
    expect(body.text).toBe('Hello from the mock model')
  })

  it('POST /api/agents/:id/stream streams the model text', async () => {
    const app = createHonoServer(buildChituma())
    const res = await app.request('/api/agents/greeter/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hi' }),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello streamed mock')
  })

  it('returns 404 for an unknown agent id', async () => {
    const app = createHonoServer(buildChituma())
    const res = await app.request('/api/agents/nope/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hi' }),
    })
    expect(res.status).toBe(404)
  })

  it('GET /api/workflows lists registered workflows', async () => {
    const app = createHonoServer(buildChituma())
    const res = await app.request('/api/workflows')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 'inc' }, { id: 'approval' }])
  })

  it('POST /api/workflows/:id/run returns success + result', async () => {
    const app = createHonoServer(buildChituma())
    const res = await app.request('/api/workflows/inc/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputData: { value: 1 } }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; result: { value: number } }
    expect(body.status).toBe('success')
    expect(body.result).toEqual({ value: 2 })
  })

  it('suspend -> resume round-trip via runId', async () => {
    const app = createHonoServer(buildChituma())

    const runRes = await app.request('/api/workflows/approval/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputData: { value: 1 } }),
    })
    expect(runRes.status).toBe(200)
    const runBody = (await runRes.json()) as {
      status: string
      runId: string
      suspended: { stepId: string }
    }
    expect(runBody.status).toBe('suspended')
    expect(runBody.suspended.stepId).toBe('gate')
    expect(typeof runBody.runId).toBe('string')

    const resumeRes = await app.request('/api/workflows/approval/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: runBody.runId,
        step: 'gate',
        resumeData: { approved: true },
      }),
    })
    expect(resumeRes.status).toBe(200)
    const resumeBody = (await resumeRes.json()) as {
      status: string
      result: { approved: boolean }
    }
    expect(resumeBody.status).toBe('success')
    expect(resumeBody.result.approved).toBe(true)
  })

  it('404 for unknown workflow id', async () => {
    const app = createHonoServer(buildChituma())
    const res = await app.request('/api/workflows/nope/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputData: {} }),
    })
    expect(res.status).toBe(404)
  })
})
