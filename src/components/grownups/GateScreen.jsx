import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NumberPad from '../lesson/exercises/NumberPad';
import { makeGateChallenge } from '../../utils/insights';
import styles from './GateScreen.module.css';

/**
 * Multiply-to-enter gate. A single a×b problem (factors 6..9) stops a curious
 * pre-reader without a password UX; an adult solves it in seconds. No timer, no
 * lockout, unlimited attempts; a wrong answer shakes, clears, and regenerates a
 * fresh challenge so a kid can't memorize one answer.
 */
export default function GateScreen({ onUnlock }) {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(() => makeGateChallenge());
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(false);

  const handleDigit = (d) => {
    if (d === '.') return; // products are whole numbers
    if (value.length < 4) setValue(value + d);
  };

  const handleDelete = () => setValue(value.slice(0, -1));

  const handleCheck = () => {
    if (value === '') return;
    if (parseInt(value, 10) === challenge.answer) {
      onUnlock();
      return;
    }
    setValue('');
    setShake(true);
    setTimeout(() => setShake(false), 350);
    setChallenge(makeGateChallenge());
  };

  return (
    <div className={styles.screen}>
      <button className={styles.back} onClick={() => navigate('/')}>
        ← Back
      </button>
      <div className={`${styles.card} ${shake ? styles.shake : ''}`}>
        <h1 className={styles.heading}>Grown-ups only</h1>
        <p className={styles.subhead}>Solve to continue:</p>
        <div className={styles.equation}>
          {challenge.a} × {challenge.b} = <span className={styles.answerSlot}>{value || '?'}</span>
        </div>
        <button className={styles.checkButton} onClick={handleCheck} disabled={value === ''}>
          CHECK
        </button>
        <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
        <p className={styles.note}>A quick check, not a password — it just keeps little ones out.</p>
      </div>
    </div>
  );
}
