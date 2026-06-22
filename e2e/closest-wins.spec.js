import { test, expect } from '@playwright/test';
import { onboard, solveExercise } from './helpers.js';

/**
 * Closest Wins (estimation challenge) end-to-end.
 *
 * Estimation mode is entered from a per-lesson "Estimation Challenge ⚡" entry
 * that only appears on a COMPLETED, eligible lesson (add/sub/mul, tier 4–5,
 * band 8-10 / 11-12 — see isEstimationEligible / D2).
 *
 * To reach a completed eligible lesson without hand-authoring answers, we drive
 * a real lesson to completion by reading each exercise's on-screen math
 * expression, computing the exact answer in-test, and entering/selecting it. The
 * 8-10 (Explorer) band's first addition lesson is tier 1 — but the entry only
 * shows on tier 4/5. So we complete lessons sequentially up the addition unit
 * until a tier-4 lesson unlocks and is completed, then take its estimation entry.
 */

// solveExercise (handles all six exercise types, including the equation-puzzle
// types) lives in helpers.js so every spec stays in sync as new types land.

/** Drive the open lesson to its summary screen ("Lesson Complete!"). */
async function completeLesson(page) {
  const summary = page.getByText(/Lesson Complete!/i);
  for (let i = 0; i < 14; i++) {
    if (await summary.isVisible().catch(() => false)) break;

    const solved = await solveExercise(page);
    if (!solved) break; // exercise area gone → lesson is finishing

    // A feedback banner appears after each answer; tap CONTINUE (or RETRY+redo).
    const banner = page.getByRole('button', { name: /^(continue|retry)$/i });
    await expect(banner).toBeVisible();
    const label = (await banner.innerText()).trim().toLowerCase();
    // The banner slides in on a spring; let it settle into the viewport.
    await page.waitForTimeout(500);
    await banner.click();
    if (label === 'retry') {
      // We computed the right answer, so a retry shouldn't happen; redo defensively.
      await solveExercise(page);
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /^continue$/i }).click();
    }
  }
  await expect(summary).toBeVisible();
}

test('closest-wins estimation challenge round', async ({ page }) => {
  // Completing several lessons end-to-end (read → compute → answer) with
  // animation settles is inherently slow; give it room.
  test.setTimeout(120_000);

  // Explorer = 8-10 band, eligible for estimation.
  await onboard(page, { name: 'Estimator', band: '8-10' });

  // Complete lessons sequentially until a tier-4 lesson is done and its
  // "Estimation Challenge" entry appears. Tiers 1..4 → at most 4 lessons.
  let estimateEntry = page.getByRole('button', { name: /Estimation Challenge/i });
  for (let lessonNum = 0; lessonNum < 5; lessonNum++) {
    if (await estimateEntry.count()) break;

    // Open the current (non-completed) lesson node.
    const currentNode = page.locator('[class*="nodeTrail"] [class*="current"]').first();
    await expect(currentNode).toBeVisible();
    await currentNode.click();

    await completeLesson(page);

    // The summary's CONTINUE returns to the learning path.
    await page.getByRole('button', { name: /^continue$/i }).click({ force: true });
    await expect(page.locator('[class*="nodeTrail"]')).toBeVisible();

    estimateEntry = page.getByRole('button', { name: /Estimation Challenge/i });
  }

  // The estimation entry is now present on a completed tier-4 lesson.
  await expect(estimateEntry.first()).toBeVisible();
  await estimateEntry.first().click();

  // Estimation UI: the ≈ ABOUT badge + "About how much?" prompt, and the first
  // exercise is the bucket variant with "about N" pills.
  await expect(page.getByText(/≈ ABOUT/)).toBeVisible();
  await expect(page.getByText(/about how much/i)).toBeVisible();
  const pills = page.getByRole('button', { name: /about \d/i });
  await expect(pills.first()).toBeVisible();
  expect(await pills.count()).toBe(4);
});
