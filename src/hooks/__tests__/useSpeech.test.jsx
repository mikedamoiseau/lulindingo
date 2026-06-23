import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeech } from '../useSpeech';

function installSpeechMock() {
  const speak = vi.fn();
  const cancel = vi.fn();
  // jsdom lacks SpeechSynthesisUtterance — provide a minimal stand-in.
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.rate = 1;
      this.lang = '';
      this.voice = null;
    }
  };
  window.speechSynthesis = { speak, cancel, speaking: false, getVoices: () => [] };
  return { speak, cancel };
}

describe('useSpeech', () => {
  afterEach(() => {
    delete window.speechSynthesis;
    delete globalThis.SpeechSynthesisUtterance;
    vi.restoreAllMocks();
  });

  it('reports supported=false when API absent', () => {
    delete window.speechSynthesis;
    const { result } = renderHook(() => useSpeech());
    expect(result.current.supported).toBe(false);
  });

  it('speak is a no-op when unsupported (does not throw)', () => {
    delete window.speechSynthesis;
    const { result } = renderHook(() => useSpeech());
    expect(() => act(() => result.current.speak('hello'))).not.toThrow();
  });

  it('reports supported=true and speaks an utterance', () => {
    const { speak } = installSpeechMock();
    const { result } = renderHook(() => useSpeech());
    expect(result.current.supported).toBe(true);
    act(() => result.current.speak('7 plus 4 equals what'));
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0];
    expect(utterance.text).toBe('7 plus 4 equals what');
  });

  it('cancels any in-flight speech before speaking (interrupt on retap)', () => {
    const { speak, cancel } = installSpeechMock();
    const { result } = renderHook(() => useSpeech());
    act(() => result.current.speak('first'));
    act(() => result.current.speak('second'));
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('applies the provided rate to the utterance', () => {
    const { speak } = installSpeechMock();
    const { result } = renderHook(() => useSpeech({ rate: 0.7 }));
    act(() => result.current.speak('slow please'));
    expect(speak.mock.calls[0][0].rate).toBe(0.7);
  });

  it('does not speak empty text', () => {
    const { speak } = installSpeechMock();
    const { result } = renderHook(() => useSpeech());
    act(() => result.current.speak(''));
    expect(speak).not.toHaveBeenCalled();
  });
});
