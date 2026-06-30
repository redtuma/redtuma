import { tool as aiTool, type Tool as AiTool } from 'ai'
import type { z } from 'zod'
import { RuntimeContext } from '../types'

export interface ToolExecuteContext<TInput> {
  /** Validated tool input. */
  context: TInput
  runtimeContext: RuntimeContext
  abortSignal?: AbortSignal
}

export interface ToolAction<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  id: string
  description: string
  inputSchema: TInputSchema
  outputSchema?: TOutputSchema
  execute: (ctx: ToolExecuteContext<z.infer<TInputSchema>>) => Promise<unknown> | unknown
}

/** Define a Redtuma tool. The id is used as the tool name presented to the model. */
export function createTool<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
>(config: {
  id: string
  description: string
  inputSchema: TInputSchema
  outputSchema?: TOutputSchema
  execute: (ctx: ToolExecuteContext<z.infer<TInputSchema>>) => Promise<unknown> | unknown
}): ToolAction<TInputSchema, TOutputSchema> {
  return { ...config }
}

/** A tool with its schema generics erased; use for heterogeneous collections. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolAction = ToolAction<any, any>

export function isToolAction(value: unknown): value is ToolAction {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ToolAction).execute === 'function' &&
    'inputSchema' in value &&
    'description' in value
  )
}

/** Adapt a {@link ToolAction} into the AI SDK `tool()` shape. */
export function toAISDKTool(
  toolAction: AnyToolAction,
  runtimeContext: RuntimeContext,
): AiTool {
  return aiTool({
    description: toolAction.description,
    parameters: toolAction.inputSchema,
    execute: async (args, { abortSignal }) =>
      toolAction.execute({ context: args, runtimeContext, abortSignal }),
  })
}

/**
 * Build the AI SDK tool map from a record of Redtuma tools and/or raw AI SDK
 * tools. Redtuma `ToolAction`s are adapted; anything else is passed through.
 */
export function buildToolset(
  tools: Record<string, AnyToolAction | AiTool> | undefined,
  runtimeContext: RuntimeContext,
): Record<string, AiTool> | undefined {
  if (!tools) return undefined
  const out: Record<string, AiTool> = {}
  for (const [name, t] of Object.entries(tools)) {
    out[name] = isToolAction(t) ? toAISDKTool(t, runtimeContext) : (t as AiTool)
  }
  return out
}
