import { describe, it, expect } from 'vitest'
import { parseModelString, resolveModel, isLanguageModel, RedtumaModelError } from '../src/llm'

describe('model routing', () => {
  it('parses provider/model strings', () => {
    expect(parseModelString('anthropic/claude-opus-4-8')).toEqual({
      provider: 'anthropic',
      modelId: 'claude-opus-4-8',
    })
  })

  it('parses model ids containing slashes', () => {
    expect(parseModelString('openai/org/model')).toEqual({
      provider: 'openai',
      modelId: 'org/model',
    })
  })

  it('rejects malformed strings', () => {
    expect(() => parseModelString('justamodel')).toThrow(RedtumaModelError)
    expect(() => parseModelString('/model')).toThrow(RedtumaModelError)
    expect(() => parseModelString('provider/')).toThrow(RedtumaModelError)
  })

  it('throws a helpful error for unknown providers', async () => {
    await expect(resolveModel('cohere/command')).rejects.toThrow(/Unknown model provider/)
  })

  it('passes through concrete language models', () => {
    const fake = { specificationVersion: 'v1' } as never
    expect(isLanguageModel(fake)).toBe(true)
  })
})
