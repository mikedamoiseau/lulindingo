import styles from './cards.module.css';

const BAR_W = 22;
const GAP = 10;
const CHART_H = 120;
const LABEL_H = 22;

/** Short "MM/DD" label from a "YYYY-MM-DD" date string. */
function shortDate(date) {
  const parts = String(date).split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
}

/** Inline-SVG bar chart of daily XP. No chart library (app is offline). */
export default function XpTrendChart({ trend }) {
  if (!trend || trend.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>XP this week</h2>
        <p className={styles.empty}>No activity yet — complete a lesson to see the trend.</p>
      </section>
    );
  }

  const max = Math.max(...trend.map((d) => d.xp), 1);
  const width = trend.length * (BAR_W + GAP) + GAP;
  const height = CHART_H + LABEL_H;

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>XP this week</h2>
      <div className={styles.scrollX}>
        <svg width={width} height={height} role="img" aria-label="Daily XP bar chart">
          {trend.map((d, i) => {
            const h = Math.round((d.xp / max) * CHART_H);
            const x = GAP + i * (BAR_W + GAP);
            const y = CHART_H - h;
            return (
              <g key={d.date}>
                <rect x={x} y={y} width={BAR_W} height={Math.max(h, 2)} rx="4" fill="var(--blue)" />
                <text
                  x={x + BAR_W / 2}
                  y={CHART_H + LABEL_H - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-secondary)"
                >
                  {shortDate(d.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
