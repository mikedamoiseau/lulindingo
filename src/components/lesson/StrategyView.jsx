import { useState } from 'react';
import CountUpDots from './strategies/CountUpDots';
import NumberLineJump from './strategies/NumberLineJump';
import SkipCountChain from './strategies/SkipCountChain';
import EqualGrouping from './strategies/EqualGrouping';
import styles from './StrategyView.module.css';

export default function StrategyView({ descriptor }) {
  const [playKey, setPlayKey] = useState(0);
  if (!descriptor || descriptor.kind === 'none') return null;

  const body = (() => {
    switch (descriptor.kind) {
      case 'count-up':
        return <CountUpDots {...descriptor} />;
      case 'number-line':
        return <NumberLineJump {...descriptor} />;
      case 'skip-count':
        return <SkipCountChain {...descriptor} />;
      case 'equal-groups':
        return <EqualGrouping {...descriptor} />;
      default:
        return null;
    }
  })();

  return (
    <div className={styles.strategy}>
      <div key={playKey}>{body}</div>
      <button className={styles.replay} onClick={() => setPlayKey((k) => k + 1)}>
        ▶ Play again
      </button>
    </div>
  );
}
