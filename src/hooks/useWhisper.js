import { useEffect, useRef, useState } from 'react';

// Lazy singleton: the Whisper-tiny.en pipeline is ~40 MB on first load and is
// cached by the browser's Cache API thereafter. We share one promise across
// the app so the model is only ever fetched once.
let pipelinePromise = null;
const progressListeners = new Set();

function broadcast(p) {
  for (const fn of progressListeners) fn(p);
}

async function getPipeline() {
  if (pipelinePromise) return pipelinePromise;
  pipelinePromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // Stay within the browser sandbox — no Node fs/local model loading.
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    return pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      progress_callback: broadcast,
    });
  })();
  return pipelinePromise;
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

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

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

    // 1. Ask for mic FIRST so the permission prompt is the very next thing
    //    the user sees — never make them wait through a 40 MB model download
    //    before knowing if mic access works.
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (blob.size === 0) {
        setError('No audio captured. Hold the mic and speak the word.');
        setStatus('error');
        return;
      }
      try {
        setStatus('transcribing');
        const float32 = await blobToFloat32(blob);
        const pipe = await getPipeline(); // resolves immediately if already loaded
        const out = await pipe(float32, { language: 'en', task: 'transcribe' });
        setTranscript((out?.text || '').trim());
        setStatus('ready');
      } catch (e) {
        setError(e?.message || 'Could not transcribe the audio.');
        setStatus('error');
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus('recording');
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }

  function reset() {
    setTranscript('');
    setError(null);
  }

  return { status, progress, transcript, error, start, stop, reset };
}
