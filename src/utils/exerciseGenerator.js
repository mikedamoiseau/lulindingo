/**
 * exerciseGenerator.js
 *
 * Pure function that generates an array of exercise objects for the
 * LuLinDingo learning platform.
 *
 * generateExercises(operation, ageBand, tier, count) → Exercise[]
 *
 * Exercise shapes:
 *   type-answer    { type, equation, correctAnswer }
 *   select-answer  { type, equation, correctAnswer, options }   // 3 options
 *   follow-pattern { type, equation, correctAnswer, options, pattern } // 2 options
 *   story-problem  { type, equation, prompt, instruction, correctAnswer }
 */

import { wrapStory, plural } from './storyTemplates.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGE_BAND_MAX = {
  '6-7': 20,
  '8-10': 1_000,
  '11-12': 1_000_000,
};

const EXERCISE_TYPES = ['type-answer', 'select-answer', 'follow-pattern', 'story-problem'];

// ---------------------------------------------------------------------------
// Seeded-random helpers (plain Math.random — deterministic only in tests via vi.mock)
// ---------------------------------------------------------------------------

/** Return a random integer in [min, max] (inclusive). */
function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Return the [lo, hi] window for a given tier (1-5) within [0, rangeMax].
 * Tier 1 → bottom 20 %, tier 5 → top 20 %, tiers in between overlap.
 *
 * Each tier owns a 20 % slice of the range; we make the window slightly
 * generous (±5 % either side of the centre) so that all values in the
 * slice can be produced.
 */
function tierWindow(rangeMax, tier) {
  const sliceSize = rangeMax * 0.2;
  const lo = Math.floor(sliceSize * (tier - 1));
  const hi = Math.min(rangeMax, Math.ceil(sliceSize * tier));
  return [lo, hi];
}

// ---------------------------------------------------------------------------
// Distractor helpers
// ---------------------------------------------------------------------------

/**
 * Generate `count` distractors that are close to `answer`, all >= 0,
 * and none equal to `answer` or to each other.
 */
function generateDistractors(answer, count, isDecimal = false) {
  const distractors = new Set();
  let spread = Math.max(1, Math.round(Math.abs(answer) * 0.15 + 1));

  let attempts = 0;
  while (distractors.size < count && attempts < 500) {
    attempts++;
    const delta = randInt(-spread, spread);
    if (delta === 0) continue;

    let candidate = answer + delta;
    if (isDecimal) {
      candidate = parseFloat(candidate.toFixed(2));
    } else {
      candidate = Math.round(candidate);
    }
    if (candidate < 0) continue;
    if (candidate === answer) continue;
    if (distractors.has(candidate)) continue;
    distractors.add(candidate);

    // Widen spread if struggling to find unique distractors
    if (attempts % 50 === 0) spread = Math.ceil(spread * 1.5);
  }

  // Fallback: if we still don't have enough, pad with safe values
  let pad = 1;
  while (distractors.size < count) {
    const candidate = isDecimal
      ? parseFloat((answer + pad).toFixed(2))
      : answer + pad;
    if (candidate !== answer && !distractors.has(candidate) && candidate >= 0) {
      distractors.add(candidate);
    }
    pad++;
  }

  return [...distractors];
}

// ---------------------------------------------------------------------------
// Exercise-type builders
// ---------------------------------------------------------------------------

function buildTypeAnswer(equation, correctAnswer) {
  return { type: 'type-answer', equation, correctAnswer };
}

function buildSelectAnswer(equation, correctAnswer, isDecimal = false) {
  const distractors = generateDistractors(correctAnswer, 2, isDecimal);
  const options = shuffle([correctAnswer, ...distractors]);
  return { type: 'select-answer', equation, correctAnswer, options };
}

/**
 * Build a follow-pattern exercise.
 *
 * @param {function} makeEntry - (stepIndex) → { expression, result, equation }
 *   Called for steps 0, 1, 2.  For step 2, result is forced to null and
 *   the equation + correctAnswer are taken from that call.
 */
function buildFollowPattern(makeEntry) {
  const entries = [makeEntry(0), makeEntry(1), makeEntry(2)];
  const lastEntry = entries[2];
  const correctAnswer = lastEntry.result;

  const pattern = entries.map((e, i) => ({
    expression: e.expression,
    result: i === 2 ? null : e.result,
  }));

  const equation = lastEntry.equation;
  const isDecimal = !Number.isInteger(correctAnswer);
  const [distractor] = generateDistractors(correctAnswer, 1, isDecimal);
  const options = shuffle([correctAnswer, distractor]);

  return { type: 'follow-pattern', equation, correctAnswer, options, pattern };
}

// ---------------------------------------------------------------------------
// Shuffle
// ---------------------------------------------------------------------------

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Operation-specific number generators
// ---------------------------------------------------------------------------

function buildAdditionExercise(exType, rangeMax, tier, ageBand) {
  const [lo, hi] = tierWindow(rangeMax, tier);
  // sum ∈ [lo, hi], split into two addends
  const sum = randInt(lo, hi);
  const a = randInt(0, sum);
  const b = sum - a;
  const equation = `${a} + ${b} = []`;
  const correctAnswer = sum;

  return buildExerciseForType(exType, equation, correctAnswer, false,
    { operation: 'addition', ageBand, a, b });
}

function buildSubtractionExercise(exType, rangeMax, tier, ageBand) {
  const [lo, hi] = tierWindow(rangeMax, tier);
  // minuend ∈ [lo, hi], ensure result >= 0
  const a = randInt(lo, hi);
  const b = randInt(0, a);
  const correctAnswer = a - b;
  const equation = `${a} - ${b} = []`;

  return buildExerciseForType(exType, equation, correctAnswer, false,
    { operation: 'subtraction', ageBand, a, b });
}

function buildMultiplicationExercise(exType, ageBand, tier) {
  const factorMax = ageBand === '11-12' ? 1000 : 50;
  const [lo, hi] = tierWindow(factorMax, tier);
  const a = randInt(Math.max(1, lo), hi);
  const b = randInt(Math.max(1, lo), hi);
  const correctAnswer = a * b;
  const equation = `${a} × ${b} = []`;

  return buildExerciseForType(exType, equation, correctAnswer, false,
    { operation: 'multiplication', ageBand, a, b });
}

function buildDivisionExercise(exType, ageBand, tier, variant) {
  if (variant === 'remainder') {
    const factorMax = ageBand === '11-12' ? 1000 : 50;
    const [lo, hi] = tierWindow(factorMax, tier);
    let dividend, divisor, quotient, remainder, attempts = 0;
    do {
      divisor = randInt(2, Math.max(2, Math.min(12, hi))); // small divisor keeps it kid-friendly
      dividend = randInt(Math.max(divisor + 1, lo), Math.max(divisor + 1, hi));
      quotient = Math.floor(dividend / divisor);
      remainder = dividend % divisor;
      attempts++;
    } while (remainder === 0 && attempts < 50);
    if (remainder === 0) { remainder = 1; dividend = quotient * divisor + 1; } // guaranteed non-zero
    const correctAnswer = `${quotient} r ${remainder}`;
    const equation = `${dividend} ÷ ${divisor} = []`;
    const base = { equation, correctAnswer, isRemainder: true, quotient, remainder, divisor, dividend };
    // Remainder answers are typed as "q r r", which only the StoryProblem
    // component's remainder input accepts — TypeTheAnswer's numeric pad cannot
    // enter the "r". So remainder exercises are ALWAYS story problems, with a
    // prompt that explicitly asks for both the share and the leftover.
    const prompt =
      `Share ${dividend} ${plural(dividend, 'cookie')} equally among ${divisor} ${plural(divisor, 'friend')}. ` +
      `How many does each friend get, and how many are left over?`;
    const instruction = 'Type your answer like "3 r 2" (each, then the leftover)';
    return { type: 'story-problem', ...base, prompt, instruction };
  }

  const isChallenger = ageBand === '11-12';

  if (isChallenger) {
    const [lo, hi] = tierWindow(1_000, tier);
    if (exType === 'story-problem') {
      // A division story ("how many does each get") implies a whole-number
      // answer, so build an EXACT division — never a decimal like 17.17 that a
      // sharing narrative can't represent.
      const divisor = randInt(2, Math.max(2, Math.min(12, Math.floor(hi / 2) || 2)));
      const quotient = randInt(Math.max(1, Math.floor(lo / divisor)), Math.max(1, Math.floor(hi / divisor)));
      const dividend = divisor * quotient;
      const equation = `${dividend} ÷ ${divisor} = []`;
      return buildStoryProblem('division', ageBand, dividend, divisor, quotient, equation);
    }
    // Challenger: random dividend and divisor, decimal result rounded to 2dp
    const dividend = randInt(Math.max(1, lo), hi);
    const divisor = randInt(1, Math.max(2, Math.floor(hi / 2)));
    const correctAnswer = parseFloat((dividend / divisor).toFixed(2));
    const equation = `${dividend} ÷ ${divisor} = []`;
    const isDecimal = !Number.isInteger(correctAnswer);
    return buildExerciseForType(exType, equation, correctAnswer, isDecimal,
      { operation: 'division', ageBand, a: dividend, b: divisor });
  } else {
    // Explorer: construct a*b then ask a*b ÷ b → integer result
    const factorMax = 50;
    const [lo, hi] = tierWindow(factorMax, tier);
    const b = randInt(Math.max(1, lo), hi);
    const result = randInt(Math.max(1, lo), hi);
    const dividend = b * result;
    const correctAnswer = result;
    const equation = `${dividend} ÷ ${b} = []`;
    return buildExerciseForType(exType, equation, correctAnswer, false,
      { operation: 'division', ageBand, a: dividend, b });
  }
}

// ---------------------------------------------------------------------------
// Route exercise type
// ---------------------------------------------------------------------------

/**
 * Build a story-problem exercise: a typed-answer variant whose equation is
 * unchanged but is wrapped in an age-banded narrative `prompt`.
 */
function buildStoryProblem(operation, ageBand, a, b, correctAnswer, equation) {
  const { prompt, instruction } = wrapStory(operation, a, b, correctAnswer, ageBand);
  return { type: 'story-problem', equation, prompt, instruction, correctAnswer };
}

function buildExerciseForType(exType, equation, correctAnswer, isDecimal, ctx) {
  switch (exType) {
    case 'type-answer':
      return buildTypeAnswer(equation, correctAnswer);
    case 'select-answer':
      return buildSelectAnswer(equation, correctAnswer, isDecimal);
    case 'story-problem':
      return buildStoryProblem(ctx.operation, ctx.ageBand, ctx.a, ctx.b, correctAnswer, equation);
    case 'follow-pattern':
      // Follow-pattern needs a sequence; we'll handle this via the dedicated
      // per-operation follow-pattern builder below.  If we arrive here it means
      // buildXxxExercise was called with 'follow-pattern' which shouldn't happen
      // for the main path — return a type-answer as safe fallback.
      return buildTypeAnswer(equation, correctAnswer);
    default:
      throw new Error(`Unknown exercise type: ${exType}`);
  }
}

// ---------------------------------------------------------------------------
// Follow-pattern builders per operation
// ---------------------------------------------------------------------------

function buildAdditionFollowPattern(rangeMax, tier) {
  const [lo, hi] = tierWindow(rangeMax, tier);
  // Fix b and increment a across three steps
  const b = randInt(0, Math.floor((hi - lo) / 4));
  const startA = randInt(lo, Math.max(lo, hi - b - 3));

  return buildFollowPattern((step) => {
    const a = startA + step;
    const result = a + b;
    return {
      expression: `${a} + ${b}`,
      result,
      equation: `${a} + ${b} = []`,
    };
  });
}

function buildSubtractionFollowPattern(rangeMax, tier) {
  const [lo, hi] = tierWindow(rangeMax, tier);
  const b = randInt(0, Math.floor((hi - lo) / 4));
  // startA must be large enough that startA + 2 - b >= 0
  const minA = Math.max(lo, b);
  const startA = randInt(minA, Math.max(minA, hi - 3));

  return buildFollowPattern((step) => {
    const a = startA + step;
    const result = a - b;
    return {
      expression: `${a} - ${b}`,
      result,
      equation: `${a} - ${b} = []`,
    };
  });
}

function buildMultiplicationFollowPattern(ageBand, tier) {
  const factorMax = ageBand === '11-12' ? 1000 : 50;
  const [lo, hi] = tierWindow(factorMax, tier);
  const b = randInt(Math.max(1, lo), hi);
  const startA = randInt(Math.max(1, lo), Math.max(1, hi - 3));

  return buildFollowPattern((step) => {
    const a = startA + step;
    const result = a * b;
    return {
      expression: `${a} × ${b}`,
      result,
      equation: `${a} × ${b} = []`,
    };
  });
}

function buildDivisionFollowPattern(ageBand, tier) {
  const isChallenger = ageBand === '11-12';

  if (isChallenger) {
    const [lo, hi] = tierWindow(1_000, tier);
    const divisor = randInt(1, Math.max(2, Math.floor(hi / 4)));
    const startDividend = randInt(Math.max(1, lo), Math.max(1, hi - divisor * 3));

    return buildFollowPattern((step) => {
      const dividend = startDividend + divisor * step;
      const result = parseFloat((dividend / divisor).toFixed(2));
      return {
        expression: `${dividend} ÷ ${divisor}`,
        result,
        equation: `${dividend} ÷ ${divisor} = []`,
      };
    });
  } else {
    // Explorer: keep divisor fixed, increment result by 1 each step
    const factorMax = 50;
    const [lo, hi] = tierWindow(factorMax, tier);
    const divisor = randInt(Math.max(1, lo), hi);
    const startResult = randInt(Math.max(1, lo), Math.max(1, hi - 3));

    return buildFollowPattern((step) => {
      const result = startResult + step;
      const dividend = divisor * result;
      return {
        expression: `${dividend} ÷ ${divisor}`,
        result,
        equation: `${dividend} ÷ ${divisor} = []`,
      };
    });
  }
}

// ---------------------------------------------------------------------------
// Main public API
// ---------------------------------------------------------------------------

const VALID_OPERATIONS = new Set(['addition', 'subtraction', 'multiplication', 'division']);

/**
 * Generate an array of exercise objects.
 *
 * @param {string} operation  - 'addition' | 'subtraction' | 'multiplication' | 'division'
 * @param {string} ageBand    - '6-7' | '8-10' | '11-12'
 * @param {number} tier       - 1–5
 * @param {number} count      - number of exercises to generate
 * @param {object} [options]   - { variant } — 'remainder' for division remainder mode
 * @returns {Exercise[]}
 */
export function generateExercises(operation, ageBand, tier, count, options = {}) {
  if (!VALID_OPERATIONS.has(operation)) {
    throw new Error(
      `Unknown operation: "${operation}". Valid operations are: ${[...VALID_OPERATIONS].join(', ')}`
    );
  }

  const { variant } = options; // 'remainder' for the division remainder mode
  const rangeMax = AGE_BAND_MAX[ageBand] ?? AGE_BAND_MAX['11-12'];
  const exercises = [];

  for (let i = 0; i < count; i++) {
    // Cycle through types: 0→type-answer, 1→select-answer, 2→follow-pattern, 3→story-problem
    let exType = EXERCISE_TYPES[i % EXERCISE_TYPES.length];

    // Remainder division has no pattern representation in v1 — substitute a
    // typed answer for the follow-pattern slot so the variant stays type+story.
    if (variant === 'remainder' && exType === 'follow-pattern') {
      exType = 'type-answer';
    }

    let exercise;

    if (exType === 'follow-pattern') {
      // Follow-pattern uses dedicated builders per operation
      switch (operation) {
        case 'addition':
          exercise = buildAdditionFollowPattern(rangeMax, tier);
          break;
        case 'subtraction':
          exercise = buildSubtractionFollowPattern(rangeMax, tier);
          break;
        case 'multiplication':
          exercise = buildMultiplicationFollowPattern(ageBand, tier);
          break;
        case 'division':
          exercise = buildDivisionFollowPattern(ageBand, tier);
          break;
      }
    } else {
      switch (operation) {
        case 'addition':
          exercise = buildAdditionExercise(exType, rangeMax, tier, ageBand);
          break;
        case 'subtraction':
          exercise = buildSubtractionExercise(exType, rangeMax, tier, ageBand);
          break;
        case 'multiplication':
          exercise = buildMultiplicationExercise(exType, ageBand, tier);
          break;
        case 'division':
          exercise = buildDivisionExercise(exType, ageBand, tier, variant);
          break;
      }
    }

    exercises.push(exercise);
  }

  return exercises;
}
