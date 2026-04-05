import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

export default function UnitBadges({ styles }) {
  const units = useLiveQuery(
    () => db.units.where('moduleId').equals('math').sortBy('order'),
    []
  );
  const lessons = useLiveQuery(() => db.lessons.toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);

  if (!units || !lessons || !progress) return null;

  const progressMap = {};
  progress.forEach((p) => {
    progressMap[p.lessonId] = p;
  });

  return (
    <div className={styles.badges}>
      {units.map((unit) => {
        const unitLessons = lessons.filter((l) => l.unitId === unit.id);
        const completed = unitLessons.filter((l) => progressMap[l.id]?.completed).length;
        const total = unitLessons.length;
        const allDone = completed === total && total > 0;
        const avgStars = allDone
          ? Math.round(
              unitLessons.reduce((sum, l) => sum + (progressMap[l.id]?.stars || 0), 0) / total
            )
          : 0;

        return (
          <div key={unit.id} className={`${styles.badge} ${allDone ? styles.badgeDone : ''}`}>
            <span className={styles.badgeEmoji}>{unit.iconEmoji}</span>
            <span className={styles.badgeTitle}>{unit.title}</span>
            <span className={styles.badgeProgress}>
              {allDone ? '⭐'.repeat(avgStars) : `${completed}/${total}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
