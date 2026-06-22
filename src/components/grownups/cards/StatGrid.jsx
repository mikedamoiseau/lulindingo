import styles from './cards.module.css';

/** At-a-glance stat tiles: streak, total XP, lessons completed, average stars. */
export default function StatGrid({ metrics }) {
  const tiles = [
    { icon: '🔥', label: 'Day streak', value: metrics.currentStreak },
    { icon: '⚡', label: 'Total XP', value: metrics.totalXp },
    { icon: '✅', label: 'Lessons done', value: metrics.lessonsCompletedTotal },
    { icon: '⭐', label: 'Avg stars', value: metrics.averageStars },
  ];
  return (
    <div className={styles.statGrid}>
      {tiles.map((t) => (
        <div key={t.label} className={styles.statTile}>
          <span className={styles.statIcon} aria-hidden="true">{t.icon}</span>
          <span className={styles.statValue}>{t.value}</span>
          <span className={styles.statLabel}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
