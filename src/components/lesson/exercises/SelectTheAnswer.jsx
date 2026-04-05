import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './SelectTheAnswer.module.css';

export default function SelectTheAnswer({ exercise, onAnswer }) {
  const [selected, setSelected] = useState(null);

  const handleCheck = () => {
    if (selected !== null) onAnswer(selected);
  };

  const parts = exercise.equation.split('[]');

  return (
    <div className={styles.container}>
      <p className={styles.instruction}>{exercise.instruction || 'Select the answer'}</p>
      <div className={styles.equation}>
        <span>{parts[0]}</span>
        <span className={styles.blank} />
        <span>{parts[1]}</span>
      </div>
      <div className={styles.options}>
        {exercise.options.map((opt) => (
          <motion.button
            key={opt}
            className={`${styles.option} ${selected === opt ? styles.selected : ''}`}
            onClick={() => setSelected(opt)}
            whileTap={{ scale: 0.97 }}
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
