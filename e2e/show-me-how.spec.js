import { test, expect } from '@playwright/test';
import { onboard } from './helpers.js';

/**
 * Show-me-how end-to-end: a Starter user starts the first (addition) lesson,
 * misses the first `type-answer` question (which allows one retry before the
 * miss is final), and the wrong-answer FeedbackBanner exposes a "Show me how"
 * control that reveals a worked strategy when tapped.
 *
 * The generator cycles exercise types by index (0 → type-answer), so the first
 * question is always type-answer. Starter-addition numbers stay small enough
 * that the strategy is always drawable (count-up), so the button is guaranteed.
 */
test('show-me-how reveals a worked strategy on a miss', async ({ page }) => {
  await onboard(page, { name: 'Strategist', band: '6-7' });

  // Enter the first lesson (first node in the trail).
  await page.locator('[class*="nodeTrail"] button').first().click();

  // The first exercise is type-answer: wait for its CHECK button to settle.
  const checkBtn = page.getByRole('button', { name: 'CHECK' });
  await expect(checkBtn).toBeVisible();

  // Type a deliberately wrong answer with the on-screen number pad. "99" is
  // outside every Starter-addition answer (count-up caps keep totals <= 20).
  const typeWrong = async () => {
    const nine = page.getByRole('button', { name: '9', exact: true });
    await nine.click();
    await nine.click();
    await checkBtn.click();
  };

  // First wrong attempt → retry banner (type-answer grants one retry).
  await typeWrong();
  const retry = page.getByRole('button', { name: 'RETRY' });
  await expect(retry).toBeVisible();
  await retry.click();

  // Second wrong attempt → the miss is final; the wrong-answer banner appears.
  await typeWrong();
  await expect(page.getByText(/The answer is/i)).toBeVisible();

  // The "Show me how" control is present on the miss.
  const showMe = page.getByRole('button', { name: /show me how/i });
  await expect(showMe).toBeVisible();

  // Tapping it reveals the worked strategy (count-up caption for addition).
  await showMe.click();
  await expect(page.getByText(/count on/i)).toBeVisible();
});
