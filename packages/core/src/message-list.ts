import type { CoreMessage } from 'ai'

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/** Canonical persisted message shape. */
export interface ChitumaMessage {
  id: string
  role: MessageRole
  content: CoreMessage['content']
  createdAt: Date
  threadId?: string
  resourceId?: string
}

export type MessageInput =
  | string
  | CoreMessage
  | CoreMessage[]
  | ChitumaMessage
  | ChitumaMessage[]

let counter = 0
function genId(): string {
  counter += 1
  return `msg_${Date.now().toString(36)}_${counter.toString(36)}`
}

function isChitumaMessage(m: unknown): m is ChitumaMessage {
  return !!m && typeof m === 'object' && 'createdAt' in m && 'id' in m && 'role' in m
}

/**
 * Normalizes heterogeneous message inputs (strings, AI SDK CoreMessages,
 * persisted ChitumaMessages) into a single ordered list and converts back to
 * the AI SDK `CoreMessage[]` shape for model calls.
 */
export class MessageList {
  private messages: ChitumaMessage[] = []

  constructor(
    private readonly meta: { threadId?: string; resourceId?: string } = {},
  ) {}

  add(input: MessageInput, role: MessageRole = 'user'): this {
    for (const m of this.coerce(input, role)) this.messages.push(m)
    return this
  }

  private coerce(input: MessageInput, role: MessageRole): ChitumaMessage[] {
    if (typeof input === 'string') {
      return [this.wrap({ role, content: input })]
    }
    const arr = Array.isArray(input) ? input : [input]
    return arr.map((m) =>
      isChitumaMessage(m)
        ? m
        : this.wrap({ role: m.role as MessageRole, content: m.content }),
    )
  }

  private wrap(m: { role: MessageRole; content: CoreMessage['content'] }): ChitumaMessage {
    return {
      id: genId(),
      role: m.role,
      content: m.content,
      createdAt: new Date(),
      threadId: this.meta.threadId,
      resourceId: this.meta.resourceId,
    }
  }

  all(): ChitumaMessage[] {
    return [...this.messages]
  }

  /** Convert to AI SDK CoreMessage[] (drops chituma-only metadata). */
  toCore(): CoreMessage[] {
    return this.messages.map(
      (m) => ({ role: m.role, content: m.content }) as CoreMessage,
    )
  }

  get length(): number {
    return this.messages.length
  }
}
