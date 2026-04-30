import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWhisper, whisperAvailable } from '../hooks/useWhisper.js';
import { scorePronunciation, scoreLabel } from '../utils/phonetics.js';
import { speak, ttsAvailable } from '../hooks/useSpeech.js';

function Stars({ n }) {
  return (
    <span className="text-amber-300" aria-label={`${n} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

function MicIcon({ pulsing }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {pulsing && (
        <>
          <circle cx="12" cy="9" r="11" fill="none" stroke="currentColor" strokeOpacity="0.4">
            <animate attributeName="r" from="11" to="18" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
}

const TONE = {
  emerald: 'bg-emerald-500/15 text-emerald-100 border-emerald-400/30',
  sky: 'bg-sky-500/15 text-sky-100 border-sky-400/30',
  amber: 'bg-amber-500/15 text-amber-100 border-amber-400/30',
  rose: 'bg-rose-500/15 text-rose-100 border-rose-400/30',
};

export default function PronunciationCheck({ word }) {
  const available = whisperAvailable();
  const { status, progress, transcript, error, start, stop, reset } = useWhisper();
  const [last, setLast] = useState(null);

  // Re-score whenever a fresh transcript arrives.
  useEffect(() => {
    if (transcript && status === 'ready') {
      const score = scorePronunciation(word, transcript);
      const meta = scoreLabel(score);
      setLast({ heard: transcript, score, meta });
    }
  }, [transcript, status, word]);

  // Reset history on word change.
  useEffect(() => {
    setLast(null);
    reset();
  }, [word, reset]);

  if (!available) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
        Pronunciation practice needs a browser with microphone + MediaRecorder support
        (Chrome, Edge, Firefox, Safari 14+).
      </div>
    );
  }

  const isLoading = status === 'loading';
  const isRecording = status === 'recording';
  const isTranscribing = status === 'transcribing';
  const isError = status === 'error';

  const buttonLabel =
    isLoading ? `Loading model · ${progress}%`
      : isRecording ? 'Tap to stop'
      : isTranscribing ? 'Transcribing…'
      : last ? 'Try again'
      : 'Tap to record';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-white/55">
          Pronunciation · on-device Whisper
        </span>
        {ttsAvailable() && (
          <button
            onClick={() => speak(word)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
            title="Hear how the word sounds (TTS)"
          >
            🔊 hear
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <button
          onClick={isRecording ? stop : start}
          disabled={isTranscribing || isLoading}
          className={[
            'group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition disabled:opacity-60',
            isRecording
              ? 'bg-rose-500 text-white shadow-glow ring-4 ring-rose-500/30'
              : isError
              ? 'bg-rose-500/30 text-rose-100 hover:bg-rose-500/40'
              : 'bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white shadow-glow hover:scale-105',
          ].join(' ')}
        >
          <MicIcon pulsing={isRecording} />
        </button>

        <div className="flex-1 text-center sm:text-left">
          <div className="text-sm font-semibold">{buttonLabel}</div>
          {isLoading && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
          {!isLoading && !last && (
            <p className="mt-1 text-xs text-white/55">
              First time: ~40 MB Whisper-tiny model downloads & caches in your browser.
              Speak the word clearly within ~2 seconds, then tap stop.
            </p>
          )}
          {isError && error && (
            <p className="mt-1 text-xs text-rose-200">{error}</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {last && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 rounded-2xl border p-4 ${TONE[last.meta.tone]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest opacity-80">
                  Heard
                </div>
                <div className="font-display text-lg font-semibold">"{last.heard}"</div>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl font-bold leading-none">{last.score}%</div>
                <div className="mt-1 text-xs opacity-90">{last.meta.label}</div>
              </div>
            </div>
            <div className="mt-2 text-xl">
              <Stars n={last.meta.stars} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
