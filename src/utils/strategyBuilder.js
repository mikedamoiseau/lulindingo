/**
 * strategyBuilder.js
 *
 * Pure logic: turn a missed exercise's equation + operation into a
 * serializable "strategy descriptor" describing ONE worked mental-math
 * method built from the SAME operands. Renderers switch on descriptor.kind.
 *
 * Equations always look like "A <op> B = []" where <op> is + - × ÷.
 */

const EQUATION_RE = /^\s*(\d+(?:\.\d+)?)\s*([+\-×÷])\s*(\d+(?:\.\d+)?)\s*=/;

// Caps keep the visuals legible. Past these, fall back to { kind: 'none' }.
const CAPS = {
  addUpBy: 12, // dots added (count-on)
  addTotal: 20, // max running total to count to
  subStart: 20, // max minuend for a hand-drawn number line
  mulStep: 12, // skip-count step size
  mulTimes: 12, // number of hops
  divDots: 30, // max dividend rendered as dots
  divGroups: 12, // max bins
  divPerGroup: 12, // max dots per bin
};

const NONE = (reason) => ({ kind: 'none', reason });

/** Parse "A op B = []" → { a, operator, b } or null. */
export function parseOperands(equation) {
  if (typeof equation !== 'string') return null;
  const m = equation.match(EQUATION_RE);
  if (!m) return null;
  return { a: parseFloat(m[1]), operator: m[2], b: parseFloat(m[3]) };
}

const isWhole = (n) => Number.isInteger(n);

/**
 * @param {string} equation  - e.g. "5 + 3 = []"
 * @param {string} operation - 'addition'|'subtraction'|'multiplication'|'division'
 * @param {string} ageBand   - reserved for future age tuning; caps already cover it
 * @returns descriptor (tagged union, always serializable)
 */
export function buildStrategy(equation, operation /*, ageBand */) {
  const ops = parseOperands(equation);
  if (!ops) return NONE('unparseable');
  const { a, b } = ops;
  if (!isWhole(a) || !isWhole(b)) return NONE('non-integer-operand');

  switch (operation) {
    case 'addition': {
      const total = a + b;
      const from = Math.max(a, b);
      const addBy = Math.min(a, b);
      if (addBy > CAPS.addUpBy || total > CAPS.addTotal) return NONE('too-large');
      return { kind: 'count-up', from, addBy, total };
    }
    case 'subtraction': {
      const end = a - b;
      if (end < 0) return NONE('negative');
      if (a > CAPS.subStart) return NONE('too-large');
      return { kind: 'number-line', start: a, jumpBack: b, end };
    }
    case 'multiplication': {
      const product = a * b;
      const step = Math.min(a, b); // skip-count by the smaller factor
      const times = Math.max(a, b); // repeated the larger number of times
      if (step > CAPS.mulStep || times > CAPS.mulTimes) return NONE('too-large');
      const chain = Array.from({ length: times }, (_, i) => step * (i + 1));
      return { kind: 'skip-count', step, times, chain, product };
    }
    case 'division': {
      if (b === 0) return NONE('divide-by-zero');
      const perGroup = a / b;
      if (!isWhole(perGroup)) return NONE('non-integer-result'); // Challenger decimals
      if (a > CAPS.divDots || b > CAPS.divGroups || perGroup > CAPS.divPerGroup) {
        return NONE('too-large');
      }
      return { kind: 'equal-groups', total: a, groups: b, perGroup };
    }
    default:
      return NONE('unknown-operation');
  }
}
