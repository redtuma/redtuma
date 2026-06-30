/**
 * The subset of Cloudflare's `DurableObjectStorage` API that the store uses.
 * Cloudflare's real storage is a structural superset of this, so a Durable
 * Object's `state.storage` satisfies it directly.
 *
 * `list()` returns entries ordered lexicographically by key — the property the
 * store relies on for message ordering via zero-padded sequence keys.
 */
export interface KVStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  put<T = unknown>(key: string, value: T): Promise<void>
  delete(key: string): Promise<boolean>
  list<T = unknown>(options?: { prefix?: string }): Promise<Map<string, T>>
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T)
}

/**
 * In-memory {@link KVStorage} that mirrors the Durable Object storage semantics
 * (structured-clone on write, lexicographic key ordering on `list`). Use it for
 * local development, tests, and conformance — it behaves like the real DO store
 * without the Workers runtime.
 */
export class MemoryKVStorage implements KVStorage {
  private readonly map = new Map<string, unknown>()

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const value = this.map.get(key)
    return value === undefined ? undefined : (clone(value) as T)
  }

  async put<T = unknown>(key: string, value: T): Promise<void> {
    this.map.set(key, clone(value))
  }

  async delete(key: string): Promise<boolean> {
    return this.map.delete(key)
  }

  async list<T = unknown>(options: { prefix?: string } = {}): Promise<Map<string, T>> {
    const prefix = options.prefix ?? ''
    const out = new Map<string, T>()
    for (const key of [...this.map.keys()].sort()) {
      if (key.startsWith(prefix)) out.set(key, clone(this.map.get(key)) as T)
    }
    return out
  }
}
