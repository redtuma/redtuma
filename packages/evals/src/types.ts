/** Arguments passed to a {@link Scorer}. */
export interface ScoreArgs {
  /** The input/prompt that produced `output` (optional). */
  input?: string
  /** The text under evaluation. */
  output: string
  /** The reference/expected answer, when the scorer compares against one. */
  expected?: string
  /** Optional retrieved context (e.g. RAG passages). */
  context?: string[]
}

/** The result of scoring a single output. */
export interface ScoreResult {
  /** Normalized score in the range 0..1 (higher is better). */
  score: number
  /** Optional human-readable explanation of the score. */
  reason?: string
}

/** A named, deterministic-or-async scoring function. */
export interface Scorer {
  id: string
  score(args: ScoreArgs): Promise<ScoreResult> | ScoreResult
}

/** Config accepted by {@link createScorer}. */
export interface ScorerConfig {
  id: string
  score(args: ScoreArgs): Promise<ScoreResult> | ScoreResult
}
