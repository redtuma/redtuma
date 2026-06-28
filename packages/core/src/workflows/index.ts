import type { z } from 'zod'
import { RuntimeContext, type Logger } from '../types'
import { noopLogger } from '../logger'

export interface StepExecuteContext<TInput = unknown, TResume = unknown> {
  inputData: TInput
  runtimeContext: RuntimeContext
  /** Result of a previously completed step by id. */
  getStepResult: (stepId: string) => unknown
  /** Data passed to `run.resume()` when resuming a suspended step. */
  resumeData?: TResume
  /** Suspend the workflow for human-in-the-loop; throws to halt execution. */
  suspend: (payload?: unknown) => never
}

export interface Step<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  id: string
  inputSchema?: TInputSchema
  outputSchema?: TOutputSchema
  resumeSchema?: z.ZodTypeAny
  suspendSchema?: z.ZodTypeAny
  execute: (ctx: StepExecuteContext) => Promise<unknown> | unknown
}

export function createStep<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
>(config: {
  id: string
  inputSchema?: TInputSchema
  outputSchema?: TOutputSchema
  resumeSchema?: z.ZodTypeAny
  suspendSchema?: z.ZodTypeAny
  execute: (ctx: StepExecuteContext) => Promise<unknown> | unknown
}): Step<TInputSchema, TOutputSchema> {
  return { ...config }
}

class SuspendSignal {
  constructor(
    public readonly stepId: string,
    public readonly payload: unknown,
  ) {}
}

type Condition = (args: { inputData: unknown; runtimeContext: RuntimeContext }) => boolean | Promise<boolean>

type Node =
  | { kind: 'step'; step: Step }
  | { kind: 'parallel'; steps: Step[] }
  | { kind: 'branch'; branches: [Condition, Step][] }
  | { kind: 'dountil'; step: Step; condition: Condition }
  | { kind: 'foreach'; step: Step }
  | { kind: 'map'; fn: (input: unknown) => unknown }

export type RunStatus = 'success' | 'suspended' | 'failed'

export interface RunResult {
  status: RunStatus
  result?: unknown
  error?: Error
  suspended?: { stepId: string; payload: unknown }
  steps: Record<string, unknown>
}

interface Snapshot {
  nodeIndex: number
  input: unknown
  results: Record<string, unknown>
  suspendedStepId: string
}

export class Workflow {
  readonly id: string
  private nodes: Node[] = []
  private committed = false
  logger: Logger = noopLogger

  constructor(public config: { id: string; inputSchema?: z.ZodTypeAny; outputSchema?: z.ZodTypeAny }) {
    this.id = config.id
  }

  then(step: Step): this {
    this.nodes.push({ kind: 'step', step })
    return this
  }
  parallel(steps: Step[]): this {
    this.nodes.push({ kind: 'parallel', steps })
    return this
  }
  branch(branches: [Condition, Step][]): this {
    this.nodes.push({ kind: 'branch', branches })
    return this
  }
  dountil(step: Step, condition: Condition): this {
    this.nodes.push({ kind: 'dountil', step, condition })
    return this
  }
  foreach(step: Step): this {
    this.nodes.push({ kind: 'foreach', step })
    return this
  }
  map(fn: (input: unknown) => unknown): this {
    this.nodes.push({ kind: 'map', fn })
    return this
  }
  commit(): this {
    this.committed = true
    return this
  }

  createRun(): Run {
    if (!this.committed) {
      throw new Error(`Workflow "${this.id}" must be committed with .commit() before running.`)
    }
    return new Run(this.id, this.nodes)
  }
}

export class Run {
  private snapshot: Snapshot | null = null

  constructor(
    public readonly workflowId: string,
    private readonly nodes: Node[],
  ) {}

  async start(args: { inputData: unknown; runtimeContext?: RuntimeContext }): Promise<RunResult> {
    const runtimeContext = args.runtimeContext ?? new RuntimeContext()
    return this.execute(0, args.inputData, {}, runtimeContext, undefined)
  }

  async resume(args: {
    step: string
    resumeData?: unknown
    runtimeContext?: RuntimeContext
  }): Promise<RunResult> {
    if (!this.snapshot) throw new Error('Cannot resume: workflow is not suspended.')
    if (this.snapshot.suspendedStepId !== args.step) {
      throw new Error(
        `Cannot resume step "${args.step}": suspended step is "${this.snapshot.suspendedStepId}".`,
      )
    }
    const { nodeIndex, input, results } = this.snapshot
    const runtimeContext = args.runtimeContext ?? new RuntimeContext()
    this.snapshot = null
    return this.execute(nodeIndex, input, results, runtimeContext, args.resumeData)
  }

  private async execute(
    startIndex: number,
    initialInput: unknown,
    results: Record<string, unknown>,
    runtimeContext: RuntimeContext,
    resumeData: unknown,
  ): Promise<RunResult> {
    let input = initialInput
    const getStepResult = (id: string) => results[id]

    for (let i = startIndex; i < this.nodes.length; i++) {
      const node = this.nodes[i]!
      const isResumeTarget = resumeData !== undefined && i === startIndex
      const ctxBase = { runtimeContext, getStepResult }

      try {
        switch (node.kind) {
          case 'step': {
            input = await this.runStep(node.step, input, ctxBase, isResumeTarget ? resumeData : undefined)
            results[node.step.id] = input
            break
          }
          case 'parallel': {
            const out = await Promise.all(
              node.steps.map((s) => this.runStep(s, input, ctxBase, undefined)),
            )
            const merged: Record<string, unknown> = {}
            node.steps.forEach((s, idx) => {
              results[s.id] = out[idx]
              merged[s.id] = out[idx]
            })
            input = merged
            break
          }
          case 'branch': {
            for (const [cond, step] of node.branches) {
              if (await cond({ inputData: input, runtimeContext })) {
                input = await this.runStep(step, input, ctxBase, isResumeTarget ? resumeData : undefined)
                results[step.id] = input
                break
              }
            }
            break
          }
          case 'dountil': {
            do {
              input = await this.runStep(node.step, input, ctxBase, undefined)
              results[node.step.id] = input
            } while (!(await node.condition({ inputData: input, runtimeContext })))
            break
          }
          case 'foreach': {
            const items = Array.isArray(input) ? input : [input]
            const out: unknown[] = []
            for (const item of items) {
              out.push(await this.runStep(node.step, item, ctxBase, undefined))
            }
            input = out
            results[node.step.id] = out
            break
          }
          case 'map': {
            input = node.fn(input)
            break
          }
        }
        resumeData = undefined
      } catch (err) {
        if (err instanceof SuspendSignal) {
          this.snapshot = {
            nodeIndex: i,
            input,
            results,
            suspendedStepId: err.stepId,
          }
          return { status: 'suspended', suspended: { stepId: err.stepId, payload: err.payload }, steps: results }
        }
        return { status: 'failed', error: err as Error, steps: results }
      }
    }

    return { status: 'success', result: input, steps: results }
  }

  private async runStep(
    step: Step,
    inputData: unknown,
    base: { runtimeContext: RuntimeContext; getStepResult: (id: string) => unknown },
    resumeData: unknown,
  ): Promise<unknown> {
    const suspend = (payload?: unknown): never => {
      throw new SuspendSignal(step.id, payload)
    }
    return step.execute({ inputData, resumeData, suspend, ...base })
  }
}

export function createWorkflow(config: {
  id: string
  inputSchema?: z.ZodTypeAny
  outputSchema?: z.ZodTypeAny
}): Workflow {
  return new Workflow(config)
}
