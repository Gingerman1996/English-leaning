import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDictionary, playAudio } from '../hooks/useDictionary.js';
import { speak, ttsAvailable } from '../hooks/useSpeech.js';
import { lookupWord } from '../utils/tokenizer.js';
import { newCardState, review } from '../utils/srs.js';
import { LEVEL_META } from '../data/levels.js';

// Free-form lookup for any word in the article that ISN'T highlighted —
// proper nouns, technical terms, conjugations our stemmer missed, or words
// outside our CEFR corpus entirely. Type the word, see definition + audio,
// and (if it happens to be in our CEFR list) tick "I know it" to feed SRS.
//
// Optional `seedWord` prop: when given, pre-populates the active query
// (used by the Lookup panel to re-open a word from recent-lookup history).
// Optional `onLookup` callback: fires whenever a lookup happens, so the
// Lookup panel can persist it to lookupHistory in localStorage.

export default function WordLookup({ progress, setProgress, seedWord, onLookup }) {
  const [query, setQuery] = useState(seedWord || '');
  const [active, setActive] = useState(seedWord || '');

  useEffect(() => {
    if (seedWord) {
      setQuery(seedWord);
      setActive(seedWord);
    }
  }, [seedWord]);

  function onSubmit(e) {
    e.preventDefault();
    const w = query.trim().toLowerCase().replace(/[^a-z'-]/g, '');
    setActive(w);
    if (w && onLookup) {
      const entry = lookupWord(w);
      onLookup({ word: w, level: entry?.level || null });
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-white/55">
          Look up any word
        </span>
        <span className="text-[10px] text-white/45">
          Words not highlighted? Type them here.
        </span>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. photosynthesis, archipelago…"
          className="flex-1 rounded-2xl border border-white/15 bg-black/30 px-3 py-2 text-sm placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="btn-ghost px-4 py-2 disabled:opacity-50"
        >
          Look up
        </button>
      </form>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-3"
          >
            <LookupResult
              word={active}
              progress={progress}
              setProgress={setProgress}
              onClose={() => setActive('')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LookupResult({ word, progress, setProgress, onClose }) {
  const entry = lookupWord(word);
  const { data, loading, error } = useDictionary(word, entry?.pos);

  const meta = entry ? LEVEL_META.find((l) => l.code === entry.level) : null;
  const def = data?.definitions?.[0]?.text;

  function markKnown() {
    if (!entry) return;
    const prev = progress[entry.id];
    const next = review(prev || newCardState(), 2);
    setProgress({ ...progress, [entry.id]: next });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold">{word}</span>
          {data?.phonetic && (
            <span className="text-xs text-white/55">{data.phonetic}</span>
          )}
          {meta && (
            <span
              className={`rounded-full bg-gradient-to-r ${meta.accent} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white`}
            >
              {entry.level}
            </span>
          )}
          {!entry && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/65">
              outside CEFR list
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white">×</button>
      </div>
      <div className="mt-2 min-h-[2em] text-sm text-white/85">
        {loading && <span className="text-white/55">Looking up…</span>}
        {!loading && error && (
          <span className="text-amber-200/85">No definition found.</span>
        )}
        {!loading && !error && def && <span>{def}</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {data?.audio && (
          <button
            onClick={() => playAudio(data.audio)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
          >
            🔊 native
          </button>
        )}
        {ttsAvailable() && (
          <button
            onClick={() => speak(word)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
          >
            🗣️ say
          </button>
        )}
        {entry && (
          <button
            onClick={markKnown}
            className="ml-auto rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/35"
          >
            ✓ I know it
          </button>
        )}
      </div>
    </div>
  );
}
