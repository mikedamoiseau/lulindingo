const MAX_HEARTS = 5;
const REFILL_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

export function calculateCurrentHearts(hearts, heartsLastRefill) {
  if (hearts >= MAX_HEARTS) return MAX_HEARTS;

  const now = Date.now();
  const elapsed = now - new Date(heartsLastRefill).getTime();
  const refills = Math.floor(elapsed / REFILL_INTERVAL_MS);

  return Math.min(MAX_HEARTS, hearts + refills);
}

export function getNextRefillMs(heartsLastRefill) {
  const elapsed = Date.now() - new Date(heartsLastRefill).getTime();
  const remainder = elapsed % REFILL_INTERVAL_MS;
  return REFILL_INTERVAL_MS - remainder;
}

export { MAX_HEARTS, REFILL_INTERVAL_MS };
