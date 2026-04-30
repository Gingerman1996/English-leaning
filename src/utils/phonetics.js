// Phonetic similarity helpers — used to score Whisper transcripts against the
// target word. Web Speech / Whisper return text, not phonemes, so we combine
// edit distance and a Soundex-style code to give partial credit when the
// user said something that sounds close but isn't an exact spelling match.

export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // Two-row DP — O(min(m, n)) memory.
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Classic Soundex: first letter + 3 digits encoding consonant clusters.
export function soundex(s) {
  if (!s) return '0000';
  s = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '0000';
  const map = {
    B: 1, F: 1, P: 1, V: 1,
    C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2,
    D: 3, T: 3,
    L: 4,
    M: 5, N: 5,
    R: 6,
  };
  const first = s[0];
  let prevCode = map[first] || 0;
  let result = first;
  for (let i = 1; i < s.length && result.length < 4; i++) {
    const ch = s[i];
    const code = map[ch] || 0;
    if (code !== 0 && code !== prevCode) result += code;
    // H and W don't reset the prev-code chain; vowels do.
    if (ch !== 'H' && ch !== 'W') prevCode = code;
  }
  return (result + '000').slice(0, 4);
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z' -]/g, '').trim();

// Score 0–100 combining: exact match → 100, soundex match → ≥85,
// edit-distance similarity otherwise. Picks the best alternative if `heard`
// has multiple words.
export function scorePronunciation(target, heard) {
  const t = norm(target);
  const h = norm(heard);
  if (!t || !h) return 0;
  if (t === h) return 100;

  const candidates = h.split(/\s+/).filter(Boolean);
  if (candidates.length === 0) return 0;

  let best = 0;
  for (const c of candidates) {
    if (c === t) {
      best = 100;
      break;
    }
    const editDist = levenshtein(t, c);
    const editScore = Math.max(0, 100 * (1 - editDist / Math.max(t.length, c.length)));
    const phonetic = soundex(t) === soundex(c) ? 88 : 0;
    const score = Math.max(editScore, phonetic);
    if (score > best) best = score;
  }
  return Math.round(best);
}

export function scoreLabel(score) {
  if (score >= 95) return { stars: 5, label: 'Native', tone: 'emerald' };
  if (score >= 85) return { stars: 4, label: 'Great', tone: 'emerald' };
  if (score >= 70) return { stars: 3, label: 'Good', tone: 'sky' };
  if (score >= 50) return { stars: 2, label: 'Close', tone: 'amber' };
  if (score >= 30) return { stars: 1, label: 'Try again', tone: 'rose' };
  return { stars: 0, label: 'Not detected', tone: 'rose' };
}
