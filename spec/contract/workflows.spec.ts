import { describe, it, expect } from 'vitest'
import { createWorkflow, createStep } from '@redtuma/core'

const double = createStep({ id: 'double', execute: ({ inputData }) => (inputData as number) * 2 })

describe('Workflow lifecycle', () => {
  it('requires .commit() before a run can be created', () => {
    const wf = createWorkflow({ id: 'uncommitted' }).then(double)
    expect(() => wf.createRun()).toThrow(/commit/)
  })

  it('runs a sequential step and exposes per-step results', async () => {
    const wf = createWorkflow({ id: 'seq' }).then(double).commit()
    const res = await wf.createRun().start({ inputData: 3 })
    expect(res.status).toBe('success')
    expect(res.result).toBe(6)
    expect(res.steps.double).toBe(6)
  })
})

describe('Workflow control flow', () => {
  it('map transforms the running value', async () => {
    const wf = createWorkflow({ id: 'map' }).map((i) => (i as number) + 10).commit()
    expect((await wf.createRun().start({ inputData: 5 })).result).toBe(15)
  })

  it('branch selects the first matching condition', async () => {
    const wf = createWorkflow({ id: 'branch' })
      .branch([
        [({ inputData }) => (inputData as number) > 0, createStep({ id: 'pos', execute: () => 'positive' })],
        [() => true, createStep({ id: 'neg', execute: () => 'negative' })],
      ])
      .commit()
    expect((await wf.createRun().start({ inputData: 5 })).result).toBe('positive')
    expect((await wf.createRun().start({ inputData: -5 })).result).toBe('negative')
  })

  it('parallel merges results into a record keyed by step id', async () => {
    const wf = createWorkflow({ id: 'par' })
      .parallel([
        createStep({ id: 'a', execute: () => 1 }),
        createStep({ id: 'b', execute: () => 2 }),
      ])
      .commit()
    expect((await wf.createRun().start({ inputData: null })).result).toEqual({ a: 1, b: 2 })
  })

  it('dountil repeats until the condition holds', async () => {
    const wf = createWorkflow({ id: 'loop' })
      .dountil(
        createStep({ id: 'inc', execute: ({ inputData }) => (inputData as number) + 1 }),
        ({ inputData }) => (inputData as number) >= 3,
      )
      .commit()
    expect((await wf.createRun().start({ inputData: 0 })).result).toBe(3)
  })

  it('foreach maps a step over an array input', async () => {
    const wf = createWorkflow({ id: 'each' })
      .foreach(createStep({ id: 'sq', execute: ({ inputData }) => (inputData as number) ** 2 }))
      .commit()
    expect((await wf.createRun().start({ inputData: [1, 2, 3] })).result).toEqual([1, 4, 9])
  })
})

describe('Workflow suspend / resume (human-in-the-loop)', () => {
  const gate = createStep({
    id: 'gate',
    execute: ({ resumeData, suspend }) => {
      if (resumeData === undefined) suspend({ reason: 'need approval' })
      return resumeData
    },
  })

  it('suspends with the step id and payload, then resumes to success', async () => {
    const run = createWorkflow({ id: 'hitl' }).then(gate).commit().createRun()

    const suspended = await run.start({ inputData: 'x' })
    expect(suspended.status).toBe('suspended')
    expect(suspended.suspended).toEqual({ stepId: 'gate', payload: { reason: 'need approval' } })

    const resumed = await run.resume({ step: 'gate', resumeData: 'approved' })
    expect(resumed.status).toBe('success')
    expect(resumed.result).toBe('approved')
  })

  it('rejects resuming when not suspended', async () => {
    const run = createWorkflow({ id: 'ns' }).then(double).commit().createRun()
    await expect(run.resume({ step: 'double' })).rejects.toThrow(/not suspended/)
  })

  it('rejects resuming the wrong step', async () => {
    const run = createWorkflow({ id: 'wrong' }).then(gate).commit().createRun()
    await run.start({ inputData: 'x' })
    await expect(run.resume({ step: 'other', resumeData: 'z' })).rejects.toThrow(/suspended step is/)
  })
})

describe('Workflow failure', () => {
  it('captures a thrown step as a failed run', async () => {
    const boom = createStep({
      id: 'boom',
      execute: () => {
        throw new Error('kaboom')
      },
    })
    const res = await createWorkflow({ id: 'fail' }).then(boom).commit().createRun().start({ inputData: null })
    expect(res.status).toBe('failed')
    expect(res.error?.message).toBe('kaboom')
  })
})
