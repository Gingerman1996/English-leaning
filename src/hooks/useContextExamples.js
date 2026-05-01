import { useEffect, useState } from 'react';

// Real-world usage examples drawn from public, CORS-friendly APIs:
//   • Google Books   — books.googleapis.com  (novels, textbooks, journals)
//   • Wikipedia      — en.wikipedia.org/w/api.php  (encyclopedic articles)
// Neither requires an API key for read-only public search. We cache results
// in-memory so flipping back to a card doesn't re-hit the network.

const cache = new Map();

async function fetchGoogleBooks(word, signal) {
  // Quote the word so Books returns matches with the exact lemma rather than
  // weakly related volumes. `printType=books` filters out magazines.
  const url = `https://www.googleapis.com/books/v1/volumes?q=%22${encodeURIComponent(word)}%22&maxResults=10&printType=books&langRestrict=en`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Books HTTP ${res.status}`);
  const json = await res.json();
  return (json.items || [])
    .map((item) => {
      const v = item.volumeInfo || {};
      const snippet = item.searchInfo?.textSnippet;
      if (!snippet) return null;
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
  )}&format=json&origin=*&srprop=snippet&srlimit=6`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Wiki HTTP ${res.status}`);
  const json = await res.json();
  return (json.query?.search || [])
    .map((r) => {
      if (!r.snippet) return null;
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
