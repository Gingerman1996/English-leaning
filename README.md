# LexQuest — Beautiful English Vocabulary

Gamified English vocabulary learning app with **CEFR levels**, **Anki-style spaced repetition**, and the **Mind Stones** progression system. Built with React + Vite + Tailwind + Framer Motion. Live word data is fetched from the open [Free Dictionary API](https://dictionaryapi.dev/) (Oxford / Wiktionary derived).

![hero](https://img.shields.io/badge/CEFR-A1%E2%86%92C2-7c3aed) ![SRS](https://img.shields.io/badge/SRS-Anki%20style-22d3ee) ![Stack](https://img.shields.io/badge/React-Vite-3b82f6)

## Features

- **CEFR Level Chef** — 6-tier progression (A1 → C2) with cooking-themed titles, from *Apprentice Chef* to *Master Chef*. The threshold table is the canonical Oxford / Cambridge band.
- **Mind Stones** — six legendary stones that you forge by reaching milestones (10, 50, 200, 500, 1500, 4000 words learned). Each stone has its own glow, color, and lore.
- **Anki-style SRS** — simplified SM-2: cards have ease, interval, repetitions, and lapses; reviewer rates recall on a 0–3 scale (Again / Hard / Good / Easy) and the next due date is computed accordingly.
- **Live dictionary entries** — phonetic, audio playback, multiple definitions, examples, synonyms, all fetched on demand and cached in memory.
- **Beautiful, animated UI** — glassmorphism, floating cards, animated stones, gradient meters, all powered by Framer Motion.
- **Local-only progress** — everything saved in `localStorage`, no account, no backend.
- **Docker-ready** — multi-stage Dockerfile with a `dev` profile (Vite HMR) and `prod` profile (nginx).

## Quick start

### Local Node

```bash
npm install
npm run dev    # http://localhost:5173
```

### Docker — production (nginx, port 8080)

```bash
docker compose --profile prod up --build
# open http://localhost:8080
```

### Docker — development (Vite HMR, port 5173)

```bash
docker compose --profile dev up --build
# open http://localhost:5173
```

### One-shot Docker build

```bash
docker build -t lexquest .
docker run --rm -p 8080:80 lexquest
```

## Project layout

```
src/
├── App.jsx                  # tab router + global state
├── main.jsx
├── index.css                # Tailwind base + custom utilities
├── data/
│   ├── words.js             # CEFR-leveled vocabulary (A1–C2)
│   └── levels.js            # CEFR metadata + Mind Stones definitions
├── hooks/
│   ├── useDictionary.js     # Free Dictionary API + in-memory cache
│   └── useStorage.js        # tiny useLocalStorage wrapper
├── utils/
│   └── srs.js               # SM-2 simplified spaced repetition
└── components/
    ├── Header.jsx
    ├── Dashboard.jsx        # hero, stats, level, stones, ladder
    ├── LevelChef.jsx        # current CEFR tier with progress
    ├── MindStones.jsx       # six animated gem cards
    ├── ReviewSession.jsx    # SRS review queue
    ├── FlashCard.jsx        # individual flashcard w/ live def
    ├── WordExplorer.jsx     # browse & mark words by level
    ├── StatCard.jsx
    └── Logo.jsx
```

## How the SRS works

Each card stores `{ ease, interval, repetitions, dueAt, lapses }`.
After a review, the algorithm in `src/utils/srs.js` updates these:

| Rating | Effect |
| --- | --- |
| **Again** (0) | reps reset, due today, ease −0.20, lapse +1 |
| **Hard** (1) | interval *= ease, ease −0.15 |
| **Good** (2) | interval *= ease, ease unchanged |
| **Easy** (3) | interval *= ease, ease +0.15 |

A word is considered **learned** once `repetitions ≥ 2` and `ease ≥ 2.0`. That count drives both the CEFR tier and the Mind Stones.

## Configuration

`SETTINGS` in `App.jsx` controls the daily queue:

```js
const SETTINGS = { newPerDay: 12, max: 80 };
```

## Deploying

Build outputs static assets to `dist/`. They're framework-agnostic — drop them on any static host (Netlify, Vercel, S3, GitHub Pages, nginx, etc.). The included `nginx.conf` already handles SPA fallback and asset caching.

## License

MIT.
