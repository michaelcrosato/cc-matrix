// Replay data: 30 Hz Float arrays in memory; 10 Hz Int16 base64 in storage (3 slots). Replays never re-simulate. Plan section 5 (Replays).
export const STRIDE = 12; // x y z yaw pitch roll steer rpm thr gear flags ax per car
const SC = [10, 10, 10, 1000, 1000, 1000, 1000, 0.5, 100, 1, 1, 100];
export function encode(rec, ncars, hz = 10) { // rec: array of per-frame number arrays (30 Hz)
  const step = Math.max(1, Math.round(30 / hz)), frames = Math.ceil(rec.length / step), data = new Int16Array(frames * ncars * STRIDE); let o = 0;
  for (let f = 0; f < rec.length; f += step) for (let i = 0; i < ncars * STRIDE; i++) { const v = rec[f][i] ?? 0; data[o++] = Math.max(-32767, Math.min(32767, Math.round(v * SC[i % STRIDE]))); }
  const bytes = new Uint8Array(data.buffer); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { v: 1, n: ncars, hz: 30 / step, frames, data: typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(bytes).toString('base64') };
}
export function decode(o) { const bin = typeof atob !== 'undefined' ? atob(o.data) : Buffer.from(o.data, 'base64').toString('binary'), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); const d = new Int16Array(bytes.buffer), rec = []; for (let f = 0; f < o.frames; f++) { const a = new Array(o.n * STRIDE); for (let i = 0; i < o.n * STRIDE; i++) a[i] = d[f * o.n * STRIDE + i] / SC[i % STRIDE]; rec.push(a); } return { rec, hz: o.hz }; }
const KEY = (slot) => 'gran-tourniquet-replay-' + slot;
export function saveSlot(slot, meta, rec, ncars) { try { const e = encode(rec, ncars); localStorage.setItem(KEY(slot), JSON.stringify({ meta, ...e })); return { ok: true }; } catch (err) { return { ok: false, why: 'THE STORAGE IS FULL. DELETE A SLOT FIRST.' }; } }
export function loadSlot(slot) { try { const s = localStorage.getItem(KEY(slot)); if (!s) return null; const o = JSON.parse(s), d = decode(o); return { meta: o.meta, rec: d.rec, hz: d.hz, n: o.n }; } catch { return null; } }
export function slotMeta(slot) { try { const s = localStorage.getItem(KEY(slot)); return s ? JSON.parse(s).meta : null; } catch { return null; } }
export function deleteSlot(slot) { try { localStorage.removeItem(KEY(slot)); } catch {} }
// Time trial ghost: the player's pose stream for the best lap, same encoding (stored in the profile under records).
export function packGhost(frames) { return encode(frames, 1); }
export function unpackGhost(o) { return decode(o); }
