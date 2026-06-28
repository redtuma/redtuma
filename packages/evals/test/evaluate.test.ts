import { describe, expect, it } from 'vitest'
import { contains, evaluate, exactMatch, type EvalItem } from '../src/index'

describe('evaluate', () => {
  it('scores a dataset with a canned run and reports per-scorer means', async () => {
    const data: EvalItem[] = [
      { input: 'a', expected: 'apple' },
      { input: 'b', expected: 'banana' },
      { input: 'c', expected: 'cherry' },
    ]

    // Fake run: correct for a and c, wrong for b.
    const canned: Record<string, string> = { a: 'apple', b: 'WRONG', c: 'cherry' }
    const run = async (input: string) => canned[input] ?? ''

    const report = await evaluate({
      data,
      scorers: [exactMatch(), contains('a')],
      run,
    })

    expect(report.results).toHaveLength(3)
    expect(report.results.map((r) => r.output)).toEqual(['apple', 'WRONG', 'cherry'])

    // exact-match: apple✓, WRONG✗, cherry✓ -> 2/3
    expect(report.summary['exact-match']!.mean).toBeCloseTo(2 / 3)
    // contains "a": apple✓, WRONG✗, cherry✗ -> 1/3
    expect(report.summary['contains']!.mean).toBeCloseTo(1 / 3)

    // Per-item scores are attached.
    expect(report.results[0]!.scores['exact-match']!.score).toBe(1)
    expect(report.results[1]!.scores['exact-match']!.score).toBe(0)
  })

  it('handles items without input and an empty dataset', async () => {
    const empty = await evaluate({ data: [], scorers: [exactMatch()], run: async () => 'x' })
    expect(empty.results).toHaveLength(0)
    expect(empty.summary['exact-match']!.mean).toBe(0)

    let received = 'unset'
    const report = await evaluate({
      data: [{ expected: '' }],
      scorers: [exactMatch()],
      run: async (input) => {
        received = input
        return input
      },
    })
    expect(received).toBe('')
    expect(report.summary['exact-match']!.mean).toBe(1)
  })
})
