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
const VALID_TYPES = ['type-answer', 'select-answer', 'follow-pattern'];
const SAMPLES_PER_COMBO = 300;

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

const OP_SYMBOL = { addition: '+', subtraction: '-', multiplication: '×', division: '÷' };

function validateExercise(ctx, operation, ageBand, ex) {
  // type
  if (!VALID_TYPES.includes(ex.type)) {
    err(ctx, `invalid type "${ex.type}"`);
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
