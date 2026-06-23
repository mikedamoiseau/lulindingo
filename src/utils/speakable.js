/**
 * speakable.js
 *
 * Pure functions that convert exercise objects into text suitable for
 * text-to-speech. No DOM, no SpeechSynthesis here — just strings.
 */

export const OPERATOR_WORDS = {
  '+': 'plus',
  '-': 'minus',
  '×': 'times',
  '÷': 'divided by',
  '=': 'equals',
};

const BLANK_TOKEN = '[]';

/**
 * Convert an equation string like "7 + 4 = []" into spoken text
 * "7 plus 4 equals what". Numbers are left as digit strings — the TTS
 * engine reads "7" as "seven" and "12.5" as "twelve point five".
 *
 * @param {string} equation
 * @returns {string}
 */
export function equationToSpeech(equation) {
  if (!equation) return '';
  return equation
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token === BLANK_TOKEN) return 'what';
      return OPERATOR_WORDS[token] ?? token;
    })
    .join(' ');
}

/**
 * Join option values into a spoken list: [11,9,12] -> "11, 9, or 12".
 */
function optionsToSpeech(options) {
  if (!Array.isArray(options) || options.length === 0) return '';
  if (options.length === 1) return String(options[0]);
  if (options.length === 2) return `${options[0]} or ${options[1]}`;
  // Oxford comma for three or more: "11, 9, or 12".
  const head = options.slice(0, -1).join(', ');
  const last = options[options.length - 1];
  return `${head}, or ${last}`;
}

/**
 * Convert a follow-pattern's rows into spoken text.
 * Each row: "<expr> is <result>." The last row (result null) is "<expr> is what?".
 */
function patternToSpeech(pattern) {
  return pattern
    .map((row) => {
      const expr = equationToSpeech(row.expression);
      return row.result === null ? `${expr} is what?` : `${expr} is ${row.result}.`;
    })
    .join(' ');
}

/**
 * Top-level entry point: exercise -> spoken text.
 *
 * @param {object|null} exercise
 * @returns {string}
 */
export function exerciseToSpeech(exercise) {
  if (!exercise) return '';

  // Story problems read the narrative prompt, not the bare equation.
  if (exercise.type === 'story-problem' && exercise.prompt) {
    return exercise.prompt;
  }

  if (exercise.type === 'follow-pattern' && Array.isArray(exercise.pattern)) {
    const rows = patternToSpeech(exercise.pattern);
    const opts = optionsToSpeech(exercise.options);
    return opts ? `${rows} Options: ${opts}.` : rows;
  }

  // Build-the-Equation has no equation string — describe the goal and tiles.
  if (exercise.type === 'build-equation' && Array.isArray(exercise.tray)) {
    const op = OPERATOR_WORDS[exercise.operator] ?? exercise.operator;
    const tiles = optionsToSpeech(exercise.tray);
    return `Build an equation that ${op} to ${exercise.result}. Tiles: ${tiles}.`;
  }

  const eq = equationToSpeech(exercise.equation);

  if (exercise.type === 'select-answer' && Array.isArray(exercise.options)) {
    const opts = optionsToSpeech(exercise.options);
    return opts ? `${eq}. Options: ${opts}.` : eq;
  }

  // type-answer and any unknown type: equation only
  return eq;
}
