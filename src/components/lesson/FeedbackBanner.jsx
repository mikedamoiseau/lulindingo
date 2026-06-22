import { useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- `motion`/`AnimatePresence` are used in JSX; repo eslint lacks the react plugin to see it
import { motion, AnimatePresence } from 'framer-motion';
import { buildStrategy } from '../../utils/strategyBuilder';
import StrategyView from './StrategyView';
import styles from './FeedbackBanner.module.css';

const ENCOURAGEMENTS = ['Amazing!', 'Great job!', 'Perfect!', 'Brilliant!', 'Keep it up!'];
const randomEncouragement = () =>
  ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

export default function FeedbackBanner({
  isCorrect,
  correctAnswer,
  correctBucket,
  equation,
  operation,
  ageBand,
  onContinue,
  isRetry,
  isEstimation,
}) {
  // Hooks must run unconditionally — declare before the isRetry early return.
  const [revealed, setRevealed] = useState(false);
  const descriptor = useMemo(
    // Estimation rewards "close", not exact arithmetic — no worked strategy.
    () =>
      !isCorrect && !isRetry && !isEstimation
        ? buildStrategy(equation, operation, ageBand)
        : null,
    [isCorrect, isRetry, isEstimation, equation, operation, ageBand]
  );
  const canShow = descriptor && descriptor.kind !== 'none';

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
            <span className={styles.icon}>{isEstimation ? '🎯' : '✅'}</span>
            <span className={styles.message}>
              {isEstimation
                ? `Great estimate! The exact answer was ${correctAnswer}`
                : randomEncouragement()}
            </span>
          </>
        ) : isEstimation ? (
          <>
            <span className={styles.icon}>👍</span>
            <div className={styles.wrongContent}>
              <span className={styles.message}>
                So close! It was about {correctBucket} (exactly {correctAnswer})
              </span>
            </div>
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
              {canShow && !revealed && (
                <button className={styles.showMeBtn} onClick={() => setRevealed(true)}>
                  💡 Show me how
                </button>
              )}
              {canShow && revealed && (
                <AnimatePresence>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                  >
                    <StrategyView descriptor={descriptor} />
                  </motion.div>
                </AnimatePresence>
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
