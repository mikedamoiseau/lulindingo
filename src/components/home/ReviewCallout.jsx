import { useNavigate } from 'react-router-dom';
import styles from './ReviewCallout.module.css';

/**
 * Soft, optional Review card shown at the top of the learning path when the
 * child has facts due for spaced review. Both actions launch the reserved
 * `/lesson/review` route in practice mode (no hearts, no XP). When no facts are
 * due the card is hidden entirely — review is an invitation, never a chore.
 *
 * "Practice for you" is always offered (even at dueCount 0 the route falls back
 * to a normal generated set), so it renders whenever the card is visible.
 */
export default function ReviewCallout({ dueCount = 0 }) {
  const navigate = useNavigate();
  if (dueCount <= 0) return null;

  const go = () =>
    navigate('/lesson/review', { state: { isPractice: true, factReview: true } });

  return (
    <div className={styles.callout} data-testid="review-callout">
      <div className={styles.info}>
        <span className={styles.icon}>🔁</span>
        <div>
          <div className={styles.title}>Review</div>
          <div className={styles.subtitle} data-testid="review-count">
            {dueCount} {dueCount === 1 ? 'fact' : 'facts'} to review
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.reviewBtn} onClick={go} data-testid="review-start">
          Review
        </button>
        <button className={styles.practiceBtn} onClick={go} data-testid="practice-for-you">
          Practice for you
        </button>
      </div>
    </div>
  );
}
