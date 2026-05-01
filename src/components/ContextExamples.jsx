import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContextExamples } from '../hooks/useContextExamples.js';
import { speak, ttsAvailable } from '../hooks/useSpeech.js';

const HIGHLIGHT_CLASS = 'rounded bg-fuchsia-400/30 px-1 text-white';

// Render a snippet that may contain <b>...</b> (Google Books) or
// <span class="searchmatch">...</span> (Wikipedia) highlight markup. We use
// sentinel chars to mark matches, strip every other tag, decode entities,
// and render the matches as <mark>. Strictly safer than dangerouslySetInnerHTML.
function renderSnippet(snippet) {
  const SOH = '';
  const EOT = '';
  const tagged = snippet
    .replace(/<b>/gi, SOH)
    .replace(/<\/b>/gi, EOT)
    .replace(/<span\s+class="searchmatch"[^>]*>/gi, SOH)
    .replace(/<\/span>/gi, EOT)
    .replace(/<[^>]+>/g, '');
  const decoded = tagged
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  const out = [];
  let buf = '';
  let inMatch = false;
  for (const ch of decoded) {
    if (ch === SOH) {
      if (buf) out.push(buf);
      buf = '';
      inMatch = true;
    } else if (ch === EOT) {
      if (buf) out.push(<mark key={out.length} className={HIGHLIGHT_CLASS}>{buf}</mark>);
      buf = '';
      inMatch = false;
    } else {
      buf += ch;
    }
  }
  if (buf) {
    if (inMatch) out.push(<mark key={out.length} className={HIGHLIGHT_CLASS}>{buf}</mark>);
    else out.push(buf);
  }
  return out;
}

function plainText(snippet) {
  return snippet.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function ContextItem({ item }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-sm leading-relaxed text-white/85">
        <span className="text-white/40">“</span>
        {renderSnippet(item.snippet)}
        <span className="text-white/40">”</span>
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <a
          href={item.link || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-[11px] text-white/55 hover:text-white"
        >
          {item.source === 'books' ? (
            <>
              <span className="mr-1">📕</span>
              <span className="font-semibold text-white/75">{item.title}</span>
              {item.authors?.[0] && <span> · {item.authors[0]}{item.authors.length > 1 && ' et al.'}</span>}
              {item.year && <span className="text-white/45"> ({item.year})</span>}
              {item.category && <span className="text-white/45"> · {item.category}</span>}
            </>
          ) : (
            <>
              <span className="mr-1">📰</span>
              Wikipedia: <span className="font-semibold text-white/75">{item.title}</span>
            </>
          )}
          <span className="ml-1 text-white/40">↗</span>
        </a>
        {ttsAvailable() && (
          <button
            onClick={() => speak(plainText(item.snippet))}
            className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80 hover:bg-white/15"
            title="Read this passage aloud"
          >
            🔊
          </button>
        )}
      </div>
    </div>
  );
}

export default function ContextExamples({ word, level }) {
  const { data, loading, error } = useContextExamples(word, level);
  const [tab, setTab] = useState('books');

  const totalCount = data.books.length + data.wiki.length;
  const items = tab === 'books' ? data.books : data.wiki;

  // Stop-words / 1-2 letter words don't produce useful context — Wikipedia
  // returns the article about the letter itself and Books returns garbled
  // OCR'd polylingual scans. Hide the panel entirely for these.
  if (data.skipped) {
    return null;
  }

  if (loading && totalCount === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/55">
          Real-world usage
        </div>
        <p className="text-sm text-white/55">Searching books & Wikipedia for “{word}”…</p>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/55">
          Real-world usage
        </div>
        <p className="text-sm text-white/55">
          No English public-source matches for “{word}”. Very rare or specialized words may not turn up.
          {error && <span className="block text-amber-200/80 mt-1">{error}</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-white/55">
          Real-world usage
          {data.complexity?.label && (
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] normal-case tracking-normal text-white/65">
              {level} · {data.complexity.label}
            </span>
          )}
        </span>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setTab('books')}
            disabled={data.books.length === 0}
            className={[
              'rounded-full px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40',
              tab === 'books'
                ? 'bg-white text-slate-900 font-semibold shadow'
                : 'bg-white/5 text-white/65 hover:bg-white/10',
            ].join(' ')}
          >
            📚 Books · {data.books.length}
          </button>
          <button
            onClick={() => setTab('wiki')}
            disabled={data.wiki.length === 0}
            className={[
              'rounded-full px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-40',
              tab === 'wiki'
                ? 'bg-white text-slate-900 font-semibold shadow'
                : 'bg-white/5 text-white/65 hover:bg-white/10',
            ].join(' ')}
          >
            📖 Wikipedia · {data.wiki.length}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          {items.length === 0 ? (
            <p className="text-xs text-white/55">
              {tab === 'books' ? 'No book matches.' : 'No Wikipedia matches.'}
            </p>
          ) : (
            items.map((item, i) => <ContextItem key={`${tab}-${i}`} item={item} />)
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
