/**
 * answerMatch.js
 *
 * Pure answer-equality helpers. Most exercises compare numerically, but
 * remainder-division exercises carry a string answer ("3 r 2") and must be
 * compared leniently because kids type spacing/casing inconsistently.
 */

/** Parse "3 r 2" / "3r2" / "3 R 2" → { q, r } or null. */
export function parseRemainder(str) {
  if (typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d+)\s*[rR]\s*(\d+)$/);
  if (!m) return null;
  return { q: parseInt(m[1], 10), r: parseInt(m[2], 10) };
}

/**
 * True if `raw` (string or number) is a correct answer for `exercise`.
 * Remainder exercises (isRemainder) compare quotient+remainder leniently;
 * everything else falls back to numeric equality.
 */
export function matchesAnswer(exercise, raw) {
  if (exercise?.isRemainder) {
    const parsed = parseRemainder(String(raw));
    if (!parsed) return false;
    return parsed.q === exercise.quotient && parsed.r === exercise.remainder;
  }
  const num = typeof raw === 'number' ? raw : parseFloat(raw);
  return num === exercise.correctAnswer;
}
