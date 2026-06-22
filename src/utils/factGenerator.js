/**
 * factGenerator.js
 *
 * Weak-fact-biased wrapper around the UNCHANGED generateExercises. It produces
 * a standard count-length set, then best-effort steers individual slots toward
 * due/weak fact signatures by over-sampling extra candidates and swapping in
 * any whose parsed signature matches a target.
 *
 * It never rewrites the generator, so npm run validate invariants are
 * untouched: the wrapper only *selects among* outputs the generator already
 * guarantees valid. Targeting is best-effort — a target may be unreachable for
 * a given tier/age window, in which case the slot keeps its original exercise.
 */

import { generateExercises } from './exerciseGenerator.js';
import { signatureForExercise, selectWeakFactTargets } from './factTracking.js';

/**
 * @param {object}   args
 * @param {object[]} args.facts      fact rows (from db.facts)
 * @param {string}   args.operation
 * @param {string}   args.ageBand
 * @param {number}   args.tier
 * @param {number}   args.count
 * @param {number}   [args.oversample=4]  candidate multiplier for steering
 * @param {string}   [args.today]
 * @returns {object[]} exactly `count` valid exercise objects
 */
export function generateWeakFactExercises({
  facts,
  operation,
  ageBand,
  tier,
  count,
  oversample = 4,
  today,
}) {
  // Base set is always valid and exactly `count` long.
  const base = generateExercises(operation, ageBand, tier, count);

  const targets = selectWeakFactTargets(facts, { operation, max: count, today });
  if (targets.length === 0) return base;

  // Over-sample candidate exercises and index the ones whose signature matches
  // a target signature.
  const candidates = generateExercises(operation, ageBand, tier, count * oversample);
  const bySig = new Map();
  for (const ex of candidates) {
    const s = signatureForExercise(ex);
    if (!s) continue;
    if (!bySig.has(s.sig)) bySig.set(s.sig, ex);
  }

  const out = [...base];
  let slot = 0;
  for (const sig of targets) {
    const match = bySig.get(sig);
    if (!match) continue; // unreachable for this tier/age window — skip
    // Place into the next steerable slot whose current exercise isn't already
    // one of our placed targets.
    if (slot >= out.length) break;
    out[slot] = match;
    slot += 1;
  }

  return out;
}
