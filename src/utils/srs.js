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

// "Learned" = a card with at least 2 successful reps & ease >=2.0.
// Mirrors Anki's idea of "young" vs "mature" but kept compact.
export function isLearned(state) {
  return state && state.repetitions >= 2 && state.ease >= 2.0;
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
