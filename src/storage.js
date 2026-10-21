// The single persistence boundary. Today it is the browser's localStorage;
// phase 2 swaps this module for a shared backend without touching the views.
// Every access is guarded: private mode, a full quota or corrupted JSON fall
// back quietly, and `set` says whether the value was kept.

const NS = 'allure:';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  // false when the browser refused it (quota, private mode): the caller decides.
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(NS + key); } catch { /* ignore */ }
  },
  // Approximate size of a stored value, in characters (≈ bytes for ASCII JSON).
  size(key) {
    try { return localStorage.getItem(NS + key)?.length ?? 0; } catch { return 0; }
  },
  // Changes made in another tab: fn(key) with the key stripped of its namespace.
  subscribe(fn) {
    const listener = e => {
      if (e.storageArea && e.storageArea !== localStorage) return;
      if (e.key == null) fn(null);
      else if (e.key.startsWith(NS)) fn(e.key.slice(NS.length));
    };
    try { addEventListener('storage', listener); } catch { /* no window */ }
    return () => removeEventListener('storage', listener);
  },
};
