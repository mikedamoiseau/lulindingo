import { motion } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import styles from './HeartDisplay.module.css';

export default function HeartDisplay() {
  const hearts = useGameStore((s) => s.user?.hearts ?? 5);

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
    </div>
  );
}
