import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../database';
import { getActiveUserId, setActiveUserId, clearActiveUserId } from '../profileMeta';

describe('profileMeta accessors', () => {
  beforeEach(async () => {
    await db.open().catch(() => {});
    await db.meta.clear();
  });

  it('returns null when no meta row exists', async () => {
    expect(await getActiveUserId()).toBeNull();
  });

  it('round-trips an active user id', async () => {
    await setActiveUserId(5);
    expect(await getActiveUserId()).toBe(5);
  });

  it('clear resets to null', async () => {
    await setActiveUserId(5);
    await clearActiveUserId();
    expect(await getActiveUserId()).toBeNull();
  });

  it('overwrites the previous active id (singleton, not append)', async () => {
    await setActiveUserId(3);
    await setActiveUserId(9);
    expect(await getActiveUserId()).toBe(9);
    expect(await db.meta.count()).toBe(1);
  });
});
