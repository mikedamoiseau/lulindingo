import { test, expect } from '@playwright/test';
import { onboard } from './helpers.js';

/**
 * Read-aloud end-to-end: a user enables "Read Aloud" in Settings, starts a
 * lesson, and sees the speaker button on the exercise.
 *
 * Headless Chromium exposes window.speechSynthesis, so SpeakerButton renders
 * (it returns null when the API is unavailable).
 */
test('read-aloud speaker button appears in a lesson once enabled', async ({ page }) => {
  await onboard(page, { name: 'Reader', band: '6-7' });

  // Sanity: this browser supports SpeechSynthesis (otherwise the button never renders).
  const supported = await page.evaluate(() => 'speechSynthesis' in window);
  expect(supported).toBe(true);

  // Open Settings via the gear button on the learning path.
  await page.getByRole('button', { name: '⚙️' }).click();
  await expect(page.getByRole('heading', { name: 'Read Aloud' })).toBeVisible();

  // Enable "Speak questions aloud". The panel slides in with a spring
  // animation, so click the label (which settles with the panel) and poll
  // until the checkbox reflects the new state.
  const toggle = page.getByRole('checkbox');
  await expect(toggle).toBeVisible();
  await page.getByText('Speak questions aloud').click();
  await expect(toggle).toBeChecked();

  // Close the settings panel (✕ button).
  await page.getByRole('button', { name: '✕' }).click();
  await expect(page.getByRole('heading', { name: 'Read Aloud' })).not.toBeVisible();

  // Start the first available lesson: the first node in the trail.
  await page.locator('[class*="nodeTrail"] button').first().click();

  // We are now in a lesson — the speaker button must be visible.
  const speaker = page.getByRole('button', { name: 'Read aloud' });
  await expect(speaker).toBeVisible();
});
