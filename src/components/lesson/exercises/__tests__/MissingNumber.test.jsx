import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MissingNumber from '../MissingNumber';

afterEach(cleanup);

const exercise = {
  type: 'missing-number',
  equation: '7 + [] = 15',
  correctAnswer: 8,
  blankSlot: 'b',
  operator: '+',
  a: 7,
  b: 8,
  result: 15,
};

describe('MissingNumber', () => {
  it('renders the equation parts around the blank', () => {
    render(<MissingNumber exercise={exercise} onAnswer={() => {}} />);
    // The visible equation shows the known operand and the shown result.
    const eq = screen.getByText(/7 \+/);
    expect(eq).toBeTruthy();
    expect(screen.getByText(/= 15/)).toBeTruthy();
  });

  it('shows the "what number is missing?" instruction by default', () => {
    render(<MissingNumber exercise={exercise} onAnswer={() => {}} />);
    expect(screen.getByText(/what number is missing/i)).toBeTruthy();
  });

  it('types via the number pad and reports the numeric answer on CHECK', () => {
    const onAnswer = vi.fn();
    render(<MissingNumber exercise={exercise} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole('button', { name: '8', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /^check$/i }));
    expect(onAnswer).toHaveBeenCalledWith(8);
  });

  it('CHECK is disabled until a digit is entered', () => {
    render(<MissingNumber exercise={exercise} onAnswer={() => {}} />);
    const check = screen.getByRole('button', { name: /^check$/i });
    expect(check.disabled).toBe(true);
  });
});
