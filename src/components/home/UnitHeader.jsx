import styles from './LearningPath.module.css';

export default function UnitHeader({ unit }) {
  return (
    <div className={styles.unitHeader}>
      <span className={styles.unitEmoji}>{unit.iconEmoji}</span>
      <div>
        <h2 className={styles.unitTitle}>{unit.title}</h2>
        <p className={styles.unitDesc}>{unit.description}</p>
      </div>
    </div>
  );
}
