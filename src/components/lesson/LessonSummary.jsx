import { motion } from 'framer-motion';
import Confetti from '../shared/Confetti';
import styles from './LessonSummary.module.css';

export default function LessonSummary({ xp, accuracy, streak, onFinish }) {
  const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <Confetti active={true} />
      <div className={styles.stars}>
        {'⭐'.repeat(stars) + '☆'.repeat(3 - stars)}
      </div>
      <h1 className={styles.title}>Lesson Complete!</h1>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{xp}</span>
          <span className={styles.statLabel}>XP earned</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{accuracy}%</span>
          <span className={styles.statLabel}>Accuracy</span>
        </div>
        {streak > 0 && (
          <div className={styles.stat}>
            <span className={styles.statValue}>🔥 {streak}</span>
            <span className={styles.statLabel}>Day streak</span>
          </div>
        )}
      </div>
      <button className={styles.finishBtn} onClick={onFinish}>
        CONTINUE
      </button>
    </motion.div>
  );
}
