// localStorage with a memory fallback, so the game imports and runs in Node and in Hub sessions.
const mem = new Map();
let ls = null;
try { if (typeof localStorage !== 'undefined') ls = localStorage; } catch { ls = null; }
export const store = {
  get(key) {
    try {
      const raw = ls ? ls.getItem(key) : mem.get(key);
      return raw == null ? null : JSON.parse(raw);
    } catch { return null; }
  },
  set(key, value) {
    const raw = JSON.stringify(value);
    try { if (ls) ls.setItem(key, raw); else mem.set(key, raw); } catch { mem.set(key, raw); }
  },
  remove(key) {
    try { if (ls) ls.removeItem(key); } catch { /* storage refused: memory still clears */ }
    mem.delete(key);
  },
  has(key) { try { return ls ? ls.getItem(key) != null : mem.has(key); } catch { return false; } },
};
