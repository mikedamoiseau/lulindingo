import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Skip exit animations so the next exercise mounts immediately.
vi.mock('framer-motion', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, AnimatePresence: ({ children }) => children };
});

// Spy on the generator (real implementation by default) so tests can pin the
// exercise set and see which operations a run asks for.
vi.mock('../../../utils/exerciseGenerator', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, generateExercises: vi.fn(real.generateExercises) };
});

import { generateExercises } from '../../../utils/exerciseGenerator';
import LessonEngine from '../LessonEngine';
import useGameStore from '../../../stores/useGameStore';
import { db } from '../../../db/database';
import { seedDatabase } from '../../../db/seed';
import { setActiveUserId } from '../../../db/profileMeta';

const fixedSet = (op = 'addition') => (_op, _band, _tier, count) =>
  Array.from({ length: count }, () => ({
    type: 'type-answer',
    equation: '2 + 3 = []',
    correctAnswer: 5,
    operation: op,
  }));

let counter = 0;
const freshSet = (op, _band, _tier, count) =>
  Array.from({ length: count }, () => {
    counter++;
    return { type: 'type-answer', equation: `${counter} + 1 = []`, correctAnswer: counter + 1, operation: op };
  });

async function setup(ageBand = '6-7') {
  for (const t of ['users', 'progress', 'streakHistory', 'units', 'lessons', 'dailyQuests', 'facts', 'meta']) {
    await db[t].clear();
  }
  await seedDatabase();
  const id = await db.users.add({
    name: 'Kid',
    totalXp: 0,
    hearts: 10,
    heartsLastRefill: new Date(),
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    ageBand,
    startingTier: 1,
  });
  await setActiveUserId(id);
  useGameStore.setState({
    user: await db.users.get(id),
    lessonXp: 0,
    lessonCorrect: 0,
    lessonTotal: 0,
    _currentRunCorrect: 0,
  });
  return id;
}

function renderAt(path, state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/lesson/:id" element={<LessonEngine />} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function typeAndCheck(digits) {
  for (const d of digits) fireEvent.click(screen.getByRole('button', { name: d }));
  fireEvent.click(screen.getByRole('button', { name: 'CHECK' }));
}

const dueFact = (op, a, b, sym) => ({
  sig: `${a}${sym}${b}`,
  operation: op,
  a,
  b,
  box: 0,
  seen: 1,
  correct: 0,
  dueAt: '2000-01-01',
  lastSeen: '2000-01-01',
});

beforeEach(() => {
  generateExercises.mockClear();
});
afterEach(() => cleanup());

describe('LessonEngine — answering', () => {
  it('ignores CHECK once an answer has been graded (no double XP / correct count)', async () => {
    generateExercises.mockImplementation(fixedSet());
    await setup();
    renderAt('/lesson/math-addition-lesson-1');
    await screen.findByText('CHECK');
    typeAndCheck(['5']);
    await screen.findByText('CONTINUE');
    fireEvent.click(screen.getByRole('button', { name: 'CHECK' })); // banner is up
    expect(useGameStore.getState().lessonCorrect).toBe(1);
    expect(useGameStore.getState().lessonXp).toBe(10);
  });

  it('starts every lesson with fresh counters (leaving via browser back used to carry them over)', async () => {
    generateExercises.mockImplementation(fixedSet());
    await setup();
    useGameStore.setState({ lessonXp: 30, lessonCorrect: 3, lessonTotal: 3, _currentRunCorrect: 3 });
    renderAt('/lesson/math-addition-lesson-1');
    await screen.findByText('CHECK');
    const s = useGameStore.getState();
    expect([s.lessonXp, s.lessonCorrect, s.lessonTotal, s._currentRunCorrect]).toEqual([0, 0, 0, 0]);
  });
});

describe('LessonEngine — review', () => {
  it('keeps the same exercise set when an answer writes to the fact vault', async () => {
    generateExercises.mockImplementation(freshSet);
    const id = await setup('8-10');
    await db.progress.put({ userId: id, lessonId: 'math-addition-lesson-1', completed: true, stars: 3, bestAccuracy: 100, attempts: 1 });
    await db.facts.put({ userId: id, ...dueFact('addition', 3, 4, '+') });
    renderAt('/lesson/review', { isPractice: true });
    await screen.findByText('CHECK');
    await act(() => new Promise((r) => setTimeout(r, 50)));
    const callsBefore = generateExercises.mock.calls.length;
    const equationBefore = document.querySelector('[class*=equation]')?.textContent;

    await act(async () => {
      await useGameStore.getState().recordFactOutcome({ sig: '9+9', operation: 'addition', a: 9, b: 9 }, false);
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(generateExercises.mock.calls.length).toBe(callsBefore);
    expect(document.querySelector('[class*=equation]')?.textContent).toBe(equationBefore);
  });

  it('reviews the operation with due facts, not units auto-completed by the age band', async () => {
    generateExercises.mockImplementation(fixedSet('multiplication'));
    const id = await setup('11-12');
    // 11-12 skips addition + subtraction: auto-completed rows with attempts 0.
    for (const op of ['addition', 'subtraction']) {
      for (let t = 1; t <= 5; t++) {
        await db.progress.put({ userId: id, lessonId: `math-${op}-lesson-${t}`, completed: true, stars: 3, bestAccuracy: 100, attempts: 0 });
      }
    }
    await db.facts.put({ userId: id, ...dueFact('multiplication', 7, 8, 'x') });
    renderAt('/lesson/review', { isPractice: true });
    await screen.findByText('CHECK');
    const ops = new Set(generateExercises.mock.calls.map((c) => c[0]));
    expect([...ops]).toEqual(['multiplication']);
  });
});
