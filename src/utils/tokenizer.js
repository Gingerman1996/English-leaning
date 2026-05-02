// Article-text tokenizer + CEFR classifier. Used by the Reader to wrap
// every interesting word in an interactive span so the learner can tap on
// "might-not-know" words for a definition + pronunciation.

import { ALL_WORDS, LEVELS } from '../data/words.js';
import { isLearned } from './srs.js';

// Lemma → { word, pos, level, id } lookup. Built once at module load.
// If the same lemma exists at multiple levels (rare after our cross-level
// dedup) the first wins, since LEVELS is iterated in increasing order in
// ALL_WORDS.
const WORD_INDEX = new Map();
for (const w of ALL_WORDS) {
  const key = w.word.toLowerCase();
  if (!WORD_INDEX.has(key)) WORD_INDEX.set(key, w);
}

// Tiny rule-based stemmer to catch trivial inflections without pulling in a
// 200 KB NLP library. Sufficient for "running" → "run", "happier" → "happy",
// "studies" → "study". Tries each suffix rule in order.
function stems(word) {
  const out = new Set([word]);
  if (word.length < 4) return out;
  const tries = [
    [/ies$/, 'y'],
    [/es$/, ''],
    [/s$/, ''],
    [/ed$/, ''],
    [/ied$/, 'y'],
    [/ing$/, ''],
    [/ying$/, 'y'],
    [/er$/, ''],
    [/est$/, ''],
    [/ier$/, 'y'],
    [/iest$/, 'y'],
    [/ly$/, ''],
    [/ily$/, 'y'],
  ];
  for (const [re, repl] of tries) {
    if (re.test(word)) {
      out.add(word.replace(re, repl));
      // Some inflections double-letter (run → running): try un-doubling.
      const undoubled = word.replace(re, repl).replace(/(.)\1$/, '$1');
      if (undoubled !== word) out.add(undoubled);
    }
  }
  // Add an 'e' back for verbs like "writing" → "write".
  if (word.endsWith('ing')) out.add(word.slice(0, -3) + 'e');
  if (word.endsWith('ed')) out.add(word.slice(0, -2) + 'e');
  return out;
}

export function lookupWord(token) {
  const lower = token.toLowerCase();
  if (WORD_INDEX.has(lower)) return WORD_INDEX.get(lower);
  for (const candidate of stems(lower)) {
    if (WORD_INDEX.has(candidate)) return WORD_INDEX.get(candidate);
  }
  return null;
}

// Token classification used by the Reader to pick a highlight color.
//
//   target     — at the user's current level, not yet learned. Practice ground.
//   challenge  — above the user's current level. Stretch goal.
//   easy       — below the user's level. Either learned or shouldn't need a hint.
//   learned    — anything the user has graduated. Don't highlight.
//   unknown    — not in our corpus at all (proper nouns, numbers, etc.).
export function classifyWord(token, userLevelCode, progress) {
  const entry = lookupWord(token);
  if (!entry) return { kind: 'unknown' };
  const userLevelIdx = LEVELS.indexOf(userLevelCode);
  const wordLevelIdx = LEVELS.indexOf(entry.level);
  if (isLearned(progress[entry.id])) return { kind: 'learned', entry };
  if (userLevelIdx < 0) return { kind: 'target', entry };
  if (wordLevelIdx === userLevelIdx) return { kind: 'target', entry };
  if (wordLevelIdx > userLevelIdx) return { kind: 'challenge', entry };
  return { kind: 'easy', entry };
}

// Split a text into an array of segments preserving punctuation/whitespace
// between words. Each segment is { kind: 'word' | 'gap', text }.
export function tokenize(text) {
  const out = [];
  // Match a "word run" as letters with optional internal hyphens/apostrophes.
  const re = /[A-Za-z]+(?:[-'][A-Za-z]+)*/g;
  let lastIdx = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      out.push({ kind: 'gap', text: text.slice(lastIdx, m.index) });
    }
    out.push({ kind: 'word', text: m[0] });
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) {
    out.push({ kind: 'gap', text: text.slice(lastIdx) });
  }
  return out;
}

// Convenience: count how many highlight-worthy words are in a text — useful
// for showing a "X new words to discover" hint above the article.
export function countHighlights(text, userLevelCode, progress) {
  let target = 0;
  let challenge = 0;
  for (const tok of tokenize(text)) {
    if (tok.kind !== 'word') continue;
    const c = classifyWord(tok.text, userLevelCode, progress);
    if (c.kind === 'target') target++;
    else if (c.kind === 'challenge') challenge++;
  }
  return { target, challenge };
}

// Walk an article and collect the unique highlighted words (target +
// challenge), mapped back to their CEFR entries. Used by the Reader to
// build a vocabulary checklist below the article.
//
// Returns: [{ entry, kind, count }, ...] sorted by:
//   1. challenge before target (harder first — gives momentum to learn)
//   2. higher count first (frequent in the article = more useful)
export function collectHighlightedWords(text, userLevelCode, progress) {
  const seen = new Map(); // entry.id → { entry, kind, count }
  for (const tok of tokenize(text)) {
    if (tok.kind !== 'word') continue;
    const c = classifyWord(tok.text, userLevelCode, progress);
    if (c.kind !== 'target' && c.kind !== 'challenge') continue;
    const key = c.entry.id;
    const existing = seen.get(key);
    if (existing) existing.count += 1;
    else seen.set(key, { entry: c.entry, kind: c.kind, count: 1 });
  }
  return [...seen.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'challenge' ? -1 : 1;
    return b.count - a.count;
  });
}
