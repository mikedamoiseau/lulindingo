import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import { isEstimationEligible } from '../../utils/estimationMode';
import styles from './LessonNode.module.css';

export default function LessonNode({ lesson, status, stars }) {
  const navigate = useNavigate();
  const hearts = useGameStore((s) => s.user?.hearts ?? 0);
  const ageBand = useGameStore((s) => s.user?.ageBand);
  const [showNoHearts, setShowNoHearts] = useState(false);
  const [showLocked, setShowLocked] = useState(false);

  // Estimation is an enrichment activity on completed, eligible upper-tier
  // lessons (tiers 4–5) for the 8-10 / 11-12 bands — see D2/D8.
  const canEstimate =
    status === 'completed' &&
    lesson.tier >= 4 &&
    isEstimationEligible(lesson.operation, ageBand);

  const handleClick = () => {
    if (status === 'locked') {
      setShowLocked(true);
      setTimeout(() => setShowLocked(false), 2000);
      return;
    }
    if (status === 'completed') {
      navigate(`/lesson/${lesson.id}`, { state: { isPractice: true } });
      return;
    }
    // Current lesson — check hearts
    if (hearts <= 0) {
      setShowNoHearts(true);
      setTimeout(() => setShowNoHearts(false), 2500);
      return;
    }
    navigate(`/lesson/${lesson.id}`);
  };

  return (
    <div className={styles.nodeWrapper}>
      <motion.button
        className={`${styles.node} ${styles[status]}`}
        onClick={handleClick}
        whileTap={status !== 'locked' ? { scale: 0.9 } : {}}
      >
        {status === 'locked' && <span className={styles.lock}>🔒</span>}
        <span className={styles.number}>{status !== 'locked' ? lesson.order : ''}</span>
        {status === 'completed' && (
          <div className={styles.stars}>{'⭐'.repeat(stars || 1)}</div>
        )}
        {status === 'current' && (
          <motion.div
            className={styles.pulse}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
      </motion.button>
      {canEstimate && (
        <button
          className={styles.estimateBtn}
          onClick={() =>
            navigate(`/lesson/${lesson.id}`, { state: { isEstimation: true } })
          }
        >
          Estimation Challenge ⚡
        </button>
      )}
      <AnimatePresence>
        {showLocked && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Finish the previous lesson first!
          </motion.div>
        )}
        {showNoHearts && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Out of hearts! Practice a lesson or wait for hearts to refill.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
