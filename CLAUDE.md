# CLAUDE.md — LengList project guide

This file is the contract for any AI assistant (Claude Code, Cursor, etc.) working
on the LengList codebase. Read it before making changes.

## What this project is

LengList is a **client-only React vocabulary trainer** built around four ideas:

1. **CEFR levels** (A1 → C2) — the user's level is computed from the count of
   "learned" words, with cooking-themed titles ("Apprentice Chef" → "Master Chef").
2. **Anki-style spaced repetition** — a simplified SM-2 algorithm in
   `src/utils/srs.js` schedules reviews. Cards have ease / interval / reps / lapses.
3. **Mind Stones** — six legendary stones unlocked at 10, 50, 200, 500, 1500, 4000
   learned words. Pure gamification UI on top of the same `learnedCount`.
4. **On-device pronunciation scoring** — Whisper-tiny.en running in the browser
   via Transformers.js, with a phonetic-similarity scorer in
   `src/utils/phonetics.js`. No audio ever leaves the device.

There is **no backend** and **no auth**. All progress lives in `localStorage`
under the key `lenglist:progress`. Live dictionary lookups go to
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
| Replace the real-world examples source | `src/hooks/useContextExamples.js` |
| Tweak the Reader article source | `src/hooks/useArticleSearch.js`, `useArticleContent.js` |
| Adjust word-highlighting heuristics in the Reader | `src/utils/tokenizer.js` (lookup, stems, classify) |
| Swap the speech model (e.g. whisper-base) | `src/hooks/useWhisper.js` (model id) |
| Tune the pronunciation scoring rules | `src/utils/phonetics.js` |
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
`lenglist:progress:v2`) and migrate the old entries — otherwise existing users
will get NaN-like UI.

## Pronunciation pipeline

Files: `src/hooks/useWhisper.js`, `src/components/PronunciationCheck.jsx`,
`src/utils/phonetics.js`. The flow is:

1. `useWhisper` lazy-loads the `Xenova/whisper-tiny.en` pipeline via
   `@huggingface/transformers`. The 40 MB model is fetched from
   `huggingface.co` and cached by the browser's Cache API. A module-level
   singleton `pipelinePromise` ensures it's loaded once per session.
2. `MediaRecorder` captures audio as webm/opus. On stop, the blob is decoded
   via `AudioContext.decodeAudioData`, mixed to mono, and resampled to 16 kHz
   with `OfflineAudioContext`.
3. The Float32Array is passed to the Whisper pipeline, which returns text.
4. `scorePronunciation(target, heard)` in `phonetics.js` returns 0–100 using
   the best of (exact match, Soundex match, Levenshtein-derived similarity)
   across each word in the transcript.

Vite needs `optimizeDeps.exclude: ['@huggingface/transformers']` (already
set) — pre-bundling breaks the dynamic ONNX runtime loader. The transformers
chunk is also split out via `manualChunks` so the initial bundle stays light;
it's only fetched when the user clicks the mic.

**Don't** introduce a server proxy for model files — the model URL is
configured to go directly to the HF CDN and benefits from cross-origin
caching. Adding a proxy would force every user to re-download.

## Reader (Learn from Reading)

`src/components/Reader.jsx` is a topic-driven reading practice surface:

1. User types a topic → `useArticleSearch` hits MediaWiki search on
   `simple.wikipedia.org` (A1/A2) or `en.wikipedia.org` (B1+).
2. User picks a result → `useArticleContent` fetches the plain-text
   extract via `prop=extracts&explaintext=1` and splits it into
   paragraphs (drops boilerplate like "See also").
3. Each paragraph is tokenized by `src/utils/tokenizer.js`, which
   classifies every word against the user's current CEFR level:

   | Class | Highlight | Meaning |
   | --- | --- | --- |
   | `target` | green underline | at the user's level, not yet learned |
   | `challenge` | amber wavy underline | above the user's level |
   | `learned` | none | user has graduated this word |
   | `easy` | none | below the user's level |
   | `unknown` | none | not in our CEFR corpus |

4. Highlighted words are wrapped in `InteractiveWord`, which opens a
   popover with the definition (via `useDictionary`), native audio +
   browser TTS, and an "I know it" button that calls `review(state, 2)`
   (Anki "Good") to push the card into the SRS pipeline.

The lookup map (`WORD_INDEX`) is a module-level singleton built once
at import. The naive stemmer in `tokenizer.js` handles trivial
inflections (`running` → `run`, `studies` → `study`) — sufficient for
Wikipedia text without pulling in a 200 KB NLP library.

### Auto level-up algorithm

`src/hooks/useReadingProgress.js` owns reading-session state, stored
under `localStorage` key `lenglist:reading`:

```js
{
  levelOverride: 'A2' | null,    // takes precedence over derived level
  history: [{ ts, title, level, total, known, mastery, outcome }],
  consecutivePasses: 0,
  totalArticlesRead: 0,
  lastPromotedAt: null,
}
```

When the user clicks "Mark article complete" in the Reader,
`recordArticle({ title, level, total, known })` is called. Mastery =
`known / total`. The session is classified:

  - `pass`    — mastery ≥ 0.90 AND total ≥ 5 highlighted words
  - `fail`    — mastery < 0.70 (resets the streak)
  - `neutral` — anything in between (streak unchanged)

After **three consecutive passes** at the user's CURRENT level,
`levelOverride` advances to the next CEFR rung. The streak resets and
a celebration toast is shown. The function returns
`{ fromLevel, toLevel }` so the caller can render the toast.

Promotion stops at C2. The user can manually reset `levelOverride` via
`resetLevelOverride()` to fall back to the learnedCount-derived level.

### Vocabulary checklist + word lookup

`VocabChecklist` (below the article) lists every unique target /
challenge word in the article with a checkbox. Ticking marks the
word as known via `review(state, 2)` ("Good"). The percentage feeds
straight into the auto-level-up calculation.

`WordLookup` is a free-form input above the checklist for words that
*aren't* highlighted — proper nouns, technical terms, conjugations
the stemmer missed. Type and submit; if the word maps into our CEFR
list, you get the level chip and "I know it" button. Otherwise you
get the dictionary definition + audio so you can still learn it,
even if it doesn't feed SRS.

## Free Dictionary API gotchas

- Returns **404 on missing entries** — `useDictionary` surfaces this as an
  `error` and the FlashCard shows a graceful fallback.
- Multiple meanings come back; we sort to put the requested `pos` first so the
  card matches the data file's intent.
- Audio URLs may be missing; check `data.audio` before showing the play button.
- The hook caches in a module-level `Map`. That's fine for a session; if you
  ever need persistence, layer on `localStorage` — but be mindful of size.

## Adding new words

The `src/data/words.js` corpus is parsed from the **official American
Oxford 3000 / 5000 PDFs** (A1–C1) plus a curated C2 set, **4,989
headwords** total. Source: [oxfordlearnersdictionaries.com](https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000).
Words are cross-deduped — a word that appears at A1 will not also appear at
B2, even if Oxford 5000 lists it as a B2 expansion.

To grow or rebalance:

1. **Append** `{ word, pos }` entries to the relevant `WORDS[level]` array.
2. Re-run `npm run dev` — `ALL_WORDS` is computed at module load, HMR picks
   the change up instantly.
3. Each entry's `id` is `${level}-${index}-${word}`. **Never reorder** existing
   arrays: `id` is the localStorage key, so reorders relocate user progress
   to different words.

Safer pattern when reorganizing: always append at the **end** of the array.

If you ever need to do a non-additive rewrite, bump the localStorage key
(`lenglist:progress` → `:v2`) and write a one-shot migration that drops state
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
