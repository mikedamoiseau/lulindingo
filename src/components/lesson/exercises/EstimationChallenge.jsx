import { useState } from 'react';
// eslint-disable-next-line no-unused-vars -- `motion` is used in JSX; repo eslint lacks the react plugin to see it
import { motion } from 'framer-motion';
import NumberPad from './NumberPad';
import SpeakerButton from '../../shared/SpeakerButton';
import { exerciseToSpeech } from '../../../utils/speakable';
import styles from './EstimationChallenge.module.css';

/**
 * Estimation exercise component. Renders one of two variants based on
 * `exercise.estimationMode`. It reports the *raw* guess via `onAnswer`
 * ({ kind, value }); LessonEngine decides correctness (bucket equality or
 * tolerance band) — correctness logic stays out of this component.
 */
export default function EstimationChallenge({ exercise, onAnswer, speechRate = 1.0, readAloud = false }) {
  const [selected, setSelected] = useState(null);
  const [value, setValue] = useState('');

  const parts = exercise.equation.split('[]');
  const isBucket = exercise.estimationMode === 'bucket';

  const handleDigit = (d) => {
    if (d === '.' && value.includes('.')) return;
    if (value.length < 10) setValue(value + d);
  };
  const handleDelete = () => setValue(value.slice(0, -1));

  const handleCheckBucket = () => {
    if (selected !== null) onAnswer({ kind: 'bucket', value: selected });
  };
  const handleCheckType = () => {
    if (value !== '') onAnswer({ kind: 'type', value: parseFloat(value) });
  };

  return (
    <div className={styles.container}>
      <div className={styles.instructionRow}>
        <span className={styles.aboutBadge}>≈ ABOUT</span>
        <p className={styles.instruction}>About how much?</p>
        {readAloud && <SpeakerButton text={exerciseToSpeech(exercise)} rate={speechRate} />}
      </div>

      <div className={styles.equation}>
        <span>{parts[0]}</span>
        <span className={styles.blank}>{isBucket ? '' : value || ''}</span>
        <span>{parts[1]}</span>
      </div>

      {isBucket ? (
        <>
          <div className={styles.options}>
            {exercise.buckets.map((bucket) => (
              <motion.button
                key={bucket}
                className={`${styles.option} ${selected === bucket ? styles.selected : ''}`}
                onClick={() => setSelected(bucket)}
                whileTap={{ scale: 0.97 }}
              >
                about {bucket}
              </motion.button>
            ))}
          </div>
          <div className={styles.checkArea}>
            <button
              className={styles.checkButton}
              onClick={handleCheckBucket}
              disabled={selected === null}
            >
              CHECK
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.inputArea}>
            <div className={styles.inputField}>
              {value || <span className={styles.placeholder}>Your estimate</span>}
            </div>
            <button className={styles.checkButton} onClick={handleCheckType} disabled={value === ''}>
              CHECK
            </button>
          </div>
          <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
        </>
      )}
    </div>
  );
}
