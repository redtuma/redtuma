import type { RedtumaMessage } from '../message-list'

export interface Thread {
  id: string
  resourceId: string
  title?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface Resource {
  id: string
  workingMemory?: string
  metadata?: Record<string, unknown>
}

export interface GetMessagesArgs {
  threadId: string
  /** Return only the most recent N messages. */
  last?: number
}

/** Persistence interface shared by all store adapters. */
export interface Store {
  // threads
  saveThread(thread: Thread): Promise<Thread>
  getThread(id: string): Promise<Thread | null>
  getThreadsByResourceId(resourceId: string): Promise<Thread[]>
  deleteThread(id: string): Promise<void>
  // messages
  saveMessages(messages: RedtumaMessage[]): Promise<RedtumaMessage[]>
  getMessages(args: GetMessagesArgs): Promise<RedtumaMessage[]>
  // working memory / resources
  getResource(id: string): Promise<Resource | null>
  saveResource(resource: Resource): Promise<Resource>
  // generic kv for workflow snapshots etc.
  persistSnapshot(key: string, value: unknown): Promise<void>
  loadSnapshot<T = unknown>(key: string): Promise<T | null>
}

/** Default ephemeral store. Useful for tests and quick starts. */
export class InMemoryStore implements Store {
  private threads = new Map<string, Thread>()
  private messages = new Map<string, RedtumaMessage[]>()
  private resources = new Map<string, Resource>()
  private snapshots = new Map<string, unknown>()

  async saveThread(thread: Thread): Promise<Thread> {
    this.threads.set(thread.id, thread)
    if (!this.messages.has(thread.id)) this.messages.set(thread.id, [])
    return thread
  }
  async getThread(id: string): Promise<Thread | null> {
    return this.threads.get(id) ?? null
  }
  async getThreadsByResourceId(resourceId: string): Promise<Thread[]> {
    return [...this.threads.values()].filter((t) => t.resourceId === resourceId)
  }
  async deleteThread(id: string): Promise<void> {
    this.threads.delete(id)
    this.messages.delete(id)
  }

  async saveMessages(messages: RedtumaMessage[]): Promise<RedtumaMessage[]> {
    for (const m of messages) {
      if (!m.threadId) continue
      const list = this.messages.get(m.threadId) ?? []
      list.push(m)
      this.messages.set(m.threadId, list)
    }
    return messages
  }
  async getMessages({ threadId, last }: GetMessagesArgs): Promise<RedtumaMessage[]> {
    const list = this.messages.get(threadId) ?? []
    return typeof last === 'number' ? list.slice(-last) : [...list]
  }

  async getResource(id: string): Promise<Resource | null> {
    return this.resources.get(id) ?? null
  }
  async saveResource(resource: Resource): Promise<Resource> {
    this.resources.set(resource.id, resource)
    return resource
  }

  async persistSnapshot(key: string, value: unknown): Promise<void> {
    this.snapshots.set(key, value)
  }
  async loadSnapshot<T = unknown>(key: string): Promise<T | null> {
    return (this.snapshots.get(key) as T) ?? null
  }
}
