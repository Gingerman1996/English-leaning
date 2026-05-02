import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useStorage.js';
import { LEVELS } from '../data/words.js';

// ───────────────────────────────────────────────────────────────────────────
// Auto level-up algorithm
//
// Each completed reading session contributes a "mastery" ratio:
//     mastery = known target/challenge words ÷ total target/challenge words
//
// We classify the session as:
//     pass    — mastery ≥ 0.90 AND ≥ MIN_TARGET_WORDS in the article
//     fail    — mastery < 0.70 (resets the consecutive-pass streak)
//     neutral — anything in between (keeps the streak unchanged)
//
// After PROMOTE_AFTER_PASSES consecutive passes at the user's CURRENT level,
// they are auto-promoted: `levelOverride` is set to the next CEFR rung. The
// counter resets and the recent-history is also pruned to articles at the
// new level so it doesn't carry over stale credit.
//
// We don't promote past C2 (the top tier). Demotion is not automatic — the
// user can manually reset `levelOverride` to null to fall back to the
// learnedCount-derived level if they feel stuck.
// ───────────────────────────────────────────────────────────────────────────

export const PROMOTE_AFTER_PASSES = 3;
export const PASS_THRESHOLD = 0.9;
export const FAIL_THRESHOLD = 0.7;
export const MIN_TARGET_WORDS = 5;

const STORAGE_KEY = 'lenglist:reading';
const initialState = {
  levelOverride: null,
  history: [], // [{ ts, title, level, total, known, mastery, outcome, source, url }]
  lookupHistory: [], // [{ ts, word, level }]  — populated by Lookup panel
  consecutivePasses: 0,
  totalArticlesRead: 0,
  lastPromotedAt: null,
};

export function useReadingProgress() {
  const [state, setState] = useLocalStorage(STORAGE_KEY, initialState);

  // recordArticle should be called when the user explicitly finishes an
  // article (clicks "I'm done"). Returns { promoted, fromLevel, toLevel }
  // so the caller can show a celebration toast.
  const recordArticle = useCallback(
    ({ title, level, total, known, source, url }) => {
      let promotion = null;
      setState((prev) => {
        const safeLevel = level || 'A1';
        const ratio = total > 0 ? known / total : 0;
        let outcome = 'neutral';
        if (total >= MIN_TARGET_WORDS) {
          if (ratio >= PASS_THRESHOLD) outcome = 'pass';
          else if (ratio < FAIL_THRESHOLD) outcome = 'fail';
        }
        const entry = {
          ts: Date.now(),
          title,
          level: safeLevel,
          total,
          known,
          mastery: ratio,
          outcome,
          source: source || 'wikipedia',
          url: url || null,
        };
        const newHistory = [...(prev.history || []), entry].slice(-15);

        let consecutivePasses = prev.consecutivePasses || 0;
        if (outcome === 'pass') consecutivePasses += 1;
        else if (outcome === 'fail') consecutivePasses = 0;

        let levelOverride = prev.levelOverride;
        let lastPromotedAt = prev.lastPromotedAt;
        if (consecutivePasses >= PROMOTE_AFTER_PASSES) {
          const idx = LEVELS.indexOf(safeLevel);
          if (idx >= 0 && idx < LEVELS.length - 1) {
            promotion = { fromLevel: safeLevel, toLevel: LEVELS[idx + 1] };
            levelOverride = LEVELS[idx + 1];
            consecutivePasses = 0;
            lastPromotedAt = Date.now();
          }
        }

        return {
          ...prev,
          history: newHistory,
          consecutivePasses,
          levelOverride,
          lastPromotedAt,
          totalArticlesRead: (prev.totalArticlesRead || 0) + 1,
        };
      });
      return promotion;
    },
    [setState]
  );

  // Track Lookup-panel queries so the panel can show "recent lookups"
  // without losing them across page reloads. Dedupes by lowercase word
  // (most-recent wins).
  const recordLookup = useCallback(
    ({ word, level }) => {
      const w = (word || '').trim().toLowerCase();
      if (!w) return;
      setState((prev) => {
        const filtered = (prev.lookupHistory || []).filter((e) => e.word !== w);
        return {
          ...prev,
          lookupHistory: [{ ts: Date.now(), word: w, level: level || null }, ...filtered].slice(0, 30),
        };
      });
    },
    [setState]
  );

  const clearLookupHistory = useCallback(
    () => setState((prev) => ({ ...prev, lookupHistory: [] })),
    [setState]
  );

  const setLevelOverride = useCallback(
    (level) => setState((prev) => ({ ...prev, levelOverride: level })),
    [setState]
  );

  const resetLevelOverride = useCallback(
    () => setState((prev) => ({ ...prev, levelOverride: null, consecutivePasses: 0 })),
    [setState]
  );

  const recentHistory = useMemo(
    () => (state.history || []).slice(-PROMOTE_AFTER_PASSES),
    [state.history]
  );

  return {
    state,
    recentHistory,
    recordArticle,
    recordLookup,
    clearLookupHistory,
    setLevelOverride,
    resetLevelOverride,
  };
}
