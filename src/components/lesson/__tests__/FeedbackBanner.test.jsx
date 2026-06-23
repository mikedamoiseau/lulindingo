import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import FeedbackBanner from '../FeedbackBanner';

const baseWrong = {
  isCorrect: false,
  correctAnswer: 8,
  equation: '5 + 3 = []',
  operation: 'addition',
  ageBand: '6-7',
  onContinue: () => {},
};

afterEach(() => cleanup());

describe('FeedbackBanner — Show me how', () => {
  it('shows the button on a wrong answer with a drawable strategy', () => {
    render(<FeedbackBanner {...baseWrong} />);
    expect(screen.getByRole('button', { name: /show me how/i })).toBeInTheDocument();
  });

  it('does NOT show the button on a correct answer', () => {
    render(<FeedbackBanner {...baseWrong} isCorrect correctAnswer={8} />);
    expect(screen.queryByRole('button', { name: /show me how/i })).toBeNull();
  });

  it('does NOT show the button when the strategy is not drawable (decimal)', () => {
    render(
      <FeedbackBanner {...baseWrong} equation="7 ÷ 2 = []" operation="division" correctAnswer={3.5} />
    );
    expect(screen.queryByRole('button', { name: /show me how/i })).toBeNull();
  });

  it('reveals the strategy when tapped', () => {
    render(<FeedbackBanner {...baseWrong} />);
    fireEvent.click(screen.getByRole('button', { name: /show me how/i }));
    expect(screen.getByText(/count on/i)).toBeInTheDocument();
  });

  it('still renders nothing extra in retry mode', () => {
    render(<FeedbackBanner {...baseWrong} isRetry />);
    expect(screen.queryByRole('button', { name: /show me how/i })).toBeNull();
  });
});
