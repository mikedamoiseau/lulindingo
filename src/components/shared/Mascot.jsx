import styles from './Mascot.module.css';

const EXPRESSIONS = {
  happy: { mouth: 'M 25 65 Q 40 80 55 65', eyes: 'open' },
  thinking: { mouth: 'M 30 65 L 50 65', eyes: 'look-up' },
  celebrating: { mouth: 'M 20 60 Q 40 85 60 60', eyes: 'closed' },
};

export default function Mascot({ expression = 'happy', size = 120 }) {
  const expr = EXPRESSIONS[expression] || EXPRESSIONS.happy;

  return (
    <svg className={styles.mascot} width={size} height={size} viewBox="0 0 80 90" fill="none">
      {/* Body */}
      <ellipse cx="40" cy="55" rx="28" ry="30" fill="#E8943A" />
      {/* Belly */}
      <ellipse cx="40" cy="60" rx="18" ry="20" fill="#F5C882" />
      {/* Head */}
      <circle cx="40" cy="35" r="22" fill="#E8943A" />
      {/* Ears */}
      <ellipse cx="22" cy="15" rx="8" ry="14" fill="#E8943A" transform="rotate(-15 22 15)" />
      <ellipse cx="22" cy="15" rx="5" ry="10" fill="#D4762A" transform="rotate(-15 22 15)" />
      <ellipse cx="58" cy="15" rx="8" ry="14" fill="#E8943A" transform="rotate(15 58 15)" />
      <ellipse cx="58" cy="15" rx="5" ry="10" fill="#D4762A" transform="rotate(15 58 15)" />
      {/* Nose */}
      <ellipse cx="40" cy="42" rx="6" ry="4" fill="#2a1a0a" />
      {/* Snout */}
      <ellipse cx="40" cy="46" rx="12" ry="8" fill="#F5C882" />
      {/* Eyes */}
      {expr.eyes === 'open' && (
        <>
          <circle cx="32" cy="32" r="4" fill="#2a1a0a" />
          <circle cx="48" cy="32" r="4" fill="#2a1a0a" />
          <circle cx="33" cy="31" r="1.5" fill="white" />
          <circle cx="49" cy="31" r="1.5" fill="white" />
        </>
      )}
      {expr.eyes === 'closed' && (
        <>
          <path d="M 28 32 Q 32 28 36 32" stroke="#2a1a0a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 44 32 Q 48 28 52 32" stroke="#2a1a0a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )}
      {expr.eyes === 'look-up' && (
        <>
          <circle cx="32" cy="30" r="4" fill="#2a1a0a" />
          <circle cx="48" cy="30" r="4" fill="#2a1a0a" />
          <circle cx="33" cy="29" r="1.5" fill="white" />
          <circle cx="49" cy="29" r="1.5" fill="white" />
        </>
      )}
      {/* Mouth */}
      <path d={expr.mouth} stroke="#2a1a0a" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
