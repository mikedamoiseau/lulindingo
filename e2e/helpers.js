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
