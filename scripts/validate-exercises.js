/**
 * Validates the dynamic exercise generator against content design rules.
 *
 * Exercises are no longer stored as static data — they are produced at
 * runtime by generateExercises(operation, ageBand, tier, count). This script
 * sweeps every operation × ageBand × tier combination, generates a large
 * sample, and asserts the invariants the app relies on. Because generation is
 * random, sampling many exercises per combo catches edge cases the unit tests
 * (which use small fixed counts) might miss.
 *
 * Run: node scripts/validate-exercises.js
 * Exits 0 on success, 1 with specific errors on failure.
 */

import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { generateExercises } = await import(
  pathToFileURL(join(__dirname, '..', 'src', 'utils', 'exerciseGenerator.js')).href
);
const { default: units } = await import(
  pathToFileURL(join(__dirname, '..', 'src', 'data', 'math', 'units.js')).href
);

const AGE_BANDS = ['6-7', '8-10', '11-12'];
const TIERS = [1, 2, 3, 4, 5];
const VALID_TYPES = [
  'type-answer',
  'select-answer',
  'follow-pattern',
  'story-problem',
  'missing-number',
  'build-equation',
];
const SAMPLES_PER_COMBO = 300;

// Parse a remainder answer string "3 r 2" / "3r2" / "3 R 2" → { q, r } or null.
function parseRemainderStr(s) {
  const m = typeof s === 'string' && s.match(/^(\d+)\s*r\s*(\d+)$/i);
  return m ? { q: +m[1], r: +m[2] } : null;
}

// Max reachable correct answer, mirroring the constants in exerciseGenerator.
// The cap is operation-specific: add/sub follow AGE_BAND_MAX, while mul/div use
// their own factor ranges (factorMax = 50 for explorers, 1000 for challengers).
const AGE_BAND_MAX = { '6-7': 20, '8-10': 1_000, '11-12': 1_000_000 };

function maxAnswer(operation, ageBand) {
  const challenger = ageBand === '11-12';
  switch (operation) {
    case 'addition':
    case 'subtraction':
      return AGE_BAND_MAX[ageBand];
    case 'multiplication': {
      const factorMax = challenger ? 1_000 : 50;
      return factorMax * factorMax;
    }
    case 'division':
      // challenger: dividend ≤ 1000, divisor ≥ 1 → answer ≤ 1000.
      // explorer: answer is the constructed quotient ≤ factorMax (50).
      return challenger ? 1_000 : 50;
    default:
      return Infinity;
  }
}

// Max reachable OPERAND value (not result). For the equation-puzzle types the
// blank / tray tiles can hold an operand, which for division is the DIVIDEND
// (= divisor × quotient), bounded by factorMax² — much larger than the quotient
// cap returned by maxAnswer. Add/sub/mul operands never exceed maxAnswer, so
// only division differs.
function maxOperand(operation, ageBand) {
  if (operation === 'division') {
    const factorMax = ageBand === '11-12' ? 1_000 : 50;
    return factorMax * factorMax;
  }
  return maxAnswer(operation, ageBand);
}

const errors = [];

function err(ctx, msg) {
  errors.push(`[${ctx}] ${msg}`);
}

// Parse "12 + 34 = []" / "12.50 ÷ 4 = []" → { a, operator, b }
function parseEquation(equation) {
  const match = equation.match(/^([\d.]+)\s*([+\-×÷])\s*([\d.]+)\s*=\s*\[\]$/);
  if (!match) return null;
  return {
    a: parseFloat(match[1]),
    operator: match[2],
    b: parseFloat(match[3]),
  };
}

function computeExpected(a, operator, b) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return parseFloat((a / b).toFixed(2));
    default: return null;
  }
}

// Same arithmetic as computeExpected; named to mirror the generator's applyOp.
const applyOp = computeExpected;

// Parse a missing-number equation "[] + 8 = 15" / "7 + [] = 15" / "[] ÷ 4 = 6".
// Returns { aStr, operator, bStr, result } with exactly one operand being "[]".
function parseMissingEquation(equation) {
  const match = equation.match(
    /^(\[\]|[\d.]+)\s*([+\-×÷])\s*(\[\]|[\d.]+)\s*=\s*([\d.]+)$/
  );
  if (!match) return null;
  const aStr = match[1];
  const bStr = match[3];
  // Exactly one operand is the blank (RHS is always numeric here).
  const blanks = [aStr, bStr].filter((s) => s === '[]').length;
  if (blanks !== 1) return null;
  return { aStr, operator: match[2], bStr, result: parseFloat(match[4]) };
}

const OP_SYMBOL = { addition: '+', subtraction: '-', multiplication: '×', division: '÷' };

function validateExercise(ctx, operation, ageBand, ex) {
  // type
  if (!VALID_TYPES.includes(ex.type)) {
    err(ctx, `invalid type "${ex.type}"`);
    return;
  }

  // NOTE on fallback tolerance: the missing-number and build-equation cycle
  // slots silently fall back to a forward `type-answer` for unsafe combos
  // (challenger decimal division). So a combo that "should" produce a puzzle
  // type may legitimately emit a `type-answer` object — that is valid and is
  // handled by the generic branch below, not an error.

  // ---- missing-number: blank sits on an OPERAND; correctAnswer is that operand
  if (ex.type === 'missing-number') {
    const parsedM = parseMissingEquation(ex.equation);
    if (!parsedM) {
      err(ctx, `unparseable missing-number equation "${ex.equation}"`);
      return;
    }
    if (parsedM.operator !== OP_SYMBOL[operation]) {
      err(ctx, `missing-number "${ex.equation}" uses "${parsedM.operator}", expected "${OP_SYMBOL[operation]}"`);
    }
    if (ex.blankSlot !== 'a' && ex.blankSlot !== 'b') {
      err(ctx, `missing-number invalid blankSlot ${JSON.stringify(ex.blankSlot)}`);
    }
    if (typeof ex.correctAnswer !== 'number' || !Number.isFinite(ex.correctAnswer)) {
      err(ctx, `missing-number correctAnswer not finite: ${JSON.stringify(ex.correctAnswer)}`);
      return;
    }
    // Reconstruct the full LHS by substituting correctAnswer into the blank,
    // then assert it equals the shown RHS.
    const aFilled = parsedM.aStr === '[]' ? ex.correctAnswer : parseFloat(parsedM.aStr);
    const bFilled = parsedM.bStr === '[]' ? ex.correctAnswer : parseFloat(parsedM.bStr);
    const got = computeExpected(aFilled, parsedM.operator, bFilled);
    if (got === null || Math.abs(got - parsedM.result) > 0.005) {
      err(ctx, `missing-number "${ex.equation}" with []=${ex.correctAnswer} → ${got}, not ${parsedM.result}`);
    }
    // The missing operand is bounded by the same ranges as a forward answer,
    // so it shares the existing per-operation answer cap (no new constant).
    if (ex.correctAnswer < 0) {
      err(ctx, `missing-number negative answer ${ex.correctAnswer} ("${ex.equation}")`);
    }
    const capM = maxOperand(operation, ageBand);
    if (ex.correctAnswer > capM) {
      err(ctx, `missing-number answer ${ex.correctAnswer} exceeds max ${capM} ("${ex.equation}")`);
    }
    if (operation === 'division') {
      if (ex.blankSlot !== 'a') {
        err(ctx, `missing-number division must blank the dividend (got slot "${ex.blankSlot}")`);
      }
      // Explorer division: the missing operand is the integer dividend.
      if (ageBand !== '11-12' && !Number.isInteger(ex.correctAnswer)) {
        err(ctx, `missing-number explorer division non-integer answer ${ex.correctAnswer}`);
      }
    }
    return;
  }

  // ---- build-equation: result shown; child fills 2 operand slots from a tray
  if (ex.type === 'build-equation') {
    if (ex.operator !== OP_SYMBOL[operation]) {
      err(ctx, `build-equation uses "${ex.operator}", expected "${OP_SYMBOL[operation]}"`);
    }
    if (ex.slots !== 2) err(ctx, `build-equation slots ${ex.slots} != 2`);
    if (!Array.isArray(ex.solution) || ex.solution.length !== 2) {
      err(ctx, `build-equation solution must be length-2 array, got ${JSON.stringify(ex.solution)}`);
      return;
    }
    if (!Array.isArray(ex.tray) || ex.tray.length !== 5) {
      err(ctx, `build-equation tray must be length-5 array, got ${JSON.stringify(ex.tray)}`);
      return;
    }
    if (typeof ex.result !== 'number' || !Number.isFinite(ex.result)) {
      err(ctx, `build-equation result not finite: ${JSON.stringify(ex.result)}`);
      return;
    }
    for (const tile of ex.tray) {
      if (typeof tile !== 'number' || !Number.isFinite(tile) || tile < 0) {
        err(ctx, `build-equation tray has invalid tile ${JSON.stringify(tile)} (${JSON.stringify(ex.tray)})`);
      }
    }
    // Solution actually produces the result.
    const [sa, sb] = ex.solution;
    if (Math.abs(applyOp(sa, ex.operator, sb) - ex.result) > 0.005) {
      err(ctx, `build-equation solution [${sa}, ${sb}] does not produce ${ex.result}`);
    }
    // Both solution operands present in the tray.
    if (!ex.tray.includes(sa) || !ex.tray.includes(sb)) {
      err(ctx, `build-equation solution [${sa}, ${sb}] not both in tray ${JSON.stringify(ex.tray)}`);
    }
    // No unintended second solution. We reason over DISTINCT tray POSITIONS (a
    // child cannot place one tile in both slots), matching the real interaction.
    // Find the position pair that realises the intended solution, then assert no
    // OTHER distinct position pair produces the result. The solution's swap is
    // also accepted for commutative ops (it is the same fact).
    const commutative = ex.operator === '+' || ex.operator === '×';
    const isSolutionValues = (x, y) =>
      (x === sa && y === sb) || (commutative && x === sb && y === sa);
    for (let i = 0; i < ex.tray.length; i++) {
      for (let j = 0; j < ex.tray.length; j++) {
        if (i === j) continue;
        const x = ex.tray[i];
        const y = ex.tray[j];
        if (isSolutionValues(x, y)) continue; // intended solution (and swap)
        if (Math.abs(applyOp(x, ex.operator, y) - ex.result) < 0.005) {
          err(ctx, `build-equation unintended solution ${x} ${ex.operator} ${y} = ${ex.result} (tray ${JSON.stringify(ex.tray)})`);
        }
      }
    }
    // Subtraction/division order fixed: no negative result.
    if ((operation === 'subtraction' || operation === 'division') && sa < sb) {
      err(ctx, `build-equation non-commutative solution out of order [${sa}, ${sb}] ("${operation}")`);
    }
    if (ex.result < 0) err(ctx, `build-equation negative result ${ex.result}`);
    const capB = maxAnswer(operation, ageBand);
    if (ex.result > capB) {
      err(ctx, `build-equation result ${ex.result} exceeds max ${capB}`);
    }
    // Tray tiles hold operands; for division the dividend tile is bounded by
    // factorMax² (maxOperand), not the quotient cap.
    const capTile = maxOperand(operation, ageBand);
    for (const tile of ex.tray) {
      if (tile > capTile) {
        err(ctx, `build-equation tray tile ${tile} exceeds operand max ${capTile} (${JSON.stringify(ex.tray)})`);
      }
    }
    return;
  }

  // equation parses and uses the operation's symbol
  const parsed = parseEquation(ex.equation);
  if (!parsed) {
    err(ctx, `unparseable equation "${ex.equation}"`);
    return;
  }
  if (parsed.operator !== OP_SYMBOL[operation]) {
    err(ctx, `equation "${ex.equation}" uses "${parsed.operator}", expected "${OP_SYMBOL[operation]}"`);
  }

  // Remainder exercises carry a STRING answer "q r r"; validate them separately
  // and return BEFORE the finite-number guard below (which would otherwise flag
  // the string as malformed).
  if (ex.isRemainder) {
    const parsedR = parseRemainderStr(ex.correctAnswer);
    if (!parsedR) {
      err(ctx, `remainder answer not "q r r": ${JSON.stringify(ex.correctAnswer)}`);
      return;
    }
    if (parsedR.q !== ex.quotient || parsedR.r !== ex.remainder)
      err(ctx, `remainder fields mismatch answer "${ex.correctAnswer}" (q=${ex.quotient}, r=${ex.remainder})`);
    if (!(parsedR.r > 0 && parsedR.r < ex.divisor))
      err(ctx, `remainder ${parsedR.r} not in (0, divisor=${ex.divisor})`);
    if (parsedR.q * ex.divisor + parsedR.r !== ex.dividend)
      err(ctx, `remainder arithmetic wrong: ${parsedR.q}*${ex.divisor}+${parsedR.r} != ${ex.dividend}`);
    if (parsed.operator !== '÷') err(ctx, `remainder equation bad: "${ex.equation}"`);
    return;
  }

  // correctAnswer must be a finite number before any numeric/string checks below
  // (guards the validator against the malformed exercises it exists to detect —
  // a missing correctAnswer should be reported, not crash the sweep).
  if (typeof ex.correctAnswer !== 'number' || !Number.isFinite(ex.correctAnswer)) {
    err(ctx, `correctAnswer is not a finite number: ${JSON.stringify(ex.correctAnswer)} ("${ex.equation}")`);
    return;
  }

  // arithmetic correctness
  const expected = computeExpected(parsed.a, parsed.operator, parsed.b);
  if (expected !== null && Math.abs(expected - ex.correctAnswer) > 0.005) {
    err(ctx, `correctAnswer ${ex.correctAnswer} but "${ex.equation}" = ${expected}`);
  }

  // answers are non-negative and within the age band's reachable range
  if (ex.correctAnswer < 0) {
    err(ctx, `negative correctAnswer ${ex.correctAnswer} ("${ex.equation}")`);
  }
  const cap = maxAnswer(operation, ageBand);
  if (ex.correctAnswer > cap) {
    err(ctx, `correctAnswer ${ex.correctAnswer} exceeds max ${cap} ("${ex.equation}")`);
  }

  // subtraction never goes negative
  if (operation === 'subtraction' && parsed.a < parsed.b) {
    err(ctx, `subtraction minuend < subtrahend ("${ex.equation}")`);
  }

  // division: integer for non-challenger explorers, ≤2dp for challenger
  if (operation === 'division') {
    if (ageBand !== '11-12' && !Number.isInteger(ex.correctAnswer)) {
      err(ctx, `non-challenger division has non-integer result ${ex.correctAnswer} ("${ex.equation}")`);
    }
    const decimals = ex.correctAnswer.toString().split('.')[1] || '';
    if (decimals.length > 2) {
      err(ctx, `division result ${ex.correctAnswer} has >2 decimal places`);
    }
  }

  // select-answer: 3 unique options including the answer, all ≥ 0
  if (ex.type === 'select-answer') {
    if (!Array.isArray(ex.options) || ex.options.length !== 3) {
      err(ctx, `select-answer needs 3 options, got ${ex.options?.length}`);
    } else {
      if (!ex.options.includes(ex.correctAnswer)) {
        err(ctx, `select-answer options ${JSON.stringify(ex.options)} missing correctAnswer ${ex.correctAnswer}`);
      }
      if (new Set(ex.options).size !== ex.options.length) {
        err(ctx, `select-answer has duplicate options ${JSON.stringify(ex.options)}`);
      }
      if (ex.options.some((o) => o < 0)) {
        err(ctx, `select-answer has negative option ${JSON.stringify(ex.options)}`);
      }
    }
  }

  // follow-pattern: 2 options incl. answer; pattern of 3 with exactly one null
  if (ex.type === 'follow-pattern') {
    if (!Array.isArray(ex.options) || ex.options.length !== 2) {
      err(ctx, `follow-pattern needs 2 options, got ${ex.options?.length}`);
    } else {
      if (!ex.options.includes(ex.correctAnswer)) {
        err(ctx, `follow-pattern options ${JSON.stringify(ex.options)} missing correctAnswer ${ex.correctAnswer}`);
      }
      if (new Set(ex.options).size !== ex.options.length) {
        err(ctx, `follow-pattern has duplicate options ${JSON.stringify(ex.options)}`);
      }
    }
    if (!Array.isArray(ex.pattern) || ex.pattern.length !== 3) {
      err(ctx, `follow-pattern needs 3 pattern entries, got ${ex.pattern?.length}`);
    } else {
      const nullCount = ex.pattern.filter((p) => p.result === null).length;
      if (nullCount !== 1) {
        err(ctx, `follow-pattern has ${nullCount} null results, expected exactly 1`);
      }
      if (ex.pattern[2].result !== null) {
        err(ctx, `follow-pattern null should be the last entry`);
      }
      if (ex.pattern.some((p) => !('expression' in p) || !('result' in p))) {
        err(ctx, `follow-pattern entry missing expression/result`);
      }
    }
  }

  // story-problem (non-remainder): a numeric answer + a narrative prompt. The
  // equation-parse and arithmetic checks above already cover its correctness.
  if (ex.type === 'story-problem') {
    if (typeof ex.prompt !== 'string' || ex.prompt.trim() === '')
      err(ctx, `story-problem missing prompt ("${ex.equation}")`);
  }
}

let totalChecked = 0;

for (const unit of units) {
  const operation = unit.operation;
  for (const ageBand of AGE_BANDS) {
    for (const tier of TIERS) {
      const ctx = `${operation} / ${ageBand} / tier ${tier}`;
      let exercises;
      try {
        exercises = generateExercises(operation, ageBand, tier, SAMPLES_PER_COMBO);
      } catch (e) {
        err(ctx, `generateExercises threw: ${e.message}`);
        continue;
      }
      if (exercises.length !== SAMPLES_PER_COMBO) {
        err(ctx, `expected ${SAMPLES_PER_COMBO} exercises, got ${exercises.length}`);
      }
      for (const ex of exercises) {
        validateExercise(ctx, operation, ageBand, ex);
        totalChecked++;
      }
    }
  }
}

// Dedicated sweep for the division remainder variant (Explorer + Challenger).
for (const ageBand of ['8-10', '11-12']) {
  for (const tier of TIERS) {
    const ctx = `division(remainder) / ${ageBand} / tier ${tier}`;
    let exercises;
    try {
      exercises = generateExercises('division', ageBand, tier, SAMPLES_PER_COMBO, { variant: 'remainder' });
    } catch (e) {
      err(ctx, `generateExercises threw: ${e.message}`);
      continue;
    }
    for (const ex of exercises) {
      validateExercise(ctx, 'division', ageBand, ex);
      totalChecked++;
    }
  }
}

if (errors.length > 0) {
  console.error(`\n❌ Validation failed with ${errors.length} error(s):\n`);
  // Dedupe identical messages to keep output readable across the large sample.
  const seen = new Set();
  for (const e of errors) {
    if (seen.has(e)) continue;
    seen.add(e);
    console.error(`  ${e}`);
  }
  console.error('');
  process.exit(1);
} else {
  console.log(
    `\n✅ Validated ${totalChecked} generated exercises across ` +
      `${units.length} operations × ${AGE_BANDS.length} age bands × ${TIERS.length} tiers.\n`
  );
  process.exit(0);
}
