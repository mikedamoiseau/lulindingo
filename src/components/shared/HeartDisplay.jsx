import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import { getNextRefillMs, MAX_HEARTS } from '../../utils/heartManager';
import styles from './HeartDisplay.module.css';

export default function HeartDisplay() {
  const hearts = useGameStore((s) => s.user?.hearts ?? 5);
  const heartsLastRefill = useGameStore((s) => s.user?.heartsLastRefill);
  const [remainingMs, setRemainingMs] = useState(null);

  useEffect(() => {
    if (hearts >= MAX_HEARTS || !heartsLastRefill) {
      setRemainingMs(null);
      return;
    }

    const tick = () => setRemainingMs(getNextRefillMs(heartsLastRefill));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [hearts, heartsLastRefill]);

  const remainingMin = remainingMs != null ? Math.ceil(remainingMs / 60000) : null;

  return (
    <div className={styles.container}>
      <motion.span
        className={styles.icon}
        key={hearts}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400 }}
      >
        ❤️
      </motion.span>
      <span className={styles.count}>{hearts}</span>
      {remainingMin != null && (
        <span className={styles.timer}>{remainingMin}m</span>
      )}
    </div>
  );
}
