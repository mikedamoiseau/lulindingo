import styles from './cards.module.css';

const ROWS = [
  { key: 'morning', label: 'Morning', icon: '🌅' },
  { key: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { key: 'evening', label: 'Evening', icon: '🌙' },
];

/** Three horizontal CSS bars showing when sessions happen. */
export default function TimeOfDayCard({ timeOfDay }) {
  const total = ROWS.reduce((s, r) => s + (timeOfDay[r.key] || 0), 0);

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>When they practice</h2>
      {total === 0 ? (
        <p className={styles.empty}>No sessions recorded yet.</p>
      ) : (
        <div className={styles.timeList}>
          {ROWS.map((r) => {
            const count = timeOfDay[r.key] || 0;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={r.key} className={styles.timeRow}>
                <span className={styles.timeLabel}>
                  <span aria-hidden="true">{r.icon}</span> {r.label}
                </span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct}%` }} />
                </div>
                <span className={styles.timeCount}>{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
