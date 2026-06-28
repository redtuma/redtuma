import { levenshtein } from './levenshtein'
import type { Scorer, ScorerConfig, ScoreResult } from './types'

/** Wrap a config into a {@link Scorer}. Identity helper for ergonomics/typing. */
export function createScorer(config: ScorerConfig): Scorer {
  return { id: config.id, score: config.score }
}

/** Clamp a number into the 0..1 range. */
function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/**
 * 1 when `output` exactly equals `expected`, else 0. Throws if `expected` is
 * absent since there is nothing to compare against.
 */
export function exactMatch(): Scorer {
  return createScorer({
    id: 'exact-match',
    score({ output, expected }): ScoreResult {
      if (expected === undefined) {
        throw new Error('exactMatch scorer requires `expected`')
      }
      const pass = output === expected
      return { score: pass ? 1 : 0, reason: pass ? 'exact match' : 'mismatch' }
    },
  })
}

/**
 * 1 when `output` contains the substring, else 0. The needle is `substr` when
 * provided, otherwise `expected`. Comparison is case-sensitive.
 */
export function contains(substr?: string): Scorer {
  return createScorer({
    id: 'contains',
    score({ output, expected }): ScoreResult {
      const needle = substr ?? expected
      if (needle === undefined) {
        throw new Error('contains scorer requires `substr` or `expected`')
      }
      const pass = output.includes(needle)
      return {
        score: pass ? 1 : 0,
        reason: pass ? `contains "${needle}"` : `missing "${needle}"`,
      }
    },
  })
}

/** 1 when `output` matches the given RegExp, else 0. */
export function regexMatch(re: RegExp): Scorer {
  return createScorer({
    id: 'regex-match',
    score({ output }): ScoreResult {
      // Reset lastIndex so global/sticky regexes are reusable across items.
      re.lastIndex = 0
      const pass = re.test(output)
      return {
        score: pass ? 1 : 0,
        reason: pass ? `matches ${re}` : `no match for ${re}`,
      }
    },
  })
}

/**
 * Normalized similarity to `expected`: `1 - distance / maxLen`, where `maxLen`
 * is the longer of the two strings. Two empty strings score 1.
 */
export function levenshteinSimilarity(): Scorer {
  return createScorer({
    id: 'levenshtein-similarity',
    score({ output, expected }): ScoreResult {
      if (expected === undefined) {
        throw new Error('levenshteinSimilarity scorer requires `expected`')
      }
      const maxLen = Math.max(output.length, expected.length)
      if (maxLen === 0) return { score: 1, reason: 'both empty' }
      const dist = levenshtein(output, expected)
      const score = clamp01(1 - dist / maxLen)
      return { score, reason: `edit distance ${dist} over ${maxLen}` }
    },
  })
}

/**
 * Fraction of `keywords` present in `output` (case-insensitive substring
 * match). An empty keyword list scores 1.
 */
export function keywordCoverage(keywords: string[]): Scorer {
  return createScorer({
    id: 'keyword-coverage',
    score({ output }): ScoreResult {
      if (keywords.length === 0) return { score: 1, reason: 'no keywords' }
      const haystack = output.toLowerCase()
      const found = keywords.filter((k) => haystack.includes(k.toLowerCase()))
      const score = found.length / keywords.length
      return {
        score,
        reason: `${found.length}/${keywords.length} keywords present`,
      }
    },
  })
}

/** 1 when `output` parses as JSON, else 0. */
export function jsonValidity(): Scorer {
  return createScorer({
    id: 'json-validity',
    score({ output }): ScoreResult {
      try {
        JSON.parse(output)
        return { score: 1, reason: 'valid JSON' }
      } catch (err) {
        return { score: 0, reason: `invalid JSON: ${(err as Error).message}` }
      }
    },
  })
}

/**
 * 1 when `output.length` is within `[min, max]` (inclusive), else 0. Either
 * bound may be omitted to leave that side unbounded.
 */
export function lengthWithin(bounds: { min?: number; max?: number }): Scorer {
  const { min, max } = bounds
  return createScorer({
    id: 'length-within',
    score({ output }): ScoreResult {
      const len = output.length
      const tooShort = min !== undefined && len < min
      const tooLong = max !== undefined && len > max
      const pass = !tooShort && !tooLong
      return {
        score: pass ? 1 : 0,
        reason: pass
          ? `length ${len} within bounds`
          : `length ${len} outside [${min ?? '-∞'}, ${max ?? '∞'}]`,
      }
    },
  })
}

/** A small, tasteful list of clearly-abusive words used by the heuristic. */
const BANNED_WORDS = ['hate', 'idiot', 'stupid', 'kill', 'moron', 'scum']

/**
 * Cheap, deterministic toxicity check: 1 when no banned word appears in
 * `output`, else 0. Matches whole words case-insensitively. Not a substitute
 * for a real model-based classifier — a guard rail for tests/CI.
 */
export function toxicityHeuristic(): Scorer {
  return createScorer({
    id: 'toxicity-heuristic',
    score({ output }): ScoreResult {
      const lower = output.toLowerCase()
      const hits = BANNED_WORDS.filter((w) =>
        new RegExp(`\\b${w}\\b`).test(lower),
      )
      const clean = hits.length === 0
      return {
        score: clean ? 1 : 0,
        reason: clean ? 'no flagged terms' : `flagged: ${hits.join(', ')}`,
      }
    },
  })
}
