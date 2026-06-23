import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import { db } from '../../db/database';
import styles from './SettingsPanel.module.css';

const AGE_BANDS = [
  { value: '6-7', label: 'Starter' },
  { value: '8-10', label: 'Explorer' },
  { value: '11-12', label: 'Challenger' },
];

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const user = useGameStore((s) => s.user);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const loadUser = useGameStore((s) => s.loadUser);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-settings', handler);
    return () => window.removeEventListener('open-settings', handler);
  }, []);

  if (!user) return null;

  // Nuclear option: wipe the WHOLE device (every child + all metadata). Distinct
  // from the per-child age-band reset above (which only touches the active
  // child's progress). Clears the family tables too so nothing is orphaned.
  const handleReset = async () => {
    await db.users.clear();
    await db.progress.clear();
    await db.streakHistory.clear();
    await db.dailyQuests.clear();
    await db.facts.clear();
    await db.meta.clear();
    await db.units.clear();
    await db.lessons.clear();
    window.location.reload();
  };

  const handleManageProfiles = () => {
    setOpen(false);
    window.dispatchEvent(new Event('open-profiles'));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setOpen(false);
              setConfirmReset(false);
            }}
          />
          <motion.div
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Settings</h2>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setOpen(false);
                  setConfirmReset(false);
                }}
              >
                ✕
              </button>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Starting Level</h3>
              <div className={styles.options}>
                {AGE_BANDS.map((b) => (
                  <button
                    key={b.value}
                    className={`${styles.option} ${user.ageBand === b.value ? styles.selected : ''}`}
                    onClick={() => updateSettings({ ageBand: b.value })}
                  >
                    <span className={styles.optLabel}>{b.label}</span>
                    <span className={styles.optDesc}>{b.value}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Read Aloud</h3>
              <label className={styles.toggleRow}>
                <span className={styles.optLabel}>Speak questions aloud</span>
                <input
                  type="checkbox"
                  checked={user.readAloud ?? false}
                  onChange={(e) => updateSettings({ readAloud: e.target.checked })}
                />
              </label>
              {(user.readAloud ?? false) && (
                <div className={styles.options}>
                  <button
                    className={`${styles.option} ${(user.speechRate ?? 1.0) === 1.0 ? styles.selected : ''}`}
                    onClick={() => updateSettings({ speechRate: 1.0 })}
                  >
                    <span className={styles.optLabel}>Normal speed</span>
                  </button>
                  <button
                    className={`${styles.option} ${(user.speechRate ?? 1.0) === 0.7 ? styles.selected : ''}`}
                    onClick={() => updateSettings({ speechRate: 0.7 })}
                  >
                    <span className={styles.optLabel}>Slow speed</span>
                  </button>
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Family Profiles</h3>
              <button
                className={styles.option}
                onClick={handleManageProfiles}
                data-testid="manage-profiles"
              >
                <span className={styles.optLabel}>Manage profiles</span>
                <span className={styles.optDesc}>Add or remove a child</span>
              </button>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Reset Progress</h3>
              {!confirmReset ? (
                <button className={styles.resetBtn} onClick={() => setConfirmReset(true)}>
                  Reset all progress
                </button>
              ) : (
                <div className={styles.confirmBox}>
                  <p className={styles.confirmText}>
                    This will delete all progress, XP, and streaks. Are you sure?
                  </p>
                  <div className={styles.confirmActions}>
                    <button className={styles.confirmYes} onClick={handleReset}>
                      Yes, reset
                    </button>
                    <button className={styles.confirmNo} onClick={() => setConfirmReset(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
