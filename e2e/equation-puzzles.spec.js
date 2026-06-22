import { test, expect } from '@playwright/test';
import { onboard, solveExercise, advanceBanner } from './helpers.js';

/**
 * Equation Puzzles end-to-end — both new interaction types.
 *
 * The exercise cycle is:
 *   0 type-answer, 1 select-answer, 2 missing-number,
 *   3 follow-pattern, 4 story-problem, 5 build-equation
 * so an Explorer (8-10) lesson of 8 exercises contains a missing-number at
 * index 2 and a build-equation at index 5. We open the first addition lesson,
 * solve exercises in order, and assert that:
 *   - a Find-the-Missing-Number exercise renders with the blank on an operand,
 *     and the computed missing operand (typed via the pad) is accepted, and
 *   - a Build-the-Equation exercise renders a tray of tiles + slots, tapping
 *     the operands that make a true equation and submitting is accepted.
 */

test('missing-number and build-equation render and accept correct answers', async ({ page }) => {
  test.setTimeout(90_000);
  await onboard(page, { name: 'Puzzler', band: '8-10' });

  const currentNode = page.locator('[class*="nodeTrail"] [class*="current"]').first();
  await expect(currentNode).toBeVisible();
  await currentNode.click();

  const area = page.locator('[class*="exerciseArea"]');
  let sawMissing = false;
  let sawBuild = false;

  // Walk the lesson; verify the two puzzle types as we encounter them.
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(350);

    // Detect a build-equation by its tray of tiles.
    if (await area.getByTestId('tray').count()) {
      // Two empty slots + 5 tray tiles render.
      expect(await area.getByTestId('slot').count()).toBe(2);
      expect(await area.getByTestId('tray').getByRole('button').count()).toBe(5);
      sawBuild = true;
    } else {
      // Detect a missing-number: the equation shows "= <number>" with the blank
      // sitting on an operand (i.e. only one number left of '=').
      const eq = area.locator('[class*="equation"]').first();
      if (await eq.count()) {
        const eqText = (await eq.innerText()).replace(/\s+/g, ' ').trim();
        const hasRhsNumber = /=\s*[\d.]+\s*$/.test(eqText);
        const lhsNums = (eqText.split('=')[0].match(/\d+/g) || []).length;
        if (hasRhsNumber && lhsNums === 1 && !(await area.getByTestId('story-equation').count())) {
          sawMissing = true;
        }
      }
    }

    const solved = await solveExercise(page);
    if (!solved) break;

    // Each correct answer is accepted: a CONTINUE banner appears (not RETRY).
    const banner = page.getByRole('button', { name: /^(continue|retry)$/i });
    await expect(banner).toBeVisible();
    const label = (await banner.innerText()).trim().toLowerCase();
    expect(label).toBe('continue'); // our computed answers are correct
    await advanceBanner(page);

    if (await page.getByText(/Lesson Complete!/i).isVisible().catch(() => false)) break;
  }

  expect(sawMissing).toBe(true);
  expect(sawBuild).toBe(true);
});
