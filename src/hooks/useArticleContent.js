import { useEffect, useState } from 'react';

// Fetch readable article text. We use the MediaWiki "TextExtracts" extension:
//   action=query&prop=extracts&exsectionformat=plain&explaintext=1
// which returns clean prose without markup. We split it into paragraphs and
// drop the noise (empty lines, "See also" boilerplate).

const cache = new Map();

function hostForLevel(level) {
  return level === 'A1' || level === 'A2'
    ? 'simple.wikipedia.org'
    : 'en.wikipedia.org';
}

export function useArticleContent(title, level) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!title) {
      setArticle(null);
      return;
    }
    const host = hostForLevel(level);
    const key = `${host}:${title}`;
    if (cache.has(key)) {
      setArticle(cache.get(key));
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const url = `https://${host}/w/api.php?action=query&format=json&origin=*&prop=extracts|info|pageimages&explaintext=1&exsectionformat=plain&inprop=url&piprop=thumbnail&pithumbsize=400&titles=${encodeURIComponent(
      title
    )}`;

    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const pages = json.query?.pages || {};
        const page = Object.values(pages)[0];
        if (!page || page.missing !== undefined) {
          throw new Error('Article not found');
        }
        const extract = (page.extract || '').trim();
        if (!extract) throw new Error('Article has no readable extract');
        // Cap length so we don't dump 30,000-word essays on the UI.
        const trimmed = extract.length > 6000 ? extract.slice(0, 6000) + '…' : extract;
        const paragraphs = trimmed
          .split(/\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0 && !/^(See also|References|Further reading|External links|Notes)\b/i.test(p));
        const result = {
          title: page.title,
          paragraphs,
          url: page.fullurl,
          thumbnail: page.thumbnail?.source || null,
          host,
        };
        cache.set(key, result);
        setArticle(result);
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setError(e.message || 'Failed to load article');
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [title, level]);

  return { article, loading, error };
}
