import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { createWorkflow, createStep } from '../src/workflows'

const inc = createStep({
  id: 'inc',
  execute: ({ inputData }) => (inputData as number) + 1,
})
const double = createStep({
  id: 'double',
  execute: ({ inputData }) => (inputData as number) * 2,
})

describe('workflow engine', () => {
  it('runs sequential steps and threads output', async () => {
    const wf = createWorkflow({ id: 'seq' }).then(inc).then(double).commit()
    const res = await wf.createRun().start({ inputData: 1 })
    expect(res.status).toBe('success')
    expect(res.result).toBe(4) // (1+1)*2
    expect(res.steps.inc).toBe(2)
  })

  it('requires commit before running', () => {
    const wf = createWorkflow({ id: 'nope' }).then(inc)
    expect(() => wf.createRun()).toThrow(/committed/)
  })

  it('runs parallel steps and merges by id', async () => {
    const wf = createWorkflow({ id: 'par' }).parallel([inc, double]).commit()
    const res = await wf.createRun().start({ inputData: 10 })
    expect(res.status).toBe('success')
    expect(res.result).toEqual({ inc: 11, double: 20 })
  })

  it('takes the first matching branch', async () => {
    const wf = createWorkflow({ id: 'br' })
      .branch([
        [({ inputData }) => (inputData as number) > 5, double],
        [() => true, inc],
      ])
      .commit()
    expect((await wf.createRun().start({ inputData: 10 })).result).toBe(20)
    expect((await wf.createRun().start({ inputData: 1 })).result).toBe(2)
  })

  it('loops with dountil', async () => {
    const wf = createWorkflow({ id: 'loop' })
      .dountil(inc, ({ inputData }) => (inputData as number) >= 5)
      .commit()
    const res = await wf.createRun().start({ inputData: 0 })
    expect(res.result).toBe(5)
  })

  it('maps over arrays with foreach', async () => {
    const wf = createWorkflow({ id: 'each' }).foreach(double).commit()
    const res = await wf.createRun().start({ inputData: [1, 2, 3] })
    expect(res.result).toEqual([2, 4, 6])
  })

  it('suspends and resumes for human-in-the-loop', async () => {
    const approval = createStep({
      id: 'approval',
      resumeSchema: z.object({ approved: z.boolean() }),
      execute: ({ inputData, resumeData, suspend }) => {
        if (!resumeData) suspend({ question: 'approve?' })
        const { approved } = resumeData as { approved: boolean }
        return { ...(inputData as object), approved }
      },
    })
    const wf = createWorkflow({ id: 'hitl' }).then(inc).then(approval).commit()
    const run = wf.createRun()

    const first = await run.start({ inputData: 1 })
    expect(first.status).toBe('suspended')
    expect(first.suspended?.stepId).toBe('approval')

    const resumed = await run.resume({ step: 'approval', resumeData: { approved: true } })
    expect(resumed.status).toBe('success')
    expect(resumed.result).toMatchObject({ approved: true })
  })

  it('reports failures', async () => {
    const boom = createStep({
      id: 'boom',
      execute: () => {
        throw new Error('kaboom')
      },
    })
    const wf = createWorkflow({ id: 'fail' }).then(boom).commit()
    const res = await wf.createRun().start({ inputData: 1 })
    expect(res.status).toBe('failed')
    expect(res.error?.message).toBe('kaboom')
  })
})
