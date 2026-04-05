import { motion, AnimatePresence } from 'framer-motion';
import styles from './XpFlyUp.module.css';

export default function XpFlyUp({ amount, trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key={trigger}
          className={styles.flyup}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -60 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          +{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}
