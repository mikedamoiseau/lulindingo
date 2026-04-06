import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { generateExercises } from '../../utils/exerciseGenerator';
import { scorePlacement, DIFFICULTY_LADDER } from '../../utils/placementScoring';
import NumberPad from '../lesson/exercises/NumberPad';
import styles from './PlacementTest.module.css';

export default function PlacementTest({ onComplete }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(3);
  const [answers, setAnswers] = useState([]);
  const [value, setValue] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);

  const [currentExercise, setCurrentExercise] = useState(() => {
    const l = DIFFICULTY_LADDER[2]; // level 3 = Explorer addition
    return generateExercises(l.operation, l.ageBand, l.tier, 1)[0];
  });

  const handleDigit = (d) => {
    if (d === '.' && value.includes('.')) return;
    if (value.length < 10) setValue(value + d);
  };

  const handleDelete = () => setValue(value.slice(0, -1));

  const handleCheck = () => {
    if (value === '') return;
    const userAnswer = parseFloat(value);
    const correct = userAnswer === currentExercise.correctAnswer;

    const newAnswers = [...answers, { level: currentLevel, correct }];
    setAnswers(newAnswers);

    if (newAnswers.length >= 8) {
      const placement = scorePlacement(newAnswers);
      setResult(placement);
      setShowResult(true);
      return;
    }

    const nextLevel = correct
      ? Math.min(currentLevel + 1, 8)
      : Math.max(currentLevel - 1, 1);
    setCurrentLevel(nextLevel);

    const nextLadder = DIFFICULTY_LADDER[nextLevel - 1];
    setCurrentExercise(
      generateExercises(nextLadder.operation, nextLadder.ageBand, nextLadder.tier, 1)[0]
    );
    setValue('');
    setQuestionIndex(questionIndex + 1);
  };

  const handleFinish = () => {
    onComplete(result);
  };

  if (showResult) {
    const levelLabel = result.ageBand === '6-7' ? 'Starter' : result.ageBand === '8-10' ? 'Explorer' : 'Challenger';
    return (
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        <div className={styles.resultCard}>
          <span className={styles.resultEmoji}>🎯</span>
          <h2 className={styles.resultTitle}>Your level: {levelLabel}!</h2>
          <p className={styles.resultSub}>
            {answers.filter((a) => a.correct).length} of 8 correct
          </p>
          <button className={styles.startButton} onClick={handleFinish}>
            START LEARNING
          </button>
        </div>
      </motion.div>
    );
  }

  const parts = currentExercise.equation.split('[]');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.questionCount}>
          Question {questionIndex + 1} of 8
        </span>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${((questionIndex + 1) / 8) * 100}%` }}
          />
        </div>
      </div>
      <div className={styles.equationArea}>
        <p className={styles.instruction}>What is...</p>
        <div className={styles.equation}>
          <span>{parts[0]}</span>
          <span className={styles.blank}>{value || ''}</span>
          <span>{parts[1]}</span>
        </div>
      </div>
      <div className={styles.inputArea}>
        <div className={styles.inputField}>
          {value || <span className={styles.placeholder}>?</span>}
        </div>
        <button
          className={styles.checkButton}
          onClick={handleCheck}
          disabled={value === ''}
        >
          CHECK
        </button>
      </div>
      <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
    </div>
  );
}
