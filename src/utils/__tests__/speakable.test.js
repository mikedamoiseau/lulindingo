import { describe, it, expect } from 'vitest';
import { equationToSpeech, exerciseToSpeech, OPERATOR_WORDS } from '../speakable';

describe('OPERATOR_WORDS', () => {
  it('maps every operator symbol used by the generator', () => {
    expect(OPERATOR_WORDS['+']).toBe('plus');
    expect(OPERATOR_WORDS['-']).toBe('minus');
    expect(OPERATOR_WORDS['×']).toBe('times');
    expect(OPERATOR_WORDS['÷']).toBe('divided by');
    expect(OPERATOR_WORDS['=']).toBe('equals');
  });
});

describe('equationToSpeech', () => {
  it('speaks addition with the blank as "what"', () => {
    expect(equationToSpeech('7 + 4 = []')).toBe('7 plus 4 equals what');
  });

  it('speaks subtraction', () => {
    expect(equationToSpeech('9 - 3 = []')).toBe('9 minus 3 equals what');
  });

  it('speaks multiplication (× symbol)', () => {
    expect(equationToSpeech('6 × 7 = []')).toBe('6 times 7 equals what');
  });

  it('speaks division (÷ symbol)', () => {
    expect(equationToSpeech('12 ÷ 4 = []')).toBe('12 divided by 4 equals what');
  });

  it('leaves decimal numbers as digit strings', () => {
    expect(equationToSpeech('5 ÷ 2 = []')).toBe('5 divided by 2 equals what');
    expect(equationToSpeech('12.5 + 1 = []')).toBe('12.5 plus 1 equals what');
  });
});

describe('exerciseToSpeech', () => {
  it('type-answer: equation only', () => {
    const ex = { type: 'type-answer', equation: '7 + 4 = []', correctAnswer: 11 };
    expect(exerciseToSpeech(ex)).toBe('7 plus 4 equals what');
  });

  it('select-answer: equation then options joined with "or"', () => {
    const ex = {
      type: 'select-answer',
      equation: '7 + 4 = []',
      correctAnswer: 11,
      options: [11, 9, 12],
    };
    expect(exerciseToSpeech(ex)).toBe('7 plus 4 equals what. Options: 11, 9, or 12.');
  });

  it('follow-pattern: reads each row then options', () => {
    const ex = {
      type: 'follow-pattern',
      equation: '7 × 3 = []',
      correctAnswer: 21,
      options: [21, 18],
      pattern: [
        { expression: '7 × 1', result: 7 },
        { expression: '7 × 2', result: 14 },
        { expression: '7 × 3', result: null },
      ],
    };
    expect(exerciseToSpeech(ex)).toBe(
      '7 times 1 is 7. 7 times 2 is 14. 7 times 3 is what? Options: 21 or 18.'
    );
  });

  it('select-answer with two options uses "or" without comma', () => {
    const ex = {
      type: 'select-answer',
      equation: '2 + 2 = []',
      correctAnswer: 4,
      options: [4, 5],
    };
    expect(exerciseToSpeech(ex)).toBe('2 plus 2 equals what. Options: 4 or 5.');
  });

  it('returns empty string for null/unknown exercise', () => {
    expect(exerciseToSpeech(null)).toBe('');
    expect(exerciseToSpeech({ type: 'mystery', equation: '1 + 1 = []' })).toBe('1 plus 1 equals what');
  });
});
