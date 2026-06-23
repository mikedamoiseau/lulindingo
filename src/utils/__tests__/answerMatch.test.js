import { describe, it, expect } from 'vitest';
import { matchesAnswer, parseRemainder } from '../answerMatch';

describe('parseRemainder', () => {
  it('parses "3 r 2"', () => expect(parseRemainder('3 r 2')).toEqual({ q: 3, r: 2 }));
  it('parses tight "3r2"', () => expect(parseRemainder('3r2')).toEqual({ q: 3, r: 2 }));
  it('parses uppercase "3 R 2"', () => expect(parseRemainder('3 R 2')).toEqual({ q: 3, r: 2 }));
  it('returns null for plain number', () => expect(parseRemainder('7')).toBeNull());
  it('returns null for garbage', () => expect(parseRemainder('abc')).toBeNull());
});

describe('matchesAnswer', () => {
  it('numeric exercise matches by equality', () => {
    expect(matchesAnswer({ correctAnswer: 12 }, 12)).toBe(true);
    expect(matchesAnswer({ correctAnswer: 12 }, 13)).toBe(false);
  });

  it('numeric exercise accepts a numeric string', () => {
    expect(matchesAnswer({ correctAnswer: 12 }, '12')).toBe(true);
  });

  it('remainder exercise matches on quotient + remainder regardless of spacing/case', () => {
    const ex = { type: 'story-problem', isRemainder: true, quotient: 3, remainder: 2, correctAnswer: '3 r 2' };
    expect(matchesAnswer(ex, '3 r 2')).toBe(true);
    expect(matchesAnswer(ex, '3r2')).toBe(true);
    expect(matchesAnswer(ex, '3 R 2')).toBe(true);
    expect(matchesAnswer(ex, '3 r 3')).toBe(false);
    expect(matchesAnswer(ex, '3')).toBe(false);
  });
});
