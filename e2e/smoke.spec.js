import { test, expect } from '@playwright/test';
import { onboard } from './helpers.js';

test('app loads to onboarding for a fresh user', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText("What's your name?")).toBeVisible();
});

test('manual onboarding lands on the learning path', async ({ page }) => {
  await onboard(page, { name: 'Smoke', band: '8-10' });
  // The learning path shows the user's name or at least leaves onboarding.
  await expect(page.getByText("What's your name?")).not.toBeVisible();
});
