import { db } from './database';

// The active profile lives in a single `meta` row so the launch picker survives
// reloads and PWA relaunches deterministically (no localStorage drift from the
// Dexie source of truth).
const META_ID = 'app';

export async function getActiveUserId() {
  const row = await db.meta.get(META_ID);
  return row?.activeUserId ?? null;
}

export async function setActiveUserId(userId) {
  await db.meta.put({ id: META_ID, activeUserId: userId });
}

export async function clearActiveUserId() {
  await db.meta.put({ id: META_ID, activeUserId: null });
}
