// eslint-disable-next-line no-unused-vars -- `motion` is used as motion.* in JSX; repo eslint lacks the react plugin to see it
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../StrategyView.module.css';

export default function CountUpDots({ from, addBy, total }) {
  const reduce = useReducedMotion();
  const dots = Array.from({ length: addBy }, (_, i) => from + i + 1);
  return (
    <div className={styles.countUp}>
      <p className={styles.caption}>
        Start at <strong>{from}</strong>, then count on <strong>{addBy}</strong> more:
      </p>
      <motion.div
        className={styles.dotRow}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.18 } } }}
      >
        {dots.map((label) => (
          <motion.span
            key={label}
            className={styles.dot}
            variants={{ hidden: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
          >
            {label}
          </motion.span>
        ))}
      </motion.div>
      <p className={styles.result}>
        {from} + {addBy} = <strong>{total}</strong>
      </p>
    </div>
  );
}
