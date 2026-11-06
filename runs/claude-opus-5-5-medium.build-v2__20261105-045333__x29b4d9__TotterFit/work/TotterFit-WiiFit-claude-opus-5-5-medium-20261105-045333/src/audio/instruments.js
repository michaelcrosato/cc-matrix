// Every instrument takes ctx, so the same code runs on AudioContext and OfflineAudioContext.
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function env(ctx, g, t, a, peak, d, sustain = 0, rel = .02) {
  const p = g.gain; p.setValueAtTime(0.00001, t); p.linearRampToValueAtTime(peak, t + a); p.exponentialRampToValueAtTime(Math.max(.00001, sustain || .00001), t + a + d); if (sustain) p.setValueAtTime(sustain, t + a + d); p.setTargetAtTime(0, t + a + d + .001, rel);
}
const noiseCache = new WeakMap();
export function noiseBuffer(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); let s = 22222;
  for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
  noiseCache.set(ctx, b); return b;
}
export function noise(ctx, t, dur) { const n = ctx.createBufferSource(); n.buffer = noiseBuffer(ctx); n.loop = true; n.start(t, (t * 7.3) % 1.9); n.stop(t + dur + .05); return n; }
const osc = (ctx, type, f, t, dur, det = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.setValueAtTime(det, t); o.start(t); o.stop(t + dur + .05); return o; };
const gainN = (ctx, v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
const filt = (ctx, type, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
export const INST = {
  epiano(ctx, out, t, m, dur, v = .5, det = 0) { // sine carrier with a 14:1 tine and a 1:1 body, fast index decay
    const f = mtof(m), c = osc(ctx, 'sine', f, t, dur + .4, det), g = gainN(ctx, 0); env(ctx, g, t, .004, v * .5, Math.max(.2, dur), .0001, .08); c.connect(g).connect(out);
    for (const [ratio, idx, dec] of [[14, f * .55, .09], [1, f * .9, .5]]) { const mod = osc(ctx, 'sine', f * ratio, t, dur + .4, det), mg = gainN(ctx, 0); mg.gain.setValueAtTime(idx * v, t); mg.gain.exponentialRampToValueAtTime(.01, t + dec); mod.connect(mg).connect(c.frequency); }
  },
  bass(ctx, out, t, m, dur, v = .6, det = 0) { // saw through an enveloped low-pass plus a click
    const o = osc(ctx, 'sawtooth', mtof(m), t, dur + .1, det), lp = filt(ctx, 'lowpass', 900, 5), g = gainN(ctx, 0); lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(180, t + .18); env(ctx, g, t, .004, v * .55, dur, .0001, .03); o.connect(lp).connect(g).connect(out);
    const cl = noise(ctx, t, .02), cg = gainN(ctx, 0); env(ctx, cg, t, .001, v * .15, .012); cl.connect(cg).connect(out);
  },
  softBass(ctx, out, t, m, dur, v = .6, det = 0) { const o = osc(ctx, 'triangle', mtof(m), t, dur + .1, det), g = gainN(ctx, 0); env(ctx, g, t, .01, v * .7, Math.max(.15, dur), .0001, .04); o.connect(g).connect(out); },
  tuba(ctx, out, t, m, dur, v = .6, det = 0) { const o = osc(ctx, 'sawtooth', mtof(m), t, dur + .1, det), lp = filt(ctx, 'lowpass', 420, 2), g = gainN(ctx, 0); env(ctx, g, t, .03, v * .7, dur * .9, .0001, .04); o.connect(lp).connect(g).connect(out); },
  marimba(ctx, out, t, m, dur, v = .5, det = 0) { const f = mtof(m); for (const [r, a, d] of [[1, 1, .3], [4, .35, .07]]) { const o = osc(ctx, 'sine', f * r, t, .5, det), g = gainN(ctx, 0); env(ctx, g, t, .002, v * a * .6, d); o.connect(g).connect(out); } },
  pizz(ctx, out, t, m, dur, v = .5, det = 0) { const o = osc(ctx, 'triangle', mtof(m), t, .3, det), lp = filt(ctx, 'lowpass', 2200, 1), g = gainN(ctx, 0); env(ctx, g, t, .002, v * .55, .13); o.connect(lp).connect(g).connect(out); },
  vibes(ctx, out, t, m, dur, v = .5, det = 0) { const f = mtof(m), trem = osc(ctx, 'sine', 5.2, t, dur + 1), tg = gainN(ctx, .18), mix = gainN(ctx, 1); trem.connect(tg).connect(mix.gain); for (const [r, a, d] of [[1, 1, Math.max(.6, dur)], [4, .22, .16]]) { const o = osc(ctx, 'sine', f * r, t, dur + 1, det), g = gainN(ctx, 0); env(ctx, g, t, .002, v * a * .5, d); o.connect(g).connect(mix); } mix.connect(out); },
  pad(ctx, out, t, m, dur, v = .4, det = 0) { const lp = filt(ctx, 'lowpass', 1100, .7), g = gainN(ctx, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .2, t + Math.min(1.2, dur * .4)); g.gain.setValueAtTime(v * .2, t + Math.max(.01, dur * .7)); g.gain.linearRampToValueAtTime(0, t + dur + .5); for (const d of [-7, 0, 8]) osc(ctx, 'sawtooth', mtof(m), t, dur + .5, det + d).connect(lp); lp.connect(g).connect(out); },
  brass(ctx, out, t, m, dur, v = .5, det = 0) { const f = mtof(m), c = osc(ctx, 'sine', f, t, dur + .1, det), mod = osc(ctx, 'sine', f, t, dur + .1, det), mg = gainN(ctx, 0), g = gainN(ctx, 0); mg.gain.setValueAtTime(0, t); mg.gain.linearRampToValueAtTime(f * 2.4, t + .05); mg.gain.exponentialRampToValueAtTime(f * .4, t + dur); mod.connect(mg).connect(c.frequency); env(ctx, g, t, .02, v * .4, dur, .0001, .03); c.connect(g).connect(out); },
  flute(ctx, out, t, m, dur, v = .4, det = 0) { const f = mtof(m), o = osc(ctx, 'sine', f, t, dur + .2, det), g = gainN(ctx, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .4, t + .09); g.gain.setValueAtTime(v * .36, t + Math.max(.1, dur - .1)); g.gain.linearRampToValueAtTime(0, t + dur + .1); o.connect(g).connect(out); const n = noise(ctx, t, dur + .1), bp = filt(ctx, 'bandpass', f, 6), ng = gainN(ctx, v * .25); n.connect(bp).connect(ng).connect(g); },
  clav(ctx, out, t, m, dur, v = .5, det = 0) { const o = osc(ctx, 'square', mtof(m), t, .2, det), hp = filt(ctx, 'bandpass', 1600, 1.4), g = gainN(ctx, 0); env(ctx, g, t, .002, v * .28, .09); o.connect(hp).connect(g).connect(out); },
  kick(ctx, out, t, m, dur, v = .8) { const o = osc(ctx, 'sine', 120, t, .3), g = gainN(ctx, 0); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + .09); env(ctx, g, t, .002, v, .2); o.connect(g).connect(out); },
  snare(ctx, out, t, m, dur, v = .6) { const n = noise(ctx, t, .2), bp = filt(ctx, 'highpass', 900, .7), g = gainN(ctx, 0); env(ctx, g, t, .001, v * .55, .13); n.connect(bp).connect(g).connect(out); const o = osc(ctx, 'triangle', 190, t, .1), og = gainN(ctx, 0); env(ctx, og, t, .001, v * .3, .07); o.connect(og).connect(out); },
  brush(ctx, out, t, m, dur, v = .4) { const n = noise(ctx, t, .12), f = filt(ctx, 'bandpass', 5200, .6), g = gainN(ctx, 0); env(ctx, g, t, .012, v * .2, .09); n.connect(f).connect(g).connect(out); },
  shaker(ctx, out, t, m, dur, v = .4) { const n = noise(ctx, t, .06), f = filt(ctx, 'highpass', 6500, .8), g = gainN(ctx, 0); env(ctx, g, t, .004, v * .16, .04); n.connect(f).connect(g).connect(out); },
  wood(ctx, out, t, m, dur, v = .5) { const o = osc(ctx, 'sine', mtof(m || 79), t, .1), g = gainN(ctx, 0); env(ctx, g, t, .001, v * .55, .05); o.connect(g).connect(out); },
  rim(ctx, out, t, m, dur, v = .5) { const o = osc(ctx, 'square', 1700, t, .03), bp = filt(ctx, 'bandpass', 1700, 6), g = gainN(ctx, 0); env(ctx, g, t, .001, v * .5, .02); o.connect(bp).connect(g).connect(out); },
  bell(ctx, out, t, m, dur, v = .4, det = 0) { const f = mtof(m); for (const [r, a, d] of [[1, 1, 1.8], [2.76, .4, .7], [5.4, .18, .3]]) { const o = osc(ctx, 'sine', f * r, t, 2, det), g = gainN(ctx, 0); env(ctx, g, t, .002, v * a * .35, d); o.connect(g).connect(out); } },
};
export function makeImpulse(ctx, sec = 1.6, decay = 2.6) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); let s = 9137;
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 2147483648 - 1) * Math.pow(1 - i / n, decay); } }
  return b;
}
