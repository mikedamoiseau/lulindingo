import { test, expect } from '@playwright/test';
import { onboard, solveExercise, advanceBanner } from './helpers.js';

/**
 * Dingo's Den end-to-end.
 *
 * The economy turns earned XP into spendable "acorns" (balance = totalXp -
 * spentAcorns). This proves the full loop with real play: onboard, complete a
 * lesson to earn acorns, open the Den tab, buy + equip an affordable decor item,
 * and confirm the balance dropped by exactly the cost and the item is equipped.
 */

/** Play one lesson to completion, returning to the learning path. */
async function completeOneLesson(page) {
  const currentNode = page.locator('[class*="nodeTrail"] [class*="current"]').first();
  await expect(currentNode).toBeVisible();
  await currentNode.click();

  for (let i = 0; i < 20; i++) {
    const solved = await solveExercise(page);
    if (!solved) break;
    await advanceBanner(page);
    if (await page.locator('[class*="finishBtn"]').count()) break;
  }

  const finishBtn = page.locator('[class*="finishBtn"]');
  await expect(finishBtn).toBeVisible();
  await finishBtn.click();
}

/** Read the current acorn balance number from the Den shop header. */
async function readBalance(page) {
  const text = (await page.getByTestId('acorn-balance').innerText()).trim(); // "190 🌰"
  const m = text.match(/\d+/);
  return m ? parseInt(m[0], 10) : NaN;
}

test('earn acorns, buy + equip a decor item, balance decreases by its cost', async ({ page }) => {
  test.setTimeout(90_000);
  await onboard(page, { name: 'Denner', band: '8-10' });

  // Earn acorns by completing a real lesson (10 XP/correct + 50 completion bonus).
  await completeOneLesson(page);
  await expect(page.locator('[class*="nodeTrail"]').first()).toBeVisible();

  // Open the Den tab.
  await page.getByRole('link', { name: /Den/ }).click();
  await expect(page.getByRole('heading', { name: /Dingo's Den/i })).toBeVisible();

  const startBalance = await readBalance(page);
  expect(startBalance).toBeGreaterThan(0);

  // Grass Tufts is the cheapest decor item (cost 30); one lesson clears that.
  expect(startBalance).toBeGreaterThanOrEqual(30);

  // Switch to the Plants category and buy + equip the grass.
  await page.getByRole('tab', { name: /Plants/i }).click();
  const grassCard = page.getByRole('button', { name: /Grass Tufts/i });
  await expect(grassCard).toBeEnabled();
  await grassCard.click();

  // Balance dropped by exactly the cost (30); never negative.
  await expect
    .poll(async () => await readBalance(page), { timeout: 5000 })
    .toBe(startBalance - 30);

  // The card now reads "Equipped" and the plants layer is present in the scene.
  await expect(grassCard).toContainText(/equipped/i);
  await expect(page.locator('[data-layer="plants"] *').first()).toBeVisible();
});

test('an item over budget is locked and cannot be bought', async ({ page }) => {
  test.setTimeout(90_000);
  await onboard(page, { name: 'Saver', band: '8-10' });
  await completeOneLesson(page);

  await page.getByRole('link', { name: /Den/ }).click();
  await expect(page.getByRole('heading', { name: /Dingo's Den/i })).toBeVisible();
  const startBalance = await readBalance(page);

  // Golden Crown costs 200 — well beyond a single lesson's earnings.
  await page.getByRole('tab', { name: /Hats/i }).click();
  const crown = page.getByRole('button', { name: /Golden Crown/i });
  await expect(crown).toBeDisabled();
  await crown.click({ force: true });

  // Balance unchanged, still non-negative.
  expect(await readBalance(page)).toBe(startBalance);
  expect(startBalance).toBeGreaterThanOrEqual(0);
});

test('equipped den persists across a reload (offline rebuild)', async ({ page }) => {
  test.setTimeout(90_000);
  await onboard(page, { name: 'Keeper', band: '8-10' });
  await completeOneLesson(page);

  await page.getByRole('link', { name: /Den/ }).click();
  await page.getByRole('tab', { name: /Plants/i }).click();
  await page.getByRole('button', { name: /Grass Tufts/i }).click();
  await expect(page.getByRole('button', { name: /Grass Tufts/i })).toContainText(/equipped/i);

  await page.reload();
  await page.getByRole('link', { name: /Den/ }).click();
  await page.getByRole('tab', { name: /Plants/i }).click();
  await expect(page.getByRole('button', { name: /Grass Tufts/i })).toContainText(/equipped/i);
  await expect(page.locator('[data-layer="plants"] *').first()).toBeVisible();
});
