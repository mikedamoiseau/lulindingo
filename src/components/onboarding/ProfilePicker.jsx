import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import Onboarding from './Onboarding';
import ParentGate from './ParentGate';
import styles from './ProfilePicker.module.css';

// Deterministic per-child accent colour from the user id so each avatar tile is
// visually distinct without storing a colour.
const COLORS = ['var(--blue)', 'var(--green)', 'var(--pink)', 'var(--orange)', 'var(--yellow)'];
const colorFor = (id) => COLORS[(Number(id) || 0) % COLORS.length];
const initialOf = (name) => (name?.trim()?.[0] || '?').toUpperCase();

const LONG_PRESS_MS = 600;

/**
 * "Who's playing?" gate.
 * @param {{ mode?: 'launch'|'switch', onClose?: () => void }} props
 *   - 'launch': the App renders this when children exist but none is active.
 *   - 'switch': rendered as an overlay from the home AvatarSwitcher; `onClose`
 *     dismisses it after a switch.
 */
export default function ProfilePicker({ mode = 'launch', onClose }) {
  const profiles = useGameStore((s) => s.profiles);
  const loadProfiles = useGameStore((s) => s.loadProfiles);
  const switchProfile = useGameStore((s) => s.switchProfile);
  const deleteProfile = useGameStore((s) => s.deleteProfile);

  // Flow state: which gated sub-flow is open.
  const [flow, setFlow] = useState(null); // null | 'gate-add' | 'adding' | 'gate-remove' | 'confirm-remove'
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeRevealed, setRemoveRevealed] = useState(false);
  const pressTimer = useRef(null);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handlePick = async (id) => {
    if (removeRevealed) return; // ignore taps while remove affordances are showing
    await switchProfile(id);
    if (mode === 'switch') onClose?.();
  };

  // Long-press a tile to reveal the remove affordance on every tile.
  const startPress = () => {
    pressTimer.current = setTimeout(() => setRemoveRevealed(true), LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const requestRemove = (profile) => {
    setRemoveTarget(profile);
    setFlow('gate-remove');
  };

  const confirmRemove = async () => {
    if (removeTarget) await deleteProfile(removeTarget.id);
    setRemoveTarget(null);
    setRemoveRevealed(false);
    setFlow(null);
    // After deleting, if we were a switch overlay and any child remains the app
    // stays put; the launch gate re-resolves via loadUser inside deleteProfile.
  };

  // Adding a child: parent gate → Onboarding in add mode.
  if (flow === 'adding') {
    return (
      <div className={styles.container}>
        <Onboarding
          mode="add"
          onComplete={() => {
            setFlow(null);
            if (mode === 'switch') onClose?.();
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="profile-picker">
      <header className={styles.header}>
        <h1 className={styles.title}>
          {mode === 'switch' ? 'Switch player' : "Who's playing?"}
        </h1>
        {mode === 'switch' && (
          <button className={styles.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </header>

      <div className={styles.grid}>
        {profiles.map((p) => (
          <div key={p.id} className={styles.tileWrap}>
            <button
              className={styles.tile}
              data-testid="profile-tile"
              onClick={() => handlePick(p.id)}
              onPointerDown={startPress}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
            >
              <span className={styles.avatar} style={{ background: colorFor(p.id) }}>
                {initialOf(p.name)}
              </span>
              <span className={styles.name}>{p.name}</span>
              <span className={styles.meta}>
                {(p.totalXp || 0)} XP · 🔥 {p.currentStreak || 0}
              </span>
            </button>
            {removeRevealed && (
              <button
                className={styles.removeBtn}
                data-testid="profile-remove"
                onClick={() => requestRemove(p)}
                aria-label={`Remove ${p.name}`}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <button
          className={`${styles.tile} ${styles.addTile}`}
          data-testid="profile-add"
          onClick={() => setFlow('gate-add')}
        >
          <span className={styles.avatar} style={{ background: 'var(--border)' }}>
            ＋
          </span>
          <span className={styles.name}>Add child</span>
        </button>
      </div>

      {removeRevealed && (
        <button className={styles.doneBtn} onClick={() => setRemoveRevealed(false)}>
          Done
        </button>
      )}

      <AnimatePresence>
        {flow === 'gate-add' && (
          <ParentGate
            key="gate-add"
            onPass={() => setFlow('adding')}
            onCancel={() => setFlow(null)}
          />
        )}
        {flow === 'gate-remove' && (
          <ParentGate
            key="gate-remove"
            onPass={() => setFlow('confirm-remove')}
            onCancel={() => {
              setFlow(null);
              setRemoveTarget(null);
            }}
          />
        )}
        {flow === 'confirm-remove' && removeTarget && (
          <motion.div
            className={styles.confirmOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="remove-confirm"
          >
            <div className={styles.confirmCard}>
              <p className={styles.confirmText}>
                Remove <strong>{removeTarget.name}</strong> and all their progress? This
                can&apos;t be undone.
              </p>
              <div className={styles.confirmActions}>
                <button className={styles.confirmYes} onClick={confirmRemove}>
                  Yes, remove
                </button>
                <button
                  className={styles.confirmNo}
                  onClick={() => {
                    setFlow(null);
                    setRemoveTarget(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
