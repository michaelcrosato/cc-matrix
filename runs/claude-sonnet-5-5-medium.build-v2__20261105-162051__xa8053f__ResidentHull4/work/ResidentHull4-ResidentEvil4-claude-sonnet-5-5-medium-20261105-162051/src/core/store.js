// localStorage wrapper that never throws (a hub session hands us an empty in-memory storage).
import { SLUG } from '../config.js';
const mem = new Map();
function ls() { try { return globalThis.localStorage || null; } catch { return null; } }
export function loadKey(key, fallback = null) {
  const k = SLUG + '.' + key;
  try { const s = ls(); const raw = s ? s.getItem(k) : mem.get(k); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
export function saveKey(key, value) {
  const k = SLUG + '.' + key;
  try { const raw = JSON.stringify(value); const s = ls(); if (s) s.setItem(k, raw); else mem.set(k, raw); return true; } catch { return false; }
}
export function removeKey(key) { const k = SLUG + '.' + key; try { const s = ls(); if (s) s.removeItem(k); else mem.delete(k); } catch { /* ignore */ } }
