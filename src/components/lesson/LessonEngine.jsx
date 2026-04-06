import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
import { calculateXp, getLessonBonus } from '../../utils/xpCalculator';
import { getMaxExercises } from '../../utils/progression';
import { generateExercises } from '../../utils/exerciseGenerator';
import ProgressBar from './ProgressBar';
import FeedbackBanner from './FeedbackBanner';
import LessonSummary from './LessonSummary';
import XpFlyUp from '../shared/XpFlyUp';
import TypeTheAnswer from './exercises/TypeTheAnswer';
import SelectTheAnswer from './exercises/SelectTheAnswer';
import FollowThePattern from './exercises/FollowThePattern';
import styles from './LessonEngine.module.css';

export default function LessonEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const isPractice = state?.isPractice ?? false;

  const lesson = useLiveQuery(() => db.lessons.get(id), [id]);
  const user = useGameStore((s) => s.user);
  const ageBand = user?.ageBand || '8-10';

  const {
    lessonXp,
    lessonCorrect,
    addXp,
    addLessonXp,
    loseHeart,
    gainHeart,
    recordAnswer,
    resetLesson,
    completeLesson,
    updateStreak,
  } = useGameStore();

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [xpFlyUp, setXpFlyUp] = useState(null);
  const [retryUsed, setRetryUsed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const maxExercises = getMaxExercises(ageBand);
  const activeExercises = useMemo(
    () => lesson ? generateExercises(lesson.operation, ageBand, lesson.tier, maxExercises) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson?.id, ageBand]
  );
  const currentExercise = activeExercises[exerciseIndex];

  const handleAnswer = useCallback(
    (answer) => {
      if (!currentExercise) return;
      const isCorrect = answer === currentExercise.correctAnswer;

      if (isCorrect) {
        if (!isPractice) {
          const xp = calculateXp();
          addLessonXp(xp);
          addXp(xp);
          setXpFlyUp(Date.now());
        }
        recordAnswer(true);
        setFeedback({ isCorrect: true });
        setRetryUsed(false);
      } else {
        const canRetry = currentExercise.type === 'type-answer' && !retryUsed;
        if (canRetry) {
          setFeedback({ isRetry: true });
          setRetryUsed(true);
        } else {
          if (!isPractice) {
            loseHeart();
          }
          recordAnswer(false);
          setRetryUsed(false);
          setFeedback({
            isCorrect: false,
            correctAnswer: currentExercise.correctAnswer,
            equation: currentExercise.equation,
          });
        }
      }
    },
    [currentExercise, retryUsed, isPractice, addLessonXp, addXp, recordAnswer, loseHeart]
  );

  const handleContinue = useCallback(async () => {
    if (feedback?.isRetry) {
      setFeedback(null);
      return;
    }

    const nextIndex = exerciseIndex + 1;
    if (nextIndex >= activeExercises.length) {
      if (!isPractice) {
        const bonus = getLessonBonus();
        addLessonXp(bonus);
        addXp(bonus);
        await updateStreak();
        const accuracy =
          activeExercises.length > 0
            ? Math.round((lessonCorrect / activeExercises.length) * 100)
            : 0;
        await completeLesson(id, accuracy);
      } else {
        await gainHeart();
      }
      setFeedback(null);
      setShowSummary(true);
    } else {
      setFeedback(null);
      setExerciseIndex(nextIndex);
    }
  }, [
    feedback,
    exerciseIndex,
    activeExercises.length,
    lessonCorrect,
    id,
    isPractice,
    addLessonXp,
    addXp,
    updateStreak,
    completeLesson,
    gainHeart,
  ]);

  const handleClose = () => {
    resetLesson();
    navigate('/');
  };

  const handleFinish = () => {
    resetLesson();
    navigate('/');
  };

  if (!lesson) {
    return <div className={styles.loading}>Loading lesson...</div>;
  }

  if (showSummary) {
    const accuracy =
      activeExercises.length > 0
        ? Math.round((lessonCorrect / activeExercises.length) * 100)
        : 0;
    return (
      <div className={styles.container}>
        <LessonSummary
          xp={isPractice ? 0 : lessonXp}
          accuracy={accuracy}
          streak={user?.currentStreak || 0}
          onFinish={handleFinish}
        />
      </div>
    );
  }

  const exerciseComponent = (() => {
    if (!currentExercise) return null;
    const props = { exercise: currentExercise, onAnswer: handleAnswer };
    switch (currentExercise.type) {
      case 'type-answer':
        return <TypeTheAnswer key={exerciseIndex} {...props} />;
      case 'select-answer':
        return <SelectTheAnswer key={exerciseIndex} {...props} />;
      case 'follow-pattern':
        return <FollowThePattern key={exerciseIndex} {...props} />;
      default:
        return <div>Unknown exercise type: {currentExercise.type}</div>;
    }
  })();

  return (
    <div className={styles.container}>
      <ProgressBar
        current={exerciseIndex + (feedback?.isCorrect ? 1 : 0)}
        total={activeExercises.length}
        onClose={handleClose}
      />
      {isPractice && <div className={styles.practiceLabel}>Practice Mode</div>}
      <AnimatePresence mode="wait">
        <motion.div
          key={exerciseIndex}
          className={styles.exerciseArea}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {exerciseComponent}
        </motion.div>
      </AnimatePresence>
      {!isPractice && <XpFlyUp amount={10} trigger={xpFlyUp} />}
      <AnimatePresence>
        {feedback && (
          <FeedbackBanner
            isCorrect={feedback.isCorrect}
            isRetry={feedback.isRetry}
            correctAnswer={feedback.correctAnswer}
            equation={feedback.equation}
            onContinue={handleContinue}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
