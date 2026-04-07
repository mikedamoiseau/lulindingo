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

  it('every exercise has type, equation, and correctAnswer', () => {
    const exercises = generateExercises('addition', '8-10', 3, 15);
    for (const ex of exercises) {
      expect(ex).toHaveProperty('type');
      expect(ex).toHaveProperty('equation');
      expect(ex).toHaveProperty('correctAnswer');
    }
  });

  it('exercise types are drawn from the three valid types', () => {
    const validTypes = new Set(['type-answer', 'select-answer', 'follow-pattern']);
    const exercises = generateExercises('addition', '8-10', 3, 30);
    for (const ex of exercises) {
      expect(validTypes.has(ex.type)).toBe(true);
    }
  });

  it('all three exercise types appear in a large batch', () => {
    const exercises = generateExercises('addition', '8-10', 3, 60);
    const types = new Set(exercises.map((e) => e.type));
    expect(types.has('type-answer')).toBe(true);
    expect(types.has('select-answer')).toBe(true);
    expect(types.has('follow-pattern')).toBe(true);
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
    const exercises = generateExercises('addition', '8-10', 3, 30);
    for (const ex of exercises) {
      const { a, operator, b } = parseEquation(ex.equation);
      expect(operator).toBe('+');
      expect(ex.correctAnswer).toBeCloseTo(computeExpected(a, operator, b), 5);
    }
  });

  it('equation symbol is "+"', () => {
    const exercises = generateExercises('addition', '8-10', 3, 10);
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
    const exercises = generateExercises('subtraction', '8-10', 3, 30);
    for (const ex of exercises) {
      const { a, operator, b } = parseEquation(ex.equation);
      expect(operator).toBe('-');
      expect(a).toBeGreaterThanOrEqual(b);
      expect(ex.correctAnswer).toBeCloseTo(computeExpected(a, operator, b), 5);
    }
  });

  it('equation symbol is "-"', () => {
    const exercises = generateExercises('subtraction', '8-10', 3, 10);
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
    const exercises = generateExercises('multiplication', '8-10', 3, 30);
    for (const ex of exercises) {
      const { a, operator, b } = parseEquation(ex.equation);
      expect(operator).toBe('×');
      expect(ex.correctAnswer).toBeCloseTo(computeExpected(a, operator, b), 5);
    }
  });

  it('Explorer factors are within 0–50', () => {
    const exercises = generateExercises('multiplication', '8-10', 5, 40);
    for (const ex of exercises) {
      const { a, b } = parseEquation(ex.equation);
      expect(a).toBeLessThanOrEqual(50);
      expect(b).toBeLessThanOrEqual(50);
    }
  });

  it('Challenger factors are within 0–1000', () => {
    const exercises = generateExercises('multiplication', '11-12', 5, 40);
    for (const ex of exercises) {
      const { a, b } = parseEquation(ex.equation);
      expect(a).toBeLessThanOrEqual(1000);
      expect(b).toBeLessThanOrEqual(1000);
    }
  });

  it('equation symbol is "×"', () => {
    const exercises = generateExercises('multiplication', '8-10', 3, 10);
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
    const exercises = generateExercises('division', '8-10', 3, 30);
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
    const exercises = generateExercises('division', '8-10', 3, 10);
    for (const ex of exercises) {
      expect(ex.equation).toContain('÷');
    }
  });
});
