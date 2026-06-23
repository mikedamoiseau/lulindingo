import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ProfilePicker from '../ProfilePicker';
import useGameStore from '../../../stores/useGameStore';

afterEach(cleanup);

beforeEach(() => {
  // Seed the store with two profiles and spy on the actions the picker calls.
  useGameStore.setState({
    profiles: [
      { id: 1, name: 'Ada', totalXp: 120, currentStreak: 3 },
      { id: 2, name: 'Bea', totalXp: 0, currentStreak: 0 },
    ],
    loadProfiles: vi.fn().mockResolvedValue(undefined),
    switchProfile: vi.fn().mockResolvedValue(undefined),
    deleteProfile: vi.fn().mockResolvedValue(undefined),
  });
});

describe('ProfilePicker', () => {
  it('renders one tile per profile plus an Add tile', () => {
    render(<ProfilePicker mode="launch" />);
    const tiles = screen.getAllByTestId('profile-tile');
    expect(tiles).toHaveLength(2);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Bea')).toBeInTheDocument();
    expect(screen.getByTestId('profile-add')).toBeInTheDocument();
  });

  it('shows the launch title', () => {
    render(<ProfilePicker mode="launch" />);
    expect(screen.getByText("Who's playing?")).toBeInTheDocument();
  });

  it('shows the switch title and a close button in switch mode', () => {
    const onClose = vi.fn();
    render(<ProfilePicker mode="switch" onClose={onClose} />);
    expect(screen.getByText('Switch player')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('tapping a tile calls switchProfile with that id', () => {
    render(<ProfilePicker mode="launch" />);
    fireEvent.click(screen.getAllByTestId('profile-tile')[0]);
    expect(useGameStore.getState().switchProfile).toHaveBeenCalledWith(1);
  });

  it('opens the parent gate when Add child is tapped', () => {
    render(<ProfilePicker mode="launch" />);
    fireEvent.click(screen.getByTestId('profile-add'));
    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();
  });
});
