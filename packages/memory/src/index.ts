import { InMemoryStore } from '@redtuma/core'
import type { AgentMemory, RedtumaMessage, CoreMessage, Store } from '@redtuma/core'

/**
 * Produces dense numeric embeddings for a batch of texts. Mirrors the AI SDK
 * `embedMany` contract in spirit but is kept self-contained so `@redtuma/memory`
 * has no hard dependency on a particular provider or on `@redtuma/rag`.
 */
export interface Embedder {
  /** Embed each input text, returning one vector per input (same order). */
  embed(texts: string[]): Promise<number[][]>
}

/**
 * Minimal vector index used for semantic recall. Compatible in spirit with the
 * `VectorStore` shape from `@redtuma/rag` but defined here to avoid a dependency.
 */
export interface VectorStore {
  /** Insert or replace vectors keyed by id, with optional per-vector metadata. */
  upsert(args: {
    ids: string[]
    vectors: number[][]
    metadata?: Record<string, unknown>[]
  }): Promise<void>
  /** Return the `topK` nearest neighbours to `queryVector`, best score first. */
  query(args: {
    queryVector: number[]
    topK: number
  }): Promise<{ id: string; score: number; metadata?: Record<string, unknown> }[]>
}

/** Tuning knobs for the various memory subsystems. */
export interface MemoryOptions {
  /** How many of the most recent messages to recall as history. Default 10. */
  lastMessages?: number
  /**
   * Semantic recall. `true` uses defaults; an object customises `topK` and the
   * `messageRange` (how many neighbours of each hit to widen the window by).
   */
  semanticRecall?: boolean | { topK: number; messageRange?: number }
  /** Working memory: a persisted free-text scratchpad scoped to a resource. */
  workingMemory?: { enabled: boolean; template?: string }
  /** Observational memory: deterministic background summarization of old turns. */
  observational?: { enabled: boolean; threshold?: number }
}

/** Constructor configuration for {@link Memory}. */
export interface MemoryConfig {
  /** Persistence backend. Defaults to a fresh {@link InMemoryStore}. */
  storage?: Store
  /** Vector index for semantic recall. Required for `semanticRecall`. */
  vector?: VectorStore
  /** Embedder for semantic recall. Required for `semanticRecall`. */
  embedder?: Embedder
  /** Behavioural options. */
  options?: MemoryOptions
}

const DEFAULT_LAST_MESSAGES = 10
const DEFAULT_TOP_K = 5

let idCounter = 0
function genId(): string {
  idCounter += 1
  return `mem_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

/** Flatten a `CoreMessage` content (string or part array) into plain text. */
function contentToText(content: CoreMessage['content']): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (
          part &&
          typeof part === 'object' &&
          'text' in part &&
          typeof (part as { text: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function byCreatedAtAsc(a: RedtumaMessage, b: RedtumaMessage): number {
  return a.createdAt.getTime() - b.createdAt.getTime()
}

/**
 * Long-term agent memory implementing the core {@link AgentMemory} contract, so
 * it can be passed straight to `new Agent({ memory })`.
 *
 * Combines four subsystems, all optional:
 * - **Recent history** — the last N messages of a thread.
 * - **Semantic recall** — embeds messages on save and, on recall, surfaces the
 *   prior messages most similar to the latest user message.
 * - **Working memory** — a persisted per-resource scratchpad spliced into the
 *   system prompt.
 * - **Observational memory** — a deterministic compressed log of older turns.
 */
export class Memory implements AgentMemory {
  private readonly storage: Store
  private readonly vector?: VectorStore
  private readonly embedder?: Embedder
  private readonly options: Required<Pick<MemoryOptions, 'lastMessages'>> & MemoryOptions

  constructor(config: MemoryConfig = {}) {
    this.storage = config.storage ?? new InMemoryStore()
    this.vector = config.vector
    this.embedder = config.embedder
    this.options = {
      lastMessages: config.options?.lastMessages ?? DEFAULT_LAST_MESSAGES,
      ...config.options,
    }
  }

  private get semanticRecallEnabled(): boolean {
    const sr = this.options.semanticRecall
    return sr === true || (typeof sr === 'object' && sr !== null)
  }

  private get topK(): number {
    const sr = this.options.semanticRecall
    return typeof sr === 'object' && sr !== null ? sr.topK : DEFAULT_TOP_K
  }

  /**
   * Persist a batch of user/assistant messages to the store (creating the thread
   * if needed) and, when semantic recall is configured, index their embeddings.
   */
  async saveMessages(args: {
    threadId: string
    resourceId: string
    messages: { role: 'user' | 'assistant'; content: CoreMessage['content'] }[]
  }): Promise<void> {
    const { threadId, resourceId, messages } = args
    if (messages.length === 0) return

    const existing = await this.storage.getThread(threadId)
    if (!existing) {
      const now = new Date()
      await this.storage.saveThread({
        id: threadId,
        resourceId,
        createdAt: now,
        updatedAt: now,
      })
    }

    const toSave: RedtumaMessage[] = messages.map((m) => ({
      id: genId(),
      role: m.role,
      content: m.content,
      createdAt: new Date(),
      threadId,
      resourceId,
    }))
    const saved = await this.storage.saveMessages(toSave)

    if (this.semanticRecallEnabled && this.embedder && this.vector) {
      const texts = saved.map((m) => contentToText(m.content))
      const vectors = await this.embedder.embed(texts)
      await this.vector.upsert({
        ids: saved.map((m) => m.id),
        vectors,
        metadata: saved.map((m) => ({
          threadId,
          resourceId,
          role: m.role,
          text: contentToText(m.content),
          createdAt: m.createdAt.toISOString(),
        })),
      })
    }

    if (this.options.observational?.enabled) {
      await this.compress(threadId)
    }
  }

  /**
   * Build the recall payload spliced into the agent prompt: the recent history
   * window (optionally widened with semantically similar older messages) plus a
   * `systemContext` carrying working and observational memory.
   */
  async rememberMessages(args: {
    threadId: string
    resourceId: string
  }): Promise<{ messages: CoreMessage[]; systemContext?: string }> {
    const { threadId, resourceId } = args
    const recent = await this.storage.getMessages({
      threadId,
      last: this.options.lastMessages,
    })

    let merged = recent
    if (this.semanticRecallEnabled && this.embedder && this.vector) {
      const recalled = await this.recall(threadId, recent)
      merged = recalled
    }

    const messages: CoreMessage[] = merged.map(
      (m) => ({ role: m.role, content: m.content }) as CoreMessage,
    )
    const systemContext = await this.buildSystemContext(threadId, resourceId)
    return systemContext ? { messages, systemContext } : { messages }
  }

  /**
   * Widen the recent window with older messages most similar to the latest user
   * message. Recalled messages are deduped against the window and prepended in
   * chronological order.
   */
  private async recall(
    threadId: string,
    recent: RedtumaMessage[],
  ): Promise<RedtumaMessage[]> {
    if (!this.embedder || !this.vector) return recent

    const all = await this.storage.getMessages({ threadId })
    const lastUser = [...all].reverse().find((m) => m.role === 'user')
    if (!lastUser) return recent

    const queryText = contentToText(lastUser.content)
    const [queryVector] = await this.embedder.embed([queryText])
    if (!queryVector) return recent

    const hits = await this.vector.query({ queryVector, topK: this.topK })
    const windowIds = new Set(recent.map((m) => m.id))
    const byId = new Map(all.map((m) => [m.id, m] as const))

    const extra: RedtumaMessage[] = []
    for (const hit of hits) {
      if (windowIds.has(hit.id)) continue
      const msg = byId.get(hit.id)
      if (!msg) continue
      windowIds.add(hit.id)
      extra.push(msg)
    }
    extra.sort(byCreatedAtAsc)
    return [...extra, ...recent]
  }

  private async buildSystemContext(
    threadId: string,
    resourceId: string,
  ): Promise<string | undefined> {
    const parts: string[] = []

    if (this.options.workingMemory?.enabled) {
      const wm = (await this.getWorkingMemory(resourceId)) ?? this.options.workingMemory.template
      if (wm) parts.push(`## Working Memory\n\n${wm}`)
    }

    if (this.options.observational?.enabled) {
      const log = await this.storage.loadSnapshot<string>(`obs:${threadId}`)
      if (log) parts.push(`## Observations\n\n${log}`)
    }

    return parts.length > 0 ? parts.join('\n\n') : undefined
  }

  /** Read the working-memory scratchpad for a resource, if any. */
  async getWorkingMemory(resourceId: string): Promise<string | undefined> {
    const resource = await this.storage.getResource(resourceId)
    return resource?.workingMemory
  }

  /** Replace the working-memory scratchpad for a resource. */
  async updateWorkingMemory(resourceId: string, text: string): Promise<void> {
    const existing = await this.storage.getResource(resourceId)
    await this.storage.saveResource({
      id: resourceId,
      workingMemory: text,
      ...(existing?.metadata ? { metadata: existing.metadata } : {}),
    })
  }

  /**
   * Deterministic observational summarization. When a thread grows beyond the
   * configured threshold, the messages older than the recent window are
   * compressed into a short observation log persisted under `obs:${threadId}`.
   * Returns the log, or `undefined` if the thread is still below threshold.
   */
  async compress(threadId: string): Promise<string | undefined> {
    const all = await this.storage.getMessages({ threadId })
    const threshold = this.options.observational?.threshold ?? this.options.lastMessages
    if (all.length <= threshold) return undefined

    const older = all.slice(0, Math.max(0, all.length - this.options.lastMessages))
    if (older.length === 0) return undefined

    const log = older
      .map((m) => `- ${m.role}: ${truncate(contentToText(m.content), 120)}`)
      .join('\n')
    await this.storage.persistSnapshot(`obs:${threadId}`, log)
    return log
  }
}
