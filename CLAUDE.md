# CLAUDE.md — LexQuest project guide

This file is the contract for any AI assistant (Claude Code, Cursor, etc.) working
on the LexQuest codebase. Read it before making changes.

## What this project is

LexQuest is a **client-only React vocabulary trainer** built around three ideas:

1. **CEFR levels** (A1 → C2) — the user's level is computed from the count of
   "learned" words, with cooking-themed titles ("Apprentice Chef" → "Master Chef").
2. **Anki-style spaced repetition** — a simplified SM-2 algorithm in
   `src/utils/srs.js` schedules reviews. Cards have ease / interval / reps / lapses.
3. **Mind Stones** — six legendary stones unlocked at 10, 50, 200, 500, 1500, 4000
   learned words. Pure gamification UI on top of the same `learnedCount`.

There is **no backend** and **no auth**. All progress lives in `localStorage`
under the key `lexquest:progress`. Live dictionary lookups go to
`https://api.dictionaryapi.dev/api/v2/entries/en/<word>` with an in-memory cache.

## Stack

- **Vite 5** + **React 18** (function components, hooks only — no classes)
- **Tailwind CSS 3** for styling, **Framer Motion 11** for animation
- **No router** — `App.jsx` switches between four tabs by string state.
- **No state library** — `useState` + the `useLocalStorage` custom hook is
  enough. Don't introduce Redux / Zustand / Jotai unless requirements grow.

## Commands

```bash
npm install       # install deps
npm run dev       # vite dev server on :5173
npm run build     # production build → dist/
npm run preview   # serve the built dist/
```

Docker:

```bash
docker compose --profile prod up --build   # nginx on :8080
docker compose --profile dev  up --build   # vite HMR on :5173
```

## Where to make changes

| If you want to… | Edit |
| --- | --- |
| Add or rebalance vocabulary | `src/data/words.js` |
| Adjust CEFR thresholds, titles, or Mind Stone unlocks | `src/data/levels.js` |
| Change SRS math (interval growth, ease bounds, "learned" rule) | `src/utils/srs.js` |
| Tweak the daily queue size / new-cards-per-day | `SETTINGS` in `src/App.jsx` |
| Replace the dictionary source | `src/hooks/useDictionary.js` |
| Restyle the flashcard | `src/components/FlashCard.jsx` |
| Add a new top-level tab | `src/components/Header.jsx` (TABS array) + `App.jsx` switch |

## Conventions

- **One component per file**, default-exported.
- **Functional, hook-only** — no class components.
- **JSX, not TSX** — keep it lightweight; types live in JSDoc comments only when
  they earn their keep.
- **Tailwind-first** — there are a few project-level utilities in
  `src/index.css` (`.glass`, `.btn-primary`, `.shimmer-text`, `.bg-stars`,
  etc.). Prefer extending those over inline color literals.
- **Animation** — use `framer-motion`. Page transitions via `AnimatePresence` in
  `App.jsx`; per-element via `motion.div` with `initial` / `animate` / `exit`.
- **Comments are sparse**. They explain *why*, not *what*. The codebase is small
  enough that good names + types beat long comments.

## SRS contract

`src/utils/srs.js` exports:

- `newCardState()` — initial state for an unseen card.
- `review(state, rating)` — pure function, returns the next state. `rating` is
  `0|1|2|3` (Again / Hard / Good / Easy).
- `isLearned(state)` — `repetitions >= 2 && ease >= 2.0`. **This is the canonical
  rule that drives CEFR level + Mind Stones**. Don't change it casually.
- `buildQueue(allWords, progress, settings)` — produces the review queue: due
  cards first (by dueAt asc), then up to `newPerDay` fresh ones.
- `summarize(progress)` — aggregate stats for the dashboard.

If you change the schema of `state`, also bump the localStorage key (e.g.
`lexquest:progress:v2`) and migrate the old entries — otherwise existing users
will get NaN-like UI.

## Free Dictionary API gotchas

- Returns **404 on missing entries** — `useDictionary` surfaces this as an
  `error` and the FlashCard shows a graceful fallback.
- Multiple meanings come back; we sort to put the requested `pos` first so the
  card matches the data file's intent.
- Audio URLs may be missing; check `data.audio` before showing the play button.
- The hook caches in a module-level `Map`. That's fine for a session; if you
  ever need persistence, layer on `localStorage` — but be mindful of size.

## Adding new words

The `src/data/words.js` corpus is the public Oxford 3000/5000 list (A1–C1)
plus a curated C2 set, ~5,349 headwords total. Source:
[tyypgzl/Oxford-5000-words](https://github.com/tyypgzl/Oxford-5000-words).

To grow or rebalance:

1. **Append** `{ word, pos }` entries to the relevant `WORDS[level]` array.
2. Re-run `npm run dev` — `ALL_WORDS` is computed at module load, HMR picks
   the change up instantly.
3. Each entry's `id` is `${level}-${index}-${word}`. **Never reorder** existing
   arrays: `id` is the localStorage key, so reorders relocate user progress
   to different words.

Safer pattern when reorganizing: always append at the **end** of the array.

If you ever need to do a non-additive rewrite, bump the localStorage key
(`lexquest:progress` → `:v2`) and write a one-shot migration that drops state
records whose ID no longer resolves via `getWordById`.

## Adding new CEFR levels or stones

Modify `LEVEL_META` / `MIND_STONES` in `src/data/levels.js`. Both are arrays
read in order; the `threshold` field drives unlock logic via simple
linear scans (`levelForLearnedCount`, `unlockedStones`). Keep the arrays sorted
ascending by threshold.

## Testing

There are currently **no automated tests**. If you add logic-heavy code (new
SRS variants, importer, etc.), add a Vitest unit suite — the toolchain is
already Vite-native, so `vitest` integrates with one dev-dep.

## Don't

- Don't introduce a server — features that need server state should be replaced
  with a client-only equivalent or rejected.
- Don't break the localStorage schema silently. Add a migration.
- Don't add tracking, analytics, or telemetry. The README explicitly promises
  local-only progress.
- Don't hardcode color hex values in components — use the Tailwind theme tokens
  in `tailwind.config.js` or the CSS variables.

## Repo

Hosted at: https://github.com/Gingerman1996/English-leaning
