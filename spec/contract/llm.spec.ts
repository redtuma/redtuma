import { describe, it, expect } from 'vitest'
import { parseModelString, resolveModel, isLanguageModel, RedtumaModelError, SUPPORTED_PROVIDERS } from '@redtuma/core'
import { textModel } from '../src/mock-model'

describe('parseModelString', () => {
  it('splits provider/model', () => {
    expect(parseModelString('anthropic/claude-opus-4-8')).toEqual({
      provider: 'anthropic',
      modelId: 'claude-opus-4-8',
    })
  })

  it('keeps slashes inside the model id', () => {
    expect(parseModelString('openai/org/model')).toEqual({ provider: 'openai', modelId: 'org/model' })
  })

  it('rejects malformed strings with RedtumaModelError', () => {
    expect(() => parseModelString('justamodel')).toThrow(RedtumaModelError)
    expect(() => parseModelString('/model')).toThrow(RedtumaModelError)
    expect(() => parseModelString('provider/')).toThrow(RedtumaModelError)
  })
})

describe('isLanguageModel', () => {
  it('treats strings as unresolved and objects as models', () => {
    expect(isLanguageModel('openai/gpt-4o')).toBe(false)
    expect(isLanguageModel(textModel('x'))).toBe(true)
  })
})

describe('resolveModel', () => {
  it('passes a concrete model through unchanged', async () => {
    const model = textModel('x')
    expect(await resolveModel(model)).toBe(model)
  })

  it('throws a helpful error for an unknown provider', async () => {
    await expect(resolveModel('cohere/command')).rejects.toThrow(/Unknown model provider/)
  })
})

describe('SUPPORTED_PROVIDERS', () => {
  it('advertises the built-in providers', () => {
    expect(SUPPORTED_PROVIDERS).toEqual(expect.arrayContaining(['anthropic', 'openai']))
  })
})
