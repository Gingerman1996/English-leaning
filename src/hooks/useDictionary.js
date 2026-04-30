import { useEffect, useRef, useState } from 'react';

// Free Dictionary API — no key required, Oxford-derived data via Wiktionary.
// Docs: https://dictionaryapi.dev/
const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

const cache = new Map();

function pickAudio(phonetics = []) {
  const withAudio = phonetics.find((p) => p.audio);
  return withAudio?.audio || '';
}

function pickPhonetic(entry) {
  if (entry.phonetic) return entry.phonetic;
  const p = entry.phonetics?.find((x) => x.text);
  return p?.text || '';
}

function shapeEntry(raw, preferredPos) {
  if (!raw || raw.length === 0) return null;
  const head = raw[0];
  const meanings = raw.flatMap((r) => r.meanings || []);

  // Prefer the meaning that matches the requested part of speech.
  const orderedMeanings = preferredPos
    ? [...meanings].sort((a, b) =>
        a.partOfSpeech === preferredPos ? -1 : b.partOfSpeech === preferredPos ? 1 : 0
      )
    : meanings;

  const flatDefinitions = orderedMeanings.flatMap((m) =>
    (m.definitions || []).slice(0, 2).map((d) => ({
      pos: m.partOfSpeech,
      text: d.definition,
      example: d.example || '',
      synonyms: (d.synonyms || []).slice(0, 4),
      antonyms: (d.antonyms || []).slice(0, 4),
    }))
  );

  return {
    word: head.word,
    phonetic: pickPhonetic(head),
    audio: pickAudio(raw.flatMap((r) => r.phonetics || [])),
    definitions: flatDefinitions.slice(0, 4),
    sourceUrls: head.sourceUrls || [],
  };
}

export function useDictionary(word, preferredPos) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ctrlRef = useRef(null);

  useEffect(() => {
    if (!word) {
      setData(null);
      return;
    }

    if (cache.has(word)) {
      const cached = cache.get(word);
      setData(shapeEntry(cached, preferredPos));
      return;
    }

    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    setLoading(true);
    setError(null);

    fetch(ENDPOINT + encodeURIComponent(word), { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!Array.isArray(json) || json.length === 0) {
          throw new Error('No entry found');
        }
        cache.set(word, json);
        setData(shapeEntry(json, preferredPos));
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setError(e.message || 'Lookup failed');
        setData(null);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [word, preferredPos]);

  return { data, loading, error };
}

export function playAudio(url) {
  if (!url) return;
  const a = new Audio(url);
  a.play().catch(() => {});
}
