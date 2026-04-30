import { motion } from 'framer-motion';
import LevelChef from './LevelChef.jsx';
import MindStones from './MindStones.jsx';
import StatCard from './StatCard.jsx';
import { LEVEL_META } from '../data/levels.js';
import { ALL_WORDS } from '../data/words.js';

export default function Dashboard({ progress, summary, learnedCount, onStartReview, onExplore }) {
  const totalWords = ALL_WORDS.length;
  const seenPct = Math.round((summary.seen / totalWords) * 100);

  return (
    <div className="space-y-8">
      <Hero
        learnedCount={learnedCount}
        due={summary.due}
        onStartReview={onStartReview}
        onExplore={onExplore}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cards due"
          value={summary.due.toLocaleString()}
          sub={summary.due > 0 ? 'Review now to keep streak' : 'No reviews waiting'}
          icon="⏳"
          accent="from-rose-400 to-fuchsia-500"
        />
        <StatCard
          label="Learned"
          value={summary.learned.toLocaleString()}
          sub={`${summary.mature.toLocaleString()} mature (>21d)`}
          icon="🌱"
          accent="from-emerald-400 to-teal-500"
        />
        <StatCard
          label="Seen"
          value={`${summary.seen.toLocaleString()}/${totalWords}`}
          sub={`${seenPct}% of catalog`}
          icon="📖"
          accent="from-sky-400 to-indigo-500"
        />
        <StatCard
          label="Avg ease"
          value={avgEase(progress)}
          sub="Higher = better recall"
          icon="✨"
          accent="from-amber-400 to-orange-500"
        />
      </div>

      <LevelChef learnedCount={learnedCount} />

      <MindStones learnedCount={learnedCount} />

      <LevelLadder progress={progress} />
    </div>
  );
}

function avgEase(progress) {
  const states = Object.values(progress);
  if (states.length === 0) return '—';
  const a = states.reduce((s, x) => s + x.ease, 0) / states.length;
  return a.toFixed(2);
}

function Hero({ learnedCount, due, onStartReview, onExplore }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-strong relative overflow-hidden rounded-[2rem] p-8 sm:p-10"
    >
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/30 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 bg-stars opacity-40" />

      <div className="relative grid items-center gap-8 lg:grid-cols-2">
        <div>
          <span className="pill mb-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            CEFR · spaced repetition · live Oxford-style entries
          </span>
          <h1 className="heading text-4xl leading-tight sm:text-5xl">
            Build a vocabulary <span className="shimmer-text">worth remembering.</span>
          </h1>
          <p className="mt-4 max-w-lg text-white/70">
            LexQuest pairs Anki-style spaced repetition with the Common European Framework so you
            always know exactly how far you've come — and what's next.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={onStartReview} className="btn-primary">
              {due > 0 ? `Review ${due} due card${due === 1 ? '' : 's'}` : 'Start a session'}
              <span aria-hidden>→</span>
            </button>
            <button onClick={onExplore} className="btn-ghost">
              Browse words
            </button>
          </div>
          <div className="mt-5 text-xs text-white/50">
            {learnedCount.toLocaleString()} words learned · all progress saved locally
          </div>
        </div>

        <div className="relative">
          <FloatingChips />
        </div>
      </div>
    </motion.div>
  );
}

function FloatingChips() {
  const chips = [
    { word: 'serendipity', sub: 'C1 · noun', x: 0, y: 0, delay: 0 },
    { word: 'resilient', sub: 'C1 · adj', x: 200, y: 60, delay: 0.2 },
    { word: 'community', sub: 'B1 · noun', x: 60, y: 160, delay: 0.4 },
    { word: 'beautiful', sub: 'A2 · adj', x: 240, y: 220, delay: 0.6 },
    { word: 'pellucid', sub: 'C2 · adj', x: 0, y: 280, delay: 0.8 },
  ];

  return (
    <div className="relative mx-auto h-80 w-full max-w-md">
      {chips.map((c, i) => (
        <motion.div
          key={c.word}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: c.delay, duration: 0.6 }}
          style={{ left: c.x, top: c.y }}
          className="absolute"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: c.delay }}
            className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 shadow-card backdrop-blur-xl"
          >
            <div className="font-display text-lg font-semibold">{c.word}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">{c.sub}</div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

function LevelLadder({ progress }) {
  // Show how many words from each CEFR level the user has seen / learned.
  const counts = {};
  for (const [id, state] of Object.entries(progress)) {
    const level = id.split('-')[0];
    counts[level] = counts[level] || { seen: 0, learned: 0 };
    counts[level].seen += 1;
    if (state.repetitions >= 2 && state.ease >= 2.0) counts[level].learned += 1;
  }
  return (
    <section>
      <h2 className="heading text-2xl">Progress by level</h2>
      <p className="mb-3 text-sm text-white/55">Each row shows learned / total for that band.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEVEL_META.map((meta) => {
          const c = counts[meta.code] || { seen: 0, learned: 0 };
          return (
            <div key={meta.code} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-lg`}
                >
                  {meta.emoji}
                </div>
                <div>
                  <div className="font-display text-sm font-semibold">
                    {meta.code} · {meta.title}
                  </div>
                  <div className="text-[11px] text-white/55">{meta.name}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-display text-lg font-bold">{c.learned}</div>
                  <div className="text-[10px] text-white/45">learned</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
