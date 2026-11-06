// The netcode: `me` guest → host 10 Hz unreliable, `do` guest → host reliable, `snap` host → all 10 Hz
// unreliable (≤ 1,100 bytes), `ev` host → all reliable, `town` chunks ≤ 12 KB host → guest (Visit only).
export const SEND_RATE = 0.1;
export const REMOTE_DELAY = 120;
export const CHUNK = 12000;
const round = (v) => Math.round(v * 100) / 100;
export const packAvatar = (a) => [a.id, round(a.x), round(a.z), round(a.facing), a.action ?? 0];
export const unpackAvatar = (r) => ({ id: r[0], x: r[1], z: r[2], facing: r[3], action: r[4] });
/** Interpolating buffer for one remote: render a little in the past; snap if more than 3 m off. */
export class RemoteTrack {
  constructor() { this.buf = []; this.x = 0; this.z = 0; this.facing = 0; this.action = 0; this.seen = false; }
  push(t, s) { this.buf.push({ t, ...s }); if (this.buf.length > 12) this.buf.shift(); }
  at(now) {
    const t = now - REMOTE_DELAY;
    const b = this.buf;
    if (!b.length) return this;
    let a = b[0], c = b[b.length - 1];
    for (let i = 0; i < b.length - 1; i++) if (b[i].t <= t && b[i + 1].t >= t) { a = b[i]; c = b[i + 1]; break; }
    const k = c.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (c.t - a.t))) : 1;
    const nx = a.x + (c.x - a.x) * k, nz = a.z + (c.z - a.z) * k;
    if (!this.seen || Math.hypot(nx - this.x, nz - this.z) > 3) { this.x = nx; this.z = nz; this.seen = true; } else { this.x += (nx - this.x) * 0.5; this.z += (nz - this.z) * 0.5; }
    this.facing = c.facing; this.action = c.action;
    return this;
  }
}
export function chunkString(s, n = CHUNK) { const out = []; for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n)); return out; }
