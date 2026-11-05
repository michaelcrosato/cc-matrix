// Ghosts: a run recorded every 4th step (30 Hz): position (centimetres, int16 deltas, a key frame every 30 samples),
// orientation (a quaternion in int16), speed and flags; stored as base64. Playback interpolates (lerp, slerp).
import { quatFromFrame, frameFromQuat, slerp, len } from './v3.js';

export const EVERY = 4;   // steps between samples
export class Recorder {
  constructor() { this.s = []; this.n = 0; }
  sample(run) {
    if (this.s.length && (run.steps % EVERY !== 0 || run.steps / EVERY !== this.s.length)) return;
    const c = run.car, q = quatFromFrame(c.f, c.r, c.u);
    this.s.push([c.p[0], c.p[1], c.p[2], q[0], q[1], q[2], q[3], len(c.v), (c.grounded ? 1 : 0) | (c.boostT > 0 ? 2 : 0) | (c.brakeVis > .3 ? 4 : 0), c.steerVis || 0]);
  }
  toGhost(meta = {}) { return Object.assign({ data: encode(this.s), n: this.s.length }, meta); }
}
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return typeof btoa === 'function' ? btoa(s) : Buffer.from(bytes).toString('base64'); }
function unb64(str) { if (typeof atob === 'function') { const s = atob(str), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; } return new Uint8Array(Buffer.from(str, 'base64')); }
export function encode(S) {
  const buf = new DataView(new ArrayBuffer(S.length * 32 + 8)); let o = 0, prev = null;
  buf.setUint32(o, S.length); o += 4;
  S.forEach((s, i) => {
    const P = [Math.round(s[0] * 100), Math.round(s[1] * 100), Math.round(s[2] * 100)];
    const key = i % 30 === 0 || !prev || P.some((v, k) => Math.abs(v - prev[k]) > 32000);
    buf.setUint8(o++, key ? 1 : 0);
    if (key) { for (const v of P) { buf.setInt32(o, v); o += 4; } }
    else for (let k = 0; k < 3; k++) { buf.setInt16(o, P[k] - prev[k]); o += 2; }
    prev = P;
    for (let k = 3; k < 7; k++) { buf.setInt16(o, Math.round(s[k] * 32767)); o += 2; }
    buf.setUint8(o++, Math.min(255, Math.round(s[7] * 3.6 / 2))); buf.setUint8(o++, s[8]); buf.setInt8(o++, Math.round(Math.max(-1, Math.min(1, s[9] || 0)) * 127));
  });
  return b64(new Uint8Array(buf.buffer, 0, o));
}
export function decode(str) {
  const b = unb64(str), v = new DataView(b.buffer, b.byteOffset, b.byteLength); let o = 0; const n = v.getUint32(o); o += 4; const out = []; let P = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const key = v.getUint8(o++);
    if (key) { P = [v.getInt32(o), v.getInt32(o + 4), v.getInt32(o + 8)]; o += 12; } else { P = [P[0] + v.getInt16(o), P[1] + v.getInt16(o + 2), P[2] + v.getInt16(o + 4)]; o += 6; }
    const q = []; for (let k = 0; k < 4; k++) { q.push(v.getInt16(o) / 32767); o += 2; }
    const sp = v.getUint8(o++) * 2 / 3.6, fl = v.getUint8(o++), st = v.getInt8(o++) / 127;
    out.push([P[0] / 100, P[1] / 100, P[2] / 100, ...q, sp, fl, st]);
  }
  return out;
}
/** a ghost to play: at(steps) -> { p, f, r, u, speed, grounded, boost, brake } */
export class Ghost {
  constructor(g) { this.meta = g; this.s = Array.isArray(g.samples) ? g.samples : decode(g.data); this.spin = 0; }
  get steps() { return (this.s.length - 1) * EVERY; }
  at(steps) {
    const S = this.s; if (!S.length) return null;
    const t = Math.max(0, steps / EVERY), i = Math.min(S.length - 1, Math.floor(t)), j = Math.min(S.length - 1, i + 1), k = Math.min(1, t - i);
    const a = S[i], b = S[j], q = slerp([a[3], a[4], a[5], a[6]], [b[3], b[4], b[5], b[6]], k), fr = frameFromQuat(q);
    return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], f: fr.f, r: fr.r, u: fr.u, speed: a[7] + (b[7] - a[7]) * k, grounded: !!(a[8] & 1), boost: !!(a[8] & 2), brake: !!(a[8] & 4), steer: a[9] * .5, done: t >= S.length - 1 };
  }
}
