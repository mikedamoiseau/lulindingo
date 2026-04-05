import { motion } from 'framer-motion';
import styles from './FeedbackBanner.module.css';

const ENCOURAGEMENTS = ['Amazing!', 'Great job!', 'Perfect!', 'Brilliant!', 'Keep it up!'];
const randomEncouragement = () =>
  ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

export default function FeedbackBanner({ isCorrect, correctAnswer, equation, onContinue, isRetry }) {
  if (isRetry) {
    return (
      <motion.div
        className={`${styles.banner} ${styles.retry}`}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <div className={styles.content}>
          <span className={styles.icon}>🤔</span>
          <span className={styles.message}>Try again!</span>
        </div>
        <button className={`${styles.continueBtn} ${styles.retryBtn}`} onClick={onContinue}>
          RETRY
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`${styles.banner} ${isCorrect ? styles.correct : styles.wrong}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className={styles.content}>
        {isCorrect ? (
          <>
            <span className={styles.icon}>✅</span>
            <span className={styles.message}>{randomEncouragement()}</span>
          </>
        ) : (
          <>
            <span className={styles.icon}>💭</span>
            <div className={styles.wrongContent}>
              <span className={styles.message}>The answer is {correctAnswer}</span>
              {equation && (
                <span className={styles.explanation}>
                  {equation.replace('[]', String(correctAnswer))}
                </span>
              )}
            </div>
          </>
        )}
      </div>
      <button
        className={`${styles.continueBtn} ${isCorrect ? styles.correctBtn : styles.wrongBtn}`}
        onClick={onContinue}
      >
        CONTINUE
      </button>
    </motion.div>
  );
}
