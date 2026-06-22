import { describe, it, expect } from 'vitest';
import { wrapStory, plural, THEME_BANK } from '../storyTemplates';

describe('plural', () => {
  it('uses singular for 1', () => {
    expect(plural(1, 'acorn', 'acorns')).toBe('acorn');
  });
  it('uses plural for 0 and >1', () => {
    expect(plural(0, 'acorn', 'acorns')).toBe('acorns');
    expect(plural(5, 'acorn', 'acorns')).toBe('acorns');
  });
  it('auto-pluralises by appending s when no plural given', () => {
    expect(plural(3, 'acorn')).toBe('acorns');
    expect(plural(1, 'acorn')).toBe('acorn');
  });
});

describe('THEME_BANK', () => {
  it('has entries for all four operations', () => {
    for (const op of ['addition', 'subtraction', 'multiplication', 'division']) {
      expect(THEME_BANK[op]).toBeDefined();
    }
  });

  it('addition and subtraction have 6-7 templates; mul/div do not require them', () => {
    expect(THEME_BANK.addition['6-7'].length).toBeGreaterThan(0);
    expect(THEME_BANK.subtraction['6-7'].length).toBeGreaterThan(0);
    expect(THEME_BANK.multiplication['8-10'].length).toBeGreaterThan(0);
    expect(THEME_BANK.division['11-12'].length).toBeGreaterThan(0);
  });
});

describe('wrapStory', () => {
  it('returns a non-empty prompt string containing both operands', () => {
    const { prompt } = wrapStory('addition', 7, 5, 12, '6-7');
    expect(typeof prompt).toBe('string');
    expect(prompt).toMatch(/7/);
    expect(prompt).toMatch(/5/);
  });

  it('6-7 prompts are short (single sentence, <= 90 chars)', () => {
    for (let i = 0; i < 20; i++) {
      const { prompt } = wrapStory('addition', 3, 4, 7, '6-7');
      expect(prompt.length).toBeLessThanOrEqual(90);
    }
  });

  it('11-12 prompts are longer / multi-clause than 6-7', () => {
    const short = wrapStory('multiplication', 6, 4, 24, '8-10').prompt;
    const long = wrapStory('multiplication', 6, 4, 24, '11-12').prompt;
    expect(long.length).toBeGreaterThan(short.length);
  });

  it('falls back to a nearby band when the requested band has no templates', () => {
    // 6-7 has no multiplication templates; should still return a usable prompt
    const { prompt } = wrapStory('multiplication', 2, 3, 6, '6-7');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('agrees number/noun: "1 acorn" not "1 acorns"', () => {
    // Force the deterministic single-template path via THEME_BANK directly.
    const tmpl = THEME_BANK.addition['6-7'][0];
    const sentence = tmpl(1, 1, 2);
    expect(sentence).not.toMatch(/\b1 \w+s\b/); // no "1 <plural>"
  });
});
