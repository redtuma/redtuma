import type { Logger } from './types'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
}

export class ConsoleLogger implements Logger {
  constructor(private readonly level: LogLevel = 'info') {}

  private enabled(level: Exclude<LogLevel, 'silent'>): boolean {
    return ORDER[level] >= ORDER[this.level]
  }

  debug(msg: string, meta?: unknown): void {
    if (this.enabled('debug')) console.debug(`[redtuma] ${msg}`, meta ?? '')
  }
  info(msg: string, meta?: unknown): void {
    if (this.enabled('info')) console.info(`[redtuma] ${msg}`, meta ?? '')
  }
  warn(msg: string, meta?: unknown): void {
    if (this.enabled('warn')) console.warn(`[redtuma] ${msg}`, meta ?? '')
  }
  error(msg: string, meta?: unknown): void {
    if (this.enabled('error')) console.error(`[redtuma] ${msg}`, meta ?? '')
  }
}

export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}
