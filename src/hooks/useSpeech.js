import { useCallback, useMemo } from 'react';

const isSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Wrap the browser SpeechSynthesis API. Fully offline. No-ops gracefully
 * when the API is unavailable.
 *
 * @param {{ rate?: number, lang?: string, voiceURI?: string|null }} [opts]
 * @returns {{ speak: (text: string) => void, cancel: () => void, supported: boolean }}
 */
export function useSpeech({ rate = 1.0, lang = 'en-US', voiceURI = null } = {}) {
  const supported = useMemo(() => isSupported(), []);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
  }, [supported]);

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return;
      // Interrupt anything already speaking so a retap restarts cleanly.
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = lang;
      if (voiceURI) {
        const match = window.speechSynthesis
          .getVoices()
          .find((v) => v.voiceURI === voiceURI);
        if (match) utterance.voice = match;
      }
      window.speechSynthesis.speak(utterance);
    },
    [supported, rate, lang, voiceURI]
  );

  return { speak, cancel, supported };
}
