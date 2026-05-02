import { useEffect, useState } from 'react';

// Tiny global toast queue. Any component anywhere can call `showToast(msg)`
// and the lone <Toast /> mounted at App level will pick it up via the
// useToast() hook. State is module-level so we don't need a Context.

let current = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(current);
}

export function showToast(message, { tone = 'emerald', duration = 1800 } = {}) {
  const id = Date.now() + Math.random();
  current = { id, message, tone };
  notify();
  setTimeout(() => {
    // Only clear if this toast is still the active one — a later toast can
    // supersede us, in which case we let it run its own clock.
    if (current && current.id === id) {
      current = null;
      notify();
    }
  }, duration);
}

export function clearToast() {
  if (current) {
    current = null;
    notify();
  }
}

export function useToast() {
  const [toast, setToast] = useState(current);
  useEffect(() => {
    listeners.add(setToast);
    return () => listeners.delete(setToast);
  }, []);
  return toast;
}
