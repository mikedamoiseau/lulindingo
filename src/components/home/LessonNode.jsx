import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './LessonNode.module.css';

export default function LessonNode({ lesson, status, stars }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (status === 'locked') return;
    if (status === 'completed') {
      navigate(`/lesson/${lesson.id}`, { state: { isPractice: true } });
    } else {
      navigate(`/lesson/${lesson.id}`);
    }
  };

  return (
    <motion.button
      className={`${styles.node} ${styles[status]}`}
      onClick={handleClick}
      whileTap={status !== 'locked' ? { scale: 0.9 } : {}}
      disabled={status === 'locked'}
    >
      <span className={styles.number}>{lesson.order}</span>
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
  );
}
