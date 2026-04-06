import { useState } from 'react';
import NumberPad from './NumberPad';
import styles from './TypeTheAnswer.module.css';

export default function TypeTheAnswer({ exercise, onAnswer }) {
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
      <p className={styles.instruction}>{exercise.instruction || 'Type the answer'}</p>
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
