import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
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

  if (!units || !lessons || !progress) return null;

  const progressMap = {};
  progress.forEach((p) => {
    progressMap[p.lessonId] = p;
  });

  // Build unit data with progression state
  let foundIncomplete = false;
  const unitData = units.map((unit) => {
    const unitLessons = lessons
      .filter((l) => l.unitId === unit.id)
      .sort((a, b) => a.order - b.order);
    const allComplete =
      unitLessons.length > 0 && unitLessons.every((l) => progressMap[l.id]?.completed);
    const isCurrentUnit = !allComplete && !foundIncomplete;
    if (isCurrentUnit) foundIncomplete = true;
    return { unit, lessons: unitLessons, allComplete, isCurrentUnit };
  });

  const currentIndex = unitData.findIndex((u) => u.isCurrentUnit);

  // Determine lesson status within current unit
  function getLessonStatus(unitLessons, lessonIndex) {
    const lesson = unitLessons[lessonIndex];
    if (progressMap[lesson.id]?.completed) return 'completed';
    // First lesson or previous is completed
    if (lessonIndex === 0 || progressMap[unitLessons[lessonIndex - 1]?.id]?.completed) {
      // Only the first non-completed lesson is "current"
      const firstIncomplete = unitLessons.findIndex((l) => !progressMap[l.id]?.completed);
      return lessonIndex === firstIncomplete ? 'current' : 'locked';
    }
    return 'locked';
  }

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
                status={getLessonStatus(unitData[currentIndex].lessons, i)}
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
