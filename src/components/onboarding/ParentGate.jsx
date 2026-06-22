import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import styles from './ParentGate.module.css';

// A lightweight, offline speed bump in front of destructive / parent-only
// actions (add / remove child). It is NOT security — a determined older child
// can solve 7 × 8 — the goal is preventing accidental taps by little kids.
// Generates a single-digit × single-digit product (factors 3–9 so the answer
// isn't trivially memorised).
function newChallenge() {
  const a = 3 + Math.floor(Math.random() * 7); // 3..9
  const b = 3 + Math.floor(Math.random() * 7); // 3..9
  return { a, b, answer: a * b };
}

export default function ParentGate({ onPass, onCancel }) {
  const [challenge, setChallenge] = useState(newChallenge);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = useCallback(
    (e) => {
      e.preventDefault();
      if (parseInt(value, 10) === challenge.answer) {
        onPass();
      } else {
        // Wrong answer reshuffles so kids can't guess by repetition.
        setError(true);
        setChallenge(newChallenge());
        setValue('');
      }
    },
    [value, challenge, onPass]
  );

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="parent-gate"
    >
      <motion.form
        className={styles.card}
        onSubmit={submit}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2 className={styles.title}>Grown-up check</h2>
        <p className={styles.prompt}>
          What is {challenge.a} × {challenge.b}?
        </p>
        <input
          className={styles.input}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="?"
          autoFocus
          aria-label="Answer"
        />
        {error && <p className={styles.error}>Not quite — try the new one.</p>}
        <div className={styles.actions}>
          <button className={styles.confirm} type="submit" disabled={value === ''}>
            Continue
          </button>
          <button className={styles.cancel} type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
