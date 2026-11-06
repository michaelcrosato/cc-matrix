// Animalese-style gibberish, spoken from each line's own text.
import { noise } from './instruments.js';
export const FORMANTS = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [500, 900], u: [350, 700] };
export const VOICES = {
  trudy: { pitch: 420, rate: 16, wave: 'square', gain: .16, fmul: 1.35, breath: 0, drift: 40 },
  stillwater: { pitch: 170, rate: 7, wave: 'sawtooth', gain: 2.6, fmul: .9, breath: .55, drift: 8, gap: true },
  bolster: { pitch: 95, rate: 11, wave: 'sawtooth', gain: 1.5, fmul: .8, breath: 0, drift: 12, burst: true },
  margaret: { pitch: 300, rate: 12, wave: 'square', gain: .55, fmul: 1.1, breath: .1, drift: 22 },
  kevin: { pitch: 200, rate: 12, wave: 'sawtooth', gain: .9, fmul: .9, breath: 0, drift: 12 },
  sandra: { pitch: 260, rate: 12, wave: 'square', gain: .55, fmul: 1, breath: 0, drift: 10 },
  paul: { pitch: 230, rate: 12, wave: 'sawtooth', gain: .9, fmul: 1, breath: 0, drift: 50 },
  gerald: { pitch: 320, rate: 12, wave: 'square', gain: .55, fmul: 1.05, breath: .2, drift: 30 },
};
export const EXCLAIM = ['Wobba-la!', 'Oof-ah.', 'Nee nee!', 'Sulla bip?', 'Dag-a-doo.'];
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
/** Schedules a line. Returns [duration, blipCount]. */
export function speakLine(ctx, out, who, text, t0) {
  const V = VOICES[who] || VOICES.kevin; let r = hash(text); const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  const bus = ctx.createGain(); bus.gain.value = V.gain; bus.connect(out);
  const step = 1 / V.rate; let t = t0, blips = 0; const words = text.split(/\s+/);
  words.forEach((w, wi) => {
    const clean = w.toLowerCase().replace(/[^a-z!?.,]/g, '');
    const isQ = clean.endsWith('?'), isX = clean.endsWith('!'), isEnd = /[.!?]$/.test(clean);
    const letters = clean.replace(/[^a-z]/g, ''); let vowelSeen = false;
    for (let i = 0; i < letters.length; i++) {
      const ch = letters[i], vowel = 'aeiou'.includes(ch);
      if (!vowel && !(i === letters.length - 1 && !vowelSeen)) { if (i % 2 === 0) { const n = noise(ctx, t, .02), g = ctx.createGain(); g.gain.setValueAtTime(.05 * V.gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + .012); n.connect(g).connect(out); t += step * .35; } continue; }
      vowelSeen = true;
      const f = FORMANTS[vowel ? ch : 'e']; let p = V.pitch * (1 + (rnd() - .5) * V.drift / V.pitch);
      const last = i >= letters.length - 2;
      if (isQ && last) p *= 1.34; else if (isX && last) p *= 1.5; else if (isEnd && last) p *= .8;
      const o = ctx.createOscillator(); o.type = V.wave; o.frequency.setValueAtTime(p, t);
      const g = ctx.createGain(); g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(1, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06);
      const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f[0] * V.fmul; b1.Q.value = 5;
      const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f[1] * V.fmul; b2.Q.value = 7;
      o.connect(b1).connect(g); o.connect(b2).connect(g); g.connect(bus); o.start(t); o.stop(t + .07);
      if (V.breath) { const n = noise(ctx, t, .07), ng = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f[1]; bp.Q.value = 2; ng.gain.setValueAtTime(.04 * V.breath, t); ng.gain.exponentialRampToValueAtTime(.0005, t + .06); n.connect(bp).connect(ng).connect(g); }
      blips++; t += step;
    }
    t += step * (isEnd ? (V.gap ? 4 : 2.4) : (V.burst && wi % 4 === 3 ? 1.6 : .55));
  });
  return [t - t0, blips];
}
