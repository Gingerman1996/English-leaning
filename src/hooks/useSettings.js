import { useLocalStorage } from './useStorage.js';

// Per-user app settings stored in localStorage. Right now this is just the
// Guardian Open Platform API key — but the file is the natural home for any
// future runtime config the user can tweak.
//
// We default the Guardian key to "test", the documented public sandbox key
// at https://open-platform.theguardian.com/access/. It's shared & rate-
// limited so heavier use should fall back to a personal key (one-click
// register at the URL above).

const DEFAULTS = {
  guardianApiKey: 'test',
};

export function useSettings() {
  return useLocalStorage('lenglist:settings', DEFAULTS);
}
