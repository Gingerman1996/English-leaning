import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast, clearToast } from '../hooks/useToast.js';

const TONE_STYLES = {
  emerald: 'bg-emerald-500/90 text-white border-emerald-300/40',
  rose:    'bg-rose-500/90 text-white border-rose-300/40',
  amber:   'bg-amber-500/90 text-white border-amber-300/40',
  sky:     'bg-sky-500/90 text-white border-sky-300/40',
  white:   'bg-slate-900/95 text-white border-white/15',
};

export default function Toast() {
  const toast = useToast();
  return createPortal(
    <AnimatePresence>
      {toast && (
        <motion.button
          key={toast.id}
          onClick={clearToast}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className={[
            'fixed bottom-6 left-1/2 z-[60] -translate-x-1/2',
            'rounded-full border px-4 py-2 text-sm font-semibold shadow-card backdrop-blur-xl',
            'cursor-pointer hover:opacity-95',
            TONE_STYLES[toast.tone] || TONE_STYLES.white,
          ].join(' ')}
          aria-live="polite"
        >
          {toast.message}
        </motion.button>
      )}
    </AnimatePresence>,
    document.body
  );
}
