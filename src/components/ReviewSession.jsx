import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FlashCard from './FlashCard.jsx';
import { ALL_WORDS } from '../data/words.js';
import { buildQueue, newCardState, review } from '../utils/srs.js';

export default function ReviewSession({ progress, setProgress, onExit, settings }) {
  const queue = useMemo(
    () => buildQueue(ALL_WORDS, progress, settings),
    // We freeze the queue when the session starts so cards don't reshuffle live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  useEffect(() => {
    setRevealed(false);
  }, [index]);

  const current = queue[index];

  if (!current) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass mx-auto max-w-xl rounded-3xl p-10 text-center"
      >
        <div className="text-6xl">🌟</div>
        <h2 className="heading mt-4 text-3xl">Inbox zero</h2>
        <p className="mt-2 text-white/65">
          You have no cards due right now. Add new words from the Explore tab, or come back later
          for spaced reviews.
        </p>
        <button onClick={onExit} className="btn-primary mt-6">
          Back to home
        </button>
      </motion.div>
    );
  }

  const total = queue.length;
  const done = index;

  function handleRate(rating) {
    const prev = progress[current.word.id] || newCardState();
    const next = review(prev, rating);
    setProgress({ ...progress, [current.word.id]: next });

    setTally((t) => ({
      again: t.again + (rating === 0 ? 1 : 0),
      hard: t.hard + (rating === 1 ? 1 : 0),
      good: t.good + (rating === 2 ? 1 : 0),
      easy: t.easy + (rating === 3 ? 1 : 0),
    }));

    setIndex((i) => i + 1);
  }

  function handleSkip() {
    setIndex((i) => i + 1);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-white/65">
          <button onClick={onExit} className="hover:text-white">
            ← Exit session
          </button>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-100">
              Again {tally.again}
            </span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-100">
              Hard {tally.hard}
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-100">
              Good {tally.good}
            </span>
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sky-100">
              Easy {tally.easy}
            </span>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${(done / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <AnimatePresence mode="wait">
          <FlashCard
            key={current.word.id + index}
            word={current.word}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onRate={handleRate}
            onSkip={handleSkip}
            queueIndex={index}
            queueTotal={total}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
