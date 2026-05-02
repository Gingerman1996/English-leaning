import { motion } from 'framer-motion';
import { LEVEL_META } from '../data/levels.js';
import { isLearned, newCardState, review } from '../utils/srs.js';
import { speak, ttsAvailable } from '../hooks/useSpeech.js';

// A checklist of every highlighted word in the current article. The user
// ticks a box to mark a word as "I already know it"; this fires the same
// SRS update as the inline popover, so the percentage feeds straight into
// the level-up algorithm.

export default function VocabChecklist({ words, progress, setProgress }) {
  if (words.length === 0) return null;

  const known = words.filter((w) => isLearned(progress[w.entry.id])).length;
  const ratio = words.length > 0 ? known / words.length : 0;
  const pct = Math.round(ratio * 100);

  function toggle(entry) {
    const prev = progress[entry.id];
    if (isLearned(prev)) return; // Already learned; no-op (UX: no demotion).
    const next = review(prev || newCardState(), 2); // Good
    setProgress({ ...progress, [entry.id]: next });
  }

  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/60">
          Vocabulary in this article
        </span>
        <span className="text-xs text-white/65">
          <span className="font-semibold text-emerald-200">{known}</span>
          <span className="text-white/45"> / {words.length} known · {pct}%</span>
        </span>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full ${pct >= 90 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-fuchsia-500 to-indigo-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {words.map(({ entry, kind, count }) => {
          const meta = LEVEL_META.find((l) => l.code === entry.level);
          const checked = isLearned(progress[entry.id]);
          return (
            <li key={entry.id}>
              <label
                className={[
                  'flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm transition',
                  checked
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
                    : 'bg-white/[0.04] hover:bg-white/[0.08]',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(entry)}
                  disabled={checked}
                  className="h-4 w-4 cursor-pointer accent-emerald-500"
                />
                <span className="flex-1 font-medium">{entry.word}</span>
                <span
                  className={[
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                    kind === 'challenge' ? 'bg-amber-400/25 text-amber-100' : 'bg-emerald-400/20 text-emerald-100',
                  ].join(' ')}
                >
                  {entry.level}
                </span>
                {count > 1 && (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/55">
                    ×{count}
                  </span>
                )}
                {ttsAvailable() && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); speak(entry.word); }}
                    className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/15"
                    title="Hear it"
                  >
                    🔊
                  </button>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
