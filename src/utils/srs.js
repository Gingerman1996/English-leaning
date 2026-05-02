// Simplified SM-2 spaced-repetition algorithm (the math powering Anki).
// Each card stores: { ease, interval, repetitions, dueAt, lapses }.
// Reviewer rates recall on a 0-3 scale: 0=Again, 1=Hard, 2=Good, 3=Easy.

const DAY_MS = 86_400_000;
const MIN_EASE = 1.3;

export function newCardState() {
  return {
    ease: 2.5,
    interval: 0, // days until next review
    repetitions: 0,
    dueAt: Date.now(), // due immediately
    lapses: 0,
    seenAt: Date.now(),
    lastReviewedAt: null,
  };
}

// rating: 0..3
export function review(state, rating) {
  let { ease, interval, repetitions, lapses } = state;
  const now = Date.now();

  if (rating === 0) {
    // Forgot — reset reps but bump lapse counter.
    repetitions = 0;
    interval = 0; // due again today
    lapses += 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * ease);

    repetitions += 1;

    // Adjust ease based on rating quality (1=Hard, 2=Good, 3=Easy).
    if (rating === 1) ease = Math.max(MIN_EASE, ease - 0.15);
    else if (rating === 3) ease = ease + 0.15;
    // rating 2 (Good) leaves ease unchanged
  }

  return {
    ...state,
    ease: Number(ease.toFixed(3)),
    interval,
    repetitions,
    lapses,
    lastReviewedAt: now,
    dueAt: now + interval * DAY_MS,
  };
}

// "Learned" = the user has recalled this word at least once without lapsing.
// Anki technically requires more reps to "graduate" a card, but for our UX
// (CEFR tier + Mind Stones tick up immediately when you nail a new word) the
// looser threshold is much more rewarding. Rating "Again" resets repetitions
// to 0, so failed cards correctly drop out of the learned set.
export function isLearned(state) {
  return state && state.repetitions >= 1 && state.ease >= 2.0;
}

// Per-word mastery score (0 → 1.5) used by the Chef level.
// Maps the SM-2 ease to a points-per-word value:
//
//   ease 1.5 (Again-heavy)  → 0      (not really learned)
//   ease 2.0                → 0.5    (Hard territory)
//   ease 2.5 (default Good) → 1.0    (matches the binary "learned" count)
//   ease 3.0 (Easy a few times) → 1.5  (mastered)
//
// Repeated Easy ratings bump ease by +0.15 each time, so a word the user
// keeps marking Easy gradually compounds toward 1.5. Hard / Again ratings
// pull ease down, eroding the score. This is the "your ratings actually
// matter for the Chef level" wiring the user asked for.
export function masteryScore(state) {
  if (!state || state.repetitions < 1) return 0;
  if (state.ease < 2.0) return 0;
  return Math.max(0, Math.min(1.5, state.ease - 1.5));
}

// Sum of mastery across the whole progress map. This is the value the
// LevelChef + CEFR-tier thresholds are now indexed against.
export function chefScore(progress) {
  let total = 0;
  for (const s of Object.values(progress || {})) {
    total += masteryScore(s);
  }
  return total;
}

export function isMature(state) {
  return state && state.interval >= 21;
}

export function isDue(state, now = Date.now()) {
  return state && state.dueAt <= now;
}

export function dueIn(state, now = Date.now()) {
  if (!state) return 0;
  return Math.max(0, state.dueAt - now);
}

export function formatInterval(state) {
  if (!state) return 'new';
  if (state.interval < 1) return '<1d';
  if (state.interval < 30) return `${state.interval}d`;
  if (state.interval < 365) return `${Math.round(state.interval / 30)}mo`;
  return `${Math.round(state.interval / 365)}y`;
}

// Build the daily review queue: due cards first, then a sprinkle of new ones.
export function buildQueue(allWords, progress, { newPerDay = 10, max = 60 } = {}) {
  const now = Date.now();
  const due = [];
  const newCards = [];
  for (const w of allWords) {
    const st = progress[w.id];
    if (!st) {
      newCards.push({ word: w, state: null });
    } else if (st.dueAt <= now) {
      due.push({ word: w, state: st });
    }
  }
  due.sort((a, b) => a.state.dueAt - b.state.dueAt);
  return [...due, ...newCards.slice(0, newPerDay)].slice(0, max);
}

export function summarize(progress) {
  const states = Object.values(progress);
  const learned = states.filter(isLearned).length;
  const mature = states.filter(isMature).length;
  const due = states.filter((s) => isDue(s)).length;
  return {
    seen: states.length,
    learned,
    mature,
    due,
  };
}
