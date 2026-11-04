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

// ---------------------------------------------------------------------------
// Curriculum — what each tier (lesson 1-5 of a unit) practises
// ---------------------------------------------------------------------------
//
// One small skill step per tier, and every problem stays solvable without a
// calculator. (The old approach sliced each age band's whole number range into
// five linear windows, so Explorer multiplication jumped from 6 × 6 straight
// to 18 × 17, and Challenger division asked things like 44 ÷ 78 = 0.56.)
//
//   R(lo, hi)     any integer in [lo, hi]
//   ONE_OF(...)   one of these values (e.g. a times table)
//
// addition / subtraction: a op b (subtraction keeps b ≤ a).
// multiplication: a × b — `a` is the times table, `b` the multiplier
//   (follow-pattern steps `b`, so it reads 3 × 7, 4 × 7, 5 × 7).
// division: divisor × quotient = dividend, so the answer is always exact.
//   `decimal` tiers instead draw a dividend that is NOT a multiple of the
//   divisor; every decimal divisor divides 100, so the answer terminates
//   within 2 decimal places (37 ÷ 4 = 9.25) — it is never rounded.
const R = (lo, hi) => ({ lo, hi });
const ONE_OF = (...values) => ({ values });

const CURRICULUM = {
  addition: {
    '6-7': [
      { a: R(1, 5), b: R(1, 4) },       // sums to 9
      { a: R(4, 7), b: R(1, 3) },       // sums to 10
      { a: R(10, 15), b: R(1, 4) },     // teen + small, no bridging: 12 + 4
      { a: R(5, 9), b: R(5, 9) },       // bridging ten: 7 + 8
      { a: R(6, 12), b: R(4, 8) },      // mixed, up to 20
    ],
    '8-10': [
      { a: R(10, 59), b: R(10, 39) },     // 2-digit + 2-digit, under 100
      { a: R(20, 99), b: R(11, 99) },     // 2-digit + 2-digit, crossing 100
      { a: R(100, 499), b: R(11, 99) },   // 3-digit + 2-digit
      { a: R(100, 400), b: R(100, 300) }, // 3-digit + 3-digit
      { a: R(250, 600), b: R(150, 399) }, // 3-digit + 3-digit, up to 999
    ],
    '11-12': [
      { a: R(100, 999), b: R(100, 999) },
      { a: R(1_000, 4_999), b: R(100, 999) },
      { a: R(1_000, 4_999), b: R(1_000, 4_999) },
      { a: R(10_000, 49_999), b: R(1_000, 9_999) },
      { a: R(10_000, 59_999), b: R(10_000, 39_999) },
    ],
  },
  subtraction: {
    '6-7': [
      { a: R(2, 5), b: R(1, 4) },       // within 5
      { a: R(6, 10), b: R(1, 5) },      // within 10
      { a: R(14, 19), b: R(1, 4) },     // teen − small, no bridging: 17 − 3
      { a: R(11, 15), b: R(4, 9) },     // bridging ten: 13 − 7
      { a: R(12, 20), b: R(3, 12) },    // mixed, up to 20
    ],
    '8-10': [
      { a: R(20, 99), b: R(3, 19) },      // 2-digit − small, under 100
      { a: R(30, 99), b: R(11, 89) },     // 2-digit − 2-digit
      { a: R(100, 499), b: R(11, 99) },   // 3-digit − 2-digit
      { a: R(200, 700), b: R(100, 299) }, // 3-digit − 3-digit
      { a: R(400, 999), b: R(150, 699) }, // 3-digit − 3-digit, borrowing across zeros
    ],
    '11-12': [
      { a: R(200, 999), b: R(100, 899) },
      { a: R(1_000, 9_999), b: R(100, 999) },
      { a: R(1_000, 9_999), b: R(1_000, 8_999) },
      { a: R(10_000, 99_999), b: R(1_000, 9_999) },
      { a: R(10_000, 99_999), b: R(10_000, 89_999) },
    ],
  },
  multiplication: {
    '6-7': [
      // Multipliers start at 2 so stories never read "There are 1 basket…".
      { a: ONE_OF(2), b: R(2, 5) },           // small doubles
      { a: ONE_OF(2), b: R(2, 10) },          // doubles up to 20
      { a: ONE_OF(10), b: R(2, 10) },
      { a: ONE_OF(5), b: R(2, 10) },
      { a: ONE_OF(2, 5, 10), b: R(2, 10) },
    ],
    '8-10': [
      { a: ONE_OF(2, 5, 10), b: R(2, 10) },
      { a: ONE_OF(3, 4, 8), b: R(2, 10) },
      { a: ONE_OF(6, 7, 9), b: R(2, 10) },
      { a: R(2, 12), b: R(2, 12) },           // all tables up to 12 × 12
      { a: R(3, 9), b: R(12, 49) },           // 2-digit × 1-digit: 37 × 6
    ],
    '11-12': [
      { a: R(2, 12), b: R(2, 12) },           // tables warm-up
      { a: R(2, 9), b: R(12, 99) },           // 2-digit × 1-digit
      { a: R(2, 9), b: R(100, 999) },         // 3-digit × 1-digit
      { a: R(11, 19), b: R(12, 99) },         // 2-digit × teen
      { a: R(11, 49), b: R(21, 99) },         // 2-digit × 2-digit
    ],
  },
  division: {
    '6-7': [
      { divisor: ONE_OF(2), quotient: R(1, 5) },
      { divisor: ONE_OF(2), quotient: R(1, 10) },   // halves
      { divisor: ONE_OF(10), quotient: R(1, 10) },
      { divisor: ONE_OF(5), quotient: R(1, 10) },
      { divisor: ONE_OF(2, 5, 10), quotient: R(1, 10) },
    ],
    '8-10': [
      { divisor: ONE_OF(2, 5, 10), quotient: R(2, 10) },
      { divisor: ONE_OF(3, 4, 8), quotient: R(2, 10) },
      { divisor: ONE_OF(6, 7, 9), quotient: R(2, 10) },
      { divisor: R(2, 12), quotient: R(2, 12) },    // within the 12 × 12 tables
      { divisor: R(3, 9), quotient: R(12, 49) },    // 1-digit divisor, 2-digit answer: 222 ÷ 6
    ],
    '11-12': [
      { divisor: R(2, 12), quotient: R(2, 12) },
      { divisor: R(3, 9), quotient: R(12, 99) },                                  // 456 ÷ 8
      { divisor: ONE_OF(2, 4, 5, 10), dividend: R(11, 99), decimal: true },       // 37 ÷ 4 = 9.25
      { divisor: R(11, 25), quotient: R(3, 30) },                                 // 312 ÷ 12
      { divisor: ONE_OF(4, 5, 20, 25), dividend: R(101, 999), decimal: true },    // 347 ÷ 4 = 86.75
    ],
  },
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

/** Draw a value from an R(lo, hi) or ONE_OF(...) spec. */
function pick(spec) {
  return spec.values ? spec.values[randInt(0, spec.values.length - 1)] : randInt(spec.lo, spec.hi);
}

/** Largest value an R / ONE_OF spec can produce. */
function specMax(spec) {
  return spec.values ? Math.max(...spec.values) : spec.hi;
}

/** Curriculum row for this operation × age band × tier (tier clamped to 1-5). */
function tierSpec(operation, ageBand, tier) {
  const bands = CURRICULUM[operation];
  const tiers = bands[ageBand] ?? bands['11-12'];
  return tiers[Math.min(5, Math.max(1, tier)) - 1];
}

/** First value of a 3-step run (start, +1, +2) that stays inside an R spec. */
function stepStart(range) {
  return randInt(range.lo, Math.max(range.lo, range.hi - 2));
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
// Number drawing — every exercise type takes its operands from CURRICULUM
// ---------------------------------------------------------------------------

/**
 * Integer quotient range for a division row. Decimal rows have no `quotient`;
 * when a whole-number answer is needed (stories, patterns, remainders) we use
 * the quotients whose dividend stays inside the row's dividend range.
 */
function quotientRange(spec, divisor) {
  if (!spec.decimal) return spec.quotient;
  return R(
    Math.max(1, Math.ceil(spec.dividend.lo / divisor)),
    Math.max(1, Math.floor(spec.dividend.hi / divisor))
  );
}

/**
 * Draw an exact division for a curriculum row → { dividend, divisor, quotient }.
 * Decimal rows give a terminating (≤ 2dp) answer unless `integerOnly` is set.
 */
function drawDivision(spec, { integerOnly = false } = {}) {
  const divisor = pick(spec.divisor);
  if (spec.decimal && !integerOnly) {
    let dividend;
    do {
      dividend = pick(spec.dividend);
    } while (dividend % divisor === 0);
    return { dividend, divisor, quotient: applyOp('÷', dividend, divisor) };
  }
  const quotient = pick(quotientRange(spec, divisor));
  return { dividend: divisor * quotient, divisor, quotient };
}

/**
 * Draw a raw {a, b, operator, result} triple for any operation. Every
 * exercise type goes through here, so they all share one difficulty curve.
 */
function drawTriple(operation, ageBand, tier, { integerOnly = false } = {}) {
  const spec = tierSpec(operation, ageBand, tier);
  const operator = OP_SYMBOL[operation];
  switch (operation) {
    case 'addition':
    case 'multiplication': {
      let a = pick(spec.a);
      let b = pick(spec.b);
      if (randInt(0, 1)) [a, b] = [b, a]; // commutative: show both orders
      return { a, b, operator, result: applyOp(operator, a, b) };
    }
    case 'subtraction': {
      const a = pick(spec.a);
      const b = randInt(spec.b.lo, Math.min(spec.b.hi, a)); // never negative
      return { a, b, operator, result: a - b };
    }
    case 'division': {
      const { dividend, divisor, quotient } = drawDivision(spec, { integerOnly });
      return { a: dividend, b: divisor, operator, result: quotient };
    }
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/** Forward "a op b = []" exercise (type-answer / select-answer / story-problem). */
function buildForwardExercise(exType, operation, ageBand, tier) {
  // A story ("how many does each friend get?") implies a whole-number answer.
  const t = drawTriple(operation, ageBand, tier, { integerOnly: exType === 'story-problem' });
  const equation = `${t.a} ${t.operator} ${t.b} = []`;
  return buildExerciseForType(exType, equation, t.result, !Number.isInteger(t.result),
    { operation, ageBand, a: t.a, b: t.b });
}

/** Division-with-remainder story: same divisors/quotients as the tier, plus a leftover. */
function buildRemainderExercise(ageBand, tier) {
  const spec = tierSpec('division', ageBand, tier);
  const { divisor, quotient } = drawDivision(spec, { integerOnly: true });
  const remainder = randInt(1, divisor - 1); // every curriculum divisor is ≥ 2
  const dividend = quotient * divisor + remainder;
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

// ---------------------------------------------------------------------------
// Raw triple producer (shared by the equation-puzzle types)
// ---------------------------------------------------------------------------

/**
 * Produce a raw {a, b, operator, result} triple for the equation-puzzle types.
 *
 * Returns `null` for challenger division (its decimal answers have no clean
 * draggable operands), so callers can fall back to a forward exercise.
 *
 * `clean` is true when both operands are integers and `result` is exact —
 * required for build-equation tiles.
 */
function makeTriple(operation, ageBand, tier) {
  if (operation === 'division' && ageBand === '11-12') return null;
  return { ...drawTriple(operation, ageBand, tier), clean: true };
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
  // tile is never larger than any real operand the child could see in this
  // unit: the largest operand any tier of the band's curriculum can produce.
  const bandRows = CURRICULUM[operation][ageBand] ?? CURRICULUM[operation]['11-12'];
  const operandMax = Math.max(...bandRows.map((row) => Math.max(specMax(row.a), specMax(row.b))));

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
// Follow-pattern builder
// ---------------------------------------------------------------------------

/**
 * Three steps where one operand goes up by 1 and the other stays fixed, all
 * drawn from the tier's curriculum row (3 × 7, 4 × 7, 5 × 7 …).
 */
function buildFollowPatternExercise(operation, ageBand, tier) {
  const spec = tierSpec(operation, ageBand, tier);
  let entry; // step → [a, operator, b]
  switch (operation) {
    case 'addition': {
      const a0 = stepStart(spec.a);
      const b = pick(spec.b);
      entry = (step) => [a0 + step, '+', b];
      break;
    }
    case 'subtraction': {
      const a0 = stepStart(spec.a);
      const b = randInt(spec.b.lo, Math.min(spec.b.hi, a0)); // a0 - b >= 0 on every step
      entry = (step) => [a0 + step, '-', b];
      break;
    }
    case 'multiplication': {
      const table = pick(spec.a);
      const b0 = stepStart(spec.b);
      entry = (step) => [b0 + step, '×', table];
      break;
    }
    case 'division': {
      // Whole-number steps even on decimal rows: the divisor stays fixed and
      // the answer goes up by 1.
      const divisor = pick(spec.divisor);
      const q0 = stepStart(quotientRange(spec, divisor));
      entry = (step) => [divisor * (q0 + step), '÷', divisor];
      break;
    }
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildFollowPattern((step) => {
    const [a, operator, b] = entry(step);
    return {
      expression: `${a} ${operator} ${b}`,
      result: applyOp(operator, a, b),
      equation: `${a} ${operator} ${b} = []`,
    };
  });
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
      exercise = buildFollowPatternExercise(operation, ageBand, tier);
    } else if (operation === 'division' && variant === 'remainder') {
      exercise = buildRemainderExercise(ageBand, tier);
    } else {
      exercise = buildForwardExercise(exType, operation, ageBand, tier);
    }

    exercises.push(exercise);
  }

  // Stamp the operation on every exercise so consumers (e.g. the Show-Me-How
  // strategy builder, fact recording) work even outside a lesson context —
  // notably the fact Review route, where no `lesson` row carries the operation.
  return exercises.map((ex) => (ex && ex.operation === undefined ? { ...ex, operation } : ex));
}
