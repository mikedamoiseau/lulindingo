import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
import { computeInsights, buildRecommendations } from '../../utils/insights';
import GateScreen from './GateScreen';
import StatGrid from './cards/StatGrid';
import NudgeList from './cards/NudgeList';
import XpTrendChart from './cards/XpTrendChart';
import MasteryList from './cards/MasteryList';
import TimeOfDayCard from './cards/TimeOfDayCard';
import styles from './GrownUpCorner.module.css';

export default function GrownUpCorner() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);

  const user = useGameStore((s) => s.user);
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const units = useLiveQuery(() => db.units.where('moduleId').equals('math').sortBy('order'), []);
  const lessons = useLiveQuery(() => db.lessons.toArray(), []);
  const streakHistory = useLiveQuery(() => db.streakHistory.toArray(), []);

  const ready =
    progress !== undefined && units !== undefined && lessons !== undefined && streakHistory !== undefined;

  const metrics = useMemo(
    () => (ready ? computeInsights({ user, progress, units, lessons, streakHistory }) : null),
    [ready, user, progress, units, lessons, streakHistory]
  );
  const recommendations = useMemo(
    () => (metrics ? buildRecommendations(metrics) : null),
    [metrics]
  );

  if (!unlocked) {
    return <GateScreen onUnlock={() => setUnlocked(true)} />;
  }

  const handleOpenSettings = () => {
    navigate('/');
    requestAnimationFrame(() => window.dispatchEvent(new Event('open-settings')));
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>
          ← Back to learning
        </button>
        <h1 className={styles.title}>Grown-Up Corner</h1>
        <p className={styles.privacy}>Everything here stays on this device.</p>
      </header>

      {!ready ? (
        <p className={styles.loading}>Loading…</p>
      ) : (
        <div className={styles.content}>
          <StatGrid metrics={metrics} />
          <NudgeList recommendations={recommendations} onOpenSettings={handleOpenSettings} />
          <XpTrendChart trend={metrics.xpTrend} />
          <MasteryList operations={metrics.operations} />
          <TimeOfDayCard timeOfDay={metrics.timeOfDay} />
        </div>
      )}
    </div>
  );
}
