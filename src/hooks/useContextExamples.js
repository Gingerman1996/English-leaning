import { useEffect, useState } from 'react';

// Real-world usage examples drawn from public, CORS-friendly APIs:
//   • Google Books   — books.googleapis.com  (novels, textbooks, journals)
//   • Wikipedia      — en.wikipedia.org/w/api.php  (encyclopedic articles)
// Neither requires an API key for read-only public search. We cache results
// in-memory so flipping back to a card doesn't re-hit the network.

const cache = new Map();

// Words too short / too common to produce meaningful context. Searching for
// "a", "an", "the" returns either the Wikipedia article about the letter or
// noisy multilingual book scans. Skip the feature entirely for these.
const SKIP_WORDS = new Set([
  'a', 'an', 'the', 'i', 'in', 'on', 'at', 'to', 'of', 'or', 'is', 'be',
  'by', 'do', 'go', 'he', 'it', 'me', 'my', 'no', 'so', 'up', 'us', 'we',
  'as', 'am', 'if', 'has', 'have', 'had', 'and', 'but', 'for', 'not',
  'are', 'was', 'were', 'you', 'she', 'her', 'him', 'his', 'its', 'our',
  'this', 'that', 'with', 'from', 'they', 'them',
]);

function shouldSkipContext(word) {
  const w = word.toLowerCase().trim();
  if (w.length < 3) return true;
  return SKIP_WORDS.has(w);
}

// Snippets need to be predominantly English to be useful. Counts the ratio
// of Latin/extended-Latin characters; rejects anything below 85%. This
// catches Thai, Korean, Chinese, Burmese, Arabic, etc. that slip past the
// langRestrict=en filter on Google Books.
function isMostlyEnglish(text) {
  const stripped = text.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ');
  if (stripped.length < 20) return false;
  let latin = 0;
  let total = 0;
  for (const ch of stripped) {
    if (/\s|[0-9]/.test(ch)) continue;
    total++;
    const code = ch.codePointAt(0);
    // Basic Latin (0–0x7F), Latin-1 Supplement, Latin Extended A/B (≤ 0x024F),
    // plus common typographic punctuation.
    const isLatin = code <= 0x024f || (code >= 0x2010 && code <= 0x2027);
    if (isLatin) latin++;
  }
  return total > 0 && latin / total >= 0.85;
}

async function fetchGoogleBooks(word, signal) {
  // Quote the word so Books returns matches with the exact lemma rather than
  // weakly related volumes. `printType=books` filters out magazines.
  // Increase maxResults so we have headroom after filtering out non-English
  // hits — Google's langRestrict alone lets a lot of mixed-language scans
  // through.
  const url = `https://www.googleapis.com/books/v1/volumes?q=%22${encodeURIComponent(word)}%22&maxResults=20&printType=books&langRestrict=en`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Books HTTP ${res.status}`);
  const json = await res.json();
  return (json.items || [])
    .map((item) => {
      const v = item.volumeInfo || {};
      const snippet = item.searchInfo?.textSnippet;
      if (!snippet) return null;
      // Trust the volume's metadata language when present.
      if (v.language && v.language !== 'en') return null;
      // Reject titles that aren't predominantly English (catches Thai /
      // Burmese / Korean cookbooks etc. that Google still tags as `en`).
      if (v.title && !isMostlyEnglish(v.title)) return null;
      // Reject snippets that are mostly non-English — common when a Thai
      // textbook has a single English example sentence.
      if (!isMostlyEnglish(snippet)) return null;
      // Skip snippets that don't actually contain the word (Google sometimes
      // returns matches against author names or category metadata).
      const re = new RegExp(`\\b${word}\\w*\\b`, 'i');
      if (!re.test(snippet.replace(/<[^>]+>/g, ''))) return null;
      return {
        source: 'books',
        snippet,
        title: v.title || 'Untitled',
        authors: v.authors || [],
        year: v.publishedDate ? v.publishedDate.slice(0, 4) : null,
        publisher: v.publisher || null,
        link: v.previewLink || v.infoLink || null,
        category: (v.categories && v.categories[0]) || null,
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

async function fetchWikipedia(word, signal) {
  // `origin=*` enables CORS. `srsearch` does fulltext search across all
  // articles and returns highlighted snippets.
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    `"${word}"`
  )}&format=json&origin=*&srprop=snippet&srlimit=10`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Wiki HTTP ${res.status}`);
  const json = await res.json();
  return (json.query?.search || [])
    .map((r) => {
      if (!r.snippet) return null;
      // Skip articles whose title equals the word — these are usually
      // dictionary-style entries about the letter / word itself, full of
      // phonetic alphabet symbols rather than usage in real prose.
      if (r.title.toLowerCase() === word.toLowerCase()) return null;
      // Reject snippets that aren't predominantly English text.
      if (!isMostlyEnglish(r.snippet)) return null;
      return {
        source: 'wikipedia',
        snippet: r.snippet,
        title: r.title,
        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

export function useContextExamples(word) {
  const [data, setData] = useState({ books: [], wiki: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!word) {
      setData({ books: [], wiki: [] });
      return;
    }
    if (shouldSkipContext(word)) {
      setData({ books: [], wiki: [], skipped: true });
      return;
    }
    const key = word.toLowerCase();
    if (cache.has(key)) {
      setData(cache.get(key));
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    Promise.allSettled([
      fetchGoogleBooks(word, ctrl.signal),
      fetchWikipedia(word, ctrl.signal),
    ])
      .then(([booksRes, wikiRes]) => {
        const result = {
          books: booksRes.status === 'fulfilled' ? booksRes.value : [],
          wiki: wikiRes.status === 'fulfilled' ? wikiRes.value : [],
        };
        cache.set(key, result);
        setData(result);
        if (booksRes.status === 'rejected' && wikiRes.status === 'rejected') {
          setError('Both context sources failed.');
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [word]);

  return { data, loading, error };
}
