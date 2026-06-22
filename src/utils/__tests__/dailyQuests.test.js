import { describe, it, expect } from 'vitest';
import {
  dateSeed,
  QUEST_CATALOG,
  selectDailyQuests,
  evaluateQuest,
  allQuestsDone,
  questLabel,
} from '../dailyQuests';

describe('dateSeed', () => {
  it('is deterministic for the same date string', () => {
    expect(dateSeed('2026-06-22')).toBe(dateSeed('2026-06-22'));
  });
  it('differs across dates', () => {
    expect(dateSeed('2026-06-22')).not.toBe(dateSeed('2026-06-23'));
  });
  it('returns an unsigned 32-bit integer', () => {
    const s = dateSeed('2026-06-22');
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('selectDailyQuests', () => {
  it('returns exactly 3 quests', () => {
    expect(selectDailyQuests('2026-06-22', '8-10')).toHaveLength(3);
  });
  it('is deterministic for the same date + band', () => {
    const a = selectDailyQuests('2026-06-22', '8-10').map((q) => q.id);
    const b = selectDailyQuests('2026-06-22', '8-10').map((q) => q.id);
    expect(a).toEqual(b);
  });
  it('picks distinct quest ids', () => {
    const ids = selectDailyQuests('2026-06-22', '8-10').map((q) => q.id);
    expect(new Set(ids).size).toBe(3);
  });
  it('prefers distinct quest types when possible', () => {
    const types = selectDailyQuests('2026-06-22', '8-10').map((q) => q.type);
    expect(new Set(types).size).toBeGreaterThanOrEqual(2);
  });
  it('never gives the 11-12 band an addition-only quest', () => {
    // sweep several dates; addition is fully skipped for this band
    for (let d = 1; d <= 28; d++) {
      const date = `2026-06-${String(d).padStart(2, '0')}`;
      const ops = selectDailyQuests(date, '11-12').map((q) => q.operation);
      expect(ops).not.toContain('addition');
      expect(ops).not.toContain('subtraction');
    }
  });
});

describe('evaluateQuest', () => {
  const base = {
    answerCount: 0,
    answerByOperation: { addition: 0, subtraction: 0, multiplication: 0, division: 0 },
    bestStreakInSession: 0,
    lessonCount: 0,
    bestLessonStars: 0,
  };

  it('answerCount quest clamps progress at target and flags done', () => {
    const q = QUEST_CATALOG.find((x) => x.id === 'answer-10-any');
    expect(evaluateQuest(q, { ...base, answerCount: 4 })).toEqual({ progress: 4, target: 10, done: false });
    expect(evaluateQuest(q, { ...base, answerCount: 12 })).toEqual({ progress: 10, target: 10, done: true });
  });

  it('per-operation quest reads answerByOperation', () => {
    const q = QUEST_CATALOG.find((x) => x.id === 'answer-10-mul');
    const stats = { ...base, answerByOperation: { ...base.answerByOperation, multiplication: 10 } };
    expect(evaluateQuest(q, stats).done).toBe(true);
  });

  it('streak quest reads bestStreakInSession', () => {
    const q = QUEST_CATALOG.find((x) => x.id === 'streak-5');
    expect(evaluateQuest(q, { ...base, bestStreakInSession: 5 }).done).toBe(true);
    expect(evaluateQuest(q, { ...base, bestStreakInSession: 4 }).done).toBe(false);
  });

  it('stars quest reads bestLessonStars', () => {
    const q = QUEST_CATALOG.find((x) => x.id === 'stars-3');
    expect(evaluateQuest(q, { ...base, bestLessonStars: 3 }).done).toBe(true);
  });
});

describe('allQuestsDone', () => {
  it('true only when every selected quest is done', () => {
    const quests = selectDailyQuests('2026-06-22', '8-10');
    const fakeAll = {
      answerCount: 999,
      answerByOperation: { addition: 999, subtraction: 999, multiplication: 999, division: 999 },
      bestStreakInSession: 999, lessonCount: 999, bestLessonStars: 3,
    };
    expect(allQuestsDone(quests, fakeAll)).toBe(true);
  });
  it('false when one quest is incomplete', () => {
    const quests = selectDailyQuests('2026-06-22', '8-10');
    const none = {
      answerCount: 0,
      answerByOperation: { addition: 0, subtraction: 0, multiplication: 0, division: 0 },
      bestStreakInSession: 0, lessonCount: 0, bestLessonStars: 0,
    };
    expect(allQuestsDone(quests, none)).toBe(false);
  });
});

describe('questLabel', () => {
  it('produces a kid-readable string containing the target', () => {
    const q = QUEST_CATALOG.find((x) => x.id === 'answer-10-mul');
    expect(questLabel(q)).toMatch(/10/);
  });
});
