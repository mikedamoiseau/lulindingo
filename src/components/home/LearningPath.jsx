import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
import { getUnitStates, getLessonStatus } from '../../utils/progression';
import UnitHeader from './UnitHeader';
import LessonNode from './LessonNode';
import HeartDisplay from '../shared/HeartDisplay';
import Mascot from '../shared/Mascot';
import styles from './LearningPath.module.css';

export default function LearningPath() {
  const user = useGameStore((s) => s.user);
  const units = useLiveQuery(
    () => db.units.where('moduleId').equals('math').sortBy('order'),
    []
  );
  const lessons = useLiveQuery(() => db.lessons.orderBy('order').toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);

  if (!units || !lessons || !progress) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const progressMap = {};
  progress.forEach((p) => {
    progressMap[p.lessonId] = p;
  });

  const unitData = getUnitStates(units, lessons, progressMap);
  const currentIndex = unitData.findIndex((u) => u.isCurrentUnit);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Mascot expression="happy" size={48} />
          <div>
            <h1 className={styles.greeting}>Hi {user?.name}!</h1>
            <div className={styles.streakBadge}>
              🔥 {user?.currentStreak || 0} day streak
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <HeartDisplay />
          <button
            className={styles.gearBtn}
            onClick={() => window.dispatchEvent(new Event('open-settings'))}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Completed units — collapsed badges */}
      {unitData.slice(0, Math.max(0, currentIndex)).map(({ unit }) => (
        <div key={unit.id} className={styles.completedBadge}>
          <span>{unit.iconEmoji}</span>
          <span className={styles.completedText}>{unit.title}</span>
          <span>✅</span>
        </div>
      ))}

      {/* Current unit — expanded */}
      {currentIndex >= 0 && (
        <div>
          <UnitHeader unit={unitData[currentIndex].unit} />
          <div className={styles.nodeTrail}>
            {unitData[currentIndex].lessons.map((lesson, i) => (
              <LessonNode
                key={lesson.id}
                lesson={lesson}
                status={getLessonStatus(unitData[currentIndex].lessons, i, progressMap)}
                stars={progressMap[lesson.id]?.stars}
              />
            ))}
          </div>
        </div>
      )}

      {/* Next unit preview */}
      {currentIndex >= 0 && currentIndex + 1 < unitData.length && (
        <div className={styles.nextPreview}>
          <span className={styles.nextLabel}>Up next</span>
          <span>
            {unitData[currentIndex + 1].unit.iconEmoji}{' '}
            {unitData[currentIndex + 1].unit.title}
          </span>
        </div>
      )}

      {/* All complete state */}
      {currentIndex === -1 && unitData.length > 0 && unitData.every((u) => u.allComplete) && (
        <div className={styles.allDone}>
          <Mascot expression="celebrating" size={100} />
          <h2 className={styles.allDoneTitle}>All lessons complete!</h2>
          <p className={styles.allDoneText}>
            Tap any completed lesson above to practice.
          </p>
          {/* Show all units expanded for practice */}
          {unitData.map(({ unit, lessons: unitLessons }) => (
            <div key={unit.id}>
              <UnitHeader unit={unit} />
              <div className={styles.nodeTrail}>
                {unitLessons.map((lesson) => (
                  <LessonNode
                    key={lesson.id}
                    lesson={lesson}
                    status="completed"
                    stars={progressMap[lesson.id]?.stars}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
