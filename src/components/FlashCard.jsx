import { motion, AnimatePresence } from 'framer-motion';
import { useDictionary, playAudio } from '../hooks/useDictionary.js';
import { LEVEL_META } from '../data/levels.js';
import { speak, ttsAvailable } from '../hooks/useSpeech.js';
import PronunciationCheck from './PronunciationCheck.jsx';
import ContextExamples from './ContextExamples.jsx';
import RatingButtons from './RatingButtons.jsx';

function LevelChip({ code }) {
  const meta = LEVEL_META.find((l) => l.code === code);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${meta.accent} px-2.5 py-1 text-[11px] font-bold text-white shadow`}
    >
      {meta.emoji} {code}
    </span>
  );
}

function ExampleLine({ text }) {
  if (!text) return null;
  return (
    <div className="mt-2 flex items-start gap-2 text-sm text-white/65">
      <span className="text-white/40">“</span>
      <p className="flex-1 italic">{text}</p>
      <span className="text-white/40">”</span>
      {ttsAvailable() && (
        <button
          onClick={() => speak(text)}
          className="icon-btn ml-1 shrink-0"
          title="Read this example aloud"
          aria-label="Read this example aloud"
        >
          🔊
        </button>
      )}
    </div>
  );
}

export default function FlashCard({ word, revealed, onReveal, onRate, onSkip, queueIndex, queueTotal }) {
  const { data, loading, error } = useDictionary(word.word, word.pos);

  return (
    <motion.div
      key={word.id}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      className="relative w-full max-w-2xl"
    >
      <div className="mb-3 flex items-center justify-between text-xs text-white/60">
        <span>
          Card {queueIndex + 1} / {queueTotal}
        </span>
        <button onClick={onSkip} className="text-white/50 hover:text-white">
          Skip →
        </button>
      </div>

      <div className="glass-strong glow-ring relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
        <div className="pointer-events-none absolute inset-0 bg-stars opacity-30" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <LevelChip code={word.level} />
            <div className="flex items-center gap-1.5">
              {data?.audio && (
                <button
                  onClick={() => playAudio(data.audio)}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
                  title="Native audio (Free Dictionary API)"
                >
                  <span>🔊</span> native
                </button>
              )}
              {ttsAvailable() && (
                <button
                  onClick={() => speak(word.word)}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
                  title="Read aloud (browser TTS)"
                >
                  <span>🗣️</span> say
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="heading text-5xl sm:text-6xl">{word.word}</h2>
            {data?.phonetic && (
              <span className="font-mono text-lg text-white/55">{data.phonetic}</span>
            )}
          </div>
          <div className="mt-1 text-sm uppercase tracking-[0.18em] text-white/45">{word.pos}</div>

          <AnimatePresence mode="wait">
            {!revealed ? (
              <motion.div
                key="hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-10"
              >
                <p className="text-white/50">
                  Try to recall the meaning, then reveal to check yourself.
                </p>
                <button onClick={onReveal} className="btn-primary mt-6 w-full">
                  Reveal meaning
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="shown"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 space-y-5"
              >
                {loading && <p className="text-white/55">Looking up Oxford-style entry…</p>}
                {error && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Couldn't fetch live definition. You can still rate your recall below.
                  </div>
                )}
                {data && (
                  <div className="space-y-4">
                    {data.definitions.length === 0 && (
                      <p className="text-white/55">No definition available.</p>
                    )}
                    {data.definitions.slice(0, 3).map((d, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                          {d.pos}
                        </div>
                        <p className="text-white/90">{d.text}</p>
                        <ExampleLine text={d.example} />
                        {d.synonyms.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {d.synonyms.map((s) => (
                              <span key={s} className="pill text-[10px]">
                                = {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <ContextExamples word={word.word} level={word.level} />

                <PronunciationCheck word={word.word} />

                <RatingButtons onRate={onRate} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
