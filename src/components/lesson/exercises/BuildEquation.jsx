import { useState } from 'react';
// eslint-disable-next-line no-unused-vars -- `motion` is used as motion.* in JSX; repo eslint lacks the react plugin to see it
import { motion } from 'framer-motion';
import SpeakerButton from '../../shared/SpeakerButton';
import { exerciseToSpeech } from '../../../utils/speakable';
import styles from './BuildEquation.module.css';

/** Apply a binary operator the same way the generator/validator do (2dp on ÷). */
function applyOp(operator, a, b) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return parseFloat((a / b).toFixed(2));
    default: return NaN;
  }
}

/**
 * Build-the-Equation: the result is shown and the child taps operands from a
 * tray into two slots to assemble a true equation. Tap-to-place (not drag):
 * tap a tray tile → it fills the next empty slot; tap a filled slot → the tile
 * returns to the tray.
 *
 * On CHECK we report the assembled value (applyOp of the two placed tiles) so
 * LessonEngine's `answer === correctAnswer` (= result) check naturally accepts
 * ANY true assembly — including a fact-family swap — and rejects wrong ones.
 */
export default function BuildEquation({ exercise, onAnswer, speechRate = 1.0, readAloud = false }) {
  const { operator, result, tray } = exercise;
  // Each slot holds the tray INDEX of the placed tile (values can repeat), or null.
  const [slots, setSlots] = useState([null, null]);

  const usedIndices = new Set(slots.filter((s) => s !== null));

  const placeTile = (trayIndex) => {
    if (usedIndices.has(trayIndex)) return;
    const empty = slots.indexOf(null);
    if (empty === -1) return; // both slots full
    const next = [...slots];
    next[empty] = trayIndex;
    setSlots(next);
  };

  const clearSlot = (slotIndex) => {
    if (slots[slotIndex] === null) return;
    const next = [...slots];
    next[slotIndex] = null;
    setSlots(next);
  };

  const bothFilled = slots[0] !== null && slots[1] !== null;

  const handleCheck = () => {
    if (!bothFilled) return;
    const x = tray[slots[0]];
    const y = tray[slots[1]];
    onAnswer(applyOp(operator, x, y));
  };

  const slotValue = (slotIndex) =>
    slots[slotIndex] === null ? '' : tray[slots[slotIndex]];

  return (
    <div className={styles.container}>
      <div className={styles.instructionRow}>
        <p className={styles.instruction}>{exercise.instruction || 'Build the equation'}</p>
        {readAloud && <SpeakerButton text={exerciseToSpeech(exercise)} rate={speechRate} />}
      </div>

      <div className={styles.equation}>
        <button
          type="button"
          data-testid="slot"
          className={`${styles.slot} ${slots[0] !== null ? styles.slotFilled : ''}`}
          onClick={() => clearSlot(0)}
        >
          {slotValue(0)}
        </button>
        <span className={styles.operator}>{operator}</span>
        <button
          type="button"
          data-testid="slot"
          className={`${styles.slot} ${slots[1] !== null ? styles.slotFilled : ''}`}
          onClick={() => clearSlot(1)}
        >
          {slotValue(1)}
        </button>
        <span className={styles.equals}>=</span>
        <span className={styles.result}>{result}</span>
      </div>

      <div className={styles.tray} data-testid="tray">
        {tray.map((value, idx) => {
          const used = usedIndices.has(idx);
          return (
            <motion.button
              key={idx}
              type="button"
              className={`${styles.tile} ${used ? styles.tileUsed : ''}`}
              onClick={() => placeTile(idx)}
              disabled={used}
              whileTap={{ scale: 0.95 }}
              layout
            >
              {value}
            </motion.button>
          );
        })}
      </div>

      <div className={styles.checkArea}>
        <button className={styles.checkButton} onClick={handleCheck} disabled={!bothFilled}>
          CHECK
        </button>
      </div>
    </div>
  );
}
