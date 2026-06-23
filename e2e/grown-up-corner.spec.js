import { test, expect } from '@playwright/test';
import { onboard } from './helpers.js';

/**
 * Grown-Up Corner end-to-end.
 *
 * Flow: onboard → tap the de-emphasized gear → solve the multiply gate (read the
 * two factors on screen, compute the product, type it via the number pad) →
 * assert the dashboard cards render. Everything is local; nothing leaves the
 * device.
 */

/** Type a number on the gate's NumberPad, then press CHECK. */
async function typePad(page, n) {
  for (const ch of String(n)) {
    await page.getByRole('button', { name: ch, exact: true }).click();
  }
  await page.getByRole('button', { name: 'CHECK' }).click();
}

test('gate unlocks with the correct product and the dashboard renders', async ({ page }) => {
  await onboard(page, { name: 'Parent', band: '8-10' });

  // The gear is de-emphasized but present in the TabBar.
  await page.getByRole('link', { name: 'Grown-ups' }).click();

  // Gate screen.
  await expect(page.getByRole('heading', { name: 'Grown-ups only' })).toBeVisible();

  // Read the two factors from the equation "a × b = ?".
  const eqText = (await page.locator('[class*="equation"]').first().innerText()).replace(/\s+/g, ' ');
  const m = eqText.match(/(\d+)\s*×\s*(\d+)/);
  expect(m).not.toBeNull();
  const product = parseInt(m[1], 10) * parseInt(m[2], 10);

  await typePad(page, product);

  // Dashboard cards.
  await expect(page.getByRole('heading', { name: 'Grown-Up Corner' })).toBeVisible();
  await expect(page.getByText('Total XP')).toBeVisible(); // stat tile
  await expect(page.getByRole('heading', { name: 'XP this week' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mastery' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What to notice' })).toBeVisible();
});

test('a wrong answer shakes and stays locked', async ({ page }) => {
  await onboard(page, { name: 'Parent', band: '8-10' });
  await page.getByRole('link', { name: 'Grown-ups' }).click();
  await expect(page.getByRole('heading', { name: 'Grown-ups only' })).toBeVisible();

  // 1 is never a valid product of two factors in 6..9, so this is always wrong.
  await typePad(page, 1);

  // Still on the gate; dashboard heading is not present.
  await expect(page.getByRole('heading', { name: 'Grown-ups only' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Grown-Up Corner' })).toHaveCount(0);
});
