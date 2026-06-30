import type { LanguageModel } from 'ai'
import type { ModelConfig } from '../types'

/**
 * Map of `provider` prefix -> lazy loader for the AI SDK provider factory.
 * Providers are optional peer deps imported on demand, so installing only one
 * (e.g. `@ai-sdk/anthropic`) is enough.
 */
type ProviderFactory = (modelId: string) => LanguageModel

const PROVIDER_LOADERS: Record<string, () => Promise<ProviderFactory>> = {
  anthropic: async () => {
    const mod = await import('@ai-sdk/anthropic').catch(() => {
      throw new RedtumaModelError(
        `Model provider "anthropic" requires the "@ai-sdk/anthropic" package. Install it with: pnpm add @ai-sdk/anthropic`,
      )
    })
    return (id) => mod.anthropic(id)
  },
  openai: async () => {
    const mod = await import('@ai-sdk/openai').catch(() => {
      throw new RedtumaModelError(
        `Model provider "openai" requires the "@ai-sdk/openai" package. Install it with: pnpm add @ai-sdk/openai`,
      )
    })
    return (id) => mod.openai(id)
  },
}

export class RedtumaModelError extends Error {
  override name = 'RedtumaModelError'
}

export function isLanguageModel(value: ModelConfig): value is LanguageModel {
  // AI SDK v1 model objects are non-string with a specificationVersion field.
  return typeof value !== 'string'
}

/** Parse a `'provider/model'` string into its parts. */
export function parseModelString(model: string): { provider: string; modelId: string } {
  const idx = model.indexOf('/')
  if (idx <= 0 || idx === model.length - 1) {
    throw new RedtumaModelError(
      `Invalid model string "${model}". Expected "provider/model", e.g. "anthropic/claude-opus-4-8".`,
    )
  }
  return { provider: model.slice(0, idx), modelId: model.slice(idx + 1) }
}

/**
 * Resolve a {@link ModelConfig} to a concrete AI SDK {@link LanguageModel}.
 * Strings of the form `provider/model` are routed to the matching provider.
 */
export async function resolveModel(model: ModelConfig): Promise<LanguageModel> {
  if (isLanguageModel(model)) return model

  const { provider, modelId } = parseModelString(model)
  const loader = PROVIDER_LOADERS[provider]
  if (!loader) {
    throw new RedtumaModelError(
      `Unknown model provider "${provider}". Supported: ${Object.keys(PROVIDER_LOADERS).join(', ')}. ` +
        `Pass an AI SDK LanguageModel directly to use another provider.`,
    )
  }
  const factory = await loader()
  return factory(modelId)
}

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_LOADERS)

// ---------------------------------------------------------------------------
// Adaptive model routing
// ---------------------------------------------------------------------------

/** The slice of a generation result a routing predicate may inspect. */
export interface RoutingResult {
  text: string
  finishReason: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
}

export interface ModelTier {
  model: ModelConfig
  /**
   * Accept this tier's result? Return `false` to escalate to the next tier.
   * Omitted (or on the last tier) means always accept. Use it to encode a
   * confidence/quality gate — e.g. reject empty output, refusals, or failed
   * validation so a stronger model is only paid for when needed.
   */
  accept?: (result: RoutingResult) => boolean
}

/** A tiered model policy understood by `Agent.generate`. */
export interface ModelRouter {
  readonly __redtumaRouter: true
  tiers: ModelTier[]
  onEscalate?: (info: { from: number; to: number }) => void
}

/**
 * Build an adaptive, cost-aware model policy: try the cheapest tier first and
 * escalate to a stronger model only when a tier's `accept` predicate rejects
 * the result. The last tier is always accepted.
 *
 * ```ts
 * model: tieredModel({
 *   tiers: [
 *     { model: 'anthropic/claude-haiku-4-5', accept: (r) => r.text.length > 0 },
 *     { model: 'anthropic/claude-opus-4-8' },
 *   ],
 * })
 * ```
 */
export function tieredModel(config: {
  tiers: ModelTier[]
  onEscalate?: (info: { from: number; to: number }) => void
}): ModelRouter {
  if (config.tiers.length === 0) {
    throw new RedtumaModelError('tieredModel requires at least one tier.')
  }
  return { __redtumaRouter: true, tiers: config.tiers, onEscalate: config.onEscalate }
}

export function isModelRouter(value: ModelConfig | ModelRouter): value is ModelRouter {
  return typeof value === 'object' && value !== null && '__redtumaRouter' in value
}
