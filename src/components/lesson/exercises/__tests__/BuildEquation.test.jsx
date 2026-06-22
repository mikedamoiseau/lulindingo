import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import BuildEquation from '../BuildEquation';

afterEach(cleanup);

const exercise = {
  type: 'build-equation',
  operator: '×',
  result: 24,
  slots: 2,
  solution: [6, 4],
  tray: [6, 4, 3, 9, 8],
  correctAnswer: 24,
};

function getTray() {
  return screen.getByTestId('tray');
}
function getTile(value) {
  return within(getTray()).getByRole('button', { name: String(value) });
}

describe('BuildEquation', () => {
  it('renders the result, operator, two slots, and 5 tray tiles', () => {
    render(<BuildEquation exercise={exercise} onAnswer={() => {}} />);
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByText('×')).toBeTruthy();
    expect(screen.getAllByTestId('slot')).toHaveLength(2);
    expect(within(getTray()).getAllByRole('button')).toHaveLength(5);
  });

  it('CHECK is disabled until both slots are filled', () => {
    render(<BuildEquation exercise={exercise} onAnswer={() => {}} />);
    const check = screen.getByRole('button', { name: /^check$/i });
    expect(check.disabled).toBe(true);
    fireEvent.click(getTile(6));
    expect(check.disabled).toBe(true);
    fireEvent.click(getTile(4));
    expect(check.disabled).toBe(false);
  });

  it('tapping a filled slot returns the tile to the tray and disables CHECK', () => {
    render(<BuildEquation exercise={exercise} onAnswer={() => {}} />);
    fireEvent.click(getTile(6));
    fireEvent.click(getTile(4));
    const check = screen.getByRole('button', { name: /^check$/i });
    expect(check.disabled).toBe(false);
    // Clear the first slot.
    const slots = screen.getAllByTestId('slot');
    fireEvent.click(slots[0]);
    expect(check.disabled).toBe(true);
  });

  it('correct assembly reports the result so the engine accepts it', () => {
    const onAnswer = vi.fn();
    render(<BuildEquation exercise={exercise} onAnswer={onAnswer} />);
    fireEvent.click(getTile(6));
    fireEvent.click(getTile(4));
    fireEvent.click(screen.getByRole('button', { name: /^check$/i }));
    expect(onAnswer).toHaveBeenCalledWith(24);
  });

  it('wrong assembly reports a value that does not equal the result', () => {
    const onAnswer = vi.fn();
    render(<BuildEquation exercise={exercise} onAnswer={onAnswer} />);
    fireEvent.click(getTile(3));
    fireEvent.click(getTile(9)); // 3 × 9 = 27 ≠ 24
    fireEvent.click(screen.getByRole('button', { name: /^check$/i }));
    expect(onAnswer).toHaveBeenCalledWith(27);
    expect(onAnswer).not.toHaveBeenCalledWith(24);
  });
});
