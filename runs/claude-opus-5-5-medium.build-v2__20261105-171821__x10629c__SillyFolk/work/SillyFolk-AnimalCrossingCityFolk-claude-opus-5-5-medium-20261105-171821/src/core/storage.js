// localStorage when there is one; otherwise memory (Node, sessions use the hub client's own).
const mem = new Map();
const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
export const storage = {
  get(k) { const s = ls(); try { return s ? s.getItem(k) : mem.get(k) ?? null; } catch { return mem.get(k) ?? null; } },
  set(k, v) { const s = ls(); try { if (s) s.setItem(k, v); else mem.set(k, v); } catch { mem.set(k, v); } },
  del(k) { const s = ls(); try { if (s) s.removeItem(k); } catch { /* memory only */ } mem.delete(k); },
  getJSON(k) { try { const v = this.get(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  setJSON(k, o) { this.set(k, JSON.stringify(o)); },
};
export const KEYS = { save: 'sillyfolk:save', settings: 'sillyfolk:settings', tuning: 'sillyfolk:tuning', session: 'sillyfolk:session', lifetime: 'sillyfolk:lifetime' };
