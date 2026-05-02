import { motion } from 'framer-motion';
import {
  LEVEL_META,
  levelForLearnedCount,
  nextLevelForLearnedCount,
  progressInLevel,
} from '../data/levels.js';

// `chefXP` is the ease-weighted score from utils/srs.js → chefScore(progress).
// We index the same CEFR thresholds against it so the bar progresses based on
// how well the user actually rates their cards (Easy contributes more, Hard
// contributes less, Again pulls it down).
export default function LevelChef({ chefXP, learnedCount }) {
  const score = chefXP ?? learnedCount ?? 0;
  const current = levelForLearnedCount(score);
  const next = nextLevelForLearnedCount(score);
  const progress = progressInLevel(score);
  const remaining = next ? Math.max(0, next.threshold - score) : 0;

  // Format Chef XP with one decimal so 47.5 doesn't round to a flat 48.
  const fmt = (n) => Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-6">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${current.accent} opacity-15`}
      />
      <div className="relative grid items-center gap-6 md:grid-cols-[auto,1fr]">
        <motion.div
          initial={{ scale: 0.7, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          className="relative"
        >
          <div
            className="absolute inset-0 -z-10 animate-float rounded-full blur-2xl"
            style={{ background: current.color, opacity: 0.45 }}
          />
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${current.accent} text-6xl shadow-glow`}
          >
            <span className="drop-shadow-lg">{current.emoji}</span>
          </div>
        </motion.div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="heading text-3xl">{current.code} · {current.name}</h3>
            <span className="text-sm text-white/65">aka {current.title}</span>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-white/75">{current.description}</p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/65">
              <span>
                <strong className="text-white">{fmt(score)}</strong> Chef XP
                {next && ` · ${fmt(remaining)} to ${next.code}`}
              </span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${current.accent}`}
              />
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
              ratings: Easy gives more · Hard gives less · Again pulls back
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {LEVEL_META.map((l) => (
              <span
                key={l.code}
                className={[
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  l.code === current.code
                    ? 'bg-white text-slate-900 shadow'
                    : score >= l.threshold
                    ? 'bg-white/15 text-white/80'
                    : 'bg-white/5 text-white/45',
                ].join(' ')}
              >
                {l.code}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
