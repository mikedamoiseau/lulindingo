import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpeakerButton from '../SpeakerButton';

function installSpeechMock() {
  const speak = vi.fn();
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.rate = 1; this.lang = ''; this.voice = null; }
  };
  window.speechSynthesis = { speak, cancel: vi.fn(), speaking: false, getVoices: () => [] };
  return { speak };
}

describe('SpeakerButton', () => {
  afterEach(() => {
    cleanup();
    delete window.speechSynthesis;
    delete globalThis.SpeechSynthesisUtterance;
    vi.restoreAllMocks();
  });

  it('renders null when SpeechSynthesis is unsupported', () => {
    delete window.speechSynthesis;
    const { container } = render(<SpeakerButton text="7 plus 4 equals what" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an accessible button when supported', () => {
    installSpeechMock();
    render(<SpeakerButton text="7 plus 4 equals what" />);
    expect(screen.getByRole('button', { name: /read aloud/i })).toBeInTheDocument();
  });

  it('speaks the text on click', async () => {
    const { speak } = installSpeechMock();
    render(<SpeakerButton text="7 plus 4 equals what" />);
    await userEvent.click(screen.getByRole('button', { name: /read aloud/i }));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('7 plus 4 equals what');
  });

  it('passes rate through to the utterance', async () => {
    const { speak } = installSpeechMock();
    render(<SpeakerButton text="slow" rate={0.7} />);
    await userEvent.click(screen.getByRole('button', { name: /read aloud/i }));
    expect(speak.mock.calls[0][0].rate).toBe(0.7);
  });
});
