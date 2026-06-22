import styles from './cards.module.css';

/** Plain-language nudges + one highlighted "practice together" suggestion. */
export default function NudgeList({ recommendations, onOpenSettings }) {
  const { nudges = [], practiceTogether } = recommendations || {};

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>What to notice</h2>

      <div className={styles.nudgeList}>
        {nudges.map((text, i) => {
          const mentionsSettings = /settings/i.test(text);
          return (
            <div key={i} className={styles.nudge}>
              <p>{text}</p>
              {mentionsSettings && onOpenSettings && (
                <button className={styles.linkButton} onClick={onOpenSettings}>
                  Open Settings
                </button>
              )}
            </div>
          );
        })}
      </div>

      {practiceTogether && (
        <div className={styles.practice}>
          <span className={styles.practiceTag}>Try this together</span>
          <h3 className={styles.practiceTitle}>{practiceTogether.title}</h3>
          <p>{practiceTogether.body}</p>
        </div>
      )}
    </section>
  );
}
