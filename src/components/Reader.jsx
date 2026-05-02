import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArticleSearch } from '../hooks/useArticleSearch.js';
import { useArticleContent } from '../hooks/useArticleContent.js';
import { tokenize, classifyWord, countHighlights } from '../utils/tokenizer.js';
import InteractiveWord from './InteractiveWord.jsx';
import { LEVEL_META, levelForLearnedCount } from '../data/levels.js';
import { isLearned } from '../utils/srs.js';
import { speak, ttsAvailable } from '../hooks/useSpeech.js';

const SUGGESTED_TOPICS = [
  'space exploration',
  'cooking',
  'football',
  'climate change',
  'ancient Egypt',
  'artificial intelligence',
  'photography',
  'ocean',
  'music history',
  'health',
];

function deriveCurrentLevel(progress) {
  const learned = Object.values(progress).filter(isLearned).length;
  return levelForLearnedCount(learned).code;
}

export default function Reader({ progress, setProgress }) {
  const currentLevel = deriveCurrentLevel(progress);
  const [chosenLevel, setChosenLevel] = useState(currentLevel);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [selectedTitle, setSelectedTitle] = useState(null);

  const { results, loading: searching } = useArticleSearch(submitted, chosenLevel);
  const { article, loading: loadingArticle, error: articleError } = useArticleContent(
    selectedTitle,
    chosenLevel
  );

  function onSubmit(e) {
    e.preventDefault();
    setSubmitted(query.trim());
    setSelectedTitle(null);
  }

  function pickSuggestion(topic) {
    setQuery(topic);
    setSubmitted(topic);
    setSelectedTitle(null);
  }

  if (selectedTitle && (article || loadingArticle)) {
    return (
      <ArticleView
        article={article}
        loading={loadingArticle}
        error={articleError}
        chosenLevel={chosenLevel}
        progress={progress}
        setProgress={setProgress}
        onBack={() => setSelectedTitle(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="relative">
          <h1 className="heading text-3xl">Learn from Reading</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/65">
            Pick any topic — we'll find an article at your reading level and highlight the words
            you might not know yet. Tap any highlight for a definition, pronunciation, and a
            "I know it" shortcut to add it to your review queue.
          </p>

          <form onSubmit={onSubmit} className="mt-5 flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a topic, e.g. 'cooking', 'space'…"
              className="flex-1 min-w-[14rem] rounded-2xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            />
            <LevelPicker
              chosen={chosenLevel}
              setChosen={setChosenLevel}
              currentLevel={currentLevel}
            />
            <button type="submit" className="btn-primary">Search</button>
          </form>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.16em] text-white/45 mr-1 self-center">
              Try:
            </span>
            {SUGGESTED_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => pickSuggestion(t)}
                className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/75 hover:bg-white/10"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!submitted && <Welcome />}

      {submitted && (
        <SearchResults
          query={submitted}
          results={results}
          loading={searching}
          onPick={(title) => setSelectedTitle(title)}
          chosenLevel={chosenLevel}
        />
      )}
    </div>
  );
}

function LevelPicker({ chosen, setChosen, currentLevel }) {
  const [open, setOpen] = useState(false);
  const meta = LEVEL_META.find((l) => l.code === chosen);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        type="button"
        className={`rounded-2xl bg-gradient-to-r ${meta.accent} px-4 py-2.5 text-sm font-semibold text-white shadow`}
      >
        {meta.emoji} {meta.code}
        {currentLevel === chosen && <span className="ml-1 text-[10px] opacity-80">(yours)</span>}
        <span className="ml-1 opacity-70">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-white/15 bg-slate-900/95 p-1.5 shadow-card backdrop-blur-xl">
          {LEVEL_META.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setChosen(l.code);
                setOpen(false);
              }}
              className={[
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm',
                chosen === l.code ? 'bg-white/15' : 'hover:bg-white/10',
              ].join(' ')}
            >
              <span>{l.emoji}</span>
              <span className="font-semibold">{l.code}</span>
              <span className="text-xs text-white/55">{l.title}</span>
              {currentLevel === l.code && (
                <span className="ml-auto text-[10px] text-emerald-300">your level</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Welcome() {
  return (
    <div className="glass rounded-3xl p-6 text-center">
      <div className="text-4xl">📖</div>
      <p className="mt-3 text-sm text-white/65">
        Search a topic above to start. Beginner levels (A1, A2) read from Simple English Wikipedia;
        intermediate and advanced read from full Wikipedia.
      </p>
    </div>
  );
}

function SearchResults({ query, results, loading, onPick, chosenLevel }) {
  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 text-sm text-white/60">
        Finding articles about “{query}”…
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 text-sm text-white/60">
        No articles match “{query}” at level {chosenLevel}. Try a different topic.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {results.map((r, i) => (
        <motion.button
          key={r.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onPick(r.title)}
          className="glass text-left rounded-2xl p-4 transition hover:bg-white/[0.07]"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold">{r.title}</h3>
            <span className="text-[11px] text-white/45 whitespace-nowrap">
              {r.wordcount.toLocaleString()} words
            </span>
          </div>
          {r.snippet && <p className="mt-1 line-clamp-3 text-sm text-white/65">{r.snippet}…</p>}
        </motion.button>
      ))}
    </div>
  );
}

function ArticleView({ article, loading, error, chosenLevel, progress, setProgress, onBack }) {
  const fullText = useMemo(
    () => (article?.paragraphs || []).join('\n\n'),
    [article]
  );
  const stats = useMemo(
    () => (fullText ? countHighlights(fullText, chosenLevel, progress) : { target: 0, challenge: 0 }),
    [fullText, chosenLevel, progress]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="btn-ghost">← Back to results</button>
        <div className="glass rounded-3xl p-6 text-sm text-white/60">Loading article…</div>
      </div>
    );
  }
  if (error || !article) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="btn-ghost">← Back to results</button>
        <div className="glass rounded-3xl p-6 text-sm text-amber-200">
          {error || 'Failed to load article.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost">← Back</button>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/55 hover:text-white"
        >
          Open on {article.host} ↗
        </a>
      </div>

      <div className="glass-strong rounded-3xl p-6 sm:p-8">
        {article.thumbnail && (
          <img
            src={article.thumbnail}
            alt=""
            className="mb-5 max-h-64 w-full rounded-2xl object-cover"
          />
        )}
        <h2 className="heading text-3xl sm:text-4xl">{article.title}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/55">
          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-emerald-100">
            🟢 {stats.target} at your level
          </span>
          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-amber-100">
            🟡 {stats.challenge} stretch words
          </span>
          {ttsAvailable() && (
            <button
              onClick={() => speak(fullText.slice(0, 1500))}
              className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
              title="Read this article aloud (browser TTS)"
            >
              🔊 read aloud
            </button>
          )}
        </div>

        <div className="mt-6 space-y-4 text-[1.05rem] leading-[1.75] text-white/90">
          {article.paragraphs.map((p, i) => (
            <Paragraph
              key={i}
              text={p}
              chosenLevel={chosenLevel}
              progress={progress}
              setProgress={setProgress}
            />
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-4 text-xs text-white/55">
        <span className="text-emerald-200">●</span> green underline = at your level (practice these)
        &nbsp;·&nbsp;
        <span className="text-amber-200">∿</span> amber wavy = above your level (stretch)
        &nbsp;·&nbsp;
        click any highlight to see meaning + hear pronunciation, or press <kbd className="rounded bg-white/15 px-1">✓ I know it</kbd> to add it to your review queue.
      </div>
    </div>
  );
}

function Paragraph({ text, chosenLevel, progress, setProgress }) {
  const tokens = useMemo(() => tokenize(text), [text]);
  return (
    <p>
      {tokens.map((tok, i) => {
        if (tok.kind === 'gap') return tok.text;
        const c = classifyWord(tok.text, chosenLevel, progress);
        // Plain (no highlight) words: render as bare text for performance.
        if (c.kind !== 'target' && c.kind !== 'challenge') return tok.text;
        return (
          <InteractiveWord
            key={i}
            token={tok.text}
            kind={c.kind}
            entry={c.entry}
            progress={progress}
            setProgress={setProgress}
          />
        );
      })}
    </p>
  );
}
