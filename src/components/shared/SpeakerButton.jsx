import { motion } from 'framer-motion';
import { useSpeech } from '../../hooks/useSpeech';
import styles from './SpeakerButton.module.css';

/**
 * Tap-to-replay speaker button. Renders nothing when the SpeechSynthesis
 * API is unavailable. Speaks the `text` prop (already composed by
 * speakable.js) at the given rate.
 */
export default function SpeakerButton({ text, rate = 1.0, voiceURI = null }) {
  const { speak, supported } = useSpeech({ rate, voiceURI });

  if (!supported) return null;

  return (
    <motion.button
      type="button"
      className={styles.button}
      aria-label="Read aloud"
      title="Read aloud"
      onClick={() => speak(text)}
      whileTap={{ scale: 0.9 }}
    >
      <span aria-hidden="true">🔊</span>
    </motion.button>
  );
}
