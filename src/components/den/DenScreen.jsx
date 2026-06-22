import { useLiveQuery } from 'dexie-react-hooks';
import useGameStore from '../../stores/useGameStore';
import { db } from '../../db/database';
import { createDefaultLayout } from '../../utils/denEconomy';
import DenScene from './DenScene';
import DenShop from './DenShop';
import styles from './DenScreen.module.css';

/**
 * DenScreen — the /den route container. Pulls the live user row from Dexie (so
 * the scene + balance react to buy/equip writes) and wires the store actions
 * into the stateless DenShop. The DenScene above mirrors the equipped layout.
 */
export default function DenScreen() {
  const storeUser = useGameStore((s) => s.user);
  const buyAndEquip = useGameStore((s) => s.buyAndEquip);
  const equip = useGameStore((s) => s.equip);
  const clearSlot = useGameStore((s) => s.clearSlot);

  // Live row keeps balance + layout current after every write; fall back to the
  // store user before the query resolves so the first paint is never blank.
  const liveUser = useLiveQuery(
    () => (storeUser ? db.users.get(storeUser.id) : undefined),
    [storeUser?.id]
  );
  const user = liveUser || storeUser;

  if (!user) return null;

  const layout = user.denLayout || createDefaultLayout();

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dingo&apos;s Den</h1>
      </header>
      <DenScene layout={layout} />
      <DenShop
        totalXp={user.totalXp}
        spentAcorns={user.spentAcorns ?? 0}
        layout={layout}
        onBuy={buyAndEquip}
        onEquip={equip}
        onClear={clearSlot}
      />
    </div>
  );
}
