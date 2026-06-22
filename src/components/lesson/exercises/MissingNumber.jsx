import { useState } from 'react';
import NumberPad from './NumberPad';
import SpeakerButton from '../../shared/SpeakerButton';
import { exerciseToSpeech } from '../../../utils/speakable';
import styles from './MissingNumber.module.css';

/**
 * Find-the-Missing-Number: the blank sits on an OPERAND (e.g. "7 + [] = 15")
 * and the child types the missing operand. Rendering reuses TypeTheAnswer's
 * model — splitting the equation on "[]" yields exactly the two parts around
 * the blank regardless of which operand it sits on — but the instruction and
 * type tag differ, so this is its own component.
 */
export default function MissingNumber({ exercise, onAnswer, speechRate = 1.0, readAloud = false }) {
  const [value, setValue] = useState('');

  const handleDigit = (d) => {
    if (d === '.' && value.includes('.')) return;
    if (value.length < 10) setValue(value + d);
  };

  const handleDelete = () => {
    setValue(value.slice(0, -1));
  };

  const handleCheck = () => {
    if (value !== '') onAnswer(parseFloat(value));
  };

  const parts = exercise.equation.split('[]');

  return (
    <div className={styles.container}>
      <div className={styles.instructionRow}>
        <p className={styles.instruction}>{exercise.instruction || 'What number is missing?'}</p>
        {readAloud && <SpeakerButton text={exerciseToSpeech(exercise)} rate={speechRate} />}
      </div>
      <div className={styles.equation}>
        <span>{parts[0]}</span>
        <span className={styles.blank}>{value || ''}</span>
        <span>{parts[1]}</span>
      </div>
      <div className={styles.inputArea}>
        <div className={styles.inputField}>
          {value || <span className={styles.placeholder}>Example: 2</span>}
        </div>
        <button className={styles.checkButton} onClick={handleCheck} disabled={value === ''}>
          CHECK
        </button>
      </div>
      <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
    </div>
  );
}
