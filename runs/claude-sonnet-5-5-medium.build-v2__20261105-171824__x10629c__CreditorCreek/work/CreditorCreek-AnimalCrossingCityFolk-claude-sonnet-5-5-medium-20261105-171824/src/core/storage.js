// localStorage with an in-memory fallback so the game imports in Node and in sandboxed frames.
const mem = new Map();
let ls = null;
try { ls = typeof localStorage !== 'undefined' ? localStorage : null; if (ls) { ls.setItem('__t', '1'); ls.removeItem('__t'); } } catch { ls = null; }
export const storage = {
  get(k) { try { return ls ? ls.getItem(k) : (mem.has(k) ? mem.get(k) : null); } catch { return mem.get(k) ?? null; } },
  set(k, v) { try { if (ls) ls.setItem(k, v); else mem.set(k, v); } catch { mem.set(k, v); } },
  remove(k) { try { if (ls) ls.removeItem(k); else mem.delete(k); } catch { mem.delete(k); } },
  json(k, d = null) { try { const s = this.get(k); return s ? JSON.parse(s) : d; } catch { return d; } },
  setJson(k, v) { this.set(k, JSON.stringify(v)); },
};
