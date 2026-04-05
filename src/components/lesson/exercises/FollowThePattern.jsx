import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './FollowThePattern.module.css';

export default function FollowThePattern({ exercise, onAnswer }) {
  const [selected, setSelected] = useState(null);

  const handleCheck = () => {
    if (selected !== null) onAnswer(selected);
  };

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Follow the pattern'}</p>
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
