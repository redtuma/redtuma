import {
  generateText,
  streamText,
  generateObject,
  type CoreMessage,
  type LanguageModel,
} from 'ai'
import type { z } from 'zod'
import { resolveModel } from '../llm'
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
  model: ModelConfig
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
    model: LanguageModel
    system: string
    messages: CoreMessage[]
    tools: ReturnType<typeof buildToolset>
    scope?: MemoryScope
    runtimeContext: RuntimeContext
  }> {
    const opts = { ...this.config.defaultGenerateOptions, ...options }
    const runtimeContext = opts.runtimeContext ?? new RuntimeContext()
    const model = await resolveModel(this.config.model)

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
      model,
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

  async generate<T = unknown>(
    input: string | CoreMessage[],
    options: GenerateOptions = {},
  ): Promise<GenerateResult<T>> {
    const { model, system, messages, tools, scope } = await this.prepare(input, options)
    const opts = { ...this.config.defaultGenerateOptions, ...options }

    if (opts.output) {
      const res = await generateObject({
        model,
        system,
        messages,
        schema: opts.output,
        temperature: opts.temperature,
        abortSignal: opts.abortSignal,
      })
      await this.persist(scope, input, JSON.stringify(res.object))
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
    await this.persist(scope, input, res.text)

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

  async stream(input: string | CoreMessage[], options: GenerateOptions = {}) {
    const { model, system, messages, tools, scope } = await this.prepare(input, options)
    const opts = { ...this.config.defaultGenerateOptions, ...options }

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
