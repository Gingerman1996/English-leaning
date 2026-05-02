import { useEffect, useState } from 'react';

// Map CEFR level to which Wikipedia corpus to search. Same approach as the
// ContextExamples panel: simple.wikipedia.org for beginners, regular Wiki for
// B1 and up.
function hostForLevel(level) {
  return level === 'A1' || level === 'A2'
    ? 'simple.wikipedia.org'
    : 'en.wikipedia.org';
}

const cache = new Map();

export function useArticleSearch(query, level) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const trimmed = query.trim();
    const host = hostForLevel(level);
    const key = `${host}:${trimmed.toLowerCase()}`;
    if (cache.has(key)) {
      setResults(cache.get(key));
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const url = `https://${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      trimmed
    )}&format=json&origin=*&srprop=snippet|wordcount&srlimit=12`;

    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const items = (json.query?.search || []).map((r) => ({
          title: r.title,
          snippet: (r.snippet || '').replace(/<[^>]+>/g, ''),
          wordcount: r.wordcount || 0,
          host,
        }));
        cache.set(key, items);
        setResults(items);
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setError(e.message || 'Search failed');
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [query, level]);

  return { results, loading, error };
}
