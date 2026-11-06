// Replay recording: every car at 30 Hz into Float32Arrays. Playback interpolates; replays never re-simulate.
export const FIELDS = 12; // x y z yaw pitch roll steer rpm throttle gear flags u
export const F_BRAKE = 1, F_SLIDE = 2, F_AIR = 4, F_PIT = 8, F_LOCK = 16, F_HEAD = 32;
export class Recording {
  constructor(meta) { this.meta = meta; this.hz = 30; this.frames = 0; this.cap = 1024; this.cars = meta.cars.map(() => new Float32Array(this.cap * FIELDS)); this.marks = []; }
  add(i, vals) { // vals is an array of FIELDS numbers for car i at the current frame
    this.cars[i].set(vals, this.frames * FIELDS);
  }
  push() { // call once all cars are in: moves to the next frame, growing if needed
    this.frames++;
    if (this.frames >= this.cap) { this.cap *= 2; this.cars = this.cars.map((a) => { const b = new Float32Array(this.cap * FIELDS); b.set(a); return b; }); }
  }
  get duration() { return this.frames / this.hz; }
  // Interpolated pose of car i at time t, written into out.
  sample(i, t, out) {
    const a = this.cars[i], f = Math.max(0, Math.min(this.frames - 1.001, t * this.hz)), k = Math.floor(f), u = f - k, p = k * FIELDS, q = (k + 1) * FIELDS;
    const L = (n) => a[p + n] + (a[q + n] - a[p + n]) * u;
    let dy = a[q + 3] - a[p + 3]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    out.x = L(0); out.y = L(1); out.z = L(2); out.yaw = a[p + 3] + dy * u; out.pitch = L(4); out.roll = L(5); out.steer = L(6); out.rpm = L(7); out.throttle = L(8); out.gear = a[p + 9]; out.flags = a[p + 10]; out.u = L(11);
    return out;
  }
  // 10 Hz, Int16 quantised, base64: what goes to storage.
  compress() {
    const step = 3, frames = Math.floor(this.frames / step), carN = this.cars.length, buf = new Int16Array(frames * carN * 9), scale = [10, 50, 10, 5000, 5000, 5000, 10000, 1, 100]; let o = 0;
    for (let f = 0; f < frames; f++) for (let c = 0; c < carN; c++) {
      const a = this.cars[c], p = f * step * FIELDS;
      const y = a[p + 3];
      const v = [a[p], a[p + 1], a[p + 2], Math.atan2(Math.sin(y), Math.cos(y)), a[p + 4], a[p + 5], a[p + 6], a[p + 7] / 2, a[p + 11]];
      for (let n = 0; n < 9; n++) buf[o++] = Math.max(-32768, Math.min(32767, Math.round(v[n] * (n === 7 ? 1 : scale[n]))));
    }
    const bytes = new Uint8Array(buf.buffer); let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return { meta: this.meta, frames, carN, data: btoa(s) };
  }
  static fromCompressed(z) {
    const bin = atob(z.data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const buf = new Int16Array(bytes.buffer), r = new Recording(z.meta), step = 3, scale = [10, 50, 10, 5000, 5000, 5000, 10000, 1, 100];
    r.cap = z.frames * step + 2; r.cars = z.meta.cars.map(() => new Float32Array(r.cap * FIELDS)); r.frames = (z.frames - 1) * step + 1;
    let o = 0; const vals = [];
    for (let f = 0; f < z.frames; f++) for (let c = 0; c < z.carN; c++) {
      for (let n = 0; n < 9; n++) vals[n] = buf[o++] / scale[n];
      const a = r.cars[c], p = f * step * FIELDS;
      a[p] = vals[0]; a[p + 1] = vals[1]; a[p + 2] = vals[2]; a[p + 3] = vals[3]; a[p + 4] = vals[4]; a[p + 5] = vals[5]; a[p + 6] = vals[6]; a[p + 7] = vals[7] * 2; a[p + 8] = 1; a[p + 9] = 3; a[p + 10] = 0; a[p + 11] = vals[8];
      if (f > 0) for (let k = 1; k < step; k++) { const u = k / step, b = (f - 1) * step * FIELDS, m = (((f - 1) * step) + k) * FIELDS; for (let n = 0; n < FIELDS; n++) { let d = a[p + n] - a[b + n]; if (n === 3) { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; } a[m + n] = a[b + n] + d * u; } }
    }
    return r;
  }
}
// A ghost is one car's lap: x, y, z, yaw at 10 Hz.
export class GhostTrace {
  constructor() { this.hz = 10; this.pts = []; }
  add(x, y, z, yaw) { this.pts.push(Math.round(x * 10), Math.round(y * 20), Math.round(z * 10), Math.round(Math.atan2(Math.sin(yaw), Math.cos(yaw)) * 5000)); }
  get duration() { return this.pts.length / 4 / this.hz; }
  toData(time, carId) { return { time, carId, pts: this.pts }; }
}
export function ghostSample(data, t, out) {
  const n = data.pts.length / 4, f = Math.max(0, Math.min(n - 1.001, t * 10)), k = Math.floor(f), u = f - k, p = data.pts, a = k * 4, b = a + 4;
  out.x = (p[a] + (p[b] - p[a]) * u) / 10; out.y = (p[a + 1] + (p[b + 1] - p[a + 1]) * u) / 20; out.z = (p[a + 2] + (p[b + 2] - p[a + 2]) * u) / 10;
  let dy = (p[b + 3] - p[a + 3]) / 5000; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  out.yaw = p[a + 3] / 5000 + dy * u; out.done = t * 10 >= n - 1;
  return out;
}
