import type { Scorer, ScoreResult } from './types'

/** A single dataset row. */
export interface EvalItem {
  input?: string
  expected?: string
  context?: string[]
}

/** The scored result for one dataset row. */
export interface EvalResultItem {
  item: EvalItem
  output: string
  scores: Record<string, ScoreResult>
}

/** Aggregate statistics for a scorer across the dataset. */
export interface ScorerSummary {
  mean: number
}

/** The full output of {@link evaluate}. */
export interface EvalReport {
  results: EvalResultItem[]
  summary: Record<string, ScorerSummary>
}

/** Arguments for {@link evaluate}. */
export interface EvaluateArgs {
  data: EvalItem[]
  scorers: Scorer[]
  /** Produces the output under test for a given input. */
  run(input: string): Promise<string>
}

/**
 * Run `run` over each dataset item, score every output with each scorer, and
 * return per-item results plus a per-scorer mean. Items are processed
 * sequentially so a stateful/throttled `run` stays predictable.
 */
export async function evaluate(args: EvaluateArgs): Promise<EvalReport> {
  const { data, scorers, run } = args
  const results: EvalResultItem[] = []

  for (const item of data) {
    const output = await run(item.input ?? '')
    const scores: Record<string, ScoreResult> = {}
    for (const scorer of scorers) {
      scores[scorer.id] = await scorer.score({
        input: item.input,
        output,
        expected: item.expected,
        context: item.context,
      })
    }
    results.push({ item, output, scores })
  }

  const summary: Record<string, ScorerSummary> = {}
  for (const scorer of scorers) {
    if (results.length === 0) {
      summary[scorer.id] = { mean: 0 }
      continue
    }
    let total = 0
    for (const r of results) total += r.scores[scorer.id]!.score
    summary[scorer.id] = { mean: total / results.length }
  }

  return { results, summary }
}
