import styles from './cards.module.css';

const OP_EMOJI = {
  addition: '➕',
  subtraction: '➖',
  multiplication: '✖️',
  division: '➗',
};

/** Stars + tier progress per operation. Dims operations not yet attempted. */
export default function MasteryList({ operations }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Mastery</h2>
      <div className={styles.masteryList}>
        {operations.map((op) => {
          const pct = Math.round((op.tiersCompleted / op.totalTiers) * 100);
          const stars = Math.round(op.avgStars);
          const dim = op.tiersCompleted === 0;
          return (
            <div key={op.operation} className={`${styles.masteryRow} ${dim ? styles.dim : ''}`}>
              <div className={styles.masteryHead}>
                <span>
                  <span aria-hidden="true">{OP_EMOJI[op.operation] || '🔢'}</span> {op.title}
                </span>
                <span className={styles.masteryMeta}>
                  {op.tiersCompleted}/{op.totalTiers}
                  {!dim && <span className={styles.stars}> {'★'.repeat(stars) || '—'}</span>}
                </span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
