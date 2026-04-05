import styles from './NumberPad.module.css';

export default function NumberPad({ onDigit, onDelete }) {
  return (
    <div className={styles.pad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button key={d} className={styles.key} onClick={() => onDigit(String(d))}>
          {d}
        </button>
      ))}
      <div className={styles.bottomRow}>
        <button className={styles.key} onClick={() => onDigit('0')}>
          0
        </button>
        <button className={`${styles.key} ${styles.deleteKey}`} onClick={onDelete}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
