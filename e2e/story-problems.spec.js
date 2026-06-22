import { test, expect } from '@playwright/test';
import { onboard } from './helpers.js';

/**
 * Story Problems end-to-end.
 *
 * Story problems are the 4th type in the exercise cycle (type-answer,
 * select-answer, follow-pattern, story-problem), so the 4th exercise of any
 * lesson is a story problem. We open the Explorer band's first lesson, answer
 * the first three exercises by reading their on-screen number sentences, then
 * assert the 4th shows a narrative prompt, answer it via the number pad, and
 * confirm the lesson advances (a feedback banner appears).
 */

const evalExpr = (a, op, b) => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return a / b;
    default: throw new Error(`Unknown operator: ${op}`);
  }
};

/** Pull "A op B" out of arbitrary text and compute the answer. */
function computeFromText(text) {
  const m = text.match(/(\d+)\s*([+\-×÷])\s*(\d+)/);
  if (!m) throw new Error(`No expression found in: ${JSON.stringify(text)}`);
  return evalExpr(parseInt(m[1], 10), m[2], parseInt(m[3], 10));
}

/** Type a number via the on-screen number pad, then CHECK. */
async function typeNumber(page, n) {
  for (const ch of String(n)) {
    await page.getByRole('button', { name: ch, exact: true }).click();
  }
  await page.getByRole('button', { name: 'CHECK' }).click();
}

/**
 * Solve one normal exercise (type/select/follow). Returns the type solved, or
 * 'story' if the current exercise is a story problem (left for the caller to
 * handle), or false if no exercise is on screen.
 */
async function solveOneOrDetectStory(page) {
  const area = page.locator('[class*="exerciseArea"]');
  await page.waitForTimeout(350); // let the slide transition settle

  // Story problem: the hidden equation testid is present.
  const storyEq = area.getByTestId('story-equation');
  if (await storyEq.count()) return 'story';

  const checkBtn = page.getByRole('button', { name: 'CHECK' });
  const blankCell = area.locator('[class*="blankCell"]');
  const eq = area.locator('[class*="equation"]').first();

  let answer;
  if (await blankCell.count()) {
    const row = blankCell.first().locator('xpath=..');
    answer = computeFromText(await row.innerText());
  } else if (await eq.count()) {
    answer = computeFromText(await eq.innerText());
  } else {
    return false;
  }

  const optionBtn = area.getByRole('button', { name: String(answer), exact: true });
  if (await optionBtn.count()) {
    await optionBtn.first().click();
    await checkBtn.click();
    return 'option';
  }
  await typeNumber(page, answer);
  return 'typed';
}

/** Tap CONTINUE on the feedback banner (and redo on an unexpected RETRY). */
async function advanceBanner(page) {
  const banner = page.getByRole('button', { name: /^(continue|retry)$/i });
  await expect(banner).toBeVisible();
  const label = (await banner.innerText()).trim().toLowerCase();
  await page.waitForTimeout(500);
  await banner.click();
  if (label === 'retry') {
    await solveOneOrDetectStory(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^continue$/i }).click();
  }
}

test('story problem renders a narrative and accepts the typed answer', async ({ page }) => {
  test.setTimeout(60_000);
  await onboard(page, { name: 'Story', band: '8-10' });

  // Open the first (current) lesson node.
  const currentNode = page.locator('[class*="nodeTrail"] [class*="current"]').first();
  await expect(currentNode).toBeVisible();
  await currentNode.click();

  // Advance through exercises until we hit the story problem (index 3).
  let reachedStory = false;
  for (let i = 0; i < 6 && !reachedStory; i++) {
    const result = await solveOneOrDetectStory(page);
    if (result === 'story') {
      reachedStory = true;
      break;
    }
    expect(result).toBeTruthy();
    await advanceBanner(page);
  }
  expect(reachedStory).toBe(true);

  const area = page.locator('[class*="exerciseArea"]');

  // The narrative prompt is shown (a sentence ending in a question mark), and
  // the bare equation is NOT visible to sighted users.
  const prompt = area.locator('[class*="prompt"]').first();
  await expect(prompt).toBeVisible();
  const promptText = (await prompt.innerText()).trim();
  expect(promptText.length).toBeGreaterThan(10);
  expect(promptText).toMatch(/\?$/);

  // Read the hidden number sentence to compute the answer, then type it.
  const equation = await area.getByTestId('story-equation').innerText();
  const answer = computeFromText(equation);
  await typeNumber(page, answer);

  // The answer is accepted: a CONTINUE banner (correct) appears, not RETRY.
  const continueBtn = page.getByRole('button', { name: /^continue$/i });
  await expect(continueBtn).toBeVisible();
});
