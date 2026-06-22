/**
 * factTracking.js
 *
 * Per-fact identity + strength model for the Fact Vault feature.
 *
 * A "fact" is a single forward two-operand step ("a op b = []"). Each is
 * identified by a normalized signature and carries Leitner box / seen / correct
 * state. The signature collapses commutative pairs (7×8 ≡ 8×7) so a child who
 * masters one isn't re-drilled on the other.
 */

import { getLocalDateString } from './streakTracker.js';
import { nextBox, nextDueDate } from './leitner.js';

// Map the parsed operator symbol → operation name + normalized signature glyph.
const OP_INFO = {
  '+': { operation: 'addition', glyph: '+', commutative: true },
  '-': { operation: 'subtraction', glyph: '-', commutative: false },
  '×': { operation: 'multiplication', glyph: 'x', commutative: true },
  x: { operation: 'multiplication', glyph: 'x', commutative: true },
  '*': { operation: 'multiplication', glyph: 'x', commutative: true },
  '÷': { operation: 'division', glyph: '/', commutative: false },
  '/': { operation: 'division', glyph: '/', commutative: false },
};

/** "Weak" facts (box ≤ 2) are eligible for review/practice biasing. */
const WEAK_BOX_THRESHOLD = 2;

/**
 * Parse a single-step equation string ("7 × 8 = []") into a fact descriptor.
 * Normalizes ×→x and ÷→/, sorts operands for commutative ops, and returns
 * null for anything that is not exactly "<number> <op> <number> = ...".
 */
export function parseFactSignature(equation) {
  if (typeof equation !== 'string') return null;
  // Exactly two operands and one operator on the left-hand side.
  const m = equation.match(/^\s*(-?\d+(?:\.\d+)?)\s*([+\-×÷x*/])\s*(-?\d+(?:\.\d+)?)\s*=/);
  if (!m) return null;

  const info = OP_INFO[m[2]];
  if (!info) return null;

  let a = parseFloat(m[1]);
  let b = parseFloat(m[3]);

  if (info.commutative && b < a) {
    [a, b] = [b, a];
  }

  return {
    sig: `${a}${info.glyph}${b}`,
    operation: info.operation,
    a,
    b,
  };
}

/**
 * Derive a fact descriptor from an exercise, or null when the exercise type /
 * shape doesn't yield a clean (a, op, b) fact (follow-pattern, build-equation,
 * missing-number-on-operand, etc.).
 */
export function signatureForExercise(exercise) {
  if (!exercise) return null;
  // follow-pattern teaches sequence reasoning, not a discrete fact.
  if (exercise.type === 'follow-pattern') return null;
  // missing-number blanks an operand, so its "equation" is "[] op b = r" — not
  // a forward fact; parseFactSignature returns null for it anyway, but skip
  // explicitly for clarity. build-equation has no equation string.
  if (exercise.type === 'missing-number' || exercise.type === 'build-equation') {
    return null;
  }
  return parseFactSignature(exercise.equation);
}

/**
 * Pure read-modify-write of a fact row given an answer outcome.
 *
 * @param {object|undefined} fact   existing row, or undefined for first encounter
 * @param {boolean}          correct
 * @param {string}           today   local date string
 * @param {object}           [parsed] {sig, operation, a, b} — required when
 *                                    `fact` is undefined (first encounter)
 * @returns {object} the new fact row
 */
export function applyOutcome(fact, correct, today = getLocalDateString(), parsed) {
  const base = fact ?? {
    sig: parsed?.sig,
    operation: parsed?.operation,
    a: parsed?.a,
    b: parsed?.b,
    seen: 0,
    correct: 0,
    box: 0,
  };

  const box = nextBox(base.box ?? 0, correct);
  return {
    sig: base.sig,
    operation: base.operation,
    a: base.a,
    b: base.b,
    seen: (base.seen ?? 0) + 1,
    correct: (base.correct ?? 0) + (correct ? 1 : 0),
    box,
    lastSeen: today,
    dueAt: nextDueDate(box, correct, today),
  };
}

export function isWeak(fact) {
  return (fact?.box ?? 0) <= WEAK_BOX_THRESHOLD;
}

export function isDue(fact, today = getLocalDateString()) {
  return Boolean(fact?.dueAt) && fact.dueAt <= today;
}

/**
 * Ordered list of weak-fact signatures to steer a generated set toward.
 * Order: due-and-weak first, then by ascending box, then oldest lastSeen.
 * Weak-but-not-due facts follow due ones. Filters by operation and caps at max.
 */
export function selectWeakFactTargets(facts, { operation, max = Infinity, today = getLocalDateString() } = {}) {
  const weak = (facts ?? [])
    .filter((f) => f && isWeak(f) && (!operation || f.operation === operation));

  weak.sort((x, y) => {
    const xd = isDue(x, today) ? 0 : 1;
    const yd = isDue(y, today) ? 0 : 1;
    if (xd !== yd) return xd - yd; // due first
    if ((x.box ?? 0) !== (y.box ?? 0)) return (x.box ?? 0) - (y.box ?? 0); // lower box first
    // oldest lastSeen first
    return String(x.lastSeen ?? '').localeCompare(String(y.lastSeen ?? ''));
  });

  return weak.slice(0, max).map((f) => f.sig);
}
