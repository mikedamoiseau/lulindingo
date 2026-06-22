// eslint-disable-next-line no-unused-vars -- `motion` is used as motion.* in JSX; repo eslint lacks the react plugin to see it
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../StrategyView.module.css';

export default function NumberLineJump({ start, jumpBack, end }) {
  const reduce = useReducedMotion();
  // buildStrategy never emits start<=0, but guard against a divide-by-zero
  // marker position if it ever did.
  if (!start || start <= 0) return null;
  const ticks = Array.from({ length: start + 1 }, (_, i) => i);
  return (
    <div className={styles.numberLine}>
      <p className={styles.caption}>
        Start at <strong>{start}</strong> and jump back <strong>{jumpBack}</strong>:
      </p>
      <div className={styles.line}>
        {ticks.map((t) => (
          <span
            key={t}
            className={`${styles.tick} ${t === end ? styles.tickLanding : ''} ${
              t === start ? styles.tickStart : ''
            }`}
          >
            {t}
          </span>
        ))}
        <motion.span
          className={styles.jumper}
          initial={{ left: `${(start / start) * 100}%` }}
          animate={{ left: `${(end / start) * 100}%` }}
          transition={{ duration: reduce ? 0 : 0.8, ease: 'easeInOut' }}
        >
          🐸
        </motion.span>
      </div>
      <p className={styles.result}>
        {start} − {jumpBack} = <strong>{end}</strong>
      </p>
    </div>
  );
}
