import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import ReviewSession from './components/ReviewSession.jsx';
import WordExplorer from './components/WordExplorer.jsx';
import MindStones from './components/MindStones.jsx';
import { useLocalStorage } from './hooks/useStorage.js';
import { ALL_WORDS } from './data/words.js';
import { buildQueue, isLearned, summarize } from './utils/srs.js';

const SETTINGS = { newPerDay: 12, max: 80 };

export default function App() {
  const [progress, setProgress] = useLocalStorage('lenglist:progress', {});
  const [tab, setTab] = useState('home');

  const summary = useMemo(() => summarize(progress), [progress]);
  const learnedCount = useMemo(
    () => Object.values(progress).filter(isLearned).length,
    [progress]
  );

  // Pre-compute the due count using the same rule the queue builder uses.
  const dueCount = useMemo(
    () => buildQueue(ALL_WORDS, progress, { newPerDay: 0, max: 9999 }).length,
    [progress]
  );

  function startReview() {
    setTab('review');
  }

  function exitReview() {
    setTab('home');
  }

  return (
    <div className="min-h-screen">
      <Header tab={tab} onTabChange={setTab} due={dueCount + Math.min(SETTINGS.newPerDay, ALL_WORDS.length - summary.seen)} />

      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {tab === 'home' && (
              <Dashboard
                progress={progress}
                summary={summary}
                learnedCount={learnedCount}
                onStartReview={startReview}
                onExplore={() => setTab('explore')}
              />
            )}
            {tab === 'review' && (
              <ReviewSession
                progress={progress}
                setProgress={setProgress}
                onExit={exitReview}
                settings={SETTINGS}
              />
            )}
            {tab === 'explore' && (
              <WordExplorer progress={progress} setProgress={setProgress} />
            )}
            {tab === 'stones' && (
              <div className="space-y-6">
                <div className="glass rounded-3xl p-6">
                  <h1 className="heading text-3xl">The Mind Stones</h1>
                  <p className="mt-2 max-w-2xl text-white/65">
                    Six legendary stones, each unlocked when you've truly learned a milestone count
                    of words. They are not handed out — they are earned, one review at a time.
                  </p>
                </div>
                <MindStones learnedCount={learnedCount} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-2 text-center text-xs text-white/40">
        LengList · Free Dictionary API · on-device Whisper · all progress lives in your browser
      </footer>
    </div>
  );
}
