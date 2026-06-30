import { createClient } from '@libsql/client'
import type { Client, InValue, Row } from '@libsql/client'
import type {
  GetMessagesArgs,
  Resource,
  Store,
  Thread,
} from '@redtuma/core/store'
import type { RedtumaMessage, MessageRole } from '@redtuma/core'

/** Either connect to a libSQL URL, or reuse an existing client. */
export type LibSQLStoreConfig =
  | { url: string; authToken?: string; client?: undefined }
  | { client: Client; url?: undefined; authToken?: undefined }

/**
 * Persistent {@link Store} backed by libSQL / SQLite. Works against a local
 * file (`file:./redtuma.db`), an in-memory database (`:memory:`), or a remote
 * Turso URL with an auth token. Tables are created lazily on first use.
 */
export class LibSQLStore implements Store {
  private readonly client: Client
  private initPromise?: Promise<void>

  constructor(config: LibSQLStoreConfig) {
    if (config.client) {
      this.client = config.client
    } else {
      this.client = createClient({
        url: config.url,
        ...(config.authToken ? { authToken: config.authToken } : {}),
      })
    }
  }

  /** Create tables on first use; the underlying promise is reused thereafter. */
  private init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.createTables()
    }
    return this.initPromise
  }

  private async createTables(): Promise<void> {
    await this.client.batch(
      [
        `CREATE TABLE IF NOT EXISTS redtuma_threads (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          title TEXT,
          metadata TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_redtuma_threads_resource
          ON redtuma_threads (resource_id)`,
        `CREATE TABLE IF NOT EXISTS redtuma_messages (
          id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL,
          resource_id TEXT,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_redtuma_messages_thread
          ON redtuma_messages (thread_id, created_at)`,
        `CREATE TABLE IF NOT EXISTS redtuma_resources (
          id TEXT PRIMARY KEY,
          working_memory TEXT,
          metadata TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS redtuma_snapshots (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`,
      ],
      'write',
    )
  }

  // --- threads ---------------------------------------------------------------

  async saveThread(thread: Thread): Promise<Thread> {
    await this.init()
    await this.client.execute({
      sql: `INSERT INTO redtuma_threads (id, resource_id, title, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              resource_id = excluded.resource_id,
              title = excluded.title,
              metadata = excluded.metadata,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at`,
      args: [
        thread.id,
        thread.resourceId,
        thread.title ?? null,
        thread.metadata ? JSON.stringify(thread.metadata) : null,
        thread.createdAt.toISOString(),
        thread.updatedAt.toISOString(),
      ],
    })
    return thread
  }

  async getThread(id: string): Promise<Thread | null> {
    await this.init()
    const { rows } = await this.client.execute({
      sql: `SELECT * FROM redtuma_threads WHERE id = ?`,
      args: [id],
    })
    const row = rows[0]
    return row ? rowToThread(row) : null
  }

  async getThreadsByResourceId(resourceId: string): Promise<Thread[]> {
    await this.init()
    const { rows } = await this.client.execute({
      sql: `SELECT * FROM redtuma_threads WHERE resource_id = ? ORDER BY created_at ASC`,
      args: [resourceId],
    })
    return rows.map(rowToThread)
  }

  async deleteThread(id: string): Promise<void> {
    await this.init()
    await this.client.batch(
      [
        { sql: `DELETE FROM redtuma_messages WHERE thread_id = ?`, args: [id] },
        { sql: `DELETE FROM redtuma_threads WHERE id = ?`, args: [id] },
      ],
      'write',
    )
  }

  // --- messages --------------------------------------------------------------

  async saveMessages(messages: RedtumaMessage[]): Promise<RedtumaMessage[]> {
    await this.init()
    const stmts = messages
      .filter((m) => m.threadId)
      .map((m) => ({
        sql: `INSERT INTO redtuma_messages (id, thread_id, resource_id, role, content, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                thread_id = excluded.thread_id,
                resource_id = excluded.resource_id,
                role = excluded.role,
                content = excluded.content,
                created_at = excluded.created_at`,
        args: [
          m.id,
          m.threadId as string,
          m.resourceId ?? null,
          m.role,
          JSON.stringify(m.content),
          m.createdAt.toISOString(),
        ] satisfies InValue[],
      }))
    if (stmts.length > 0) await this.client.batch(stmts, 'write')
    return messages
  }

  async getMessages({ threadId, last }: GetMessagesArgs): Promise<RedtumaMessage[]> {
    await this.init()
    if (typeof last === 'number') {
      // Fetch the most recent N, then re-order ascending for the caller.
      const { rows } = await this.client.execute({
        sql: `SELECT * FROM (
                SELECT *, rowid AS _rowid FROM redtuma_messages WHERE thread_id = ?
                ORDER BY created_at DESC, _rowid DESC LIMIT ?
              ) ORDER BY created_at ASC, _rowid ASC`,
        args: [threadId, last],
      })
      return rows.map(rowToMessage)
    }
    const { rows } = await this.client.execute({
      sql: `SELECT * FROM redtuma_messages WHERE thread_id = ?
            ORDER BY created_at ASC, rowid ASC`,
      args: [threadId],
    })
    return rows.map(rowToMessage)
  }

  // --- resources -------------------------------------------------------------

  async getResource(id: string): Promise<Resource | null> {
    await this.init()
    const { rows } = await this.client.execute({
      sql: `SELECT * FROM redtuma_resources WHERE id = ?`,
      args: [id],
    })
    const row = rows[0]
    return row ? rowToResource(row) : null
  }

  async saveResource(resource: Resource): Promise<Resource> {
    await this.init()
    await this.client.execute({
      sql: `INSERT INTO redtuma_resources (id, working_memory, metadata)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              working_memory = excluded.working_memory,
              metadata = excluded.metadata`,
      args: [
        resource.id,
        resource.workingMemory ?? null,
        resource.metadata ? JSON.stringify(resource.metadata) : null,
      ],
    })
    return resource
  }

  // --- snapshots (generic kv) ------------------------------------------------

  async persistSnapshot(key: string, value: unknown): Promise<void> {
    await this.init()
    await this.client.execute({
      sql: `INSERT INTO redtuma_snapshots (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, JSON.stringify(value)],
    })
  }

  async loadSnapshot<T = unknown>(key: string): Promise<T | null> {
    await this.init()
    const { rows } = await this.client.execute({
      sql: `SELECT value FROM redtuma_snapshots WHERE key = ?`,
      args: [key],
    })
    const row = rows[0]
    if (!row) return null
    return JSON.parse(row.value as string) as T
  }
}

// --- row revivers ------------------------------------------------------------

function rowToThread(row: Row): Thread {
  const metadata = row.metadata as string | null
  const title = row.title as string | null
  return {
    id: row.id as string,
    resourceId: row.resource_id as string,
    ...(title !== null ? { title } : {}),
    ...(metadata !== null
      ? { metadata: JSON.parse(metadata) as Record<string, unknown> }
      : {}),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function rowToMessage(row: Row): RedtumaMessage {
  const resourceId = row.resource_id as string | null
  return {
    id: row.id as string,
    role: row.role as MessageRole,
    content: JSON.parse(row.content as string) as RedtumaMessage['content'],
    createdAt: new Date(row.created_at as string),
    threadId: row.thread_id as string,
    ...(resourceId !== null ? { resourceId } : {}),
  }
}

function rowToResource(row: Row): Resource {
  const workingMemory = row.working_memory as string | null
  const metadata = row.metadata as string | null
  return {
    id: row.id as string,
    ...(workingMemory !== null ? { workingMemory } : {}),
    ...(metadata !== null
      ? { metadata: JSON.parse(metadata) as Record<string, unknown> }
      : {}),
  }
}
