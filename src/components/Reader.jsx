import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArticleSearch } from '../hooks/useArticleSearch.js';
import { useArticleContent } from '../hooks/useArticleContent.js';
import { useGuardianArticles } from '../hooks/useGuardianArticles.js';
import { useSettings } from '../hooks/useSettings.js';
import {
  collectHighlightedWords,
  countHighlights,
  classifyWord,
  tokenize,
} from '../utils/tokenizer.js';
import InteractiveWord from './InteractiveWord.jsx';
import { LEVEL_META, levelForLearnedCount } from '../data/levels.js';
import { isLearned } from '../utils/srs.js';
import { speak, stopSpeaking, ttsAvailable, useIsSpeaking } from '../hooks/useSpeech.js';
import {
  useReadingProgress,
  PROMOTE_AFTER_PASSES,
  PASS_THRESHOLD,
  MIN_TARGET_WORDS,
} from '../hooks/useReadingProgress.js';
import VocabChecklist from './VocabChecklist.jsx';
import WordLookup from './WordLookup.jsx';
import ReaderRail from './ReaderRail.jsx';

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

function deriveLevel(progress, override) {
  if (override) return override;
  const learned = Object.values(progress).filter(isLearned).length;
  return levelForLearnedCount(learned).code;
}

export default function Reader({ progress, setProgress }) {
  const reading = useReadingProgress();
  // Settings now lives at the App level (header gear icon). We only need
  // read access for the Guardian API key.
  const [settings] = useSettings();
  const currentLevel = deriveLevel(progress, reading.state.levelOverride);
  const [chosenLevel, setChosenLevel] = useState(currentLevel);
  const [source, setSource] = useState('wikipedia'); // 'wikipedia' | 'guardian'

  // Sync chosen level when override changes (e.g. after auto-promotion).
  useEffect(() => {
    setChosenLevel(currentLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel]);

  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [panel, setPanel] = useState('search'); // 'search' | 'lookup' | 'history' | 'progress'
  const [seedLookup, setSeedLookup] = useState('');

  const wiki = useArticleSearch(source === 'wikipedia' ? submitted : '', chosenLevel);
  const wikiContent = useArticleContent(
    source === 'wikipedia' ? selectedTitle : null,
    chosenLevel
  );
  const guardian = useGuardianArticles(
    source === 'guardian' ? submitted : '',
    settings.guardianApiKey
  );

  // Unified shape for the rest of the component.
  const results = source === 'wikipedia' ? wiki.results : guardian.results;
  const searching = source === 'wikipedia' ? wiki.loading : guardian.loading;
  const sourceError = source === 'guardian' ? guardian.error : null;

  // Guardian's search response already includes the article body, so the
  // "content" lookup is just an in-memory find. Wikipedia needs a 2nd fetch.
  const article =
    source === 'wikipedia'
      ? wikiContent.article
      : guardian.results.find((r) => r.title === selectedTitle) || null;
  const loadingArticle = source === 'wikipedia' ? wikiContent.loading : false;
  const articleError = source === 'wikipedia' ? wikiContent.error : null;

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

  // Re-open a previously-read article via the History panel. For Wikipedia
  // we just set the title and let useArticleContent re-fetch (the cache
  // hits if the title hasn't aged out). For Guardian we need a re-search
  // because the API doesn't expose stable per-article fetch — the closest
  // we have is title-as-query, but bookmark navigation works best by
  // opening the original URL externally.
  function reopenArticle(entry) {
    if (entry.source !== source) setSource(entry.source);
    if (entry.level && entry.level !== chosenLevel) setChosenLevel(entry.level);
    setSubmitted(entry.title);
    setSelectedTitle(entry.title);
    setPanel('search');
  }

  function jumpToLookup(word) {
    setSeedLookup(word);
    setPanel('lookup');
  }

  // Switching rail panels while reading an article should close the
  // article view and take the user to the chosen panel.
  function changePanel(next) {
    setSelectedTitle(null);
    setPanel(next);
  }

  const railItems = [
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'lookup', icon: '🔎', label: 'Look up' },
    { id: 'history', icon: '📚', label: 'History', badge: reading.state.history?.length || 0 },
    { id: 'progress', icon: '🎯', label: 'Progress', badge: reading.state.consecutivePasses || 0 },
  ];

  const inArticle = !!(selectedTitle && (article || loadingArticle));

  // Reading the article: rail on the left for quick nav, article on the right.
  if (inArticle) {
    return (
      <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
        <ReaderRail items={railItems} active={panel} onChange={changePanel} />
        <div className="min-w-0 flex-1 space-y-6">
          <ArticleView
            article={article}
            loading={loadingArticle}
            error={articleError}
            chosenLevel={chosenLevel}
            progress={progress}
            setProgress={setProgress}
            reading={reading}
            source={source}
            onBack={() => setSelectedTitle(null)}
          />
        </div>
      </div>
    );
  }

  // Listing pages (search / lookup / history / progress): no rail. The four
  // panels switch via horizontal tabs at the top so the layout stays clean.
  return (
    <div className="space-y-6">
      <PanelTabs items={railItems} active={panel} onChange={setPanel} />

      {panel === 'search' && (
        <SearchPanel
          query={query}
          setQuery={setQuery}
          onSubmit={onSubmit}
          pickSuggestion={pickSuggestion}
          source={source}
          setSource={setSource}
          chosenLevel={chosenLevel}
          setChosenLevel={setChosenLevel}
          currentLevel={currentLevel}
          settings={settings}
          reading={reading}
          sourceError={sourceError}
          submitted={submitted}
          results={results}
          searching={searching}
          onPickResult={(title) => setSelectedTitle(title)}
        />
      )}

      {panel === 'lookup' && (
        <LookupPanel
          progress={progress}
          setProgress={setProgress}
          reading={reading}
          seedWord={seedLookup}
          consumeSeed={() => setSeedLookup('')}
        />
      )}

      {panel === 'history' && (
        <HistoryPanel reading={reading} onReopen={reopenArticle} />
      )}

      {panel === 'progress' && (
        <ProgressPanel reading={reading} currentLevel={currentLevel} />
      )}
    </div>
  );
}

// Horizontal version of the rail used on listing pages. Looks like the
// LengList tab bar so it feels native.
function PanelTabs({ items, active, onChange }) {
  return (
    <nav
      aria-label="Reader sections"
      className="-mx-1 flex gap-1 overflow-x-auto px-1"
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            aria-pressed={isActive}
            className={[
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition',
              isActive
                ? 'bg-white text-slate-900 font-semibold shadow'
                : 'bg-white/5 text-white/75 hover:bg-white/10',
            ].join(' ')}
          >
            <span aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span
                className={[
                  'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  isActive ? 'bg-fuchsia-500 text-white' : 'bg-fuchsia-500 text-white',
                ].join(' ')}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Panel: Search (the original Reader landing surface)
// ───────────────────────────────────────────────────────────────────────────
function SearchPanel({
  query, setQuery, onSubmit, pickSuggestion,
  source, setSource, chosenLevel, setChosenLevel, currentLevel,
  settings, reading, sourceError,
  submitted, results, searching, onPickResult,
}) {
  return (
    <>
      <div className="glass-strong relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="relative">
          <h1 className="heading text-3xl">Learn from Reading</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/70">
            Pick any topic — we'll find an article at your reading level and highlight the words
            you might not know yet. Tick the ones you know in the checklist; if you master 90% of
            three articles in a row, you'll auto-level-up.
          </p>

          <SourcePicker source={source} setSource={setSource} />

          {source === 'guardian' && !settings.guardianApiKey && (
            <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              No Guardian API key set. Open the ⚙️ Settings button in the header to add one (free, 1 minute).
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={source === 'guardian' ? 'Search Guardian articles…' : "Search a topic, e.g. 'cooking', 'space'…"}
              className="flex-1 min-w-[14rem] rounded-2xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm placeholder:text-white/50 focus:border-white/30 focus:outline-none"
            />
            <LevelPicker
              chosen={chosenLevel}
              setChosen={setChosenLevel}
              currentLevel={currentLevel}
            />
            <button type="submit" className="btn-primary">Search</button>
          </form>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.16em] text-white/55 mr-1 self-center">
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

          {source === 'guardian' && (chosenLevel === 'A1' || chosenLevel === 'A2') && (
            <p className="mt-3 text-[11px] text-amber-200/85">
              Heads up: Guardian articles use full journalistic English — usually too advanced for {chosenLevel}.
              Wikipedia (Simple English) is a softer landing for beginners.
            </p>
          )}
        </div>
      </div>

      <PromotionStreak reading={reading} currentLevel={currentLevel} />

      {sourceError && <SourceError error={sourceError} />}

      {!submitted && <Welcome source={source} />}

      {submitted && (
        <SearchResults
          query={submitted}
          results={results}
          loading={searching}
          onPick={onPickResult}
          chosenLevel={chosenLevel}
          source={source}
        />
      )}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Panel: Lookup (the WordLookup component + recent history)
// ───────────────────────────────────────────────────────────────────────────
function LookupPanel({ progress, setProgress, reading, seedWord, consumeSeed }) {
  const recents = reading.state.lookupHistory || [];

  // Once the seed has primed the input, clear it so a manual lookup later
  // doesn't get overridden by a stale seed.
  useEffect(() => {
    if (seedWord) {
      const t = setTimeout(consumeSeed, 50);
      return () => clearTimeout(t);
    }
  }, [seedWord, consumeSeed]);

  return (
    <div className="space-y-5">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="relative">
          <h1 className="heading text-2xl">🔎 Look up any word</h1>
          <p className="mt-1 text-sm text-white/70">
            Type any English word — useful for proper nouns, technical terms, or words our CEFR
            corpus doesn't cover. If the word is in our list, you can also tick "I know it" to
            push it into the SRS queue.
          </p>
        </div>
      </div>

      <WordLookup
        progress={progress}
        setProgress={setProgress}
        seedWord={seedWord}
        onLookup={reading.recordLookup}
      />

      <RecentLookups
        recents={recents}
        onPick={(word) => {
          // Re-trigger a lookup of the same word: bump it to the top + the
          // WordLookup component re-renders the result.
          reading.recordLookup({ word, level: null });
        }}
        onClear={reading.clearLookupHistory}
      />
    </div>
  );
}

function RecentLookups({ recents, onPick, onClear }) {
  if (recents.length === 0) {
    return (
      <div className="glass rounded-3xl p-5 text-sm text-white/65">
        Recent lookups will show up here so you can re-check a word fast.
      </div>
    );
  }
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-white/65">
          Recent lookups · {recents.length}
        </span>
        <button onClick={onClear} className="text-xs text-white/60 hover:text-white">
          Clear
        </button>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {recents.map((r) => {
          const meta = r.level ? LEVEL_META.find((l) => l.code === r.level) : null;
          return (
            <li key={r.word + r.ts}>
              <button
                onClick={() => onPick(r.word)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs hover:bg-white/10"
                title={`Re-look up "${r.word}"`}
              >
                <span className="font-medium">{r.word}</span>
                {meta && (
                  <span
                    className={`rounded-full bg-gradient-to-r ${meta.accent} px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white`}
                  >
                    {meta.code}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Panel: History — recent reading sessions
// ───────────────────────────────────────────────────────────────────────────
function HistoryPanel({ reading, onReopen }) {
  const history = (reading.state.history || []).slice().reverse();
  if (history.length === 0) {
    return (
      <div className="glass-strong rounded-3xl p-6">
        <h1 className="heading text-2xl">📚 Reading history</h1>
        <p className="mt-2 text-sm text-white/70">
          Articles you've completed will appear here so you can re-open them, see the mastery you
          scored, or open the original source.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="glass-strong rounded-3xl p-6">
        <h1 className="heading text-2xl">📚 Reading history</h1>
        <p className="mt-1 text-sm text-white/70">
          {history.length} article{history.length === 1 ? '' : 's'} read. Most recent first.
        </p>
      </div>
      <ul className="space-y-3">
        {history.map((h, i) => (
          <HistoryItem key={`${h.title}-${h.ts}-${i}`} entry={h} onReopen={onReopen} />
        ))}
      </ul>
    </div>
  );
}

function HistoryItem({ entry, onReopen }) {
  const meta = LEVEL_META.find((l) => l.code === entry.level);
  const pct = Math.round((entry.mastery || 0) * 100);
  const date = new Date(entry.ts);
  const dateLabel = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const outcomeMeta =
    entry.outcome === 'pass' ? { color: 'text-emerald-300', icon: '✓' }
    : entry.outcome === 'fail' ? { color: 'text-rose-300', icon: '✗' }
    : { color: 'text-white/55', icon: '·' };
  return (
    <li className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta?.accent || 'from-fuchsia-500 to-violet-500'} text-sm font-bold text-white`}
        >
          {entry.level || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold leading-snug">{entry.title}</h3>
          <p className="mt-1 text-[11px] text-white/55">
            {entry.source === 'guardian' ? '🗞️ Guardian' : '📰 Wikipedia'} · {dateLabel}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-display text-lg font-bold ${outcomeMeta.color}`}>
            {pct}%
          </div>
          <div className="text-[10px] text-white/45">
            {entry.known}/{entry.total}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => onReopen(entry)} className="btn-ghost px-3 py-1.5 text-xs">
          Re-open
        </button>
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/55 hover:text-white"
          >
            Original source ↗
          </a>
        )}
      </div>
    </li>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Panel: Progress — streak, mastery history, level-up status
// ───────────────────────────────────────────────────────────────────────────
function ProgressPanel({ reading, currentLevel }) {
  const passes = reading.state.consecutivePasses || 0;
  const recent = (reading.state.history || []).slice(-PROMOTE_AFTER_PASSES * 2).reverse();
  const totalRead = reading.state.totalArticlesRead || 0;
  const lastPromotedAt = reading.state.lastPromotedAt;
  return (
    <div className="space-y-5">
      <div className="glass-strong rounded-3xl p-6">
        <h1 className="heading text-2xl">🎯 Progress</h1>
        <p className="mt-1 text-sm text-white/70">
          Your reading journey at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.16em] text-white/55">Promotion streak</div>
          <div className="mt-1 font-display text-3xl font-bold">
            {passes}<span className="text-white/45 text-lg"> / {PROMOTE_AFTER_PASSES}</span>
          </div>
          <div className="mt-1 text-xs text-white/65">
            articles passed at <strong>{currentLevel}</strong> with ≥{Math.round(PASS_THRESHOLD * 100)}% mastery
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: PROMOTE_AFTER_PASSES }, (_, i) => (
              <div
                key={i}
                className={[
                  'h-2 flex-1 rounded-full',
                  i < passes ? 'bg-emerald-400' : 'bg-white/10',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.16em] text-white/55">Articles read</div>
          <div className="mt-1 font-display text-3xl font-bold">{totalRead}</div>
          <div className="mt-1 text-xs text-white/65">
            {lastPromotedAt
              ? `Last promotion: ${new Date(lastPromotedAt).toLocaleDateString()}`
              : 'No promotion yet — keep reading to advance.'}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mb-3 text-xs uppercase tracking-[0.16em] text-white/55">
          Recent sessions
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-white/65">No sessions recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((h, i) => {
              const pct = Math.round((h.mastery || 0) * 100);
              const tone =
                h.outcome === 'pass' ? 'border-emerald-400/30 bg-emerald-500/10'
                : h.outcome === 'fail' ? 'border-rose-400/30 bg-rose-500/10'
                : 'border-white/10 bg-white/[0.03]';
              return (
                <li key={`${h.title}-${h.ts}-${i}`} className={`flex items-center gap-3 rounded-xl border p-2.5 ${tone}`}>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold">{h.level}</span>
                  <span className="flex-1 truncate text-sm">{h.title}</span>
                  <span className="text-xs font-semibold">{pct}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SourcePicker({ source, setSource }) {
  return (
    <div className="mt-4 inline-flex rounded-2xl border border-white/10 bg-black/20 p-1">
      <button
        onClick={() => setSource('wikipedia')}
        className={[
          'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
          source === 'wikipedia' ? 'bg-white text-slate-900 shadow' : 'text-white/65 hover:text-white',
        ].join(' ')}
      >
        📰 Wikipedia
      </button>
      <button
        onClick={() => setSource('guardian')}
        className={[
          'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
          source === 'guardian' ? 'bg-white text-slate-900 shadow' : 'text-white/65 hover:text-white',
        ].join(' ')}
      >
        🗞️ Guardian
      </button>
    </div>
  );
}

function SourceError({ error }) {
  if (error === 'missing-key') return null; // already covered by banner above
  let msg = error;
  if (error === 'invalid-key') msg = 'Guardian API rejected the key. Open the ⚙️ Settings button in the header to fix it.';
  if (error === 'rate-limited') msg = 'Guardian API rate limit hit (test keys are shared). Try again in a minute, or use your own key in Settings.';
  return (
    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
      {msg}
    </div>
  );
}

function PromotionStreak({ reading, currentLevel }) {
  const passes = reading.state.consecutivePasses || 0;
  if (passes === 0) return null;
  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
      🔥 Promotion streak: <strong>{passes}/{PROMOTE_AFTER_PASSES}</strong> articles passed at
      level {currentLevel} (≥{Math.round(PASS_THRESHOLD * 100)}% mastery). Finish {PROMOTE_AFTER_PASSES - passes} more to level up automatically.
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

function Welcome({ source }) {
  return (
    <div className="glass rounded-3xl p-6 text-center">
      <div className="text-4xl">📖</div>
      <p className="mt-3 text-sm text-white/65">
        {source === 'guardian'
          ? 'Search a topic above to pull the latest journalism from The Guardian. Best for B1+ readers — full English, fresh news.'
          : 'Search a topic above to start. Beginner levels (A1, A2) read from Simple English Wikipedia; intermediate and advanced read from full Wikipedia.'}
      </p>
    </div>
  );
}

function SearchResults({ query, results, loading, onPick, chosenLevel, source }) {
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
          key={`${source}-${r.title}-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onPick(r.title)}
          className="glass text-left rounded-2xl p-4 transition hover:bg-white/[0.07]"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold">{r.title}</h3>
            <span className="text-[11px] text-white/45 whitespace-nowrap">
              {(r.wordcount || 0).toLocaleString()} words
            </span>
          </div>
          {(r.trailText || r.snippet) && (
            <p className="mt-1 line-clamp-3 text-sm text-white/65">
              {r.trailText || r.snippet}{!r.trailText && '…'}
            </p>
          )}
          {source === 'guardian' && (r.section || r.publicationDate) && (
            <p className="mt-2 text-[11px] text-white/45">
              {r.section}{r.section && r.publicationDate && ' · '}{r.publicationDate}
            </p>
          )}
        </motion.button>
      ))}
    </div>
  );
}

function ArticleView({ article, loading, error, chosenLevel, progress, setProgress, reading, source, onBack }) {
  const speaking = useIsSpeaking();
  const fullText = useMemo(
    () => (article?.paragraphs || []).join('\n\n'),
    [article]
  );

  // Ensure any in-flight speech stops if the user navigates away or swaps
  // articles mid-readout.
  useEffect(() => {
    return () => stopSpeaking();
  }, [article?.title]);
  const stats = useMemo(
    () => (fullText ? countHighlights(fullText, chosenLevel, progress) : { target: 0, challenge: 0 }),
    [fullText, chosenLevel, progress]
  );
  const highlightedWords = useMemo(
    () => (fullText ? collectHighlightedWords(fullText, chosenLevel, progress) : []),
    [fullText, chosenLevel, progress]
  );
  const totalHighlighted = highlightedWords.length;
  const knownCount = highlightedWords.filter((w) => isLearned(progress[w.entry.id])).length;
  const mastery = totalHighlighted > 0 ? knownCount / totalHighlighted : 0;

  const [completed, setCompleted] = useState(false);
  const [promotion, setPromotion] = useState(null);

  // Reset completion state when the article changes.
  useEffect(() => {
    setCompleted(false);
    setPromotion(null);
  }, [article?.title]);

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

  function handleComplete() {
    if (completed) return;
    setCompleted(true);
    const result = reading.recordArticle({
      title: article.title,
      level: chosenLevel,
      total: totalHighlighted,
      known: knownCount,
      source: source || 'wikipedia',
      url: article.url || null,
    });
    if (result) setPromotion(result);
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

      <AnimatePresence>
        {promotion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl border-2 border-amber-300/50 bg-gradient-to-r from-amber-500/20 via-fuchsia-500/20 to-indigo-500/20 p-5"
          >
            <div className="flex items-center gap-3">
              <div className="text-4xl">🎉</div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold text-amber-100">
                  Level up! {promotion.fromLevel} → {promotion.toLevel}
                </h3>
                <p className="text-sm text-white/75">
                  You mastered three articles in a row at {promotion.fromLevel}. Reader articles
                  will now be served at <strong>{promotion.toLevel}</strong>.
                </p>
              </div>
              <button
                onClick={() => setPromotion(null)}
                className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              onClick={() => (speaking ? stopSpeaking() : speak(fullText.slice(0, 1500)))}
              className={[
                'ml-auto rounded-full px-3 py-1 text-xs',
                speaking
                  ? 'bg-rose-500/30 text-rose-100 hover:bg-rose-500/40'
                  : 'bg-white/10 hover:bg-white/15',
              ].join(' ')}
              title={speaking ? 'Stop reading' : 'Read this article aloud (browser TTS)'}
            >
              {speaking ? '⏹ stop' : '🔊 read aloud'}
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

      <WordLookup progress={progress} setProgress={setProgress} />

      <VocabChecklist
        words={highlightedWords}
        progress={progress}
        setProgress={setProgress}
      />

      <div className="glass rounded-3xl p-4 text-xs text-white/65">
        <span className="text-emerald-200">●</span> green underline = at your level (practice)
        &nbsp;·&nbsp;
        <span className="text-amber-200">∿</span> amber wavy = above your level (stretch)
        &nbsp;·&nbsp;
        click any highlight for meaning + audio + ✓ I know it. Mastery ≥{Math.round(PASS_THRESHOLD * 100)}%
        on {PROMOTE_AFTER_PASSES} articles in a row triggers auto level-up.
      </div>

      {/* Sticky CTA — visible whether the user has scrolled to the bottom
          or is still reading mid-article. Disappears once recorded. */}
      <div className="sticky bottom-3 z-20">
        <div className="mx-auto max-w-3xl">
          {completed ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 backdrop-blur-xl px-4 py-3 shadow-card text-sm text-emerald-100"
            >
              <div className="flex items-center gap-3">
                <div className="text-xl">✅</div>
                <div className="flex-1">
                  Recorded: <strong>{Math.round(mastery * 100)}%</strong> mastery
                  ({knownCount} / {totalHighlighted})
                  {totalHighlighted < MIN_TARGET_WORDS && (
                    <span className="ml-1 text-emerald-200/80">
                      · needs ≥{MIN_TARGET_WORDS} highlights to count
                    </span>
                  )}
                </div>
                <button onClick={onBack} className="rounded-full bg-white/15 px-3 py-1 text-xs hover:bg-white/25">
                  Next article →
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-slate-900/85 backdrop-blur-xl px-4 py-3 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs text-white/70">
                  Mastery: <strong className="text-white">{Math.round(mastery * 100)}%</strong>
                  <span className="text-white/55"> ({knownCount}/{totalHighlighted})</span>
                </div>
                <button onClick={handleComplete} className="ml-auto btn-primary py-2 text-sm">
                  ✓ Mark complete
                </button>
              </div>
            </div>
          )}
        </div>
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
