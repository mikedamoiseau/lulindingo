// Pure estimation logic for the "Closest Wins" challenge mode.
// Transforms a generator-produced exact answer into rounded buckets (multiple
// choice) and a tolerance check (typed estimate). No generator changes.

export const TOLERANCE_PCT = 0.10;
export const ABSOLUTE_FLOOR = 5;
export const BUCKET_COUNT = 4;

/** Rounding step for a value, scaled by its order of magnitude. */
export function granularityFor(answer) {
  const n = Math.abs(answer);
  if (n < 100) return 10;
  if (n < 1_000) return 100;
  if (n < 10_000) return 1_000;
  if (n < 100_000) return 10_000;
  return 100_000;
}

/** True if `guess` is within the tolerance band of `answer`. */
export function isWithinTolerance(guess, answer) {
  const band = Math.max(ABSOLUTE_FLOOR, Math.abs(answer) * TOLERANCE_PCT);
  return Math.abs(guess - answer) <= band;
}

/** Fisher–Yates shuffle using an injectable rng (does not mutate input). */
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Produce BUCKET_COUNT rounded buckets around `answer`, exactly one of which
 * (`correctBucket`) is the multiple of `granularity` the answer rounds to.
 * Buckets straddle the true bucket when possible, are >= 0, distinct, sorted asc.
 *
 * @param {number} answer
 * @param {() => number} [rng] - injectable [0,1) source for deterministic tests
 * @returns {{ buckets: number[], correctBucket: number, granularity: number }}
 */
export function makeBuckets(answer, rng = Math.random) {
  let granularity = granularityFor(answer);
  // Defensive: if magnitude is so small that granularity swallows the answer
  // (only possible when D2 eligibility is bypassed), fall back to step 10.
  // Strict '>' so an answer that sits exactly on a power-of-ten boundary
  // (e.g. 1000) keeps its order-of-magnitude step instead of collapsing to 10.
  if (granularity > answer && answer > 0) granularity = 10;

  const trueBucket = Math.round(answer / granularity) * granularity;

  // Candidate distractor offsets. Prefer ±1/±2 (close, scannable), widen to ±3.
  const negativeOffsets = [-1, -2, -3];
  const positiveOffsets = [1, 2, 3];

  // Build the list of >= 0 distractor candidates, keeping the straddle invariant:
  // guarantee at least one below (when trueBucket > 0) and one above.
  const belowCandidates = negativeOffsets
    .map((k) => trueBucket + k * granularity)
    .filter((b) => b >= 0 && b !== trueBucket);
  const aboveCandidates = positiveOffsets
    .map((k) => trueBucket + k * granularity)
    .filter((b) => b > trueBucket);

  const distractors = new Set();

  // Force one straddling bucket below the true bucket where possible.
  if (belowCandidates.length > 0) {
    const pick = shuffle(belowCandidates, rng)[0];
    distractors.add(pick);
  }
  // Force one above.
  if (aboveCandidates.length > 0) {
    const pick = shuffle(aboveCandidates, rng)[0];
    distractors.add(pick);
  }

  // Fill remaining distractor slots from the combined pool, shuffled.
  const needed = BUCKET_COUNT - 1; // distractors besides the true bucket
  const pool = shuffle([...belowCandidates, ...aboveCandidates], rng);
  for (const candidate of pool) {
    if (distractors.size >= needed) break;
    if (candidate !== trueBucket) distractors.add(candidate);
  }

  // If we still lack distractors (true bucket pinned at/near zero), extend upward.
  let k = 4;
  while (distractors.size < needed) {
    const candidate = trueBucket + k * granularity;
    if (candidate !== trueBucket) distractors.add(candidate);
    k++;
  }

  const buckets = [...distractors, trueBucket].sort((a, b) => a - b);
  return { buckets, correctBucket: trueBucket, granularity };
}

/**
 * Wrap a generator exercise into an estimation exercise.
 * Keeps `correctAnswer`; adds estimation fields; rewrites equation to use ≈.
 *
 * @param {object} ex - exercise from generateExercises (any type)
 * @param {'bucket'|'type'} variant
 * @param {() => number} [rng]
 * @returns {object} estimation exercise
 */
export function buildEstimationExercise(ex, variant, rng = Math.random) {
  const equation = String(ex.equation).replace('=', '≈');
  const base = {
    estimation: true,
    estimationMode: variant,
    equation,
    correctAnswer: ex.correctAnswer,
  };
  if (variant === 'bucket') {
    const { buckets, correctBucket, granularity } = makeBuckets(ex.correctAnswer, rng);
    return { ...base, buckets, correctBucket, granularity };
  }
  // Typed variant: still carry the rounded "about N" value so miss feedback
  // can say "It was about <correctBucket>" instead of "about undefined".
  const granularity = granularityFor(ex.correctAnswer);
  const correctBucket = Math.round(ex.correctAnswer / granularity) * granularity;
  return { ...base, correctBucket, granularity };
}
