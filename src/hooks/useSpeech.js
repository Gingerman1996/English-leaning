// Browser SpeechSynthesis (TTS) wrapper. Whisper-based recognition lives in
// useWhisper.js — this file is purely the "computer says it back" half.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

export function ttsAvailable() {
  return !!synth;
}

let cachedVoice = null;

function pickVoice() {
  if (!synth) return null;
  if (cachedVoice) return cachedVoice;
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;
  // Prefer a US English voice; fall back to anything English.
  const us = voices.find((v) => /en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
  cachedVoice = us || voices[0];
  return cachedVoice;
}

// Some browsers fire `voiceschanged` once after first call to getVoices —
// make sure we re-pick when that happens.
if (synth && typeof synth.addEventListener === 'function') {
  synth.addEventListener('voiceschanged', () => {
    cachedVoice = null;
  });
}

export function speak(text, { rate = 0.95, pitch = 1.0, lang = 'en-US' } = {}) {
  if (!synth || !text) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  const voice = pickVoice();
  if (voice) u.voice = voice;
  synth.speak(u);
}

export function stopSpeaking() {
  if (synth) synth.cancel();
}
