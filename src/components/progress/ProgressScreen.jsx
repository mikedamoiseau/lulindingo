import useGameStore from '../../stores/useGameStore';
import StreakCalendar from './StreakCalendar';
import UnitBadges from './UnitBadges';
import HeartDisplay from '../shared/HeartDisplay';
import styles from './ProgressScreen.module.css';

export default function ProgressScreen() {
  const user = useGameStore((s) => s.user);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Progress</h1>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>⚡ {user?.totalXp || 0}</span>
          <span className={styles.statLabel}>Total XP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>🔥 {user?.currentStreak || 0}</span>
          <span className={styles.statLabel}>Streak</span>
        </div>
        <div className={styles.statCard}>
          <HeartDisplay />
          <span className={styles.statLabel}>Hearts</span>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>This Week</h2>
      <StreakCalendar styles={styles} />

      <h2 className={styles.sectionTitle}>Units</h2>
      <UnitBadges styles={styles} />
    </div>
  );
}
