import { noise, I } from './instruments.js';
import { cosmetic } from '../core/rng.js';
const r = (a, b) => a + (b - a) * cosmetic();
function nb(ctx, out, t, { type = 'bandpass', f = 1000, q = 1, dur = 0.1, peak = 0.5, f2 = null, a = 0.002 }) {
  const n = ctx.createBufferSource(); n.buffer = noise(ctx); const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(fl); fl.connect(g); g.connect(out); n.start(t, cosmetic() * 0.5); n.stop(t + dur + 0.05); return g;
}
function tone(ctx, out, t, { type = 'sine', f = 440, f2 = null, dur = 0.2, peak = 0.3, a = 0.005, vib = 0 }) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  if (vib) { const l = ctx.createOscillator(); l.frequency.value = 22; const lg = ctx.createGain(); lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); return g;
}
export const SFX = {
  clack(ctx, out, t, big = 1) { for (let i = 0; i < 3; i++) nb(ctx, out, t + i * r(0.01, 0.05), { f: r(700, 2400), q: 14, dur: 0.07, peak: 0.45 * big }); },
  spring(ctx, out, t) { tone(ctx, out, t, { type: 'sine', f: 180, f2: 760, dur: 0.4, peak: 0.25, vib: 40 }); },
  splash(ctx, out, t, big = 1) { nb(ctx, out, t, { type: 'lowpass', f: 5000, f2: 300, q: 0.7, dur: 0.5 + 0.6 * big, peak: 0.5 * big, a: 0.01 }); },
  marble(ctx, out, t) { tone(ctx, out, t, { f: r(1500, 2800), dur: 0.12, peak: 0.12 }); },
  plateHum(ctx, out, t, f = 200) { tone(ctx, out, t, { type: 'triangle', f, dur: 0.12, peak: 0.08, a: 0.02 }); },
  plateCrash(ctx, out, t) { for (let i = 0; i < 6; i++) nb(ctx, out, t + i * 0.03, { f: r(2000, 6000), q: 10, dur: 0.12, peak: 0.3 }); },
  thud(ctx, out, t) { tone(ctx, out, t, { f: 160, f2: 60, dur: 0.12, peak: 0.4 }); },
  spike(ctx, out, t) { tone(ctx, out, t, { type: 'square', f: 900, f2: 300, dur: 0.1, peak: 0.2 }); },
  whistle(ctx, out, t) { tone(ctx, out, t, { f: 2600, dur: 0.5, peak: 0.2, vib: 90, a: 0.02 }); },
  bell(ctx, out, t) { I.bell(ctx, out, t, 84, 0.5, 1); },
  breathIn(ctx, out, t) { nb(ctx, out, t, { type: 'bandpass', f: 600, f2: 1800, q: 0.8, dur: 1.2, peak: 0.12, a: 0.5 }); },
  breathOut(ctx, out, t) { nb(ctx, out, t, { type: 'bandpass', f: 1800, f2: 500, q: 0.8, dur: 1.2, peak: 0.12, a: 0.3 }); },
  wind(ctx, out, t) { nb(ctx, out, t, { type: 'bandpass', f: 300, f2: 1400, q: 2, dur: 1, peak: 0.25, a: 0.8 }); },
  creak(ctx, out, t) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(95, t + 0.9); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 12; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(900, t + 0.9); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + 1.1); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 1.2); },
  uiMove(ctx, out, t) { I.wood(ctx, out, t, 0.5, 1100); },
  uiOk(ctx, out, t) { I.wood(ctx, out, t, 0.6, 1400); I.wood(ctx, out, t + 0.07, 0.5, 1900); },
  uiBack(ctx, out, t) { I.wood(ctx, out, t, 0.6, 900); I.wood(ctx, out, t + 0.07, 0.5, 600); },
  stamp(ctx, out, t) { tone(ctx, out, t, { f: 110, f2: 45, dur: 0.25, peak: 0.6 }); nb(ctx, out, t, { f: 600, q: 0.7, dur: 0.1, peak: 0.3 }); },
  drumRoll(ctx, out, t, dur = 2) { const n = Math.floor(dur / 0.045); for (let i = 0; i < n; i++) nb(ctx, out, t + i * 0.045, { f: 220, q: 1, dur: 0.05, peak: 0.1 + 0.25 * i / n }); },
  footClick(ctx, out, t, good = 1) { I.wood(ctx, out, t, 0.9, 1500 + 400 * good); },
  gasp(ctx, out, t) { nb(ctx, out, t, { type: 'bandpass', f: 900, f2: 2200, q: 1, dur: 0.25, peak: 0.2, a: 0.1 }); },
  squawk(ctx, out, t) { tone(ctx, out, t, { type: 'sawtooth', f: 700, f2: 380, dur: 0.28, peak: 0.2, vib: 120 }); },
  pop(ctx, out, t) { tone(ctx, out, t, { f: 400, f2: 900, dur: 0.08, peak: 0.25 }); },
  whoosh(ctx, out, t) { nb(ctx, out, t, { type: 'bandpass', f: 500, f2: 3000, q: 1, dur: 0.35, peak: 0.2, a: 0.15 }); },
  tick(ctx, out, t) { I.wood(ctx, out, t, 0.4, 2000); },
  count(ctx, out, t, last = false) { tone(ctx, out, t, { f: last ? 1320 : 880, dur: 0.25, peak: 0.3 }); },
  sting(ctx, out, t, medal = 0) { const notes = [[72, 76, 79], [74, 77, 81], [76, 79, 83], [79, 83, 86, 91]][Math.min(3, medal)]; notes.forEach((m, i) => I.vibes(ctx, out, t + i * 0.12, m, 0.5, 0.8)); I.brass(ctx, out, t + notes.length * 0.12, notes[0] - 12, 0.4, 0.6); },
  reveal(ctx, out, t) { [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => I.vibes(ctx, out, t + i * 0.1, m, 0.6, 0.7)); I.brass(ctx, out, t + 0.7, 72, 0.7, 0.6); I.brass(ctx, out, t + 0.7, 79, 0.7, 0.6); },
  unlock(ctx, out, t) { [84, 88, 91, 96].forEach((m, i) => I.bell(ctx, out, t + i * 0.09, m, 0.3, 0.6)); },
  fall(ctx, out, t) { SFX.clack(ctx, out, t, 1.4); SFX.clack(ctx, out, t + 0.18, 1); SFX.clack(ctx, out, t + 0.4, 0.8); },
  hop(ctx, out, t) { tone(ctx, out, t, { f: 300, f2: 620, dur: 0.12, peak: 0.2 }); },
  catch(ctx, out, t) { I.wood(ctx, out, t, 0.6, 1200 + cosmetic() * 400); },
  gust(ctx, out, t) { SFX.wind(ctx, out, t); },
  ring(ctx, out, t) { I.bell(ctx, out, t, 96, 0.4, 0.5); },
};
