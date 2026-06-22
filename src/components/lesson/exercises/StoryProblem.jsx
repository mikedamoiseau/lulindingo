import { useState } from 'react';
import NumberPad from './NumberPad';
import SpeakerButton from '../../shared/SpeakerButton';
import { exerciseToSpeech } from '../../../utils/speakable';
import styles from './StoryProblem.module.css';

/**
 * StoryProblem — a typed-answer exercise variant.
 *
 * Shows the `prompt` narrative, then a number pad. For remainder exercises it
 * shows an `r` key and submits the raw `"q r r"` string; otherwise it submits a
 * number. Correctness is decided by LessonEngine via matchesAnswer().
 */
export default function StoryProblem({ exercise, onAnswer, speechRate = 1.0, readAloud = false }) {
  const [value, setValue] = useState('');
  const isRemainder = !!exercise.isRemainder;

  const handleDigit = (d) => {
    if (d === '.' && (value.includes('.') || isRemainder)) return; // no decimals in remainder mode
    if (value.length < 12) setValue(value + d);
  };
  const handleR = () => {
    if (isRemainder && value && !/[rR]/.test(value)) setValue(value + ' r ');
  };
  const handleDelete = () => setValue(value.replace(/ r $/, '').slice(0, -1));

  const handleCheck = () => {
    if (value.trim() === '') return;
    onAnswer(isRemainder ? value.trim() : parseFloat(value));
  };

  return (
    <div className={styles.container}>
      <div className={styles.instructionRow}>
        <p className={styles.instruction}>
          {exercise.instruction || 'Read the story and type the answer'}
        </p>
        {readAloud && <SpeakerButton text={exerciseToSpeech(exercise)} rate={speechRate} />}
      </div>
      <div className={styles.storyCard}>
        <span className={styles.emoji}>📖</span>
        <p className={styles.prompt}>{exercise.prompt}</p>
      </div>
      <div className={styles.inputArea}>
        <div className={styles.inputField}>
          {value || (
            <span className={styles.placeholder}>{isRemainder ? 'Example: 3 r 2' : 'Example: 12'}</span>
          )}
        </div>
        <button className={styles.checkButton} onClick={handleCheck} disabled={value.trim() === ''}>
          CHECK
        </button>
      </div>
      <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
      {isRemainder && (
        <button className={styles.remainderKey} onClick={handleR}>
          remainder ( r )
        </button>
      )}
    </div>
  );
}
