import { expect } from '@playwright/test';

const BAND_LABELS = { '6-7': 'Starter', '8-10': 'Explorer', '11-12': 'Challenger' };

/**
 * Drive the onboarding flow to a fresh learning path.
 * Picks the manual "Choose my level" route (skips the placement test) and
 * selects the given age band.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ name?: string, band?: '6-7'|'8-10'|'11-12' }} [opts]
 */
export async function onboard(page, { name = 'Tester', band = '8-10' } = {}) {
  await page.goto('/');
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /Choose my level/i }).click();
  await page.getByRole('button', { name: new RegExp(BAND_LABELS[band], 'i') }).click();
  // Landed on the learning path.
  await expect(page).toHaveURL(/\/$|\/learn|localhost:5173\/?$/);
}

// ---------------------------------------------------------------------------
// Exercise solving (shared across specs)
// ---------------------------------------------------------------------------

const evalExpr = (a, op, b) => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return parseFloat((a / b).toFixed(2));
    default: throw new Error(`Unknown operator: ${op}`);
  }
};

/** Pull "A op B" out of arbitrary text and compute the answer. */
export function computeFromText(text) {
  const m = text.match(/(\d+)\s*([+\-×÷])\s*(\d+)/);
  if (!m) throw new Error(`No expression found in: ${JSON.stringify(text)}`);
  return evalExpr(parseInt(m[1], 10), m[2], parseInt(m[3], 10));
}

/** Type a number via the on-screen number pad, then CHECK. */
export async function typeNumber(page, n) {
  for (const ch of String(n)) {
    await page.getByRole('button', { name: ch, exact: true }).click();
  }
  await page.getByRole('button', { name: 'CHECK' }).click();
}

/**
 * Find-the-Missing-Number: the on-screen equation looks like "7 +  = 15" (the
 * blank operand renders empty). Recover the missing operand and type it.
 * The equation is "A op B = R" with exactly one of A/B blanked (R always shown).
 */
export async function solveMissingNumber(page, area) {
  const eqText = (await area.locator('[class*="equation"]').first().innerText()).trim();
  // Normalise whitespace/newlines to single spaces.
  const flat = eqText.replace(/\s+/g, ' ').trim();
  // Expect "<lhs> = <result>" where lhs contains the operator and one number.
  const m = flat.match(/^(.*?)\s*=\s*([\d.]+)$/);
  if (!m) throw new Error(`Cannot parse missing-number equation: ${JSON.stringify(flat)}`);
  const lhs = m[1].trim();
  const result = parseFloat(m[2]);
  const opMatch = lhs.match(/([+\-×÷])/);
  if (!opMatch) throw new Error(`No operator in missing-number lhs: ${JSON.stringify(lhs)}`);
  const op = opMatch[1];
  const nums = lhs.match(/\d+(?:\.\d+)?/g) || [];
  if (nums.length !== 1) throw new Error(`Expected one known operand in: ${JSON.stringify(lhs)}`);
  const known = parseFloat(nums[0]);
  // Is the known operand before the operator (knownIsFirst) or after it?
  // blank=a renders "op known" (number after op); blank=b renders "known op".
  const knownIsFirst = lhs.search(/\d/) < lhs.indexOf(op);
  let missing;
  switch (op) {
    case '+': missing = result - known; break;            // a + b = r → missing = r - known
    case '-': missing = knownIsFirst ? known - result : known + result; break; // a - [] = r → a - r ; [] - b = r → r + b
    case '×': missing = result / known; break;
    case '÷': missing = result * known; break;            // only dividend is blanked: [] ÷ known = r → r * known
    default: throw new Error(`Unknown operator: ${op}`);
  }
  await typeNumber(page, missing);
}

/**
 * Build-the-Equation: tap two tray tiles whose values make a true equation with
 * the shown result, then submit. We read the operator + result, then pick a
 * pair of tray tiles (respecting order for non-commutative ops) that works.
 */
export async function solveBuildEquation(page, area) {
  const tray = area.getByTestId('tray');
  const tiles = tray.getByRole('button');
  const count = await tiles.count();
  const values = [];
  for (let i = 0; i < count; i++) {
    values.push(parseInt((await tiles.nth(i).innerText()).trim(), 10));
  }
  // Operator + result live in the equation row. Result is the number after "=".
  const eqText = (await area.locator('[class*="equation"]').first().innerText()).replace(/\s+/g, ' ').trim();
  const opMatch = eqText.match(/([+\-×÷])/);
  const op = opMatch ? opMatch[1] : '+';
  const resMatch = eqText.match(/=\s*([\d.]+)/);
  const result = resMatch ? parseFloat(resMatch[1]) : NaN;

  // Find an ordered pair of distinct tile indices producing the result.
  let pick = null;
  for (let i = 0; i < count && !pick; i++) {
    for (let j = 0; j < count && !pick; j++) {
      if (i === j) continue;
      if (Math.abs(evalExpr(values[i], op, values[j]) - result) < 0.005) {
        pick = [i, j];
      }
    }
  }
  if (!pick) throw new Error(`No tray pair makes ${result} with op ${op}: ${JSON.stringify(values)}`);
  await tiles.nth(pick[0]).click();
  await tiles.nth(pick[1]).click();
  await page.getByRole('button', { name: 'CHECK' }).click();
}

/**
 * Solve ONE exercise of any type on screen. Returns the type solved
 * ('story' | 'missing' | 'build' | 'option' | 'typed'), or false if no
 * exercise is present (lesson finished / summary shown).
 */
export async function solveExercise(page) {
  const area = page.locator('[class*="exerciseArea"]');
  await page.waitForTimeout(350); // let the framer-motion slide transition settle

  // build-equation: a tray of tiles is present.
  if (await area.getByTestId('tray').count()) {
    await solveBuildEquation(page, area);
    return 'build';
  }

  // story-problem: a visually-hidden equation testid is present.
  const storyEq = area.getByTestId('story-equation');
  if (await storyEq.count()) {
    await typeNumber(page, computeFromText(await storyEq.innerText()));
    return 'story';
  }

  // follow-pattern: the blank row shows "???"; the question is that row's expr.
  const blankCell = area.locator('[class*="blankCell"]');
  if (await blankCell.count()) {
    const row = blankCell.first().locator('xpath=..');
    const answer = computeFromText(await row.innerText());
    const optionBtn = area.getByRole('button', { name: String(answer), exact: true });
    if (await optionBtn.count()) {
      await optionBtn.first().click();
      await page.getByRole('button', { name: 'CHECK' }).click();
      return 'option';
    }
    await typeNumber(page, answer);
    return 'typed';
  }

  const eq = area.locator('[class*="equation"]').first();
  if (!(await eq.count())) return false;

  const eqText = (await eq.innerText()).replace(/\s+/g, ' ').trim();
  // missing-number: the blank sits on an OPERAND, so the RHS (after '=') is a
  // number and the LHS has exactly one operand. Detect by "= <number>" with the
  // blank operand making only one number appear left of '='.
  const rhsNum = eqText.match(/=\s*[\d.]+\s*$/);
  const lhsNums = (eqText.split('=')[0].match(/\d+(?:\.\d+)?/g) || []).length;
  if (rhsNum && lhsNums === 1) {
    await solveMissingNumber(page, area);
    return 'missing';
  }

  // type-answer / select-answer: ".equation" holds "A op B = []".
  const answer = computeFromText(eqText);
  const optionBtn = area.getByRole('button', { name: String(answer), exact: true });
  if (await optionBtn.count()) {
    await optionBtn.first().click();
    await page.getByRole('button', { name: 'CHECK' }).click();
    return 'option';
  }
  await typeNumber(page, answer);
  return 'typed';
}

/** Tap CONTINUE on the feedback banner (redo on an unexpected RETRY). */
export async function advanceBanner(page) {
  const banner = page.getByRole('button', { name: /^(continue|retry)$/i });
  await expect(banner).toBeVisible();
  const label = (await banner.innerText()).trim().toLowerCase();
  await page.waitForTimeout(500);
  await banner.click();
  if (label === 'retry') {
    await solveExercise(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^continue$/i }).click();
  }
}

/** Clear IndexedDB so the next reload starts at onboarding. */
export async function resetApp(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) || [];
    await Promise.all(
      dbs.map((d) => d.name && new Promise((res) => {
        const req = indexedDB.deleteDatabase(d.name);
        req.onsuccess = req.onerror = req.onblocked = () => res();
      }))
    );
  });
}
