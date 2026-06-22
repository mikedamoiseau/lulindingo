// eslint-disable-next-line no-unused-vars -- `motion` is used as motion.* in JSX; repo eslint lacks the react plugin to see it
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../StrategyView.module.css';

export default function EqualGrouping({ total, groups, perGroup }) {
  const reduce = useReducedMotion();
  return (
    <div className={styles.equalGroups}>
      <p className={styles.caption}>
        Share <strong>{total}</strong> into <strong>{groups}</strong> equal groups:
      </p>
      <motion.div
        className={styles.groupRow}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.12 } } }}
      >
        {Array.from({ length: groups }).map((_, g) => (
          <div key={g} className={styles.bin}>
            {Array.from({ length: perGroup }).map((_, d) => (
              <motion.span
                key={d}
                className={styles.groupDot}
                variants={{ hidden: { scale: 0 }, show: { scale: 1 } }}
              />
            ))}
          </div>
        ))}
      </motion.div>
      <p className={styles.result}>
        {total} ÷ {groups} = <strong>{perGroup}</strong> in each
      </p>
    </div>
  );
}
