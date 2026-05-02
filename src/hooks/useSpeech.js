// Browser SpeechSynthesis (TTS) wrapper. Whisper-based recognition lives in
// useWhisper.js — this file is purely the "computer says it back" half.

import { useEffect, useState } from 'react';

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

// Global "is speaking" state, broadcast to every component that subscribes
// via useIsSpeaking(). The browser's native speechSynthesis.speaking flag
// changes silently, so we wire it up to utterance events ourselves to make
// the UI reactive.
let isSpeakingState = false;
const speakingListeners = new Set();

function setSpeaking(value) {
  if (isSpeakingState === value) return;
  isSpeakingState = value;
  for (const fn of speakingListeners) fn(value);
}

export function isSpeaking() {
  return isSpeakingState;
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
  // Wire utterance lifecycle → global state.
  u.onstart = () => setSpeaking(true);
  u.onend = () => setSpeaking(false);
  u.onerror = () => setSpeaking(false);
  // pause/resume don't fire reliably across browsers; we treat them as no-ops.
  synth.speak(u);
  // Some browsers (Safari) don't always fire `start` immediately, so set
  // optimistic state right away.
  setSpeaking(true);
}

export function stopSpeaking() {
  if (synth) synth.cancel();
  setSpeaking(false);
}

// React hook: returns true while TTS is active. Re-renders the consumer
// whenever speak()/stopSpeaking() flip the state.
export function useIsSpeaking() {
  const [value, setValue] = useState(isSpeakingState);
  useEffect(() => {
    speakingListeners.add(setValue);
    return () => speakingListeners.delete(setValue);
  }, []);
  return value;
}
