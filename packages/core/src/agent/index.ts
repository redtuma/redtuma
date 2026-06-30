import {
  generateText,
  streamText,
  generateObject,
  type CoreMessage,
} from 'ai'
import type { z } from 'zod'
import { resolveModel, isModelRouter, type ModelRouter } from '../llm'
import { buildToolset, type AnyToolAction } from '../tools'
import { MessageList } from '../message-list'
import { RuntimeContext, type DynamicArgument, type Logger, type ModelConfig } from '../types'
import { noopLogger } from '../logger'

/**
 * Minimal memory contract the Agent depends on. Implemented by `@redtuma/memory`.
 * Kept in core so the Agent can integrate memory without a hard dependency.
 */
export interface AgentMemory {
  rememberMessages(args: {
    threadId: string
    resourceId: string
  }): Promise<{ messages: CoreMessage[]; systemContext?: string }>
  saveMessages(args: {
    threadId: string
    resourceId: string
    messages: { role: 'user' | 'assistant'; content: CoreMessage['content'] }[]
  }): Promise<void>
}

export interface AgentConfig {
  id: string
  name?: string
  instructions: DynamicArgument<string>
  /** A single model, or a `tieredModel(...)` policy for adaptive cost routing. */
  model: ModelConfig | ModelRouter
  tools?: Record<string, AnyToolAction>
  memory?: AgentMemory
  defaultGenerateOptions?: Partial<GenerateOptions>
}

export interface MemoryScope {
  thread: string
  resource: string
}

export interface GenerateOptions {
  maxSteps?: number
  temperature?: number
  toolChoice?: 'auto' | 'none' | 'required'
  /** Zod schema; when set, returns a validated `object` instead of free text. */
  output?: z.ZodTypeAny
  memory?: MemoryScope
  runtimeContext?: RuntimeContext
  abortSignal?: AbortSignal
}

export interface GenerateResult<T = unknown> {
  text: string
  object?: T
  toolCalls: unknown[]
  toolResults: unknown[]
  steps: unknown[]
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  finishReason: string
  response: unknown
  /** Present when a `tieredModel` policy chose this result. */
  routing?: { tier: number; attempts: number }
}

export class Agent {
  readonly id: string
  readonly name: string
  private readonly config: AgentConfig
  private logger: Logger = noopLogger
  private memory?: AgentMemory

  constructor(config: AgentConfig) {
    this.config = config
    this.id = config.id
    this.name = config.name ?? config.id
    this.memory = config.memory
  }

  /** Called by the Redtuma registry to inject shared deps. */
  __register(deps: { logger?: Logger; memory?: AgentMemory }): void {
    if (deps.logger) this.logger = deps.logger
    if (!this.memory && deps.memory) this.memory = deps.memory
  }

  private async resolveInstructions(runtimeContext: RuntimeContext): Promise<string> {
    const ins = this.config.instructions
    return typeof ins === 'function' ? await ins({ runtimeContext }) : ins
  }

  private async prepare(
    input: string | CoreMessage[],
    options: GenerateOptions,
  ): Promise<{
    system: string
    messages: CoreMessage[]
    tools: ReturnType<typeof buildToolset>
    scope?: MemoryScope
    runtimeContext: RuntimeContext
  }> {
    const opts = { ...this.config.defaultGenerateOptions, ...options }
    const runtimeContext = opts.runtimeContext ?? new RuntimeContext()

    let system = await this.resolveInstructions(runtimeContext)
    const list = new MessageList()

    // Memory recall
    const scope = opts.memory
    if (this.memory && scope) {
      const recalled = await this.memory.rememberMessages({
        threadId: scope.thread,
        resourceId: scope.resource,
      })
      if (recalled.systemContext) system += `\n\n${recalled.systemContext}`
      for (const m of recalled.messages) list.add(m, m.role as 'user' | 'assistant')
    }

    list.add(input)

    return {
      system,
      messages: list.toCore(),
      tools: buildToolset(this.config.tools, runtimeContext),
      scope,
      runtimeContext,
    }
  }

  private async persist(
    scope: MemoryScope | undefined,
    userInput: string | CoreMessage[],
    assistantText: string,
  ): Promise<void> {
    if (!this.memory || !scope) return
    const userContent =
      typeof userInput === 'string'
        ? userInput
        : (userInput.at(-1)?.content ?? '')
    await this.memory.saveMessages({
      threadId: scope.thread,
      resourceId: scope.resource,
      messages: [
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantText },
      ],
    })
  }

  /** Run one model (no routing, no persistence) and shape the result. */
  private async generateOnce<T>(
    modelConfig: ModelConfig,
    prepared: Awaited<ReturnType<Agent['prepare']>>,
    opts: GenerateOptions,
  ): Promise<GenerateResult<T>> {
    const model = await resolveModel(modelConfig)
    const { system, messages, tools } = prepared

    if (opts.output) {
      const res = await generateObject({
        model,
        system,
        messages,
        schema: opts.output,
        temperature: opts.temperature,
        abortSignal: opts.abortSignal,
      })
      return {
        text: JSON.stringify(res.object),
        object: res.object as T,
        toolCalls: [],
        toolResults: [],
        steps: [],
        usage: res.usage,
        finishReason: res.finishReason,
        response: res.response,
      }
    }

    const res = await generateText({
      model,
      system,
      messages,
      tools,
      maxSteps: opts.maxSteps ?? 5,
      temperature: opts.temperature,
      toolChoice: opts.toolChoice,
      abortSignal: opts.abortSignal,
    })
    return {
      text: res.text,
      toolCalls: res.toolCalls,
      toolResults: res.toolResults,
      steps: res.steps,
      usage: res.usage,
      finishReason: res.finishReason,
      response: res.response,
    }
  }

  /** Try tiers cheapest-first, escalating until a tier's `accept` passes. */
  private async generateRouted<T>(
    router: ModelRouter,
    prepared: Awaited<ReturnType<Agent['prepare']>>,
    opts: GenerateOptions,
  ): Promise<GenerateResult<T>> {
    const last = router.tiers.length - 1
    for (let i = 0; i <= last; i++) {
      const tier = router.tiers[i]!
      const result = await this.generateOnce<T>(tier.model, prepared, opts)
      const accepted =
        i === last ||
        !tier.accept ||
        tier.accept({ text: result.text, finishReason: result.finishReason, usage: result.usage })
      if (accepted) {
        result.routing = { tier: i, attempts: i + 1 }
        return result
      }
      router.onEscalate?.({ from: i, to: i + 1 })
    }
    // Unreachable: the last tier is always accepted.
    throw new Error('Model router exhausted all tiers without a result.')
  }

  async generate<T = unknown>(
    input: string | CoreMessage[],
    options: GenerateOptions = {},
  ): Promise<GenerateResult<T>> {
    const prepared = await this.prepare(input, options)
    const opts = { ...this.config.defaultGenerateOptions, ...options }
    const model = this.config.model

    const result = isModelRouter(model)
      ? await this.generateRouted<T>(model, prepared, opts)
      : await this.generateOnce<T>(model, prepared, opts)

    await this.persist(prepared.scope, input, result.text)
    return result
  }

  async stream(input: string | CoreMessage[], options: GenerateOptions = {}) {
    const { system, messages, tools, scope } = await this.prepare(input, options)
    const opts = { ...this.config.defaultGenerateOptions, ...options }

    // Streaming can't inspect a result before committing, so a routed model
    // streams from its cheapest tier; adaptive escalation applies to generate().
    const modelConfig = isModelRouter(this.config.model)
      ? this.config.model.tiers[0]!.model
      : this.config.model
    const model = await resolveModel(modelConfig)

    const result = streamText({
      model,
      system,
      messages,
      tools,
      maxSteps: opts.maxSteps ?? 5,
      temperature: opts.temperature,
      toolChoice: opts.toolChoice,
      abortSignal: opts.abortSignal,
      onFinish: ({ text }) => {
        void this.persist(scope, input, text)
      },
    })

    return result
  }
}
