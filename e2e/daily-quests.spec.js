import { test, expect } from '@playwright/test';
import { onboard, solveExercise, advanceBanner } from './helpers.js';

/**
 * Daily Quest Board end-to-end.
 *
 * On the learning path a kid sees three deterministically-chosen daily quests,
 * each starting at 0/target. Playing a lesson feeds the quest counters
 * (answers / streak / stars / lesson count), and the board reflects that
 * progress when the kid returns to the home screen.
 */

/** Read each quest's "progress/target" numerator into an array of numbers. */
async function questNumerators(page) {
  const counts = page.getByTestId('quest-count');
  const n = await counts.count();
  const nums = [];
  for (let i = 0; i < n; i++) {
    const text = (await counts.nth(i).innerText()).trim(); // "4/10"
    nums.push(parseInt(text.split('/')[0], 10));
  }
  return nums;
}

test('quest board renders three zeroed quests and advances after play', async ({ page }) => {
  test.setTimeout(90_000);
  await onboard(page, { name: 'Quester', band: '8-10' });

  // The board renders with exactly three quests.
  const board = page.getByTestId('quest-board');
  await expect(board).toBeVisible();
  await expect(page.getByTestId('quest-item')).toHaveCount(3);

  // Every quest starts at zero progress and there is no claim button yet.
  const startNums = await questNumerators(page);
  expect(startNums).toHaveLength(3);
  expect(startNums.every((x) => x === 0)).toBe(true);
  await expect(page.getByTestId('quest-claim')).toHaveCount(0);

  // Play through a full lesson to feed the quest counters.
  const currentNode = page.locator('[class*="nodeTrail"] [class*="current"]').first();
  await expect(currentNode).toBeVisible();
  await currentNode.click();

  // Solve every exercise until the summary screen appears.
  for (let i = 0; i < 20; i++) {
    const solved = await solveExercise(page);
    if (!solved) break; // no exercise on screen — summary is showing
    await advanceBanner(page);
    // If the summary CONTINUE button is present, the lesson is done.
    if (await page.locator('[class*="finishBtn"]').count()) break;
  }

  // Return to the learning path from the summary.
  const finishBtn = page.locator('[class*="finishBtn"]');
  await expect(finishBtn).toBeVisible();
  await finishBtn.click();

  // Back on the board: at least one quest now shows progress > 0.
  await expect(page.getByTestId('quest-board')).toBeVisible();
  await expect
    .poll(async () => (await questNumerators(page)).some((x) => x > 0), { timeout: 5000 })
    .toBe(true);
});
