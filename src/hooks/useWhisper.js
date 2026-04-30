import { useCallback, useEffect, useRef, useState } from 'react';

// Lazy singleton: the Whisper-tiny.en pipeline is ~40 MB on first load and is
// cached by the browser's Cache API thereafter. We share one promise across
// the app so the model is only ever fetched once.
let pipelinePromise = null;
const progressListeners = new Set();

function broadcast(p) {
  for (const fn of progressListeners) fn(p);
}

// We tried `int8` and `q8` for both encoder and decoder; both failed because
// (a) the encoder doesn't ship an `_int8.onnx` file (404), and (b) the
// library's WebGPU backend silently fell back to the q4 decoder which is
// broken (MatMulNBits missing scale tensors). The combo below is the one
// proven to load cleanly: fp32 encoder (33 MB) + fp16 decoder (59 MB).
// Total ~92 MB on first load, cached afterwards. Larger than ideal but
// non-negotiable until upstream fixes the q4/q8 path.
async function getPipeline() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    // Pre-disable WebGPU at the env level — `device: 'wasm'` in pipeline
    // options wasn't enough; the WebGPU bundle was still being loaded in
    // some code paths.
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.numThreads = 1;
    }
    return pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      progress_callback: broadcast,
      device: 'wasm',
      dtype: {
        encoder_model: 'fp32',
        decoder_model_merged: 'fp16',
      },
    });
  })().catch((e) => {
    pipelinePromise = null;
    throw e;
  });
  return pipelinePromise;
}

// Lets the UI offer a "Clear cached model" button. Wipes the entries in the
// browser's Cache API that transformers.js wrote, then resets the singleton
// so the next request re-downloads.
export async function clearWhisperCache() {
  pipelinePromise = null;
  if (typeof caches === 'undefined') return;
  const names = await caches.keys();
  for (const name of names) {
    if (name.startsWith('transformers-cache') || name.includes('huggingface')) {
      await caches.delete(name);
    }
  }
}

// Decode an arbitrary audio Blob to a 16 kHz mono Float32Array — the format
// Whisper expects. Mixes channels to mono and resamples via
// OfflineAudioContext to avoid pulling in a resampler library.
async function blobToFloat32(blob, targetSr = 16000) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  try {
    const arrayBuf = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);

    // Mix down to mono.
    const monoLen = decoded.length;
    const mono = new Float32Array(monoLen);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const data = decoded.getChannelData(ch);
      for (let i = 0; i < monoLen; i++) {
        mono[i] += data[i] / decoded.numberOfChannels;
      }
    }

    if (decoded.sampleRate === targetSr) return mono;

    const targetLen = Math.ceil(decoded.duration * targetSr);
    const offline = new OfflineAudioContext(1, targetLen, targetSr);
    const buf = offline.createBuffer(1, mono.length, decoded.sampleRate);
    buf.copyToChannel(mono, 0);
    const src = offline.createBufferSource();
    src.buffer = buf;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally {
    ctx.close();
  }
}

export function whisperAvailable() {
  if (typeof window === 'undefined') return false;
  if (!navigator?.mediaDevices?.getUserMedia) return false;
  if (typeof MediaRecorder === 'undefined') return false;
  return true;
}

// Browsers block getUserMedia silently in many places: cross-origin iframes
// without `allow="microphone"`, insecure (non-https, non-localhost) origins,
// and Permissions Policy denials. Detect those up front so we can show a
// clear hint instead of a silent failure.
export function micEnvironmentIssue() {
  if (typeof window === 'undefined') return null;

  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  const isSecure = window.isSecureContext || isLocalhost;
  if (!isSecure) {
    return 'Microphone needs HTTPS (or localhost). Open the app at https:// or on http://localhost.';
  }

  const inIframe = window.self !== window.top;
  if (inIframe) {
    // Permissions Policy is the modern API; featurePolicy is the old name.
    const policy = document.featurePolicy || document.permissionsPolicy;
    const allowed = policy ? policy.allowsFeature('microphone') : false;
    if (!allowed) {
      return 'This page is in a preview iframe that blocks the microphone. Open the app in a new tab/window to enable mic access.';
    }
  }
  return null;
}

// Eagerly trigger model download. Call this after the user has revealed a
// card so by the time they click the mic, the model is already buffering.
export function preloadWhisper() {
  if (whisperAvailable()) {
    getPipeline().catch(() => {});
  }
}

export function useWhisper() {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | recording | transcribing | error
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(null); // { url, duration, mimeType } or null

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  // Subscribe to model load progress for the lifetime of this hook.
  useEffect(() => {
    function onProgress(p) {
      if (p.status === 'progress' && p.total) {
        setProgress(Math.round((p.loaded / p.total) * 100));
      } else if (p.status === 'done') {
        setProgress(100);
      }
    }
    progressListeners.add(onProgress);
    return () => {
      progressListeners.delete(onProgress);
    };
  }, []);

  // Stop the mic stream on unmount.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function ensureLoaded() {
    if (status === 'ready' || status === 'recording' || status === 'transcribing') return;
    setError(null);
    setStatus('loading');
    setProgress(0);
    try {
      await getPipeline();
      setStatus('ready');
    } catch (e) {
      setError(e?.message || 'Failed to load Whisper model');
      setStatus('error');
      throw e;
    }
  }

  async function start() {
    if (status === 'recording' || status === 'transcribing') return;
    if (!whisperAvailable()) {
      setError('Pronunciation requires a browser with microphone + MediaRecorder support.');
      setStatus('error');
      return;
    }
    const envIssue = micEnvironmentIssue();
    if (envIssue) {
      setError(envIssue);
      setStatus('error');
      return;
    }

    setError(null);
    setTranscript('');
    // Defer revoking the previous blob URL — if we revoke before React
    // re-renders, the <audio> element fires one last fetch on the dead URL
    // and the browser logs "Failed to load resource". 100ms is enough for
    // React to swap the src.
    if (recording?.url) {
      const old = recording.url;
      setTimeout(() => URL.revokeObjectURL(old), 100);
    }
    setRecording(null);

    // 1. Ask for mic FIRST so the permission prompt is the very next thing
    //    the user sees — never make them wait through a 40 MB model download
    //    before knowing if mic access works.
    console.log('[LengList] Requesting microphone…');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[LengList] Mic granted; tracks:', stream.getTracks().map((t) => t.label));
    } catch (e) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Microphone permission was denied. Click the 🔒 icon in the address bar to allow it, then try again.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('No microphone detected on this device.');
      } else if (name === 'NotReadableError') {
        setError('Microphone is busy in another app. Close the other app and retry.');
      } else {
        setError(e?.message || 'Could not access microphone.');
      }
      setStatus('error');
      return;
    }

    // 2. Kick off model download in parallel (no await). Errors here surface
    //    later during transcription; we don't gate the recording on it.
    getPipeline().catch(() => {});

    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const duration = (Date.now() - startedAtRef.current) / 1000;
      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      console.log(`[LengList] Stopped: ${duration.toFixed(2)}s, ${blob.size} bytes, ${mimeType}`);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (blob.size === 0) {
        setError('No audio captured — try holding the mic for at least 1 second and speaking before tapping stop.');
        setStatus('error');
        return;
      }
      // Expose the recording so the user can play it back even if
      // transcription fails.
      const url = URL.createObjectURL(blob);
      setRecording({ url, duration, mimeType });

      try {
        setStatus('transcribing');
        console.log('[LengList] Decoding audio…');
        const float32 = await blobToFloat32(blob);
        console.log(`[LengList] Decoded: ${float32.length} samples @ 16kHz (${(float32.length / 16000).toFixed(2)}s)`);
        console.log('[LengList] Awaiting pipeline…');
        const pipe = await getPipeline();
        console.log('[LengList] Running Whisper inference…');
        // whisper-tiny.en is the English-only checkpoint — passing `language`
        // or `task` triggers "Cannot specify task/language for an
        // English-only model". Only multilingual variants (whisper-tiny,
        // whisper-base, etc. without `.en`) accept those options.
        const out = await pipe(float32);
        // Some Whisper pipelines return { text } directly; chunked variants
        // return [{ text, timestamp }]. Handle both.
        const rawText = Array.isArray(out)
          ? out.map((c) => c?.text || '').join(' ')
          : out?.text || '';
        console.log('[LengList] Whisper returned:', JSON.stringify(out), '→ extracted text:', JSON.stringify(rawText));
        const text = rawText.trim();
        if (!text) {
          setError('Whisper returned no text. Try recording again, a bit closer to the mic.');
          setStatus('error');
        } else {
          setTranscript(text);
          setStatus('ready');
        }
      } catch (e) {
        console.error('[LengList] Transcribe failed:', e);
        setError(e?.message || 'Could not transcribe the audio.');
        setStatus('error');
      }
    };
    recorderRef.current = recorder;
    // timeslice=100ms ensures `ondataavailable` fires even for very short
    // recordings; otherwise some browsers only emit once on stop, which can
    // produce an empty blob if the user taps stop quickly.
    recorder.start(100);
    startedAtRef.current = Date.now();
    setStatus('recording');
    console.log('[LengList] Recording…');
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }

  // useCallback so the reference is stable across renders. Otherwise
  // PronunciationCheck's `useEffect(..., [word, reset])` fires on EVERY
  // render and re-clears transcript + last score before the user can see
  // them — a sneaky race that hid the score card right after computing it.
  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    setRecording((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  return { status, progress, transcript, error, recording, start, stop, reset };
}
