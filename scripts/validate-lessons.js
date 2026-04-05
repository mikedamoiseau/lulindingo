/**
 * Validates all lesson data files against content design rules.
 * Run: node scripts/validate-lessons.js
 * Exits 0 on success, 1 with specific errors on failure.
 */

import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '..', 'src', 'data', 'math', 'lessons');
const VALID_TYPES = ['type-answer', 'select-answer', 'follow-pattern'];

const errors = [];
const allLessonIds = new Set();

function err(file, lessonId, exerciseIdx, msg) {
  const loc = exerciseIdx !== null ? `exercise ${exerciseIdx + 1}` : 'lesson';
  errors.push(`[${file} → ${lessonId} → ${loc}] ${msg}`);
}

// Parse operands from equation string like "1 + 2 = []" or "[] = 3 + 4"
function parseEquation(equation) {
  const cleaned = equation.replace('[]', '').trim();
  const match = cleaned.match(/(\d+)\s*([+\-])\s*(\d+)/);
  if (!match) return null;
  return {
    left: parseInt(match[1], 10),
    operator: match[2],
    right: parseInt(match[3], 10),
  };
}

function computeAnswer(parsed) {
  if (!parsed) return null;
  if (parsed.operator === '+') return parsed.left + parsed.right;
  if (parsed.operator === '-') return parsed.left - parsed.right;
  return null;
}

// Load units
const unitsModule = await import(join(__dirname, '..', 'src', 'data', 'math', 'units.js'));
const units = unitsModule.default;
const unitIds = new Set(units.map((u) => u.id));

// Determine unit topic by ID
function getUnitTopic(unitId) {
  const unit = units.find((u) => u.id === unitId);
  return unit?.topic || null;
}

function getUnitTitle(unitId) {
  const unit = units.find((u) => u.id === unitId);
  return unit?.title || unitId;
}

// Load and validate all lesson files
const files = (await readdir(LESSONS_DIR)).filter((f) => f.endsWith('.js'));

for (const file of files) {
  const mod = await import(join(LESSONS_DIR, file));
  const lessons = mod.default;

  if (!Array.isArray(lessons)) {
    errors.push(`[${file}] Default export is not an array`);
    continue;
  }

  for (const lesson of lessons) {
    // Check for duplicate lesson IDs
    if (allLessonIds.has(lesson.id)) {
      errors.push(`[${file}] Duplicate lesson ID: ${lesson.id}`);
    }
    allLessonIds.add(lesson.id);

    // Check unitId references a real unit
    if (!unitIds.has(lesson.unitId)) {
      err(file, lesson.id, null, `unitId "${lesson.unitId}" does not match any unit`);
    }

    // Check minimum exercise count
    if (!lesson.exercises || lesson.exercises.length < 10) {
      err(file, lesson.id, null, `has ${lesson.exercises?.length || 0} exercises, needs at least 10`);
    }

    if (!lesson.exercises) continue;

    const unitTitle = getUnitTitle(lesson.unitId);

    for (let i = 0; i < lesson.exercises.length; i++) {
      const ex = lesson.exercises[i];

      // Valid type
      if (!VALID_TYPES.includes(ex.type)) {
        err(file, lesson.id, i, `invalid type "${ex.type}"`);
        continue;
      }

      // Check correctAnswer is mathematically correct
      const parsed = parseEquation(ex.equation);
      if (parsed) {
        const expected = computeAnswer(parsed);
        if (expected !== null && expected !== ex.correctAnswer) {
          err(file, lesson.id, i, `correctAnswer is ${ex.correctAnswer} but equation "${ex.equation}" = ${expected}`);
        }
      }

      // select-answer and follow-pattern must have options containing correctAnswer
      if (ex.type === 'select-answer' || ex.type === 'follow-pattern') {
        if (!Array.isArray(ex.options)) {
          err(file, lesson.id, i, `${ex.type} missing options array`);
        } else if (!ex.options.includes(ex.correctAnswer)) {
          err(file, lesson.id, i, `options ${JSON.stringify(ex.options)} does not include correctAnswer ${ex.correctAnswer}`);
        }
      }

      // follow-pattern must have pattern with exactly one null result
      if (ex.type === 'follow-pattern') {
        if (!Array.isArray(ex.pattern)) {
          err(file, lesson.id, i, `follow-pattern missing pattern array`);
        } else {
          const nullCount = ex.pattern.filter((p) => p.result === null).length;
          if (nullCount !== 1) {
            err(file, lesson.id, i, `pattern has ${nullCount} null results, expected exactly 1`);
          }
        }
      }

      // Content range checks based on unit
      if (parsed) {
        if (unitTitle === 'Addition 1') {
          if (parsed.left > 10 || parsed.right > 10) {
            err(file, lesson.id, i, `Addition 1: operands should be 0-10, got ${parsed.left} and ${parsed.right}`);
          }
          const sum = parsed.left + parsed.right;
          if (sum > 10) {
            err(file, lesson.id, i, `Addition 1: sum should not exceed 10, got ${sum}`);
          }
        }

        if (unitTitle === 'Addition 2') {
          const sum = parsed.left + parsed.right;
          if (sum > 50) {
            err(file, lesson.id, i, `Addition 2: sum should not exceed 50, got ${sum}`);
          }
        }

        if (unitTitle === 'Subtraction 1') {
          if (parsed.left > 10 || parsed.right > 10) {
            err(file, lesson.id, i, `Subtraction 1: operands should be 0-10, got ${parsed.left} and ${parsed.right}`);
          }
          const result = parsed.left - parsed.right;
          if (result < 0) {
            err(file, lesson.id, i, `Subtraction 1: result should be non-negative, got ${result}`);
          }
        }
      }
    }
  }
}

// Summary
if (errors.length > 0) {
  console.error(`\n❌ Validation failed with ${errors.length} error(s):\n`);
  errors.forEach((e) => console.error(`  ${e}`));
  console.error('');
  process.exit(1);
} else {
  const totalLessons = allLessonIds.size;
  console.log(`\n✅ All ${totalLessons} lessons validated successfully.\n`);
  process.exit(0);
}
