import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../../stores/useGameStore';
import PlacementTest from './PlacementTest';
import styles from './Onboarding.module.css';

const AGE_BANDS = [
  { value: '6-7', label: 'Starter', hint: 'Ages 6-7', emoji: '🌱', startingTier: 1 },
  { value: '8-10', label: 'Explorer', hint: 'Ages 8-10', emoji: '🚀', startingTier: 2 },
  { value: '11-12', label: 'Challenger', hint: 'Ages 11-12', emoji: '⚡', startingTier: 3 },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const createUser = useGameStore((s) => s.createUser);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) setStep(1);
  };

  const handleTestLevel = () => setStep(3);
  const handleChooseLevel = () => setStep(2);

  const handleAgeBand = async (band) => {
    await createUser(name.trim(), band.value, {
      startingTier: band.startingTier,
      placementMethod: 'manual',
    });
  };

  const handlePlacementComplete = async (result) => {
    await createUser(name.trim(), result.ageBand, {
      startingTier: result.startingTier,
      placementMethod: 'test',
    });
  };

  if (step === 3) {
    return <PlacementTest onComplete={handlePlacementComplete} />;
  }

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.form
            key="name"
            className={styles.step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            onSubmit={handleNameSubmit}
          >
            <h1 className={styles.title}>What's your name?</h1>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              maxLength={20}
            />
            <button
              className={styles.button}
              type="submit"
              disabled={!name.trim()}
            >
              CONTINUE
            </button>
          </motion.form>
        )}
        {step === 1 && (
          <motion.div
            key="choice"
            className={styles.step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <h1 className={styles.title}>How should we start?</h1>
            <p className={styles.subtitle}>Find your perfect level</p>
            <div className={styles.bands}>
              <button className={styles.bandCard} onClick={handleTestLevel}>
                <span className={styles.bandEmoji}>🎯</span>
                <span className={styles.bandLabel}>Test my level</span>
                <span className={styles.bandHint}>8 quick questions</span>
              </button>
              <button className={styles.bandCard} onClick={handleChooseLevel}>
                <span className={styles.bandEmoji}>✋</span>
                <span className={styles.bandLabel}>Choose my level</span>
                <span className={styles.bandHint}>Pick manually</span>
              </button>
            </div>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="age"
            className={styles.step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <h1 className={styles.title}>Pick a starting level</h1>
            <p className={styles.subtitle}>You can always change this later</p>
            <div className={styles.bands}>
              {AGE_BANDS.map((band) => (
                <button
                  key={band.value}
                  className={styles.bandCard}
                  onClick={() => handleAgeBand(band)}
                >
                  <span className={styles.bandEmoji}>{band.emoji}</span>
                  <span className={styles.bandLabel}>{band.label}</span>
                  <span className={styles.bandHint}>{band.hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
