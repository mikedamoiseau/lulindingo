import { describe, it, expect } from 'vitest';
import { generateExercises } from '../exerciseGenerator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a simple binary equation string like "5 + 3 = []" and return
 * { a, operator, b } as numbers so we can verify arithmetic independently.
 */
function parseEquation(equation) {
  // Matches: "12 + 34 = []" or "12.50 ÷ 4 = []" etc.
  const match = equation.match(/^([\d.]+)\s*([\+\-×÷])\s*([\d.]+)\s*=\s*\[\]$/);
  if (!match) throw new Error(`Cannot parse equation: "${equation}"`);
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
    default: throw new Error(`Unknown operator: ${operator}`);
  }
}

function averageAnswer(exercises) {
  return exercises.reduce((sum, ex) => sum + ex.correctAnswer, 0) / exercises.length;
}

/**
 * Keep only the "forward result" exercise types whose equation is the classic
 * "a op b = []" string (result in the blank). The equation-puzzle types
 * (missing-number → operand blank; build-equation → no equation string) are
 * validated by their own describe blocks, so the legacy parse-the-equation
 * assertions below filter them out.
 */
function forwardOnly(exercises) {
  return exercises.filter(
    (e) => e.type === 'type-answer' || e.type === 'select-answer' || e.type === 'story-problem'
  );
}

// ---------------------------------------------------------------------------
// Shared structure tests
// ---------------------------------------------------------------------------

describe('generateExercises — shared structure', () => {
  it('throws on unknown operation', () => {
    expect(() => generateExercises('modulo', '8-10', 3, 5)).toThrow();
  });

  it('returns the requested count', () => {
    const exercises = generateExercises('addition', '8-10', 3, 10);
    expect(exercises).toHaveLength(10);
  });

  it('every exercise has type and correctAnswer (equation for all but build-equation)', () => {
    const exercises = generateExercises('addition', '8-10', 3, 15);
    for (const ex of exercises) {
      expect(ex).toHaveProperty('type');
      expect(ex).toHaveProperty('correctAnswer');
      // build-equation has no "a op b = []" equation string (it carries a tray);
      // every other type renders from an equation field.
      if (ex.type !== 'build-equation') expect(ex).toHaveProperty('equation');
    }
  });

  it('exercise types are drawn from the valid types', () => {
    const validTypes = new Set([
      'type-answer',
      'select-answer',
      'follow-pattern',
      'story-problem',
      'missing-number',
      'build-equation',
    ]);
    const exercises = generateExercises('addition', '8-10', 3, 30);
    for (const ex of exercises) {
      expect(validTypes.has(ex.type)).toBe(true);
    }
  });

  it('all six exercise types appear in a large batch', () => {
    const exercises = generateExercises('addition', '8-10', 3, 60);
    const types = new Set(exercises.map((e) => e.type));
    expect(types.has('type-answer')).toBe(true);
    expect(types.has('select-answer')).toBe(true);
    expect(types.has('follow-pattern')).toBe(true);
    expect(types.has('story-problem')).toBe(true);
    expect(types.has('missing-number')).toBe(true);
    expect(types.has('build-equation')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// select-answer structure
// ---------------------------------------------------------------------------

describe('generateExercises — select-answer structure', () => {
  function getSelectAnswerExercises(count = 60) {
    return generateExercises('addition', '8-10', 3, count).filter(
      (e) => e.type === 'select-answer'
    );
  }

  it('select-answer has exactly 3 options', () => {
    const exercises = getSelectAnswerExercises();
    expect(exercises.length).toBeGreaterThan(0);
    for (const ex of exercises) {
      expect(ex.options).toHaveLength(3);
    }
  });

  it('select-answer options contain the correctAnswer', () => {
    const exercises = getSelectAnswerExercises();
    for (const ex of exercises) {
      expect(ex.options).toContain(ex.correctAnswer);
    }
  });

  it('select-answer distractors are not equal to the correct answer', () => {
    const exercises = getSelectAnswerExercises();
    for (const ex of exercises) {
      const distractors = ex.options.filter((o) => o !== ex.correctAnswer);
      for (const d of distractors) {
        expect(d).not.toBe(ex.correctAnswer);
      }
    }
  });

  it('select-answer distractors are >= 0', () => {
    const exercises = getSelectAnswerExercises();
    for (const ex of exercises) {
      for (const o of ex.options) {
        expect(o).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// follow-pattern structure
// ---------------------------------------------------------------------------

describe('generateExercises — follow-pattern structure', () => {
  function getFollowPatternExercises(count = 60) {
    return generateExercises('addition', '8-10', 3, count).filter(
      (e) => e.type === 'follow-pattern'
    );
  }

  it('follow-pattern has exactly 3 pattern entries', () => {
    const exercises = getFollowPatternExercises();
    expect(exercises.length).toBeGreaterThan(0);
    for (const ex of exercises) {
      expect(ex.pattern).toHaveLength(3);
    }
  });

  it('follow-pattern last entry has null result', () => {
    const exercises = getFollowPatternExercises();
    for (const ex of exercises) {
      expect(ex.pattern[2].result).toBeNull();
    }
  });

  it('follow-pattern first two entries have non-null results', () => {
    const exercises = getFollowPatternExercises();
    for (const ex of exercises) {
      expect(ex.pattern[0].result).not.toBeNull();
      expect(ex.pattern[1].result).not.toBeNull();
    }
  });

  it('follow-pattern has exactly 2 options', () => {
    const exercises = getFollowPatternExercises();
    for (const ex of exercises) {
      expect(ex.options).toHaveLength(2);
    }
  });

  it('follow-pattern options contain the correctAnswer', () => {
    const exercises = getFollowPatternExercises();
    for (const ex of exercises) {
      expect(ex.options).toContain(ex.correctAnswer);
    }
  });

  it('follow-pattern options distractor is not equal to correctAnswer', () => {
    const exercises = getFollowPatternExercises();
    for (const ex of exercises) {
      const distractors = ex.options.filter((o) => o !== ex.correctAnswer);
      for (const d of distractors) {
        expect(d).not.toBe(ex.correctAnswer);
      }
    }
  });

  it('follow-pattern pattern entries each have expression and result fields', () => {
    const exercises = getFollowPatternExercises();
    for (const ex of exercises) {
      for (const entry of ex.pattern) {
        expect(entry).toHaveProperty('expression');
        expect(entry).toHaveProperty('result');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Addition tests
// ---------------------------------------------------------------------------

describe('generateExercises — addition', () => {
  it('Starter (6-7) answers stay within 0–20', () => {
    const exercises = generateExercises('addition', '6-7', 3, 30);
    for (const ex of exercises) {
      expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(ex.correctAnswer).toBeLessThanOrEqual(20);
    }
  });

  it('Explorer (8-10) answers stay within 0–1000', () => {
    const exercises = generateExercises('addition', '8-10', 3, 30);
    for (const ex of exercises) {
      expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(ex.correctAnswer).toBeLessThanOrEqual(1000);
    }
  });

  it('Challenger (11-12) answers stay within 0–1,000,000', () => {
    const exercises = generateExercises('addition', '11-12', 3, 30);
    for (const ex of exercises) {
      expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(ex.correctAnswer).toBeLessThanOrEqual(1_000_000);
    }
  });

  it('higher tiers produce larger numbers on average', () => {
    const tier1 = generateExercises('addition', '8-10', 1, 50);
    const tier5 = generateExercises('addition', '8-10', 5, 50);
    expect(averageAnswer(tier5)).toBeGreaterThan(averageAnswer(tier1));
  });

  it('equations have correct arithmetic', () => {
    const exercises = forwardOnly(generateExercises('addition', '8-10', 3, 30));
    for (const ex of exercises) {
      const { a, operator, b } = parseEquation(ex.equation);
      expect(operator).toBe('+');
      expect(ex.correctAnswer).toBeCloseTo(computeExpected(a, operator, b), 5);
    }
  });

  it('equation symbol is "+"', () => {
    const exercises = forwardOnly(generateExercises('addition', '8-10', 3, 10));
    for (const ex of exercises) {
      expect(ex.equation).toContain('+');
    }
  });
});

// ---------------------------------------------------------------------------
// Subtraction tests
// ---------------------------------------------------------------------------

describe('generateExercises — subtraction', () => {
  it('results are never negative', () => {
    const exercises = generateExercises('subtraction', '8-10', 3, 30);
    for (const ex of exercises) {
      expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });

  it('Starter (6-7) results stay within 0–20', () => {
    const exercises = generateExercises('subtraction', '6-7', 3, 30);
    for (const ex of exercises) {
      expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(ex.correctAnswer).toBeLessThanOrEqual(20);
    }
  });

  it('equations have correct arithmetic', () => {
    const exercises = forwardOnly(generateExercises('subtraction', '8-10', 3, 30));
    for (const ex of exercises) {
      const { a, operator, b } = parseEquation(ex.equation);
      expect(operator).toBe('-');
      expect(a).toBeGreaterThanOrEqual(b);
      expect(ex.correctAnswer).toBeCloseTo(computeExpected(a, operator, b), 5);
    }
  });

  it('equation symbol is "-"', () => {
    const exercises = forwardOnly(generateExercises('subtraction', '8-10', 3, 10));
    for (const ex of exercises) {
      expect(ex.equation).toContain('-');
    }
  });
});

// ---------------------------------------------------------------------------
// Multiplication tests
// ---------------------------------------------------------------------------

describe('generateExercises — multiplication', () => {
  it('Explorer produces valid results', () => {
    const exercises = generateExercises('multiplication', '8-10', 3, 30);
    expect(exercises.length).toBe(30);
    for (const ex of exercises) {
      expect(ex.correctAnswer).toBeGreaterThan(0);
    }
  });

  it('equations have correct arithmetic', () => {
    const exercises = forwardOnly(generateExercises('multiplication', '8-10', 3, 30));
    for (const ex of exercises) {
      const { a, operator, b } = parseEquation(ex.equation);
      expect(operator).toBe('×');
      expect(ex.correctAnswer).toBeCloseTo(computeExpected(a, operator, b), 5);
    }
  });

  it('Explorer factors are within 0–50', () => {
    const exercises = forwardOnly(generateExercises('multiplication', '8-10', 5, 40));
    for (const ex of exercises) {
      const { a, b } = parseEquation(ex.equation);
      expect(a).toBeLessThanOrEqual(50);
      expect(b).toBeLessThanOrEqual(50);
    }
  });

  it('Challenger factors are within 0–1000', () => {
    const exercises = forwardOnly(generateExercises('multiplication', '11-12', 5, 40));
    for (const ex of exercises) {
      const { a, b } = parseEquation(ex.equation);
      expect(a).toBeLessThanOrEqual(1000);
      expect(b).toBeLessThanOrEqual(1000);
    }
  });

  it('equation symbol is "×"', () => {
    const exercises = forwardOnly(generateExercises('multiplication', '8-10', 3, 10));
    for (const ex of exercises) {
      expect(ex.equation).toContain('×');
    }
  });
});

// ---------------------------------------------------------------------------
// Division tests
// ---------------------------------------------------------------------------

describe('generateExercises — division', () => {
  it('Explorer always produces integer results', () => {
    const exercises = generateExercises('division', '8-10', 3, 30);
    for (const ex of exercises) {
      expect(Number.isInteger(ex.correctAnswer)).toBe(true);
    }
  });

  it('Explorer equations have correct arithmetic', () => {
    const exercises = forwardOnly(generateExercises('division', '8-10', 3, 30));
    for (const ex of exercises) {
      const { a, operator, b } = parseEquation(ex.equation);
      expect(operator).toBe('÷');
      expect(ex.correctAnswer).toBeCloseTo(computeExpected(a, operator, b), 5);
    }
  });

  it('Challenger can produce decimal results', () => {
    // Run enough exercises that at least some decimals appear
    const exercises = generateExercises('division', '11-12', 3, 60);
    const hasDecimal = exercises.some((ex) => !Number.isInteger(ex.correctAnswer));
    expect(hasDecimal).toBe(true);
  });

  it('Challenger results are rounded to 2 decimal places', () => {
    const exercises = generateExercises('division', '11-12', 3, 40);
    for (const ex of exercises) {
      const asString = ex.correctAnswer.toString();
      const decimalPart = asString.includes('.') ? asString.split('.')[1] : '';
      expect(decimalPart.length).toBeLessThanOrEqual(2);
    }
  });

  it('equation symbol is "÷"', () => {
    const exercises = forwardOnly(generateExercises('division', '8-10', 3, 10));
    for (const ex of exercises) {
      expect(ex.equation).toContain('÷');
    }
  });
});

// ---------------------------------------------------------------------------
// story-problem type + remainder division variant
// ---------------------------------------------------------------------------

import { parseRemainder } from '../answerMatch.js';

describe('story-problem type', () => {
  it('appears in the type cycle at its fixed position', () => {
    // Cycle: type-answer, select-answer, missing-number, follow-pattern,
    // story-problem, build-equation → story-problem is index 4.
    const ex = generateExercises('addition', '6-7', 1, 5);
    expect(ex[4].type).toBe('story-problem');
  });

  it('story problem keeps a numeric correctAnswer and a parseable equation', () => {
    const ex = generateExercises('addition', '6-7', 2, 5)[4];
    expect(typeof ex.correctAnswer).toBe('number');
    expect(ex.equation).toMatch(/\[\]/);
    expect(typeof ex.prompt).toBe('string');
    expect(ex.prompt.length).toBeGreaterThan(0);
  });

  it('story prompt math is consistent with the equation', () => {
    const ex = generateExercises('addition', '6-7', 3, 5)[4]; // story-problem slot
    const m = ex.equation.match(/^(\d+) \+ (\d+) = \[\]$/);
    expect(Number(m[1]) + Number(m[2])).toBe(ex.correctAnswer);
  });

  it('challenger division stories use exact integer division (no decimal answer)', () => {
    // Sample many — challenger division stories must never carry a decimal
    // answer, since a sharing narrative implies a whole number.
    for (let i = 0; i < 50; i++) {
      const ex = generateExercises('division', '11-12', 4, 8).filter(
        (e) => e.type === 'story-problem'
      );
      for (const e of ex) {
        expect(Number.isInteger(e.correctAnswer)).toBe(true);
        const m = e.equation.match(/^(\d+) ÷ (\d+) = \[\]$/);
        expect(Number(m[1]) % Number(m[2])).toBe(0); // exact
        expect(Number(m[1]) / Number(m[2])).toBe(e.correctAnswer);
      }
    }
  });
});

describe('division remainder variant', () => {
  it('produces "q r r" answers with 0 < r < divisor for explorer remainder', () => {
    const ex = generateExercises('division', '8-10', 3, 12, { variant: 'remainder' });
    for (const e of ex) {
      expect(e.isRemainder).toBe(true);
      const parsed = parseRemainder(e.correctAnswer);
      expect(parsed).not.toBeNull();
      const m = e.equation.match(/^(\d+) ÷ (\d+) = \[\]$/);
      const dividend = Number(m[1]);
      const divisor = Number(m[2]);
      expect(parsed.q * divisor + parsed.r).toBe(dividend);
      expect(parsed.r).toBeGreaterThan(0);
      expect(parsed.r).toBeLessThan(divisor);
    }
  });

  it('never emits a remainder of 0', () => {
    const ex = generateExercises('division', '11-12', 5, 30, { variant: 'remainder' });
    for (const e of ex) expect(parseRemainder(e.correctAnswer).r).not.toBe(0);
  });

  it('remainder exercises are always story-problems (only the StoryProblem input accepts "q r r")', () => {
    const ex = generateExercises('division', '8-10', 3, 20, { variant: 'remainder' });
    for (const e of ex) {
      expect(e.type).toBe('story-problem');
      // prompt asks for the leftover, not the bare share
      expect(e.prompt.toLowerCase()).toContain('left over');
      expect(e.instruction).toMatch(/r/);
    }
  });

  it('default division stays decimal/exact (no isRemainder)', () => {
    const ex = generateExercises('division', '8-10', 3, 6);
    for (const e of ex) expect(e.isRemainder).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// missing-number (Find-the-Missing-Number)
// ---------------------------------------------------------------------------

// Helper: substitute correctAnswer into the [] and verify the equation is true.
function assertMissingNumberTrue(ex) {
  expect(ex.type).toBe('missing-number');
  expect(['a', 'b']).toContain(ex.blankSlot);
  // exactly one [] in the equation, on an operand (left of '=')
  const [lhs, rhs] = ex.equation.split('=').map((s) => s.trim());
  expect(rhs).not.toContain('[]'); // result is shown
  expect(lhs).toContain('[]'); // blank is an operand
  // reconstruct
  const filledLhs = lhs.replace('[]', String(ex.correctAnswer));
  const m = filledLhs.match(/^([\d.]+)\s*([+\-×÷])\s*([\d.]+)$/);
  expect(m).toBeTruthy();
  const a = parseFloat(m[1]);
  const b = parseFloat(m[3]);
  const r = parseFloat(rhs);
  const got = { '+': a + b, '-': a - b, '×': a * b, '÷': parseFloat((a / b).toFixed(2)) }[m[2]];
  expect(Math.abs(got - r)).toBeLessThan(0.005);
}

describe('generateExercises — missing-number', () => {
  // Force only the missing-number type by requesting many and filtering.
  function missingOnly(operation, ageBand, tier, n = 200) {
    return generateExercises(operation, ageBand, tier, n).filter((e) => e.type === 'missing-number');
  }

  it.each(['addition', 'subtraction', 'multiplication', 'division'])(
    '%s missing-number puzzles are arithmetically true with a non-negative answer',
    (op) => {
      const band = op === 'division' || op === 'multiplication' ? '8-10' : '6-7';
      const list = missingOnly(op, band, 3);
      expect(list.length).toBeGreaterThan(0);
      for (const ex of list) {
        assertMissingNumberTrue(ex);
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(ex.correctAnswer)).toBe(true);
      }
    }
  );

  it('division only ever blanks the dividend (never the divisor)', () => {
    const list = missingOnly('division', '8-10', 3);
    for (const ex of list) {
      expect(ex.blankSlot).toBe('a'); // dividend
      expect(ex.equation.startsWith('[]')).toBe(true);
    }
  });

  it('explorer division missing-number answers are integers', () => {
    for (const ex of missingOnly('division', '8-10', 3)) {
      expect(Number.isInteger(ex.correctAnswer)).toBe(true);
    }
  });

  it('carries the full triple (a, b, result, operator) for validation', () => {
    const [ex] = missingOnly('addition', '6-7', 3, 60);
    expect(ex).toMatchObject({
      a: expect.any(Number),
      b: expect.any(Number),
      result: expect.any(Number),
      operator: expect.any(String),
    });
  });
});

// ---------------------------------------------------------------------------
// build-equation (Build-the-Equation)
// ---------------------------------------------------------------------------

describe('generateExercises — build-equation', () => {
  function buildOnly(operation, ageBand, tier, n = 250) {
    return generateExercises(operation, ageBand, tier, n).filter((e) => e.type === 'build-equation');
  }
  const apply = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '×': (a, b) => a * b,
    '÷': (a, b) => parseFloat((a / b).toFixed(2)),
  };

  it('solution operands actually produce the result', () => {
    for (const op of ['addition', 'subtraction', 'multiplication']) {
      for (const ex of buildOnly(op, '8-10', 3)) {
        const [a, b] = ex.solution;
        expect(Math.abs(apply[ex.operator](a, b) - ex.result)).toBeLessThan(0.005);
      }
    }
  });

  it('tray contains both solution operands plus exactly 3 decoys (5 tiles)', () => {
    for (const ex of buildOnly('multiplication', '8-10', 3)) {
      expect(ex.tray).toHaveLength(5);
      expect(ex.tray).toEqual(expect.arrayContaining(ex.solution));
      expect(ex.slots).toBe(2);
    }
  });

  it('decoys never form a second true equation (no unintended solution)', () => {
    for (const ex of buildOnly('multiplication', '8-10', 3)) {
      const sol = new Set([ex.solution.join(','), [...ex.solution].reverse().join(',')]);
      let truePairs = 0;
      for (const x of ex.tray)
        for (const y of ex.tray) {
          if (x === y) continue;
          if (Math.abs(apply[ex.operator](x, y) - ex.result) < 0.005) {
            if (!sol.has(`${x},${y}`)) truePairs++;
          }
        }
      expect(truePairs).toBe(0);
    }
  });

  it('subtraction/division build-equations are non-commutative (order fixed)', () => {
    for (const ex of buildOnly('subtraction', '8-10', 3)) {
      const [a, b] = ex.solution;
      expect(a).toBeGreaterThanOrEqual(b); // minuend >= subtrahend, result >= 0
    }
  });

  it('challenger division never emits build-equation (falls back)', () => {
    expect(buildOnly('division', '11-12', 3)).toHaveLength(0);
  });
});
