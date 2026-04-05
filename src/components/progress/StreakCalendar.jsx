import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { getLocalDateString } from '../../utils/streakTracker';

export default function StreakCalendar({ styles }) {
  const history = useLiveQuery(() => db.streakHistory.toArray(), []);
  const dates = new Set((history || []).map((h) => h.date));

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    days.push({
      date: dateStr,
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      active: dates.has(dateStr),
    });
  }

  return (
    <div className={styles.calendar}>
      {days.map((d) => (
        <div key={d.date} className={`${styles.calDay} ${d.active ? styles.calActive : ''}`}>
          <span className={styles.calDayName}>{d.day}</span>
          <div className={styles.calDot}>{d.active ? '🔥' : '○'}</div>
        </div>
      ))}
    </div>
  );
}
