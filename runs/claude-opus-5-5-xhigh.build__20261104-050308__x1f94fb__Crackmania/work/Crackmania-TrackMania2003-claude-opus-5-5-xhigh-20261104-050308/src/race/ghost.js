// CRACKMANIA ghosts and replays (PLAN §4.7): a sample every 4th step (30 Hz): the position as 1/256 m deltas with a
// float key frame every 30 samples, the orientation as a smallest-three quaternion in 32 bits, the speed, flags
// (1 grounded, 2 boost, 4 brake, 8 a cut: no blending from the sample before). Stored base64 in the profile.
import { quatFromFrame, frameFromQuat, slerp } from '../lib/v3.js';

export const EVERY = 4, KEY = 30, QS = 256;
export class GhostRecorder {
  constructor() { this.P = []; this.Q = []; this.V = []; this.F = []; this.marks = []; this.cut = false; }
  sample(car, steps, flags = 0) {
    this.P.push(car.p[0], car.p[1], car.p[2]); this.Q.push(quatFromFrame(car.f, car.r, car.u)); this.V.push(Math.min(255, Math.round(car.kmh / 2)));
    this.F.push(flags | (car.grounded ? 1 : 0) | (car.boostT > 0 ? 2 : 0) | (car.brakeOn ? 4 : 0) | (this.cut ? 8 : 0)); this.cut = false;
  }
  mark(kind, steps) { this.marks.push([kind, steps]); if (kind === 'respawn') this.cut = true; }
  get count() { return this.V.length; }
  /** a Ghost to play back now */
  ghost(meta = {}) { return Ghost.decode(this.encode(meta)); }
  encode(meta = {}) {
    const n = this.V.length, keys = Math.ceil(n / KEY), bytes = new ArrayBuffer(12 + keys * 12 + n * 12), dv = new DataView(bytes);
    dv.setUint8(0, 71); dv.setUint8(1, 49); dv.setUint32(2, n, true); dv.setUint16(6, 0, true);
    let o = 12, last = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const p = [this.P[i * 3], this.P[i * 3 + 1], this.P[i * 3 + 2]];
      if (i % KEY === 0) { for (let k = 0; k < 3; k++) { dv.setFloat32(o, p[k], true); o += 4; last[k] = Math.fround(p[k]); } }
      else for (let k = 0; k < 3; k++) { const d = Math.max(-32767, Math.min(32767, Math.round((p[k] - last[k]) * QS))); dv.setInt16(o, d, true); o += 2; last[k] += d / QS; }
      dv.setUint32(o, packQuat(this.Q[i]), true); o += 4;
      dv.setUint8(o++, this.V[i]); dv.setUint8(o++, this.F[i]);
    }
    const raw = new Uint8Array(bytes, 0, o);
    return { v: 1, data: toB64(raw), marks: this.marks.slice(), ...meta };
  }
}
export class Ghost {
  /** from an encoded { data, marks, ... } */
  static decode(enc) {
    const raw = fromB64(enc.data), dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength), n = dv.getUint32(2, true), g = new Ghost();
    g.n = n; g.P = new Float64Array(n * 3); g.Q = []; g.V = new Uint8Array(n); g.F = new Uint8Array(n); g.marks = enc.marks || []; g.meta = enc;
    let o = 12; const last = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      if (i % KEY === 0) for (let k = 0; k < 3; k++) { last[k] = dv.getFloat32(o, true); o += 4; }
      else for (let k = 0; k < 3; k++) { last[k] += dv.getInt16(o, true) / QS; o += 2; }
      g.P[i * 3] = last[0]; g.P[i * 3 + 1] = last[1]; g.P[i * 3 + 2] = last[2];
      g.Q.push(unpackQuat(dv.getUint32(o, true))); o += 4; g.V[i] = dv.getUint8(o++); g.F[i] = dv.getUint8(o++);
    }
    g.bytes = raw.byteLength;
    return g;
  }
  /** the last step it reaches */
  get steps() { return (this.n - 1) * EVERY; }
  get finishSteps() { const m = this.marks.find(m => m[0] === 'finish'); return m ? m[1] : null; }
  /** where it is at a step (fractional ok): { p, f, r, u, q, kmh, flags } */
  at(step) {
    const x = Math.max(0, Math.min(this.n - 1, step / EVERY)), i = Math.floor(x), j = Math.min(this.n - 1, i + 1), k = this.F[j] & 8 ? 0 : x - i;
    const P = this.P, p = [P[i * 3] + (P[j * 3] - P[i * 3]) * k, P[i * 3 + 1] + (P[j * 3 + 1] - P[i * 3 + 1]) * k, P[i * 3 + 2] + (P[j * 3 + 2] - P[i * 3 + 2]) * k];
    const q = k ? slerp(this.Q[i], this.Q[j], k) : this.Q[i], fr = frameFromQuat(q);
    return { p, f: fr.f, r: fr.r, u: fr.u, q, kmh: (this.V[i] + (this.V[j] - this.V[i]) * k) * 2, flags: this.F[i], grounded: !!(this.F[i] & 1), boost: !!(this.F[i] & 2), brake: !!(this.F[i] & 4) };
  }
  /** the marks of one kind: [[kind, steps]] */
  of(kind) { return this.marks.filter(m => m[0] === kind).map(m => m[1]); }
}
/* smallest three: the largest component's index (2 bits), the others in 10 bits each over +-1/sqrt2 */
const S2 = Math.SQRT1_2;
function packQuat(q) {
  let m = 0; for (let i = 1; i < 4; i++) if (Math.abs(q[i]) > Math.abs(q[m])) m = i;
  const s = q[m] < 0 ? -1 : 1; let v = m;
  for (let i = 0, b = 2; i < 4; i++) if (i !== m) { const c = Math.max(0, Math.min(1023, Math.round((q[i] * s / S2 * .5 + .5) * 1023))); v |= c << b; b += 10; }
  return v >>> 0;
}
function unpackQuat(v) {
  const m = v & 3, q = [0, 0, 0, 0]; let sum = 0;
  for (let i = 0, b = 2; i < 4; i++) if (i !== m) { const c = (v >>> b) & 1023; q[i] = (c / 1023 - .5) * 2 * S2; sum += q[i] * q[i]; b += 10; }
  q[m] = Math.sqrt(Math.max(0, 1 - sum)); return q;
}
const B64 = typeof btoa === 'function' ? btoa : s => Buffer.from(s, 'binary').toString('base64');
const UNB64 = typeof atob === 'function' ? atob : s => Buffer.from(s, 'base64').toString('binary');
function toB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return B64(s); }
function fromB64(b) { const s = UNB64(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
