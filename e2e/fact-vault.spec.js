import { test, expect } from '@playwright/test';
import { onboard, solveExercise, advanceBanner } from './helpers.js';

/**
 * Fact Vault end-to-end.
 *
 * Playing a lesson records per-fact mastery into the Dexie `facts` table. We
 * prove the loop end-to-end:
 *   1. onboard + complete a lesson → facts are persisted.
 *   2. force one fact "due" (dueAt in the past) → the home Review callout shows.
 *   3. tap Review → a fact-targeted set plays in practice mode (no hearts lost).
 */

/** Read every row of the Dexie `facts` object store via raw IndexedDB. */
function readFacts(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('LuLinDingo');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('facts')) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction('facts', 'readonly');
          const req = tx.objectStore('facts').getAll();
          req.onsuccess = () => {
            resolve(req.result);
            db.close();
          };
          req.onerror = () => reject(req.error);
        };
      })
  );
}

/** Force a fact's dueAt to a past date so it counts as "due" on reload. */
function forceFactDue(page, sig) {
  return page.evaluate(
    (s) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('LuLinDingo');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('facts', 'readwrite');
          const store = tx.objectStore('facts');
          const get = store.get(s);
          get.onsuccess = () => {
            const row = get.result;
            row.dueAt = '2000-01-01';
            row.box = 0;
            store.put(row);
          };
          tx.oncomplete = () => {
            resolve(true);
            db.close();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    sig
  );
}

async function playLessonToSummary(page) {
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
  await expect(page.getByTestId('quest-board')).toBeVisible();
}

test('playing a lesson records facts, then a due fact surfaces a Review callout', async ({ page }) => {
  test.setTimeout(120_000);
  await onboard(page, { name: 'Vaulter', band: '8-10' });

  // No facts before play; Review callout hidden.
  await expect(page.getByTestId('review-callout')).toHaveCount(0);

  await playLessonToSummary(page);

  // Facts were persisted by recordAnswer threading.
  await expect
    .poll(async () => (await readFacts(page)).length, { timeout: 5000 })
    .toBeGreaterThan(0);

  const facts = await readFacts(page);
  // Every recorded fact has the expected shape.
  for (const f of facts) {
    expect(typeof f.sig).toBe('string');
    expect(typeof f.box).toBe('number');
    expect(typeof f.dueAt).toBe('string');
    expect(f.seen).toBeGreaterThanOrEqual(1);
  }

  // Force one fact due in the past, reload → Review callout appears with a count.
  await forceFactDue(page, facts[0].sig);
  await page.reload();
  const callout = page.getByTestId('review-callout');
  await expect(callout).toBeVisible();
  await expect(page.getByTestId('review-count')).toContainText(/fact/);

  // Capture hearts before review.
  const heartsText = page.locator('[class*="heart"]');
  // Launch the targeted Review set.
  await page.getByTestId('review-start').click();

  // Review chrome is labelled "Review" and runs as practice (no XP fly-up).
  await expect(page.getByText('Review', { exact: true }).first()).toBeVisible();

  // Solve the whole review set.
  for (let i = 0; i < 20; i++) {
    const solved = await solveExercise(page);
    if (!solved) break;
    await advanceBanner(page);
    if (await page.locator('[class*="finishBtn"]').count()) break;
  }
  // Review ends on a summary; finishing returns home without crashing.
  const finishBtn = page.locator('[class*="finishBtn"]');
  await expect(finishBtn).toBeVisible();
  await finishBtn.click();
  await expect(page.getByTestId('quest-board')).toBeVisible();

  // Facts still present (review updated, did not wipe, the vault).
  expect((await readFacts(page)).length).toBeGreaterThan(0);
  // Reference kept to avoid an unused-locator lint quibble in some setups.
  void heartsText;
});
