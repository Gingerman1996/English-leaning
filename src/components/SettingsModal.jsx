import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsModal({ open, onClose, settings, setSettings }) {
  const [apiKey, setApiKey] = useState(settings.guardianApiKey || '');

  // Sync local state when the parent's settings change (e.g. someone else
  // edits the key) and reset the input each time the modal opens.
  useEffect(() => {
    if (open) setApiKey(settings.guardianApiKey || '');
  }, [open, settings.guardianApiKey]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function save() {
    setSettings({ ...settings, guardianApiKey: apiKey.trim() });
    onClose();
  }

  function clear() {
    setApiKey('');
    setSettings({ ...settings, guardianApiKey: '' });
  }

  function reset() {
    setApiKey('test');
    setSettings({ ...settings, guardianApiKey: 'test' });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-card"
          >
            <div className="flex items-center justify-between">
              <h2 className="heading text-xl">Settings</h2>
              <button onClick={onClose} className="text-white/45 hover:text-white">×</button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-white/80">
                  Guardian Open Platform API key
                </label>
                <p className="mt-1 text-xs text-white/55">
                  Used to fetch articles from{' '}
                  <a
                    href="https://www.theguardian.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-white/30 hover:decoration-white"
                  >
                    The Guardian
                  </a>{' '}
                  in the Read tab. The default <code className="rounded bg-white/10 px-1">test</code> key is shared
                  and rate-limited; for daily use,{' '}
                  <a
                    href="https://open-platform.theguardian.com/access/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-white/30 hover:decoration-white"
                  >
                    register a free Developer key
                  </a>{' '}
                  (one minute, just an email) and paste it here.
                </p>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Guardian key…"
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm font-mono placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-[11px] text-white/55">
                <strong className="text-white/75">Privacy:</strong> the key is stored in your
                browser's localStorage and only used to call the Guardian API directly from
                your browser. It never goes to any LengList server (there isn't one).
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button onClick={save} className="btn-primary">Save</button>
                <button onClick={reset} className="btn-ghost">Reset to "test"</button>
                <button onClick={clear} className="btn-ghost text-rose-200">Clear</button>
                <button onClick={onClose} className="ml-auto text-xs text-white/55 hover:text-white">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
