import { useState } from 'react';
import { motion } from 'framer-motion';
import SpeakerButton from '../../shared/SpeakerButton';
import { exerciseToSpeech } from '../../../utils/speakable';
import styles from './FollowThePattern.module.css';

export default function FollowThePattern({ exercise, onAnswer, speechRate = 1.0, readAloud = false }) {
  const [selected, setSelected] = useState(null);

  const handleCheck = () => {
    if (selected !== null) onAnswer(selected);
  };

  return (
    <div className={styles.container}>
      <div className={styles.instructionRow}>
        <p className={styles.instruction}>{exercise.instruction || 'Follow the pattern'}</p>
        {readAloud && <SpeakerButton text={exerciseToSpeech(exercise)} rate={speechRate} />}
      </div>
      <div className={styles.table}>
        {exercise.pattern.map((row, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.cell}>{row.expression}</div>
            <div className={`${styles.cell} ${row.result === null ? styles.blankCell : ''}`}>
              {row.result === null ? '???' : row.result}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.options}>
        {exercise.options.map((opt) => (
          <motion.button
            key={opt}
            className={`${styles.option} ${selected === opt ? styles.selected : ''}`}
            onClick={() => setSelected(opt)}
            whileTap={{ scale: 0.95 }}
          >
            {opt}
          </motion.button>
        ))}
      </div>
      <div className={styles.checkArea}>
        <button className={styles.checkButton} onClick={handleCheck} disabled={selected === null}>
          CHECK
        </button>
      </div>
    </div>
  );
}
