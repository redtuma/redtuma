import { describe, expect, it } from 'vitest'
import {
  contains,
  exactMatch,
  jsonValidity,
  keywordCoverage,
  lengthWithin,
  levenshtein,
  levenshteinSimilarity,
  regexMatch,
  toxicityHeuristic,
} from '../src/index'

describe('exactMatch', () => {
  it('scores 1 on an exact match and 0 otherwise', async () => {
    const s = exactMatch()
    expect((await s.score({ output: 'hi', expected: 'hi' })).score).toBe(1)
    expect((await s.score({ output: 'hi', expected: 'ho' })).score).toBe(0)
  })

  it('throws when expected is missing', () => {
    expect(() => exactMatch().score({ output: 'hi' })).toThrow()
  })
})

describe('contains', () => {
  it('uses an explicit substring when given', async () => {
    const s = contains('cat')
    expect((await s.score({ output: 'a cat sat' })).score).toBe(1)
    expect((await s.score({ output: 'a dog ran' })).score).toBe(0)
  })

  it('falls back to expected when no substring is given', async () => {
    const s = contains()
    expect((await s.score({ output: 'hello world', expected: 'world' })).score).toBe(1)
    expect((await s.score({ output: 'hello world', expected: 'mars' })).score).toBe(0)
  })
})

describe('regexMatch', () => {
  it('scores by regex test result', async () => {
    const s = regexMatch(/^\d{3}-\d{4}$/)
    expect((await s.score({ output: '123-4567' })).score).toBe(1)
    expect((await s.score({ output: 'nope' })).score).toBe(0)
  })

  it('is reusable across calls with a global regex', async () => {
    const s = regexMatch(/foo/g)
    expect((await s.score({ output: 'foo' })).score).toBe(1)
    expect((await s.score({ output: 'foo' })).score).toBe(1)
  })
})

describe('levenshtein', () => {
  it('computes known distances', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('flaw', 'lawn')).toBe(2)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('same', 'same')).toBe(0)
  })
})

describe('levenshteinSimilarity', () => {
  it('returns 1 - dist/maxLen', async () => {
    const s = levenshteinSimilarity()
    // kitten/sitting: dist 3, maxLen 7 -> 1 - 3/7
    expect((await s.score({ output: 'kitten', expected: 'sitting' })).score).toBeCloseTo(1 - 3 / 7)
    expect((await s.score({ output: 'abc', expected: 'abc' })).score).toBe(1)
    expect((await s.score({ output: '', expected: '' })).score).toBe(1)
  })
})

describe('keywordCoverage', () => {
  it('returns the fraction of keywords present (case-insensitive)', async () => {
    const s = keywordCoverage(['Alpha', 'beta', 'GAMMA'])
    expect((await s.score({ output: 'alpha and BETA only' })).score).toBeCloseTo(2 / 3)
    expect((await s.score({ output: 'alpha beta gamma' })).score).toBe(1)
    expect((await s.score({ output: 'none here' })).score).toBe(0)
  })

  it('scores 1 for an empty keyword list', async () => {
    expect((await keywordCoverage([]).score({ output: 'x' })).score).toBe(1)
  })
})

describe('jsonValidity', () => {
  it('scores 1 for valid JSON and 0 otherwise', async () => {
    const s = jsonValidity()
    expect((await s.score({ output: '{"a":1}' })).score).toBe(1)
    expect((await s.score({ output: '[1,2,3]' })).score).toBe(1)
    expect((await s.score({ output: '{not json}' })).score).toBe(0)
  })
})

describe('lengthWithin', () => {
  it('respects min and max bounds', async () => {
    const s = lengthWithin({ min: 2, max: 5 })
    expect((await s.score({ output: 'abc' })).score).toBe(1)
    expect((await s.score({ output: 'a' })).score).toBe(0)
    expect((await s.score({ output: 'abcdef' })).score).toBe(0)
  })

  it('allows an unbounded side', async () => {
    expect((await lengthWithin({ min: 3 }).score({ output: 'abcd' })).score).toBe(1)
    expect((await lengthWithin({ max: 3 }).score({ output: 'abcd' })).score).toBe(0)
  })
})

describe('toxicityHeuristic', () => {
  it('flags banned words and passes clean text', async () => {
    const s = toxicityHeuristic()
    expect((await s.score({ output: 'have a lovely day' })).score).toBe(1)
    expect((await s.score({ output: 'you idiot' })).score).toBe(0)
  })

  it('matches whole words only', async () => {
    // "skillet" contains "kill" as a substring but not as a word.
    expect((await toxicityHeuristic().score({ output: 'a skillet' })).score).toBe(1)
  })
})
