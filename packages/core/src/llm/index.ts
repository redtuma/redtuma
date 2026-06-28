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
      throw new ChitumaModelError(
        `Model provider "anthropic" requires the "@ai-sdk/anthropic" package. Install it with: pnpm add @ai-sdk/anthropic`,
      )
    })
    return (id) => mod.anthropic(id)
  },
  openai: async () => {
    const mod = await import('@ai-sdk/openai').catch(() => {
      throw new ChitumaModelError(
        `Model provider "openai" requires the "@ai-sdk/openai" package. Install it with: pnpm add @ai-sdk/openai`,
      )
    })
    return (id) => mod.openai(id)
  },
}

export class ChitumaModelError extends Error {
  override name = 'ChitumaModelError'
}

export function isLanguageModel(value: ModelConfig): value is LanguageModel {
  // AI SDK v1 model objects are non-string with a specificationVersion field.
  return typeof value !== 'string'
}

/** Parse a `'provider/model'` string into its parts. */
export function parseModelString(model: string): { provider: string; modelId: string } {
  const idx = model.indexOf('/')
  if (idx <= 0 || idx === model.length - 1) {
    throw new ChitumaModelError(
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
    throw new ChitumaModelError(
      `Unknown model provider "${provider}". Supported: ${Object.keys(PROVIDER_LOADERS).join(', ')}. ` +
        `Pass an AI SDK LanguageModel directly to use another provider.`,
    )
  }
  const factory = await loader()
  return factory(modelId)
}

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_LOADERS)
