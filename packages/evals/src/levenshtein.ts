/**
 * Levenshtein edit distance between two strings (insertions, deletions and
 * substitutions, each cost 1). Iterative two-row implementation, O(n*m) time
 * and O(min(n,m)) space.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Ensure `b` is the shorter string to minimize the row width.
  if (a.length < b.length) {
    const tmp = a
    a = b
    b = tmp
  }

  let prev = new Array<number>(b.length + 1)
  let curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    const ac = a.charCodeAt(i - 1)
    for (let j = 1; j <= b.length; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1
      const del = prev[j]! + 1
      const ins = curr[j - 1]! + 1
      const sub = prev[j - 1]! + cost
      curr[j] = Math.min(del, ins, sub)
    }
    const swap = prev
    prev = curr
    curr = swap
  }

  return prev[b.length]!
}
