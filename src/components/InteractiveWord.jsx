import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useDictionary, playAudio } from '../hooks/useDictionary.js';
import { speak, ttsAvailable } from '../hooks/useSpeech.js';
import { newCardState, review } from '../utils/srs.js';
import { LEVEL_META } from '../data/levels.js';
import RatingButtons, { RATINGS } from './RatingButtons.jsx';
import { showToast } from '../hooks/useToast.js';

const POPOVER_WIDTH = 288; // matches `w-72`

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
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  // Recompute popover position whenever the popover is open. We portal it to
  // document.body so it isn't trapped by ancestor stacking contexts (the
  // article hero uses `glass-strong`, which sets `backdrop-filter` and
  // creates a stacking context that previously clipped the popover behind
  // the next section). Using page-relative coords means the popover follows
  // the document scroll.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const compute = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      // We compute the left edge directly — no CSS transform on the popover,
      // because that would clash with motion's scale/translateY animation
      // (transforms can't be composited from two sources). Center on the
      // word, then clamp so the popover stays 8 px inside the viewport.
      const wordCenter = rect.left + window.scrollX + rect.width / 2;
      let left = wordCenter - POPOVER_WIDTH / 2;
      const minLeft = window.scrollX + 8;
      const maxLeft = window.scrollX + window.innerWidth - POPOVER_WIDTH - 8;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = maxLeft;
      setPos({ top: rect.bottom + window.scrollY + 8, left });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open]);

  // Click outside (anywhere not on the button or the popover) + Escape closes.
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      const inButton = buttonRef.current && buttonRef.current.contains(e.target);
      const inPopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!inButton && !inPopover) setOpen(false);
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

  function rateWord(rating) {
    if (!entry) return;
    const prev = progress[entry.id] || newCardState();
    const next = review(prev, rating);
    setProgress({ ...progress, [entry.id]: next });
    const r = RATINGS.find((x) => x.rating === rating);
    showToast(`✓ "${entry.word}" recorded as ${r?.label || 'Good'}`, { tone: r?.tone || 'emerald' });
    setOpen(false);
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={className + ' bg-transparent border-0 p-0 m-0 text-inherit font-inherit'}
        type="button"
      >
        {token}
      </button>
      {open &&
        createPortal(
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'absolute', top: pos.top, left: pos.left }}
            className="z-50 w-72 rounded-2xl border border-white/15 bg-slate-900/95 p-3 text-left shadow-card backdrop-blur-xl"
          >
            <Popover entry={entry} kind={kind} onClose={() => setOpen(false)} onRate={rateWord} />
          </motion.div>,
          document.body
        )}
    </>
  );
}

function Popover({ entry, kind, onClose, onRate }) {
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
        <button onClick={onClose} className="text-white/50 hover:text-white">×</button>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xl font-bold">{entry.word}</span>
        {data?.phonetic && <span className="text-xs text-white/55">{data.phonetic}</span>}
        <span className="ml-auto text-[10px] uppercase tracking-widest text-white/55">{entry.pos}</span>
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
      </div>
      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
          How well did you recall it?
        </div>
        <RatingButtons compact onRate={onRate} />
      </div>
    </div>
  );
}
