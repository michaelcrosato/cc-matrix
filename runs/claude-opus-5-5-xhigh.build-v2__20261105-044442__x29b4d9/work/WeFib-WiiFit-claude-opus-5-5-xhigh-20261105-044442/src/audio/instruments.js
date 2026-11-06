// Every instrument takes (ctx, out, t, midi, dur, vel, det): same code live and offline.
export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function env(ctx, out, t, a, peak, d, sus, r, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus * peak), t + a + d);
  const end = Math.max(t + a + d, t + dur);
  g.gain.setValueAtTime(Math.max(0.0001, sus * peak), end);
  g.gain.exponentialRampToValueAtTime(0.0001, end + r);
  g.connect(out);
  return { g, end: end + r + 0.02 };
}
function osc(ctx, type, f, det, t, end, dest) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = f; o.detune.value = det || 0;
  if (dest) o.connect(dest);
  o.start(t); o.stop(end);
  return o;
}
let noiseBuf = new WeakMap();
export function noise(ctx) {
  let b = noiseBuf.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    let x = 12345;
    for (let i = 0; i < d.length; i++) { x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff; d[i] = x / 0x3fffffff - 1; }
    noiseBuf.set(ctx, b);
  }
  return b;
}
export function noiseSrc(ctx, t, dur, dest, rate = 1) {
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx); s.loop = true; s.playbackRate.value = rate;
  s.connect(dest);
  s.start(t, (t * 7.13) % 1.5); s.stop(t + dur);
  return s;
}

export function epiano(ctx, out, t, midi, dur, vel = 0.5, det = 0, clav = false) {
  const f = mtof(midi);
  const e = env(ctx, out, t, 0.004, vel * 0.5, clav ? 0.16 : 0.9, clav ? 0.12 : 0.25, clav ? 0.05 : 0.3, dur);
  const car = osc(ctx, 'sine', f, det, t, e.end, e.g);
  const tine = osc(ctx, 'sine', f * 14, det, t, t + 0.22);
  const ti = ctx.createGain();
  ti.gain.setValueAtTime(f * (clav ? 3.4 : 2.1) * vel, t); ti.gain.exponentialRampToValueAtTime(1, t + (clav ? 0.1 : 0.2));
  tine.connect(ti); ti.connect(car.frequency);
  const body = osc(ctx, 'sine', f, det, t, e.end);
  const bi = ctx.createGain();
  bi.gain.setValueAtTime(f * 0.9 * vel, t); bi.gain.exponentialRampToValueAtTime(f * 0.1, t + 0.5);
  body.connect(bi); bi.connect(car.frequency);
}
export function clav(ctx, out, t, midi, dur, vel, det) { epiano(ctx, out, t, midi, Math.min(dur, 0.14), vel, det, true); }

export function bass(ctx, out, t, midi, dur, vel = 0.6, det = 0) {
  const f = mtof(midi);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 7;
  lp.frequency.setValueAtTime(f * 9, t); lp.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.16);
  const e = env(ctx, lp, t, 0.003, vel * 0.7, 0.12, 0.55, 0.05, dur);
  lp.connect(out);
  osc(ctx, 'sawtooth', f, det, t, e.end, e.g);
  osc(ctx, 'sine', f, det, t, e.end, e.g);
  // Slap click.
  const c = ctx.createGain();
  c.gain.setValueAtTime(vel * 0.25, t); c.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
  noiseSrc(ctx, t, 0.03, hp); hp.connect(c); c.connect(out);
}
export function softBass(ctx, out, t, midi, dur, vel = 0.6, det = 0) {
  const f = mtof(midi);
  const e = env(ctx, out, t, 0.012, vel * 0.8, 0.25, 0.6, 0.08, dur);
  osc(ctx, 'sine', f, det, t, e.end, e.g);
  const h = ctx.createGain(); h.gain.value = 0.22; h.connect(e.g);
  osc(ctx, 'triangle', f * 2, det, t, e.end, h);
}
export function tuba(ctx, out, t, midi, dur, vel = 0.6, det = 0) {
  const f = mtof(midi);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
  lp.frequency.setValueAtTime(f * 2, t); lp.frequency.linearRampToValueAtTime(f * 5, t + 0.05); lp.frequency.linearRampToValueAtTime(f * 3, t + 0.2);
  const e = env(ctx, lp, t, 0.02, vel * 0.8, 0.1, 0.7, 0.05, dur);
  lp.connect(out);
  osc(ctx, 'sawtooth', f, det, t, e.end, e.g);
}
export function marimba(ctx, out, t, midi, dur, vel = 0.5, det = 0) {
  const f = mtof(midi);
  const e = env(ctx, out, t, 0.002, vel * 0.6, 0.32, 0.001, 0.03, 0.01);
  osc(ctx, 'sine', f, det, t, e.end, e.g);
  const h = ctx.createGain();
  h.gain.setValueAtTime(0.5, t); h.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  h.connect(e.g);
  osc(ctx, 'sine', f * 4, det, t, t + 0.1, h);
}
export function vibes(ctx, out, t, midi, dur, vel = 0.5, det = 0) {
  const f = mtof(midi);
  const trem = ctx.createGain(); trem.gain.value = 1; trem.connect(out);
  const lfo = osc(ctx, 'sine', 5.2, 0, t, t + dur + 1.5);
  const d = ctx.createGain(); d.gain.value = 0.28; lfo.connect(d); d.connect(trem.gain);
  const e = env(ctx, trem, t, 0.003, vel * 0.42, 1.1, 0.12, 0.3, dur);
  osc(ctx, 'sine', f, det, t, e.end, e.g);
  const h = ctx.createGain(); h.gain.setValueAtTime(0.32, t); h.gain.exponentialRampToValueAtTime(0.001, t + 0.3); h.connect(e.g);
  osc(ctx, 'sine', f * 4, det, t, t + 0.4, h);
}
export function bell(ctx, out, t, midi, dur, vel = 0.4, det = 0) {
  const f = mtof(midi);
  const e = env(ctx, out, t, 0.002, vel * 0.35, 1.8, 0.001, 0.1, 0.01);
  const c = osc(ctx, 'sine', f, det, t, e.end, e.g);
  const m = osc(ctx, 'sine', f * 3.51, det, t, t + 1.2);
  const i = ctx.createGain(); i.gain.setValueAtTime(f * 1.2, t); i.gain.exponentialRampToValueAtTime(1, t + 1.2);
  m.connect(i); i.connect(c.frequency);
}
export function pad(ctx, out, t, midi, dur, vel = 0.3, det = 0) {
  const f = mtof(midi);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
  lp.frequency.setValueAtTime(f * 1.5, t); lp.frequency.linearRampToValueAtTime(f * 3.4, t + dur * 0.5); lp.frequency.linearRampToValueAtTime(f * 2, t + dur);
  lp.connect(out);
  const e = env(ctx, lp, t, Math.min(dur * 0.35, 1.2), vel * 0.26, 0.3, 0.85, Math.min(1.2, dur * 0.3), dur);
  for (const d of [-7, 0, 7]) osc(ctx, 'sawtooth', f, det + d, t, e.end, e.g);
}
export function brass(ctx, out, t, midi, dur, vel = 0.5, det = 0) {
  const f = mtof(midi);
  const e = env(ctx, out, t, 0.02, vel * 0.42, 0.1, 0.55, 0.06, dur);
  const c = osc(ctx, 'sine', f, det, t, e.end, e.g);
  const m = osc(ctx, 'sine', f, det, t, e.end);
  const i = ctx.createGain();
  i.gain.setValueAtTime(f * 0.5, t); i.gain.linearRampToValueAtTime(f * 2.4, t + 0.04); i.gain.exponentialRampToValueAtTime(f * 1.1, t + 0.18);
  m.connect(i); i.connect(c.frequency);
}
export function flute(ctx, out, t, midi, dur, vel = 0.4, det = 0) {
  const f = mtof(midi);
  const e = env(ctx, out, t, 0.06, vel * 0.42, 0.15, 0.8, 0.12, dur);
  const c = osc(ctx, 'sine', f, det, t, e.end, e.g);
  const lfo = osc(ctx, 'sine', 4.6, 0, t + 0.15, e.end);
  const d = ctx.createGain(); d.gain.value = f * 0.006; lfo.connect(d); d.connect(c.frequency);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 6;
  const n = ctx.createGain(); n.gain.value = 0.3; bp.connect(n); n.connect(e.g);
  noiseSrc(ctx, t, e.end - t, bp);
}
export function pizz(ctx, out, t, midi, dur, vel = 0.5, det = 0) {
  const f = mtof(midi);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
  lp.frequency.setValueAtTime(f * 7, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.18); lp.connect(out);
  const e = env(ctx, lp, t, 0.002, vel * 0.55, 0.24, 0.001, 0.02, 0.01);
  osc(ctx, 'sawtooth', f, det, t, e.end, e.g);
}
export function kick(ctx, out, t, _m, _d, vel = 0.9) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); g.connect(out);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  o.connect(g); o.start(t); o.stop(t + 0.3);
}
export function snare(ctx, out, t, _m, _d, vel = 0.6) {
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2100; bp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vel * 0.75, t); g.gain.setValueAtTime(vel * 0.6, t + 0.09); g.gain.linearRampToValueAtTime(0.0001, t + 0.13);
  bp.connect(g); g.connect(out);
  noiseSrc(ctx, t, 0.14, bp);
  const b = ctx.createGain(); b.gain.setValueAtTime(vel * 0.4, t); b.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); b.connect(out);
  osc(ctx, 'triangle', 190, 0, t, t + 0.09, b);
}
function tick(ctx, out, t, freq, q, dur, vel) {
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g); g.connect(out);
  noiseSrc(ctx, t, dur + 0.01, f);
}
export const brush = (ctx, out, t, _m, _d, vel = 0.3) => tick(ctx, out, t, 5200, 0.6, 0.09, vel * 0.5);
export const shaker = (ctx, out, t, _m, _d, vel = 0.3) => tick(ctx, out, t, 8200, 1.2, 0.045, vel * 0.42);
export const hat = (ctx, out, t, _m, _d, vel = 0.3) => tick(ctx, out, t, 9800, 2, 0.03, vel * 0.5);
export function woodblock(ctx, out, t, midi, _d, vel = 0.5) {
  const f = mtof(midi || 84);
  const g = ctx.createGain(); g.gain.setValueAtTime(vel * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); g.connect(out);
  osc(ctx, 'sine', f, 0, t, t + 0.07, g);
  osc(ctx, 'triangle', f * 1.5, 0, t, t + 0.04, g);
}
export function rim(ctx, out, t, _m, _d, vel = 0.4) {
  const g = ctx.createGain(); g.gain.setValueAtTime(vel * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03); g.connect(out);
  osc(ctx, 'square', 1700, 0, t, t + 0.035, g);
  tick(ctx, out, t, 3300, 2, 0.02, vel * 0.3);
}
export const INSTRUMENTS = { epiano, clav, bass, softBass, tuba, marimba, vibes, bell, pad, brass, flute, pizz, kick, snare, brush, shaker, hat, woodblock, rim };
