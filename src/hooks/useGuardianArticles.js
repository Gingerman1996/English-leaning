import { useEffect, useState } from 'react';

// Search the Guardian Open Platform for articles. The API includes the full
// bodyText in the search response when we ask for `show-fields=bodyText`,
// so a single round trip gets us search results AND the article body —
// no second fetch needed when the user picks one to read.
//
// Free Developer tier: 5,000 calls/day, 1 call/sec, CORS enabled.

const cache = new Map();

export function useGuardianArticles(query, apiKey) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || !query.trim()) {
      setResults([]);
      return;
    }
    const trimmed = query.trim();
    if (!apiKey) {
      setError('missing-key');
      setResults([]);
      return;
    }

    const cacheKey = `${apiKey.slice(0, 6)}:${trimmed.toLowerCase()}`;
    if (cache.has(cacheKey)) {
      setResults(cache.get(cacheKey));
      setError(null);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(
      trimmed
    )}&page-size=12&show-fields=trailText,bodyText,thumbnail,headline&order-by=relevance&api-key=${encodeURIComponent(
      apiKey
    )}`;

    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          throw new Error('invalid-key');
        }
        if (r.status === 429) throw new Error('rate-limited');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (json.response?.status !== 'ok') {
          throw new Error(json.response?.message || 'Guardian API error');
        }
        const items = (json.response?.results || []).map((r) => {
          const body = r.fields?.bodyText || '';
          // Split body into paragraphs; drop trivially short ones (boilerplate).
          const paragraphs = body
            .split(/\n+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 30)
            .slice(0, 25); // cap so we don't dump a 4000-word longread
          return {
            title: r.webTitle,
            section: r.sectionName,
            publicationDate: (r.webPublicationDate || '').slice(0, 10),
            url: r.webUrl,
            trailText: (r.fields?.trailText || '').replace(/<[^>]+>/g, ''),
            paragraphs,
            wordcount: body.split(/\s+/).filter(Boolean).length,
            thumbnail: r.fields?.thumbnail || null,
            host: 'theguardian.com',
            source: 'guardian',
          };
        });
        cache.set(cacheKey, items);
        setResults(items);
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setError(e.message || 'Guardian search failed');
        setResults([]);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [query, apiKey]);

  return { results, loading, error };
}
