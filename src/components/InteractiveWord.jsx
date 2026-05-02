import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDictionary, playAudio } from '../hooks/useDictionary.js';
import { speak, ttsAvailable } from '../hooks/useSpeech.js';
import { newCardState, review } from '../utils/srs.js';
import { LEVEL_META } from '../data/levels.js';

const KIND_STYLES = {
  // Highlight intensity: target (your level) > challenge (above) > easy/learned (none)
  target: 'underline decoration-emerald-400 decoration-2 underline-offset-4 cursor-pointer hover:bg-emerald-400/20 rounded px-0.5',
  challenge: 'underline decoration-amber-400 decoration-wavy decoration-2 underline-offset-4 cursor-pointer hover:bg-amber-400/20 rounded px-0.5',
  easy: '',
  learned: '',
  unknown: '',
};

export default function InteractiveWord({ token, kind, entry, progress, setProgress }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Click outside to close, and Escape key.
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const className = KIND_STYLES[kind] || '';
  if (!className) {
    // Plain word — render as text node, no wrapper.
    return token;
  }

  function markKnown() {
    if (!entry) return;
    const prev = progress[entry.id] || newCardState();
    const next = review(prev, 2); // Good
    setProgress({ ...progress, [entry.id]: next });
    setOpen(false);
  }

  return (
    <span ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={className + ' bg-transparent border-0 p-0 m-0 text-inherit font-inherit'}
        type="button"
      >
        {token}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-900/95 p-3 text-left shadow-card backdrop-blur-xl"
          >
            <Popover entry={entry} kind={kind} onClose={() => setOpen(false)} onMarkKnown={markKnown} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

function Popover({ entry, kind, onClose, onMarkKnown }) {
  const { data, loading } = useDictionary(entry.word, entry.pos);
  const meta = LEVEL_META.find((l) => l.code === entry.level);

  const def = data?.definitions?.[0]?.text;

  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={`rounded-full bg-gradient-to-r ${meta?.accent || 'from-fuchsia-500 to-violet-500'} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white`}
        >
          {entry.level} · {kind === 'challenge' ? 'above your level' : 'your level'}
        </span>
        <button onClick={onClose} className="text-white/40 hover:text-white">×</button>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xl font-bold">{entry.word}</span>
        {data?.phonetic && <span className="text-xs text-white/55">{data.phonetic}</span>}
        <span className="ml-auto text-[10px] uppercase tracking-widest text-white/45">{entry.pos}</span>
      </div>
      <div className="mt-2 min-h-[2.5em] text-white/85">
        {loading && <span className="text-white/55">Loading meaning…</span>}
        {!loading && def && <span>{def}</span>}
        {!loading && !def && <span className="text-white/55">No definition available.</span>}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {data?.audio && (
          <button
            onClick={() => playAudio(data.audio)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
            title="Native speaker audio"
          >
            🔊 native
          </button>
        )}
        {ttsAvailable() && (
          <button
            onClick={() => speak(entry.word)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
            title="Browser TTS"
          >
            🗣️ say
          </button>
        )}
        <button
          onClick={onMarkKnown}
          className="ml-auto rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/35"
          title="Mark as known — adds it to your SRS as 'Good'"
        >
          ✓ I know it
        </button>
      </div>
    </div>
  );
}
