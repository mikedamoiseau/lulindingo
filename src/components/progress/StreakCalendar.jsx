import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

export default function StreakCalendar({ styles }) {
  const history = useLiveQuery(() => db.streakHistory.toArray(), []);
  const dates = new Set((history || []).map((h) => h.date));

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
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
