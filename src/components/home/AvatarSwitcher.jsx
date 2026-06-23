import { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- `motion` is used as motion.* in JSX; repo eslint lacks the react plugin to see it
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import ProfilePicker from '../onboarding/ProfilePicker';
import styles from './AvatarSwitcher.module.css';

const COLORS = ['var(--blue)', 'var(--green)', 'var(--pink)', 'var(--orange)', 'var(--yellow)'];
const colorFor = (id) => COLORS[(Number(id) || 0) % COLORS.length];
const initialOf = (name) => (name?.trim()?.[0] || '?').toUpperCase();

// Small circular avatar in the home header. Tapping it (or firing the
// 'open-profiles' window event, e.g. from Settings) opens the ProfilePicker as
// a switch overlay.
export default function AvatarSwitcher() {
  const user = useGameStore((s) => s.user);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-profiles', handler);
    return () => window.removeEventListener('open-profiles', handler);
  }, []);

  if (!user) return null;

  return (
    <>
      <button
        className={styles.avatar}
        style={{ background: colorFor(user.id) }}
        onClick={() => setOpen(true)}
        data-testid="avatar-switcher"
        aria-label={`Switch player (current: ${user.name})`}
      >
        {initialOf(user.name)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ProfilePicker mode="switch" onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
