import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import ReviewSession from './components/ReviewSession.jsx';
import WordExplorer from './components/WordExplorer.jsx';
import Reader from './components/Reader.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { useLocalStorage } from './hooks/useStorage.js';
import { useSettings } from './hooks/useSettings.js';
import { isLearned, summarize } from './utils/srs.js';

const SETTINGS = { newPerDay: 12, max: 80 };

export default function App() {
  const [progress, setProgress] = useLocalStorage('lenglist:progress', {});
  const [settings, setSettings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState('home');

  const summary = useMemo(() => summarize(progress), [progress]);
  const learnedCount = useMemo(
    () => Object.values(progress).filter(isLearned).length,
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
      <Header
        tab={tab}
        onTabChange={setTab}
        due={summary.due}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />

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
                onRead={() => setTab('read')}
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
            {tab === 'read' && (
              <Reader progress={progress} setProgress={setProgress} />
            )}
            {tab === 'explore' && (
              <WordExplorer progress={progress} setProgress={setProgress} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-2 text-center text-xs text-white/55">
        LengList · Free Dictionary API · on-device Whisper · all progress lives in your browser
      </footer>
    </div>
  );
}
