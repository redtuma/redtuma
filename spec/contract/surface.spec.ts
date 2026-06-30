import { describe, it, expect } from 'vitest'
import * as core from '@redtuma/core'

/**
 * The export surface itself is part of the contract: consumers import these
 * names. If a refactor drops or renames one, that's a breaking change and this
 * file should fail.
 */
describe('@redtuma/core export surface', () => {
  const functions = [
    'createTool',
    'toAISDKTool',
    'buildToolset',
    'isToolAction',
    'createWorkflow',
    'createStep',
    'resolveModel',
    'parseModelString',
    'isLanguageModel',
  ] as const

  const constructors = [
    'Redtuma',
    'Agent',
    'Workflow',
    'Run',
    'MessageList',
    'InMemoryStore',
    'RuntimeContext',
    'ConsoleLogger',
    'RedtumaModelError',
  ] as const

  it.each(functions)('exports function `%s`', (name) => {
    expect(typeof (core as Record<string, unknown>)[name]).toBe('function')
  })

  it.each(constructors)('exports constructor `%s`', (name) => {
    expect(typeof (core as Record<string, unknown>)[name]).toBe('function')
  })

  it('exports SUPPORTED_PROVIDERS as a string array', () => {
    expect(Array.isArray(core.SUPPORTED_PROVIDERS)).toBe(true)
    expect(core.SUPPORTED_PROVIDERS.every((p) => typeof p === 'string')).toBe(true)
  })

  it('exports a noop logger with the Logger shape', () => {
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      expect(typeof core.noopLogger[level]).toBe('function')
    }
  })

  it('resolves every documented subpath entry', async () => {
    await Promise.all([
      expect(import('@redtuma/core/agent')).resolves.toBeDefined(),
      expect(import('@redtuma/core/tools')).resolves.toBeDefined(),
      expect(import('@redtuma/core/workflows')).resolves.toBeDefined(),
      expect(import('@redtuma/core/llm')).resolves.toBeDefined(),
      expect(import('@redtuma/core/store')).resolves.toBeDefined(),
    ])
  })
})
