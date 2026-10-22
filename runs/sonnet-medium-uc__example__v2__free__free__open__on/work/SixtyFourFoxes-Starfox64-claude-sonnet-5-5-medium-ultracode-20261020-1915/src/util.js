// Shared math helpers, seeded RNG and a tiny keyframe animation system.
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const sign = (v) => (v < 0 ? -1 : 1);
export const smooth = (t) => t * t * (3 - 2 * t);
export const remap = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rnd = Math.random;
export const rr = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
export const EASE = {
  lin: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

/**
 * Procedural clip animator. A clip is {dur, loop, tracks:[{part, prop, keys:[[t,v],...], ease}]}.
 * Parts are looked up in root.userData.parts. Multiple layers may play at once;
 * a track writes an absolute value to its property.
 */
export class Animator {
  constructor(root) {
    this.root = root;
    this.layers = new Map();
  }
  play(clip, opts = {}) {
    const layer = opts.layer || 'main';
    const cur = this.layers.get(layer);
    if (cur && cur.clip === clip && !opts.restart) { cur.speed = opts.speed ?? cur.speed; return; }
    this.layers.set(layer, { clip, t: 0, speed: opts.speed ?? 1, loop: opts.loop ?? clip.loop ?? false, done: false, onDone: opts.onDone });
  }
  stop(layer = 'main') { this.layers.delete(layer); }
  isPlaying(layer = 'main') { const l = this.layers.get(layer); return !!l && !l.done; }
  update(dt) {
    const parts = this.root.userData.parts || {};
    for (const [name, l] of this.layers) {
      l.t += dt * l.speed;
      let t = l.t;
      if (t >= l.clip.dur) {
        if (l.loop) t = t % l.clip.dur;
        else { t = l.clip.dur; if (!l.done) { l.done = true; l.onDone && l.onDone(); } }
      }
      for (const tr of l.clip.tracks) {
        const obj = tr.part === 'root' ? this.root : parts[tr.part];
        if (!obj) continue;
        const k = tr.keys;
        let v = k[k.length - 1][1];
        if (t <= k[0][0]) v = k[0][1];
        else {
          for (let i = 0; i < k.length - 1; i++) {
            if (t >= k[i][0] && t <= k[i + 1][0]) {
              const u = (t - k[i][0]) / Math.max(1e-6, k[i + 1][0] - k[i][0]);
              v = lerp(k[i][1], k[i + 1][1], (EASE[tr.ease] || EASE.io)(u));
              break;
            }
          }
        }
        const path = tr.prop.split('.');
        let o = obj;
        for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
        o[path[path.length - 1]] = v;
      }
    }
  }
}
export const store = {
  get(k, d) { try { const v = localStorage.getItem('sff.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sff.' + k, JSON.stringify(v)); } catch {} },
};
