import { describe, it, expect } from 'vitest';
import { parseOperands, buildStrategy } from '../strategyBuilder';

describe('parseOperands', () => {
  it('parses addition', () => {
    expect(parseOperands('5 + 3 = []')).toEqual({ a: 5, operator: '+', b: 3 });
  });
  it('parses subtraction', () => {
    expect(parseOperands('12 - 4 = []')).toEqual({ a: 12, operator: '-', b: 4 });
  });
  it('parses multiplication with × glyph', () => {
    expect(parseOperands('6 × 7 = []')).toEqual({ a: 6, operator: '×', b: 7 });
  });
  it('parses division with ÷ glyph', () => {
    expect(parseOperands('20 ÷ 4 = []')).toEqual({ a: 20, operator: '÷', b: 4 });
  });
  it('parses decimals', () => {
    expect(parseOperands('7.5 ÷ 2 = []')).toEqual({ a: 7.5, operator: '÷', b: 2 });
  });
  it('returns null for unparseable input', () => {
    expect(parseOperands('what is x = []')).toBeNull();
    expect(parseOperands(undefined)).toBeNull();
  });
});

describe('buildStrategy — addition (count-up)', () => {
  it('builds count-up for small addition', () => {
    const s = buildStrategy('5 + 3 = []', 'addition', '6-7');
    expect(s).toEqual({ kind: 'count-up', from: 5, addBy: 3, total: 8 });
  });
  it('counts up from the LARGER operand (count-on strategy)', () => {
    const s = buildStrategy('2 + 9 = []', 'addition', '6-7');
    expect(s).toEqual({ kind: 'count-up', from: 9, addBy: 2, total: 11 });
  });
  it('falls back to none when total is too big to draw', () => {
    expect(buildStrategy('40 + 30 = []', 'addition', '8-10').kind).toBe('none');
  });
});

describe('buildStrategy — subtraction (number-line)', () => {
  it('builds a backward jump', () => {
    const s = buildStrategy('12 - 4 = []', 'subtraction', '6-7');
    expect(s).toEqual({ kind: 'number-line', start: 12, jumpBack: 4, end: 8 });
  });
  it('falls back to none for a large minuend', () => {
    expect(buildStrategy('250 - 30 = []', 'subtraction', '8-10').kind).toBe('none');
  });
});

describe('buildStrategy — multiplication (skip-count)', () => {
  it('builds a skip-count chain', () => {
    const s = buildStrategy('5 × 4 = []', 'multiplication', '8-10');
    expect(s.kind).toBe('skip-count');
    expect(s.product).toBe(20);
    // skip-counts by the SMALLER factor, repeated the LARGER number of times
    expect(s.step).toBe(4);
    expect(s.times).toBe(5);
    expect(s.chain).toEqual([4, 8, 12, 16, 20]);
  });
  it('falls back to none when factors are large', () => {
    expect(buildStrategy('40 × 30 = []', 'multiplication', '11-12').kind).toBe('none');
  });
});

describe('buildStrategy — division (equal-groups)', () => {
  it('builds equal groups for a clean division', () => {
    const s = buildStrategy('20 ÷ 4 = []', 'division', '8-10');
    expect(s).toEqual({ kind: 'equal-groups', total: 20, groups: 4, perGroup: 5 });
  });
  it('falls back to none for a decimal (Challenger) result', () => {
    expect(buildStrategy('7 ÷ 2 = []', 'division', '11-12').kind).toBe('none');
  });
  it('falls back to none when the dividend is too large to draw as dots', () => {
    expect(buildStrategy('144 ÷ 12 = []', 'division', '8-10').kind).toBe('none');
  });
});

describe('buildStrategy — guards', () => {
  it('returns none for unparseable equation', () => {
    expect(buildStrategy('???', 'addition', '6-7').kind).toBe('none');
  });
  it('returns none for any decimal operand', () => {
    expect(buildStrategy('5.5 + 3 = []', 'addition', '6-7').kind).toBe('none');
  });
  it('descriptor is always a plain serializable object', () => {
    const s = buildStrategy('5 + 3 = []', 'addition', '6-7');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
  it('returns none for zero-start subtraction (no number line to draw)', () => {
    const s = buildStrategy('0 - 0 = []', 'subtraction', '6-7');
    expect(s.kind).toBe('none');
    expect(s.reason).toBe('zero-start');
  });
  it('returns none when operation disagrees with the equation glyph', () => {
    // operation says addition but the equation is a subtraction
    const s = buildStrategy('5 - 3 = []', 'addition', '6-7');
    expect(s.kind).toBe('none');
    expect(s.reason).toBe('operator-mismatch');
  });
});
