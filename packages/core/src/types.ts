import type { CoreMessage, LanguageModel } from 'ai'

/** A model is either a `'provider/model'` string or a concrete AI SDK model. */
export type ModelConfig = string | LanguageModel

/** A value that may be provided directly or computed from a runtime context. */
export type DynamicArgument<T> =
  | T
  | ((ctx: { runtimeContext: RuntimeContext }) => T | Promise<T>)

/** Arbitrary per-invocation key/value context passed through to tools/instructions. */
export class RuntimeContext<T extends Record<string, unknown> = Record<string, unknown>> {
  private readonly map = new Map<string, unknown>()

  constructor(initial?: T) {
    if (initial) {
      for (const [k, v] of Object.entries(initial)) this.map.set(k, v)
    }
  }

  get<K extends keyof T & string>(key: K): T[K] | undefined {
    return this.map.get(key) as T[K] | undefined
  }

  set<K extends keyof T & string>(key: K, value: T[K]): void {
    this.map.set(key, value)
  }

  has(key: string): boolean {
    return this.map.has(key)
  }
}

export interface Logger {
  debug(msg: string, meta?: unknown): void
  info(msg: string, meta?: unknown): void
  warn(msg: string, meta?: unknown): void
  error(msg: string, meta?: unknown): void
}

/** Shared dependencies injected into components when registered on a Redtuma instance. */
export interface SharedDeps {
  logger?: Logger
  storage?: unknown
  memory?: unknown
  telemetry?: unknown
}

export type { CoreMessage }
