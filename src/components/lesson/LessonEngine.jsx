import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
import { calculateXp, getLessonBonus } from '../../utils/xpCalculator';
import { getMaxExercises } from '../../utils/progression';
import { generateExercises } from '../../utils/exerciseGenerator';
import { generateWeakFactExercises } from '../../utils/factGenerator';
import { selectWeakFactTargets } from '../../utils/factTracking';
import { buildEstimationExercise, isWithinTolerance } from '../../utils/estimation';
import { useSpeech } from '../../hooks/useSpeech';
import { exerciseToSpeech } from '../../utils/speakable';
import ProgressBar from './ProgressBar';
import FeedbackBanner from './FeedbackBanner';
import LessonSummary from './LessonSummary';
import XpFlyUp from '../shared/XpFlyUp';
import TypeTheAnswer from './exercises/TypeTheAnswer';
import SelectTheAnswer from './exercises/SelectTheAnswer';
import FollowThePattern from './exercises/FollowThePattern';
import EstimationChallenge from './exercises/EstimationChallenge';
import StoryProblem from './exercises/StoryProblem';
import MissingNumber from './exercises/MissingNumber';
import BuildEquation from './exercises/BuildEquation';
import { matchesAnswer } from '../../utils/answerMatch';
import styles from './LessonEngine.module.css';

export default function LessonEngine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  // The reserved 'review' id builds a fact-targeted set instead of a seeded
  // lesson. It always runs in practice mode (no hearts, no XP, no completion).
  const isReview = id === 'review';
  const isPractice = (state?.isPractice ?? false) || isReview;
  const isEstimation = state?.isEstimation ?? false;

  const lesson = useLiveQuery(() => (isReview ? undefined : db.lessons.get(id)), [id]);
  const facts = useLiveQuery(() => (isReview ? db.facts.toArray() : []), [id]);
  const progress = useLiveQuery(() => (isReview ? db.progress.toArray() : []), [id]);
  const user = useGameStore((s) => s.user);
  const ageBand = user?.ageBand || '8-10';
  const readAloud = user?.readAloud ?? false;
  const speechRate = user?.speechRate ?? 1.0;
  const { speak } = useSpeech({ rate: speechRate });

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
  const activeExercises = useMemo(() => {
    if (isReview) {
      const factList = facts ?? [];
      const progressList = progress ?? [];
      const startingTier = user?.startingTier ?? 1;

      // Current tier in an operation = how many of its 5 lessons are completed,
      // clamped to 1–5 (fallback to startingTier, then 1).
      const tierFor = (operation) => {
        const completed = progressList.filter(
          (p) => p.completed && p.lessonId.startsWith(`math-${operation}-`)
        ).length;
        return Math.min(5, Math.max(1, completed || startingTier || 1));
      };

      // Operations the child has actually started (any completed lesson) —
      // avoids surfacing division facts to a kid who's only done addition.
      const ALL_OPS = ['addition', 'subtraction', 'multiplication', 'division'];
      let activeOps = ALL_OPS.filter((op) =>
        progressList.some((p) => p.completed && p.lessonId.startsWith(`math-${op}-`))
      );

      // Prefer ops that actually have weak facts to review.
      const opsWithWeak = activeOps.filter(
        (op) => selectWeakFactTargets(factList, { operation: op, max: 1 }).length > 0
      );
      const reviewOps = (opsWithWeak.length ? opsWithWeak : activeOps);

      // Empty vault / brand-new child: fall back to a normal generated set for
      // the first started operation (or addition).
      if (reviewOps.length === 0) {
        const op = activeOps[0] || 'addition';
        return generateExercises(op, ageBand, tierFor(op), maxExercises);
      }

      // Spread `maxExercises` across the review ops, biasing each toward its
      // own weak facts, then trim to maxExercises.
      const perOp = Math.max(1, Math.ceil(maxExercises / reviewOps.length));
      const set = [];
      for (const op of reviewOps) {
        set.push(
          ...generateWeakFactExercises({
            facts: factList,
            operation: op,
            ageBand,
            tier: tierFor(op),
            count: perOp,
          })
        );
      }
      return set.slice(0, maxExercises);
    }
    if (!lesson) return [];
    if (isEstimation) {
      const tier = lesson.tier >= 4 ? lesson.tier : 5; // upper tiers only (D2)
      // forwardOnly: estimation needs "a op b = result" exercises; the puzzle
      // types (missing-number/build-equation) have no result to estimate.
      const base = generateExercises(lesson.operation, ageBand, tier, maxExercises, { forwardOnly: true });
      // Alternate bucket / typed variants, starting with bucket (D5).
      return base.map((ex, i) => buildEstimationExercise(ex, i % 2 === 0 ? 'bucket' : 'type'));
    }
    return generateExercises(lesson.operation, ageBand, lesson.tier, maxExercises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, ageBand, isEstimation, isReview, facts, progress]);
  const currentExercise = activeExercises[exerciseIndex];

  useEffect(() => {
    if (readAloud && currentExercise && !showSummary) {
      speak(exerciseToSpeech(currentExercise));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseIndex, currentExercise?.equation, readAloud, showSummary]);

  const handleAnswer = useCallback(
    (answer) => {
      if (!currentExercise) return;

      const isCorrect = currentExercise.estimation
        ? currentExercise.estimationMode === 'bucket'
          ? answer.value === currentExercise.correctBucket
          : isWithinTolerance(answer.value, currentExercise.correctAnswer)
        : matchesAnswer(currentExercise, answer);

      if (isCorrect) {
        if (!isPractice) {
          const xp = calculateXp();
          addLessonXp(xp);
          setXpFlyUp(Date.now());
        }
        recordAnswer(true, currentExercise.operation || lesson?.operation, isPractice, currentExercise);
        setFeedback({
          isCorrect: true,
          isEstimation,
          correctAnswer: currentExercise.correctAnswer,
        });
        setRetryUsed(false);
      } else {
        // Estimation gives no retry — "close" is already the reward (D6).
        // Typed-numeric answers (incl. missing-number) get one retry for the
        // "oops typo" case; selection-based types (select/follow/build) do not.
        const RETRYABLE = new Set(['type-answer', 'story-problem', 'missing-number']);
        const canRetry =
          !currentExercise.estimation && RETRYABLE.has(currentExercise.type) && !retryUsed;
        if (canRetry) {
          setFeedback({ isRetry: true });
          setRetryUsed(true);
        } else {
          // Estimation is enrichment and never costs hearts (D6).
          if (!isPractice && !isEstimation) {
            loseHeart();
          }
          recordAnswer(false, currentExercise.operation || lesson?.operation, isPractice, currentExercise);
          setRetryUsed(false);
          // build-equation has no "a op b = []" string; reconstruct a friendly
          // worked equation for the banner from its canonical solution.
          const feedbackEquation =
            currentExercise.type === 'build-equation'
              ? `${currentExercise.solution[0]} ${currentExercise.operator} ${currentExercise.solution[1]} = []`
              : currentExercise.equation;
          setFeedback({
            isCorrect: false,
            isEstimation,
            correctAnswer: currentExercise.correctAnswer,
            correctBucket: currentExercise.correctBucket,
            equation: feedbackEquation,
          });
        }
      }
    },
    [currentExercise, retryUsed, isPractice, isEstimation, addLessonXp, recordAnswer, loseHeart, lesson?.operation]
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
        await addXp(lessonXp + bonus);
        await updateStreak();
        const accuracy =
          activeExercises.length > 0
            ? Math.round((lessonCorrect / activeExercises.length) * 100)
            : 0;
        await completeLesson(id, accuracy, isPractice);
      } else if (!isReview) {
        // Lesson-replay practice earns a heart (by design); spaced Review is
        // pure enrichment — no hearts, no XP — and is always available, so
        // awarding a heart here would let it be farmed.
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
    lessonXp,
    id,
    isPractice,
    isReview,
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

  if (isReview) {
    // Wait until the live facts/progress queries have resolved.
    if (facts === undefined || progress === undefined) {
      return <div className={styles.loading}>Loading review...</div>;
    }
  } else if (!lesson) {
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
    const props = { exercise: currentExercise, onAnswer: handleAnswer, speechRate, readAloud };
    if (currentExercise.estimation) {
      return <EstimationChallenge key={exerciseIndex} {...props} />;
    }
    switch (currentExercise.type) {
      case 'type-answer':
        return <TypeTheAnswer key={exerciseIndex} {...props} />;
      case 'select-answer':
        return <SelectTheAnswer key={exerciseIndex} {...props} />;
      case 'follow-pattern':
        return <FollowThePattern key={exerciseIndex} {...props} />;
      case 'story-problem':
        return <StoryProblem key={exerciseIndex} {...props} />;
      case 'missing-number':
        return <MissingNumber key={exerciseIndex} {...props} />;
      case 'build-equation':
        return <BuildEquation key={exerciseIndex} {...props} />;
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
      {isReview && <div className={styles.practiceLabel}>Review</div>}
      {isPractice && !isReview && <div className={styles.practiceLabel}>Practice Mode</div>}
      {isEstimation && <div className={styles.practiceLabel}>Estimation Challenge</div>}
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
            isEstimation={feedback.isEstimation}
            correctAnswer={feedback.correctAnswer}
            correctBucket={feedback.correctBucket}
            equation={feedback.equation}
            operation={currentExercise?.operation || lesson?.operation}
            ageBand={ageBand}
            onContinue={handleContinue}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
