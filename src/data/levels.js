// CEFR level metadata: thresholds (in cumulative learned-words), labels, color, icon hue.
// Thresholds reflect commonly-cited Oxford/Cambridge ranges.

export const LEVEL_META = [
  {
    code: 'A1',
    name: 'Breakthrough',
    title: 'Apprentice Chef',
    description: 'You can introduce yourself, greet people, and exchange basic personal details.',
    threshold: 0,
    nextThreshold: 500,
    color: '#22d3ee',
    accent: 'from-cyan-400 to-sky-500',
    emoji: '🍳',
  },
  {
    code: 'A2',
    name: 'Waystage',
    title: 'Line Cook',
    description: 'You can handle simple, routine tasks and describe familiar topics.',
    threshold: 500,
    nextThreshold: 1000,
    color: '#34d399',
    accent: 'from-emerald-400 to-teal-500',
    emoji: '🥗',
  },
  {
    code: 'B1',
    name: 'Threshold',
    title: 'Sous Chef',
    description: 'You can deal with most travel situations and produce simple connected text.',
    threshold: 1000,
    nextThreshold: 2000,
    color: '#facc15',
    accent: 'from-amber-400 to-yellow-500',
    emoji: '🍜',
  },
  {
    code: 'B2',
    name: 'Vantage',
    title: 'Chef de Partie',
    description: 'You can interact with fluency and spontaneity, and write detailed text on many subjects.',
    threshold: 2000,
    nextThreshold: 4000,
    color: '#fb923c',
    accent: 'from-orange-400 to-rose-500',
    emoji: '🍣',
  },
  {
    code: 'C1',
    name: 'Effective Operational',
    title: 'Head Chef',
    description: 'You express yourself fluently and use language flexibly for social, academic and professional purposes.',
    threshold: 4000,
    nextThreshold: 8000,
    color: '#f472b6',
    accent: 'from-pink-400 to-fuchsia-500',
    emoji: '🥘',
  },
  {
    code: 'C2',
    name: 'Mastery',
    title: 'Master Chef',
    description: 'You understand virtually everything heard or read, and express yourself precisely.',
    threshold: 8000,
    nextThreshold: Infinity,
    color: '#a78bfa',
    accent: 'from-violet-400 to-purple-600',
    emoji: '👨‍🍳',
  },
];

export function levelForLearnedCount(count) {
  let current = LEVEL_META[0];
  for (const lvl of LEVEL_META) {
    if (count >= lvl.threshold) current = lvl;
    else break;
  }
  return current;
}

export function nextLevelForLearnedCount(count) {
  const current = levelForLearnedCount(count);
  const idx = LEVEL_META.findIndex((l) => l.code === current.code);
  return LEVEL_META[idx + 1] ?? null;
}

export function progressInLevel(count) {
  const cur = levelForLearnedCount(count);
  if (cur.nextThreshold === Infinity) return 1;
  const span = cur.nextThreshold - cur.threshold;
  const inLvl = count - cur.threshold;
  return Math.max(0, Math.min(1, inLvl / span));
}

// Mind Stones — six legendary stones unlocked by milestones.
// Inspired by the six classic colored gemstones of myth.
export const MIND_STONES = [
  {
    key: 'spark',
    name: 'Spark Stone',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.55)',
    threshold: 10,
    description: 'You took the first step. Curiosity ignited.',
  },
  {
    key: 'tide',
    name: 'Tide Stone',
    color: '#0ea5e9',
    glow: 'rgba(14, 165, 233, 0.55)',
    threshold: 50,
    description: 'Vocabulary flows like water — effortless and constant.',
  },
  {
    key: 'mind',
    name: 'Mind Stone',
    color: '#eab308',
    glow: 'rgba(234, 179, 8, 0.55)',
    threshold: 200,
    description: 'Memory has been forged into a tool of recall.',
  },
  {
    key: 'soul',
    name: 'Soul Stone',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.55)',
    threshold: 500,
    description: 'You speak the language with feeling, not just knowledge.',
  },
  {
    key: 'time',
    name: 'Time Stone',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.55)',
    threshold: 1500,
    description: 'Mastery is a ritual practiced across days, weeks, years.',
  },
  {
    key: 'reality',
    name: 'Reality Stone',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.55)',
    threshold: 4000,
    description: 'The language is no longer foreign — it is yours.',
  },
];

export function unlockedStones(learnedCount) {
  return MIND_STONES.filter((s) => learnedCount >= s.threshold).map((s) => s.key);
}
