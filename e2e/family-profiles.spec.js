import { test, expect } from '@playwright/test';
import { onboard, solveExercise, advanceBanner } from './helpers.js';

// Onboard the Nth child from inside the ProfilePicker "Add child" flow:
// open the avatar switcher → Add → solve the parent gate → onboarding.
async function addChild(page, { name, band = '8-10' }) {
  const BAND_LABELS = { '6-7': 'Starter', '8-10': 'Explorer', '11-12': 'Challenger' };
  // Open the switcher overlay.
  await page.getByTestId('avatar-switcher').click();
  await expect(page.getByTestId('profile-picker')).toBeVisible();
  // Add child → parent gate.
  await page.getByTestId('profile-add').click();
  await passParentGate(page);
  // Onboarding (add mode) — same name + manual level flow.
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /Choose my level/i }).click();
  await page.getByRole('button', { name: new RegExp(BAND_LABELS[band], 'i') }).click();
}

// Read "What is A × B?" and type the product.
async function passParentGate(page) {
  const gate = page.getByTestId('parent-gate');
  await expect(gate).toBeVisible();
  const prompt = await gate.getByText(/What is/i).innerText();
  const m = prompt.match(/(\d+)\s*×\s*(\d+)/);
  if (!m) throw new Error(`Cannot parse parent-gate prompt: ${JSON.stringify(prompt)}`);
  const answer = parseInt(m[1], 10) * parseInt(m[2], 10);
  await gate.getByLabel('Answer').fill(String(answer));
  await gate.getByRole('button', { name: /continue/i }).click();
  await expect(gate).not.toBeVisible();
}

test('fresh start goes straight to onboarding (no picker)', async ({ page }) => {
  await page.goto('/');
  // No children → onboarding, never the picker.
  await expect(page.getByText("What's your name?")).toBeVisible();
  await expect(page.getByTestId('profile-picker')).toHaveCount(0);
});

test('add a second child, switch between them, progress stays isolated', async ({ page }) => {
  // Child A (fresh start → onboarding, as today).
  await onboard(page, { name: 'Alice', band: '8-10' });
  await expect(page.getByText('Hi Alice!')).toBeVisible();

  // Add child B via the home avatar switcher (parent gate → onboarding).
  await addChild(page, { name: 'Bob', band: '8-10' });
  // The new child becomes active and lands in the app.
  await expect(page.getByText('Hi Bob!')).toBeVisible();
  await expect(page.getByText('Hi Alice!')).toHaveCount(0);

  // Complete a lesson as Bob to give Bob distinct progress + streak.
  await completeCurrentLesson(page);
  await expect(page.getByText('Hi Bob!')).toBeVisible();
  // Bob completed a lesson → his streak is now 1.
  await expect(page.locator('[class*="streakBadge"]')).toContainText('1 day streak');

  // Switch to Alice via the avatar switcher.
  await page.getByTestId('avatar-switcher').click();
  await expect(page.getByTestId('profile-picker')).toBeVisible();
  await page.getByTestId('profile-tile').filter({ hasText: 'Alice' }).click();
  await expect(page.getByText('Hi Alice!')).toBeVisible();

  // Alice did no lessons → her streak is still 0, proving isolation: Bob's
  // completed lesson + streak bump did NOT leak into Alice's namespace.
  await expect(page.locator('[class*="streakBadge"]')).toContainText('0 day streak');
});

// Play the current lesson to completion and return to the learning path.
async function completeCurrentLesson(page) {
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

test('removing the active child re-resolves to the remaining profile or onboarding', async ({ page }) => {
  await onboard(page, { name: 'Solo', band: '8-10' });
  await expect(page.getByText('Hi Solo!')).toBeVisible();

  // Open switcher, long-press to reveal remove, then remove the only child.
  await page.getByTestId('avatar-switcher').click();
  await expect(page.getByTestId('profile-picker')).toBeVisible();

  const tile = page.getByTestId('profile-tile').first();
  // Long-press (>600ms) to reveal the remove affordance.
  await tile.dispatchEvent('pointerdown');
  await page.waitForTimeout(750);
  await tile.dispatchEvent('pointerup');

  await page.getByTestId('profile-remove').first().click();
  await passParentGate(page);
  await page.getByTestId('remove-confirm').getByRole('button', { name: /yes, remove/i }).click();

  // Was the last child → onboarding.
  await expect(page.getByText("What's your name?")).toBeVisible();
});
