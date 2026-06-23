// eslint-disable-next-line no-unused-vars -- `motion` is used as motion.* in JSX; repo eslint lacks the react plugin to see it
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../StrategyView.module.css';

export default function SkipCountChain({ step, times, chain, product }) {
  const reduce = useReducedMotion();
  return (
    <div className={styles.skipCount}>
      <p className={styles.caption}>
        Count by <strong>{step}</strong>, <strong>{times}</strong> times:
      </p>
      <motion.div
        className={styles.chain}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.2 } } }}
      >
        {chain.map((n, i) => (
          <motion.span
            key={i}
            className={`${styles.chainToken} ${i === chain.length - 1 ? styles.chainLast : ''}`}
            variants={{ hidden: { y: 8, opacity: 0 }, show: { y: 0, opacity: 1 } }}
          >
            {n}
          </motion.span>
        ))}
      </motion.div>
      <p className={styles.result}>
        {step} × {times} = <strong>{product}</strong>
      </p>
    </div>
  );
}
