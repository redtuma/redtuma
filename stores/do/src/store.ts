import type { GetMessagesArgs, Resource, Store, Thread } from '@redtuma/core/store'
import type { RedtumaMessage } from '@redtuma/core'
import type { KVStorage } from './storage'

// Zero-padded sequence width — keeps lexicographic key order equal to numeric
// order for any realistic thread length.
const SEQ_WIDTH = 16
const pad = (n: number): string => n.toString().padStart(SEQ_WIDTH, '0')

const key = {
  thread: (id: string) => `t:${id}`,
  threadPrefix: 't:',
  message: (threadId: string, seq: number) => `m:${threadId}:${pad(seq)}`,
  messagePrefix: (threadId: string) => `m:${threadId}:`,
  counter: (threadId: string) => `c:${threadId}`,
  resource: (id: string) => `r:${id}`,
  snapshot: (k: string) => `s:${k}`,
}

/**
 * A {@link Store} persisted in a single Cloudflare Durable Object's key/value
 * storage. One Durable Object instance typically owns one conversation thread
 * (or one resource), so its memory is co-located, strongly consistent, and
 * needs no external database. Pass the DO's `state.storage` (or
 * {@link MemoryKVStorage} for local/dev/test).
 */
export class DurableObjectStore implements Store {
  constructor(private readonly kv: KVStorage) {}

  async saveThread(thread: Thread): Promise<Thread> {
    await this.kv.put(key.thread(thread.id), thread)
    return thread
  }

  async getThread(id: string): Promise<Thread | null> {
    return (await this.kv.get<Thread>(key.thread(id))) ?? null
  }

  async getThreadsByResourceId(resourceId: string): Promise<Thread[]> {
    const threads = await this.kv.list<Thread>({ prefix: key.threadPrefix })
    return [...threads.values()].filter((t) => t.resourceId === resourceId)
  }

  async deleteThread(id: string): Promise<void> {
    await this.kv.delete(key.thread(id))
    await this.kv.delete(key.counter(id))
    const messages = await this.kv.list({ prefix: key.messagePrefix(id) })
    for (const k of messages.keys()) await this.kv.delete(k)
  }

  async saveMessages(messages: RedtumaMessage[]): Promise<RedtumaMessage[]> {
    // Per-thread monotonic sequence. DO execution is single-threaded, so this
    // read-modify-write is race-free within an object.
    const nextSeq = new Map<string, number>()
    for (const m of messages) {
      if (!m.threadId) continue
      let seq = nextSeq.get(m.threadId)
      if (seq === undefined) seq = (await this.kv.get<number>(key.counter(m.threadId))) ?? 0
      await this.kv.put(key.message(m.threadId, seq), m)
      nextSeq.set(m.threadId, seq + 1)
    }
    for (const [threadId, seq] of nextSeq) {
      await this.kv.put(key.counter(threadId), seq)
    }
    return messages
  }

  async getMessages({ threadId, last }: GetMessagesArgs): Promise<RedtumaMessage[]> {
    const map = await this.kv.list<RedtumaMessage>({ prefix: key.messagePrefix(threadId) })
    const all = [...map.values()]
    return typeof last === 'number' ? all.slice(-last) : all
  }

  async getResource(id: string): Promise<Resource | null> {
    return (await this.kv.get<Resource>(key.resource(id))) ?? null
  }

  async saveResource(resource: Resource): Promise<Resource> {
    await this.kv.put(key.resource(resource.id), resource)
    return resource
  }

  async persistSnapshot(k: string, value: unknown): Promise<void> {
    await this.kv.put(key.snapshot(k), value)
  }

  async loadSnapshot<T = unknown>(k: string): Promise<T | null> {
    return (await this.kv.get<T>(key.snapshot(k))) ?? null
  }
}
