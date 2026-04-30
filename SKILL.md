---
name: lenglist-vocab-coach
description: Coach a user through learning English vocabulary with the LengList stack — CEFR levels, Anki-style spaced repetition, and Mind Stones gamification. Use when the user wants to add words to their study queue, plan a review session, interpret their progress, or extend the LengList codebase. The skill assumes the user is running the LengList React app locally (npm run dev) or in Docker, with progress persisted in localStorage under the key `lenglist:progress`.
---

# LengList Vocab Coach

A focused skill for working with the LengList vocabulary trainer.

## When to use this skill

Trigger when the user is:

- **Studying** with LengList and wants you to explain a result, recommend a
  daily target, or pick a CEFR level to focus on.
- **Extending** the app — adding word lists, tweaking the SRS algorithm,
  adjusting Mind Stone thresholds, or restyling the UI.
- **Debugging** their progress — e.g. "why is this word still in my queue?"
  or "how is my level computed?"

Don't trigger on generic vocabulary questions unrelated to the app.

## Mental model

```
       ┌────────────┐    review()    ┌──────────────┐
       │  user rate │ ───────────────▶│ card state   │
       │ 0 / 1 / 2 / 3                │ ease, interval, reps │
       └────────────┘                 └──────────────┘
                                              │
                                              ▼
                            isLearned(state) ?
                                              │
                                              ▼
                            learnedCount ── drives ──▶ CEFR tier (A1…C2)
                                              │
                                              └─ drives ──▶ Mind Stones unlocks
```

A word becomes **learned** when `repetitions ≥ 2` and `ease ≥ 2.0`. The
"Apprentice Chef → Master Chef" titles map onto CEFR thresholds (0 / 500 /
1000 / 2000 / 4000 / 8000 learned words). Mind Stones unlock at 10, 50, 200,
500, 1500, 4000.

## Routine tasks

### "Plan my session for today"

1. Read `summary.due` from the dashboard (or compute via `summarize(progress)`).
2. If `due > 0`, advise the user to clear due cards first — that's the
   foundation of SM-2's correctness.
3. Suggest **+10–15 new cards** as a sustainable daily intake.
4. Recommend the lowest CEFR level still under 80% mastery.

### "Why is this word stuck?"

Inspect the card state in localStorage:

```js
JSON.parse(localStorage.getItem('lenglist:progress'))['<id>']
```

Stuck signals: `lapses > 3`, `ease < 1.6`. Recommend:

- Re-rate as **Easy** only if recall is genuinely instant.
- Add a personal mnemonic and revisit the **example sentence** in the card.
- If the card is failing because the definition is wrong / unhelpful, the
  Free Dictionary entry might be off — check the source URLs in the
  `data.sourceUrls` field.

### "Add a word list (e.g. TOEIC, IELTS, GRE)"

1. Add a new array to `WORDS` in `src/data/words.js` keyed by your tag (e.g.
   `WORDS.TOEIC = [...]`). Each entry: `{ word, pos }`.
2. Add the tag to `LEVELS` if you want it to show up as a level filter.
3. Append (don't reorder) to keep existing user progress intact, since
   IDs are `${level}-${index}-${word}`.

### "Change the daily queue size"

Edit `SETTINGS` in `src/App.jsx`:

```js
const SETTINGS = { newPerDay: 12, max: 80 };
```

Higher `newPerDay` accelerates learning but increases tomorrow's review
load. Sensible range: 5–20.

### "Why don't I have stone X yet?"

`MIND_STONES` thresholds in `src/data/levels.js`:

| Stone | Threshold |
| --- | --- |
| Spark | 10 |
| Tide | 50 |
| Mind | 200 |
| Soul | 500 |
| Time | 1500 |
| Reality | 4000 |

`learnedCount` is the gate, not `seen`. Reviewing a card you got "Again" on
won't move the needle until reps reaches 2 with ease ≥ 2.0.

## Pitfalls to flag

- **Reordering `WORDS[level]` arrays** silently moves user progress to
  different words because IDs are positional. Always append at the end.
- **Resetting localStorage** wipes everything — no backup. Don't do this in a
  fix without a clear export path.
- **Free Dictionary API** is a community service with no SLA. If lookups
  start failing, surface the error to the user and consider a fallback.
- **The `isLearned` rule** drives CEFR + Stones simultaneously. Changing it
  changes both at once. Decide consciously.

## Useful snippets

**Export current progress as JSON** (in browser console):

```js
copy(JSON.stringify(JSON.parse(localStorage['lenglist:progress'])))
```

**Reset progress completely**:

```js
localStorage.removeItem('lenglist:progress'); location.reload();
```

**Compute current level from a count**:

```js
import { levelForLearnedCount } from './src/data/levels.js';
levelForLearnedCount(640).code; // 'A2'
```

## Out of scope

- Spaced repetition for full sentences (LengList is word-level by design)
- Social / leaderboard features (the project is intentionally local-only)
- Cloud pronunciation services (e.g. Azure Speech) — pronunciation runs
  on-device via Whisper-tiny.en through Transformers.js
