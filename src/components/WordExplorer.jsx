import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LEVELS, WORDS } from '../data/words.js';
import { LEVEL_META } from '../data/levels.js';
import { useDictionary, playAudio } from '../hooks/useDictionary.js';
import { isLearned, newCardState, review } from '../utils/srs.js';

function WordRow({ entry, level, state, onMark, onOpen, isOpen }) {
  const meta = LEVEL_META.find((l) => l.code === level);
  const learned = isLearned(state);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-sm font-bold text-white shadow`}
          >
            {level}
          </span>
          <div>
            <div className="font-display text-lg font-semibold">{entry.word}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{entry.pos}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {learned ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-100">learned</span>
          ) : state ? (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-100">
              learning · {state.repetitions} reps
            </span>
          ) : (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-white/55">new</span>
          )}
          <span className="text-white/40">{isOpen ? '▾' : '▸'}</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <DefinitionPanel entry={entry} state={state} onMark={onMark} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DefinitionPanel({ entry, state, onMark }) {
  const { data, loading, error } = useDictionary(entry.word, entry.pos);

  return (
    <div className="border-t border-white/10 bg-black/20 p-5">
      {loading && <p className="text-white/60 text-sm">Loading definition…</p>}
      {error && (
        <p className="text-amber-200/80 text-sm">
          Couldn't fetch a live definition (network or no entry). You can still mark progress.
        </p>
      )}
      {data && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {data.phonetic && (
              <span className="font-mono text-sm text-white/60">{data.phonetic}</span>
            )}
            {data.audio && (
              <button
                onClick={() => playAudio(data.audio)}
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs hover:bg-white/15"
              >
                🔊 listen
              </button>
            )}
          </div>
          <ol className="space-y-2 text-sm">
            {data.definitions.map((d, i) => (
              <li key={i} className="rounded-xl bg-white/[0.05] p-3">
                <span className="text-[10px] uppercase tracking-widest text-white/45">{d.pos}</span>
                <div className="text-white/90">{d.text}</div>
                {d.example && (
                  <div className="mt-1 text-xs italic text-white/55">“{d.example}”</div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button onClick={() => onMark('again')} className="btn-ghost px-3 py-2 text-xs">
          Mark hard
        </button>
        <button
          onClick={() => onMark('good')}
          className="rounded-2xl bg-emerald-500/20 px-3 py-2 font-semibold text-emerald-100 hover:bg-emerald-500/30"
        >
          I know this
        </button>
        <button
          onClick={() => onMark('easy')}
          className="rounded-2xl bg-sky-500/20 px-3 py-2 font-semibold text-sky-100 hover:bg-sky-500/30"
        >
          Mark mastered
        </button>
        {state && (
          <span className="ml-auto self-center text-[11px] text-white/45">
            ease {state.ease.toFixed(2)} · interval {state.interval}d · reps {state.repetitions}
          </span>
        )}
      </div>
    </div>
  );
}

export default function WordExplorer({ progress, setProgress }) {
  const [activeLevel, setActiveLevel] = useState('A1');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const list = useMemo(() => {
    const items = WORDS[activeLevel].map((w, idx) => ({
      ...w,
      id: `${activeLevel}-${idx}-${w.word}`,
    }));
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((w) => w.word.toLowerCase().includes(q));
  }, [activeLevel, query]);

  function rate(entry, kind) {
    const ratingMap = { again: 0, hard: 1, good: 2, easy: 3 };
    const prev = progress[entry.id] || newCardState();
    const next = review(prev, ratingMap[kind]);
    setProgress({ ...progress, [entry.id]: next });
  }

  return (
    <div>
      <div className="glass mb-5 rounded-3xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => {
              const meta = LEVEL_META.find((m) => m.code === l);
              const active = activeLevel === l;
              return (
                <button
                  key={l}
                  onClick={() => setActiveLevel(l)}
                  className={[
                    'rounded-2xl px-3 py-1.5 text-sm font-semibold transition',
                    active
                      ? `bg-gradient-to-r ${meta.accent} text-white shadow`
                      : 'bg-white/5 text-white/65 hover:bg-white/10',
                  ].join(' ')}
                >
                  {meta.emoji} {l}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-white/45">
              {LEVEL_META.find((m) => m.code === activeLevel).title}
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search words…"
              className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm placeholder:text-white/35 focus:border-white/25 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {list.map((entry) => (
          <WordRow
            key={entry.id}
            entry={entry}
            level={activeLevel}
            state={progress[entry.id]}
            isOpen={openId === entry.id}
            onOpen={() => setOpenId(openId === entry.id ? null : entry.id)}
            onMark={(kind) => rate(entry, kind)}
          />
        ))}
        {list.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-white/55">
            No matches — try another search.
          </div>
        )}
      </div>
    </div>
  );
}
