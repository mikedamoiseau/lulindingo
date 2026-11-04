import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';

// Skip exit animations so closed panels unmount immediately.
vi.mock('framer-motion', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, AnimatePresence: ({ children }) => children };
});

import SettingsPanel from '../SettingsPanel';
import useGameStore from '../../../stores/useGameStore';
import { db } from '../../../db/database';
import { seedDatabase } from '../../../db/seed';

async function setupStarterWithProgress() {
  for (const t of ['users', 'progress', 'streakHistory', 'units', 'lessons', 'dailyQuests', 'facts', 'meta']) {
    await db[t].clear();
  }
  await seedDatabase();
  await useGameStore.getState().createUser('Kid', '6-7');
  const { user } = useGameStore.getState();
  await db.progress.put({
    userId: user.id,
    lessonId: 'math-addition-lesson-1',
    completed: true,
    stars: 3,
    bestAccuracy: 100,
    attempts: 1,
  });
  return user.id;
}

function openSettings() {
  render(<SettingsPanel />);
  act(() => {
    window.dispatchEvent(new Event('open-settings'));
  });
}

const progressCount = (userId) => db.progress.where('userId').equals(userId).count();

afterEach(() => cleanup());

describe('SettingsPanel — switching age group', () => {
  let userId;
  beforeEach(async () => {
    userId = await setupStarterWithProgress();
  });

  it('asks for confirmation before switching (switching clears lesson progress)', async () => {
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: /Explorer/ }));

    expect(screen.getByText(/Switch to Explorer\?/)).toBeInTheDocument();
    expect(screen.getByText(/XP and streak are kept/)).toBeInTheDocument();
    // Nothing changed yet.
    expect(useGameStore.getState().user.ageBand).toBe('6-7');
    expect(await progressCount(userId)).toBe(1);
  });

  it('switches only after "Yes, switch"', async () => {
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: /Explorer/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, switch' }));

    await waitFor(() => expect(useGameStore.getState().user.ageBand).toBe('8-10'));
    expect(await progressCount(userId)).toBe(0);
    expect(screen.queryByText(/Switch to Explorer\?/)).not.toBeInTheDocument();
  });

  it('Cancel keeps the current age group and progress', async () => {
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: /Explorer/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/Switch to Explorer\?/)).not.toBeInTheDocument();
    expect(useGameStore.getState().user.ageBand).toBe('6-7');
    expect(await progressCount(userId)).toBe(1);
  });

  it('tapping the current age group asks nothing and changes nothing', async () => {
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: /Starter/ }));

    expect(screen.queryByText(/Switch to/)).not.toBeInTheDocument();
    expect(await progressCount(userId)).toBe(1);
  });
});
