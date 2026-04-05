import { motion } from 'framer-motion';
import styles from './ProgressBar.module.css';

export default function ProgressBar({ current, total, onClose }) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={styles.container}>
      <button className={styles.closeBtn} onClick={onClose}>
        ✕
      </button>
      <div className={styles.barTrack}>
        <motion.div
          className={styles.barFill}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        />
      </div>
    </div>
  );
}
