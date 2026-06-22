/**
 * storyTemplates.js
 *
 * Pure templating layer for Story Problem Mode. Wraps the numbers the
 * exercise generator already produced in an age-banded narrative. No new
 * arithmetic happens here — `answer` is passed in and never recomputed.
 *
 * wrapStory(operation, a, b, answer, ageBand) → { prompt, instruction }
 */

/** Pick a noun form by count. Defaults plural to singular + 's'. */
export function plural(n, singular, pluralForm) {
  const p = pluralForm ?? `${singular}s`;
  return n === 1 ? singular : p;
}

// Each template: (a, b, answer) => string. Templates own their own
// pluralisation so "1 acorn" / "2 acorns" agree. Keep 6-7 to ONE clause.
export const THEME_BANK = {
  addition: {
    '6-7': [
      (a, b) => `Dingo found ${a} ${plural(a, 'acorn')}, then ${b} more. How many now?`,
      (a, b) => `You have ${a} ${plural(a, 'sticker')} and get ${b} more. How many in all?`,
    ],
    '8-10': [
      (a, b) =>
        `The class collected ${a} ${plural(a, 'leaf', 'leaves')} on Monday and ${b} on Tuesday. How many leaves altogether?`,
    ],
    '11-12': [
      (a, b) =>
        `A library had ${a} ${plural(a, 'book')} on its shelves. After a donation of ${b} more ${plural(b, 'book')} arrived, how many books does the library hold in total?`,
    ],
  },
  subtraction: {
    '6-7': [
      (a, b) => `Dingo had ${a} ${plural(a, 'berry', 'berries')} and ate ${b}. How many are left?`,
      (a, b) => `There were ${a} ${plural(a, 'duck')} in the pond. ${b} swam away. How many remain?`,
    ],
    '8-10': [
      (a, b) =>
        `A baker made ${a} ${plural(a, 'muffin')} and sold ${b} of them before lunch. How many muffins are still on the tray?`,
    ],
    '11-12': [
      (a, b) =>
        `A stadium with ${a} ${plural(a, 'seat')} sold ${b} ${plural(b, 'ticket')} for tonight's match. How many seats are still empty?`,
    ],
  },
  multiplication: {
    // 6-7 never reaches the multiplication unit; no templates needed.
    '8-10': [
      (a, b) => `There are ${a} ${plural(a, 'basket')} with ${b} ${plural(b, 'apple')} in each. How many apples in all?`,
    ],
    '11-12': [
      (a, b) =>
        `A school orders ${a} ${plural(a, 'crate')} of juice boxes, and each crate holds ${b} ${plural(b, 'box', 'boxes')}. How many juice boxes did the school order in total?`,
    ],
  },
  division: {
    // 6-7 never reaches the division unit.
    '8-10': [
      // a = dividend, b = divisor, answer = quotient (exact division path)
      (a, b) => `Dingo shares ${a} ${plural(a, 'treat')} equally among ${b} ${plural(b, 'friend')}. How many does each friend get?`,
    ],
    '11-12': [
      // a = dividend, b = divisor, answer = exact quotient (story path forces
      // exact division, so this shares out evenly with nothing left over).
      (a, b) =>
        `A factory packs ${a} ${plural(a, 'bottle')} equally into ${b} ${plural(b, 'crate')}. How many bottles are in each crate?`,
    ],
  },
};

const INSTRUCTION = 'Read the story and type the answer';

/** Bands to try in order when the requested band has no templates. */
const BAND_FALLBACK = {
  '6-7': ['6-7', '8-10', '11-12'],
  '8-10': ['8-10', '11-12', '6-7'],
  '11-12': ['11-12', '8-10', '6-7'],
};

function pickTemplates(operation, ageBand) {
  const byBand = THEME_BANK[operation] || {};
  for (const band of BAND_FALLBACK[ageBand] || ['8-10']) {
    if (byBand[band] && byBand[band].length) return byBand[band];
  }
  return null;
}

/**
 * Wrap pre-computed operands in a narrative.
 *
 * @param {string} operation
 * @param {number} a - first operand as it appears in the equation
 * @param {number} b - second operand
 * @param {number} answer - the already-computed correct answer
 * @param {string} ageBand
 * @returns {{ prompt: string, instruction: string }}
 */
export function wrapStory(operation, a, b, answer, ageBand) {
  const templates = pickTemplates(operation, ageBand);
  if (!templates) {
    // Last-resort generic prompt; should not happen for valid operations.
    return { prompt: `What is the answer? (${a}, ${b})`, instruction: INSTRUCTION };
  }
  const tmpl = templates[Math.floor(Math.random() * templates.length)];
  return { prompt: tmpl(a, b, answer), instruction: INSTRUCTION };
}
