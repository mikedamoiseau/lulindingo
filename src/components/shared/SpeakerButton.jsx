import { useSpeech } from '../../hooks/useSpeech';
import styles from './SpeakerButton.module.css';

/**
 * Tap-to-replay speaker button. Renders nothing when the SpeechSynthesis
 * API is unavailable. Speaks the `text` prop (already composed by
 * speakable.js) at the given rate.
 *
 * Uses a plain <button> (with a CSS active-tap effect) rather than
 * framer-motion's <motion.button>: the project's eslint flags the
 * lowercase `motion` import as unused (varsIgnorePattern only spares
 * PascalCase names), so avoiding it keeps this new file lint-clean.
 */
export default function SpeakerButton({ text, rate = 1.0, voiceURI = null }) {
  const { speak, supported } = useSpeech({ rate, voiceURI });

  if (!supported) return null;

  return (
    <button
      type="button"
      className={styles.button}
      aria-label="Read aloud"
      title="Read aloud"
      onClick={() => speak(text)}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  );
}
