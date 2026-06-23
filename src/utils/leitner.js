/**
 * leitner.js
 *
 * Kid-friendly Leitner spaced-review schedule for the Fact Vault feature.
 *
 * A fact lives in an integer "box" 0–5. A correct answer promotes it one box
 * (review later); a wrong answer demotes it two boxes (resurface fast) and is
 * always due again tomorrow. Each box maps to a fixed interval in days.
 *
 * All date math is at local-day granularity, reusing getLocalDateString from
 * streakTracker.js (consistent with streaks; no time-of-day surprises).
 */

import { getLocalDateString } from './streakTracker.js';

/** Days until a fact is due again, indexed by box. */
export const BOX_INTERVALS_DAYS = [1, 1, 2, 4, 7, 14];

/** Highest (mastered) box. */
export const MAX_BOX = 5;

/**
 * New box after answering.
 * Correct → +1 (capped at MAX_BOX). Wrong → -2 (floored at 0): a miss costs
 * more than a hit earns so genuinely shaky facts resurface, but one slip can't
 * undo a solid fact entirely.
 */
export function nextBox(box, correct) {
  return correct ? Math.min(box + 1, MAX_BOX) : Math.max(box - 2, 0);
}

/**
 * Add `n` days to a local date string ("YYYY-MM-DD"), returning a new local
 * date string. Pure; handles month/year boundaries via the Date arithmetic.
 */
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Construct at local noon to avoid any DST edge shifting the calendar day.
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  date.setDate(date.getDate() + n);
  return getLocalDateString(date);
}

/**
 * Next due-date (local date string) for a fact.
 * Wrong → today + 1 (tomorrow). Correct → today + BOX_INTERVALS_DAYS[box],
 * where `box` is the box the fact lands in AFTER applying nextBox.
 */
export function nextDueDate(box, correct, today = getLocalDateString()) {
  if (!correct) return addDays(today, 1);
  const interval = BOX_INTERVALS_DAYS[box] ?? BOX_INTERVALS_DAYS[MAX_BOX];
  return addDays(today, interval);
}
