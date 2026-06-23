import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import EstimationChallenge from '../EstimationChallenge';

afterEach(cleanup);

const bucketExercise = {
  estimation: true,
  estimationMode: 'bucket',
  equation: '247 + 581 ≈ []',
  correctAnswer: 828,
  buckets: [600, 800, 1000, 1200],
  correctBucket: 800,
  granularity: 100,
};

const typeExercise = {
  estimation: true,
  estimationMode: 'type',
  equation: '247 + 581 ≈ []',
  correctAnswer: 828,
};

describe('EstimationChallenge', () => {
  it('shows the ≈ about badge and "About how much?" prompt', () => {
    render(<EstimationChallenge exercise={bucketExercise} onAnswer={() => {}} />);
    expect(screen.getByText(/about how much/i)).toBeTruthy();
    expect(screen.getByText(/≈ ABOUT/)).toBeTruthy();
  });

  it('bucket variant renders 4 "about N" pills and reports {kind:"bucket"}', () => {
    const onAnswer = vi.fn();
    render(<EstimationChallenge exercise={bucketExercise} onAnswer={onAnswer} />);
    const pills = screen.getAllByRole('button', { name: /about \d/i });
    expect(pills).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: /about 800/i }));
    fireEvent.click(screen.getByRole('button', { name: /^check$/i }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'bucket', value: 800 });
  });

  it('type variant renders a number pad and reports {kind:"type"}', () => {
    const onAnswer = vi.fn();
    render(<EstimationChallenge exercise={typeExercise} onAnswer={onAnswer} />);
    // digits from the number pad
    fireEvent.click(screen.getByRole('button', { name: '8', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '0', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '0', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /^check$/i }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'type', value: 800 });
  });
});
