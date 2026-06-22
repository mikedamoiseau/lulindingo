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

// Cycle of exercise interaction types. The two equation-puzzle types
// (missing-number, build-equation) are appended/interleaved so earlier
// positions (type-answer/select-answer/follow-pattern/story-problem) stay
// stable. Length 6 — every position is reachable in a normal lesson.
const EXERCISE_TYPES = [
  'type-answer',
  'select-answer',
  'missing-number',
  'follow-pattern',
  'story-problem',
  'build-equation',
];

const OP_SYMBOL = { addition: '+', subtraction: '-', multiplication: '×', division: '÷' };

// Legal blank slots per operation for Find-the-Missing-Number.
// Division → dividend ('a') only: blanking the divisor is not exactly
// recoverable for the challenger decimal path, so we forbid it everywhere
// to keep one simple rule.
const MISSING_SLOTS = {
  addition: ['a', 'b'],
  subtraction: ['a', 'b'],
  multiplication: ['a', 'b'],
  division: ['a'],
};

/** Apply a binary operator the same way the rest of the codebase does (2dp on ÷). */
function applyOp(operator, a, b) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return parseFloat((a / b).toFixed(2));
    default: throw new Error(`Unknown operator: ${operator}`);
  }
}

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
// Raw triple producer (shared by the equation-puzzle types)
// ---------------------------------------------------------------------------

/**
 * Produce a raw {a, b, operator, result} triple using the SAME ranges/guards
 * as the per-operation builders above, so difficulty scaling is identical.
 *
 * Returns `null` for combinations the equation-puzzle types can't safely use
 * (challenger decimal division has no clean draggable operands and no exactly
 * recoverable blank), so callers can fall back to a forward exercise.
 *
 * `clean` is true when both operands are integers and `result` is exact —
 * required for build-equation tiles.
 */
function makeTriple(operation, ageBand, tier) {
  switch (operation) {
    case 'addition': {
      const rangeMax = AGE_BAND_MAX[ageBand] ?? AGE_BAND_MAX['11-12'];
      const [lo, hi] = tierWindow(rangeMax, tier);
      const sum = randInt(lo, hi);
      const a = randInt(0, sum);
      const b = sum - a;
      return { a, b, operator: '+', result: sum, clean: true };
    }
    case 'subtraction': {
      const rangeMax = AGE_BAND_MAX[ageBand] ?? AGE_BAND_MAX['11-12'];
      const [lo, hi] = tierWindow(rangeMax, tier);
      const a = randInt(lo, hi);
      const b = randInt(0, a);
      return { a, b, operator: '-', result: a - b, clean: true };
    }
    case 'multiplication': {
      const factorMax = ageBand === '11-12' ? 1000 : 50;
      const [lo, hi] = tierWindow(factorMax, tier);
      const a = randInt(Math.max(1, lo), hi);
      const b = randInt(Math.max(1, lo), hi);
      return { a, b, operator: '×', result: a * b, clean: true };
    }
    case 'division': {
      if (ageBand === '11-12') {
        // Challenger decimal division — no clean operands / non-recoverable
        // blank. Signal "unsafe" so the puzzle types fall back.
        return null;
      }
      // Explorer: construct dividend = b * result so division is exact.
      const factorMax = 50;
      const [lo, hi] = tierWindow(factorMax, tier);
      const b = randInt(Math.max(1, lo), hi);
      const result = randInt(Math.max(1, lo), hi);
      const dividend = b * result;
      return { a: dividend, b, operator: '÷', result, clean: true };
    }
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// ---------------------------------------------------------------------------
// Find-the-Missing-Number
// ---------------------------------------------------------------------------

/**
 * Build a Find-the-Missing-Number exercise: the blank moves onto an operand,
 * the result is shown, and `correctAnswer` is the missing operand.
 * Returns `null` for unsafe combos (challenger division) so the caller falls back.
 */
function buildMissingNumberExercise(operation, ageBand, tier) {
  const t = makeTriple(operation, ageBand, tier);
  if (!t) return null;

  const legal = MISSING_SLOTS[operation];
  let blankSlot = legal[randInt(0, legal.length - 1)];

  // Guard against blanking a slot whose known operand is 0 for × (avoids /0
  // recovery ambiguity). Multiplication operands are ≥ 1 in practice, so this
  // is belt-and-suspenders.
  if (operation === 'multiplication') {
    if (blankSlot === 'a' && t.b === 0) blankSlot = 'b';
    else if (blankSlot === 'b' && t.a === 0) blankSlot = 'a';
  }

  const correctAnswer = blankSlot === 'a' ? t.a : t.b;
  const aStr = blankSlot === 'a' ? '[]' : String(t.a);
  const bStr = blankSlot === 'b' ? '[]' : String(t.b);
  const equation = `${aStr} ${t.operator} ${bStr} = ${t.result}`;
  return { type: 'missing-number', equation, correctAnswer, blankSlot, ...t };
}

// ---------------------------------------------------------------------------
// Build-the-Equation
// ---------------------------------------------------------------------------

/**
 * Build a Build-the-Equation exercise: the result is shown and the child fills
 * two operand slots from a tray of 5 tiles (2 real operands + 3 decoys).
 * Decoys are filtered so no decoy forms an unintended second true equation.
 * Returns `null` for unsafe combos (challenger division) so the caller falls back.
 */
function buildBuildEquationExercise(operation, ageBand, tier) {
  // Division is gated out of build-equation: the draggable operand would be the
  // large dividend (e.g. drag "90" to assemble "[] ÷ [] = 9"), which is poor UX,
  // and tiny quotients (result ≤ ~1) make a clean, single-solution decoy tray
  // essentially impossible (almost any pair of adjacent integers divides to ≈1).
  // Returning null makes the dispatcher fall back to a forward typed answer.
  if (operation === 'division') return null;

  const t = makeTriple(operation, ageBand, tier);
  if (!t || !t.clean) return null;

  const { operator, result } = t;
  const solution = [t.a, t.b];
  const commutative = operator === '+' || operator === '×';

  // Degenerate subtraction (n - n = 0) has identical operands and a result that
  // ANY equal-valued tile pair reproduces, so a clean single-solution tray is
  // impossible. Fall back to a forward exercise.
  if (operator === '-' && result === 0) return null;

  // Decoy tiles must stay within the band's representable operand range, so a
  // tile is never larger than any real operand the child could see. For add/sub
  // that is AGE_BAND_MAX; for multiplication it's the factor max.
  const operandMax =
    operator === '×'
      ? (ageBand === '11-12' ? 1000 : 50)
      : (AGE_BAND_MAX[ageBand] ?? AGE_BAND_MAX['11-12']);

  // A candidate tile forms an unintended solution if, paired (in either order
  // for commutative ops) with the solution operands or another accepted tile,
  // it yields the result — other than the intended solution (and its swap).
  const isTruePair = (x, y) => Math.abs(applyOp(operator, x, y) - result) < 0.005;

  // Would adding `cand` to the existing accepted tiles create an unintended true
  // pair? We iterate over DISTINCT tile POSITIONS (a child cannot place one tile
  // in both slots), so the two solution tiles are positions 0 and 1; any other
  // ordered position pair that yields the result is a second solution.
  const createsSecondSolution = (cand, accepted) => {
    const tiles = [...solution, ...accepted, cand]; // positions: 0,1 = solution
    for (let i = 0; i < tiles.length; i++) {
      for (let j = 0; j < tiles.length; j++) {
        if (i === j) continue; // can't use the same tile twice
        // The intended solution uses positions (0,1) — and (1,0) for commutative.
        if (i === 0 && j === 1) continue;
        if (commutative && i === 1 && j === 0) continue;
        if (isTruePair(tiles[i], tiles[j])) return true;
      }
    }
    return false;
  };

  // Gather candidate decoys from distractors of each operand and the result.
  const pool = [
    ...generateDistractors(t.a, 4),
    ...generateDistractors(t.b, 4),
    ...generateDistractors(result, 4),
  ];

  // A candidate is acceptable as a decoy if it is a non-negative integer within
  // the band's operand range, not equal to a solution operand or an existing
  // decoy, and does not create a second true equation.
  const acceptable = (cand) =>
    Number.isInteger(cand) &&
    cand >= 0 &&
    cand <= operandMax &&
    cand !== solution[0] &&
    cand !== solution[1] &&
    !decoys.includes(cand) &&
    !createsSecondSolution(cand, decoys);

  const decoys = [];
  let poolIdx = 0;
  while (decoys.length < 3 && poolIdx < pool.length) {
    const cand = pool[poolIdx++];
    if (acceptable(cand)) decoys.push(cand);
  }

  // Padding fallback: walk candidate offsets around the result (both directions),
  // staying within [0, operandMax], skipping any that fail the filter.
  let pad = 1;
  let attempts = 0;
  while (decoys.length < 3 && attempts < 4000) {
    attempts++;
    const cand = pad % 2 === 1 ? result + Math.ceil(pad / 2) : result - pad / 2;
    pad++;
    if (acceptable(cand)) decoys.push(cand);
  }

  // Last resort (tiny ranges): scan the whole legal operand range for any
  // distinct value that still passes the no-second-solution filter.
  for (let cand = 0; decoys.length < 3 && cand <= operandMax; cand++) {
    if (acceptable(cand)) decoys.push(cand);
  }

  const tray = shuffle([...solution, ...decoys]);
  return { type: 'build-equation', operator, result, slots: 2, solution, tray, correctAnswer: result };
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

  // variant: 'remainder' for the division remainder mode.
  // forwardOnly: restrict to forward "a op b = result" exercises (a real
  // equation string + numeric result answer). Estimation mode needs this —
  // missing-number's answer is an operand and build-equation has no equation.
  const { variant, forwardOnly } = options;
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

    // Remainder variant has no equation-puzzle representation in v1 — fall the
    // new types back to a forward typed answer so the variant stays type+story.
    if (variant === 'remainder' && (exType === 'missing-number' || exType === 'build-equation')) {
      exType = 'type-answer';
    }

    // Forward-only callers (estimation) can't use the puzzle types.
    if (forwardOnly && (exType === 'missing-number' || exType === 'build-equation')) {
      exType = 'type-answer';
    }

    let exercise;

    if (exType === 'missing-number') {
      exercise = buildMissingNumberExercise(operation, ageBand, tier);
      // Silent fallback to a forward typed answer when the combo is unsafe.
      if (!exercise) exType = 'type-answer';
    } else if (exType === 'build-equation') {
      exercise = buildBuildEquationExercise(operation, ageBand, tier);
      if (!exercise) exType = 'type-answer';
    }

    if (exercise) {
      exercises.push(exercise);
      continue;
    }

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
