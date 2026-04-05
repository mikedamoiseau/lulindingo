import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Confetti.module.css';

const COLORS = ['#58cc02', '#1cb0f6', '#ffc800', '#ff86d0', '#ff9600'];

export default function Confetti({ active }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: 10 + Math.random() * 80,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.3,
        duration: 1.5 + Math.random(),
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
      }))
    );
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <div className={styles.container}>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className={styles.particle}
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{ y: '100vh', opacity: 0, rotate: p.rotation }}
              transition={{ delay: p.delay, duration: p.duration, ease: 'easeIn' }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
