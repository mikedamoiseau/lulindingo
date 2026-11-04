// Pure, deterministic daily-quest logic. No Date.now / Math.random.

export const QUEST_CATALOG = Object.freeze([
  { id: 'answer-10-any',   type: 'answers',  metric: 'answerCount',     target: 10, operation: null,             icon: '✏️' },
  { id: 'answer-15-any',   type: 'answers',  metric: 'answerCount',     target: 15, operation: null,             icon: '✏️' },
  { id: 'answer-10-mul',   type: 'answers',  metric: 'answerCount',     target: 10, operation: 'multiplication', icon: '✖️' },
  { id: 'answer-10-add',   type: 'answers',  metric: 'answerCount',     target: 10, operation: 'addition',       icon: '➕' },
  { id: 'streak-5',        type: 'streak',   metric: 'streakInSession', target: 5,  operation: null,             icon: '🔥' },
  { id: 'streak-8',        type: 'streak',   metric: 'streakInSession', target: 8,  operation: null,             icon: '🔥' },
  { id: 'stars-3',         type: 'stars',    metric: 'lessonStars',     target: 3,  operation: null,             icon: '⭐' },
  { id: 'finish-1-lesson', type: 'lessons',  metric: 'lessonCount',     target: 1,  operation: null,             icon: '🏁' },
]);

// Operations a band never practices (mirror of skipUnits.js SKIP_UNITS_BY_BAND).
const SKIPPED_OPERATIONS_BY_BAND = {
  '6-7': [],
  '8-10': [],
  '11-12': ['addition', 'subtraction'],
};

export function dateSeed(dateString) {
  let h = 0x811c9dc5;
  for (let i = 0; i < dateString.length; i++) {
    h ^= dateString.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items, rng) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {string} dateString
 * @param {string} ageBand
 * @param {string[]} [playableOps] - operations whose answers can count today.
 *   Only current-unit lessons accrue quest progress (practice is exempt), so
 *   an "Answer 10 multiplication questions" quest is impossible for a child in
 *   the addition unit. When given, operation quests are limited to these.
 *   Omitted → every operation the age band practises.
 */
export function selectDailyQuests(dateString, ageBand, playableOps) {
  const skippedOps = SKIPPED_OPERATIONS_BY_BAND[ageBand] || [];
  const canPlay = (op) =>
    playableOps ? playableOps.includes(op) : !skippedOps.includes(op);
  const achievable = QUEST_CATALOG.filter((q) => !q.operation || canPlay(q.operation));
  const rng = mulberry32(dateSeed(dateString));
  const shuffled = seededShuffle(achievable, rng);

  const picked = [];
  const usedTypes = new Set();
  // Pass 1: greedily pick distinct types.
  for (const q of shuffled) {
    if (picked.length === 3) break;
    if (!usedTypes.has(q.type)) {
      picked.push(q);
      usedTypes.add(q.type);
    }
  }
  // Pass 2: fill remaining slots with whatever is left (distinct ids).
  for (const q of shuffled) {
    if (picked.length === 3) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked;
}

function rawProgress(quest, stats) {
  switch (quest.metric) {
    case 'answerCount':
      return quest.operation
        ? stats.answerByOperation?.[quest.operation] || 0
        : stats.answerCount || 0;
    case 'streakInSession':
      return stats.bestStreakInSession || 0;
    case 'lessonStars':
      return stats.bestLessonStars || 0;
    case 'lessonCount':
      return stats.lessonCount || 0;
    default:
      return 0;
  }
}

export function evaluateQuest(quest, stats) {
  const raw = rawProgress(quest, stats);
  const progress = Math.min(raw, quest.target);
  return { progress, target: quest.target, done: raw >= quest.target };
}

/**
 * Quests are picked once a day, but a child can finish a unit mid-day. An
 * unfinished operation quest for an operation they can no longer play (the
 * finished unit collapses and practice doesn't count) would then be stuck.
 * Swap each such quest, in place, for an achievable one that isn't done yet,
 * preferring a quest type not already on the board. Others are kept as-is.
 *
 * @param {string[]} questIds - today's quest ids
 * @param {object} stats - today's quest row (answer counts etc.)
 * @param {string[]} playableOps - operations whose answers can count now
 * @returns {string[]} the same ids, or a copy with stuck quests replaced
 */
export function replaceStuckQuests(questIds, stats, playableOps) {
  const byId = (id) => QUEST_CATALOG.find((q) => q.id === id);
  const isStuck = (q) =>
    q?.operation && !playableOps.includes(q.operation) && !evaluateQuest(q, stats).done;
  if (!questIds.some((id) => isStuck(byId(id)))) return questIds;

  const result = [...questIds];
  for (let i = 0; i < result.length; i++) {
    if (!isStuck(byId(result[i]))) continue;
    const usedTypes = new Set(result.filter((_, j) => j !== i).map((id) => byId(id)?.type));
    const candidates = QUEST_CATALOG.filter(
      (q) =>
        !result.includes(q.id) &&
        (!q.operation || playableOps.includes(q.operation)) &&
        !evaluateQuest(q, stats).done
    );
    const pick = candidates.find((q) => !usedTypes.has(q.type)) ?? candidates[0];
    if (pick) result[i] = pick.id;
  }
  return result;
}

export function allQuestsDone(quests, stats) {
  return quests.length > 0 && quests.every((q) => evaluateQuest(q, stats).done);
}

export function questLabel(quest) {
  switch (quest.metric) {
    case 'answerCount':
      return quest.operation
        ? `Answer ${quest.target} ${quest.operation} questions`
        : `Answer ${quest.target} questions`;
    case 'streakInSession':
      return `Get ${quest.target} in a row correct`;
    case 'lessonStars':
      return `Finish a lesson with ${quest.target} stars`;
    case 'lessonCount':
      return quest.target === 1
        ? 'Finish a lesson'
        : `Finish ${quest.target} lessons`;
    default:
      return 'Daily quest';
  }
}
