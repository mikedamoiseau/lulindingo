const MAX_HEARTS = 10;
const REFILL_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

export function calculateCurrentHearts(hearts, heartsLastRefill) {
  if (hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, heartsLastRefill };

  const now = Date.now();
  const lastRefillTime = new Date(heartsLastRefill).getTime();
  const elapsed = now - lastRefillTime;
  const refills = Math.floor(elapsed / REFILL_INTERVAL_MS);

  if (refills <= 0) return { hearts, heartsLastRefill };

  const newHearts = Math.min(MAX_HEARTS, hearts + refills);
  // If at max, snap timestamp to now so we don't accumulate stale elapsed time.
  // Otherwise advance by exactly the intervals consumed.
  const newLastRefill =
    newHearts >= MAX_HEARTS
      ? new Date(now).toISOString()
      : new Date(lastRefillTime + refills * REFILL_INTERVAL_MS).toISOString();

  return { hearts: newHearts, heartsLastRefill: newLastRefill };
}

export function getNextRefillMs(heartsLastRefill) {
  const elapsed = Date.now() - new Date(heartsLastRefill).getTime();
  const remainder = elapsed % REFILL_INTERVAL_MS;
  return REFILL_INTERVAL_MS - remainder;
}

export { MAX_HEARTS, REFILL_INTERVAL_MS };
