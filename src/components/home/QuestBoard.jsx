import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import useGameStore from '../../stores/useGameStore';
import { getLocalDateString } from '../../utils/streakTracker';
import {
  QUEST_CATALOG,
  evaluateQuest,
  allQuestsDone,
  questLabel,
} from '../../utils/dailyQuests';
import styles from './QuestBoard.module.css';

export default function QuestBoard() {
  const ensureTodayQuests = useGameStore((s) => s.ensureTodayQuests);
  const claimQuestReward = useGameStore((s) => s.claimQuestReward);
  const activeUserId = useGameStore((s) => s.user?.id);

  useEffect(() => {
    ensureTodayQuests();
  }, [ensureTodayQuests, activeUserId]);

  const today = getLocalDateString();
  const row = useLiveQuery(
    () => (activeUserId == null ? undefined : db.dailyQuests.get([activeUserId, today])),
    [today, activeUserId]
  );

  if (!row) return null;

  const quests = row.questIds
    .map((id) => QUEST_CATALOG.find((q) => q.id === id))
    .filter(Boolean);
  const done = allQuestsDone(quests, row);

  return (
    <section className={styles.board} aria-label="Daily quests" data-testid="quest-board">
      <header className={styles.boardHeader}>
        <span className={styles.title}>Daily Quests</span>
        {done && !row.claimed && (
          <button
            className={styles.claimBtn}
            onClick={() => claimQuestReward()}
            data-testid="quest-claim"
          >
            Claim reward 🎁
          </button>
        )}
        {row.claimed && <span className={styles.claimed}>Reward claimed ✅</span>}
      </header>
      <ul className={styles.list}>
        {quests.map((q) => {
          const { progress, target, done: qDone } = evaluateQuest(q, row);
          const pct = Math.round((progress / target) * 100);
          return (
            <li
              key={q.id}
              className={`${styles.quest} ${qDone ? styles.questDone : ''}`}
              data-testid="quest-item"
            >
              <span className={styles.icon}>{qDone ? '✅' : q.icon}</span>
              <div className={styles.questBody}>
                <span className={styles.label}>{questLabel(q)}</span>
                <div className={styles.bar}>
                  <div className={styles.fill} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className={styles.count} data-testid="quest-count">
                {progress}/{target}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
