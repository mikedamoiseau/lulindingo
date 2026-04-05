export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

export function calculateStreak(lastActiveDate, currentStreak) {
  if (!lastActiveDate) return 0;
  const today = getLocalDateString();
  if (lastActiveDate === today) return currentStreak;
  if (lastActiveDate === getYesterdayString()) return currentStreak;
  return 0;
}

export function isStreakMilestone(streak) {
  return [7, 30, 100].includes(streak);
}
