import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ProgressBar.module.css';

export default function ProgressBar({ current, total, onClose }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={styles.container}>
      <button className={styles.closeBtn} onClick={() => setShowConfirm(true)}>
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
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.dialog}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <p className={styles.dialogText}>Quit this lesson?</p>
              <p className={styles.dialogSub}>Your progress will be lost.</p>
              <div className={styles.dialogButtons}>
                <button
                  className={styles.dialogCancel}
                  onClick={() => setShowConfirm(false)}
                >
                  Keep going
                </button>
                <button className={styles.dialogQuit} onClick={onClose}>
                  Quit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
