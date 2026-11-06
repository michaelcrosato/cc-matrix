import { noiseSrc } from './instruments.js';

// Animalese-style gibberish, spoken from each line's own text.
export const VOICES = {
  trudy: { name: 'Trudy', pitch: 420, rate: 16, type: 'square', drift: 22, formant: 1.25, gain: 0.3, q: 7, breath: 0 },
  stillwater: { name: 'Ms. Stillwater', pitch: 170, rate: 7, type: 'sawtooth', drift: 5, formant: 0.8, gain: 1.05, q: 5, breath: 0.45, gap: 1.5 },
  bolster: { name: 'Coach Bolster', pitch: 95, rate: 11, type: 'sawtooth', drift: 12, formant: 0.72, gain: 1.15, q: 4, breath: 0 },
  guest: { name: 'Guest', pitch: 260, rate: 12, type: 'square', drift: 18, formant: 1, gain: 0.55, q: 6, breath: 0 },
  margaret: { name: 'Gentle Margaret', pitch: 300, rate: 11, type: 'square', drift: 12, formant: 1.1, gain: 0.55, q: 6, breath: 0.1 },
  kevin: { name: 'Retired Kevin', pitch: 205, rate: 10, type: 'sawtooth', drift: 8, formant: 0.9, gain: 0.7, q: 5, breath: 0 },
  sandras: { name: 'Both Sandras', pitch: 320, rate: 13, type: 'square', drift: 16, formant: 1.15, gain: 0.55, q: 6, breath: 0, double: 1.26 },
  paul: { name: 'Unsteady Paul', pitch: 235, rate: 12, type: 'square', drift: 38, formant: 0.95, gain: 0.6, q: 6, breath: 0 },
  gerald: { name: 'Young Gerald', pitch: 200, rate: 9, type: 'sawtooth', drift: 30, formant: 0.85, gain: 0.7, q: 5, breath: 0.2 },
};
const FORMANTS = { a: [730, 1090], e: [530, 1840], i: [300, 2300], o: [570, 840], u: [340, 870] };
const EXCLAIM = ['Wobba-la!', 'Oof-ah.', 'Nee nee!', 'Sul-sul-oh?', 'Hoppa!', 'Mm-bah.'];
export const nonsense = (i) => EXCLAIM[i % EXCLAIM.length];

function blip(m, out, t, f, vowel, v, dur, r) {
  const ctx = m.ctx;
  const [f1, f2] = FORMANTS[vowel] || FORMANTS.a;
  const o = ctx.createOscillator(); o.type = v.type; o.frequency.setValueAtTime(f, t);
  const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f1 * v.formant; b1.Q.value = v.q;
  const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f2 * v.formant; b2.Q.value = v.q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v.gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.01);
  if (v.breath) {
    const n = ctx.createBiquadFilter(); n.type = 'bandpass'; n.frequency.value = f2 * v.formant; n.Q.value = 1.2;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(v.gain * v.breath * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(ng); ng.connect(out);
    noiseSrc(ctx, t, dur + 0.01, n);
  }
  if (r() < 0.35) {
    const c = ctx.createBiquadFilter(); c.type = 'highpass'; c.frequency.value = 3200;
    const cg = ctx.createGain(); cg.gain.setValueAtTime(v.gain * 0.3, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    c.connect(cg); cg.connect(out);
    noiseSrc(ctx, t, 0.016, c);
  }
}

/**
 * Schedule a line of gibberish. Returns its length in seconds and how many blips it fired.
 * Pitch rises on ?, jumps on !, falls at the end of a sentence.
 */
export function speak(m, out, voiceId, text, t0, r) {
  const v = VOICES[voiceId] || VOICES.guest;
  const step = 1 / v.rate;
  let t = t0, blips = 0;
  const s = String(text).toLowerCase();
  // Walk the letters; each syllable-group (a vowel run) fires one blip.
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === ' ') { t += step * 0.9; i++; continue; }
    if (c === ',' || c === ';' || c === ':') { t += step * 3 * (v.gap || 1); i++; continue; }
    if (c === '.' || c === '!' || c === '?') { t += step * 5 * (v.gap || 1); i++; continue; }
    if (!/[a-z]/.test(c)) { i++; continue; }
    let j = i;
    let vowel = 'a';
    let found = false;
    while (j < n && /[a-z]/.test(s[j])) {
      if ('aeiou'.includes(s[j]) && !found) { vowel = s[j]; found = true; }
      j++;
      if (found && !'aeiou'.includes(s[j] || ' ')) break;
    }
    const rest = s.slice(j);
    const m2 = rest.match(/[.!?]/);
    const end = m2 ? m2[0] : '';
    const toEnd = m2 ? m2.index : 99;
    let p = v.pitch * (1 + ((r() - 0.5) * v.drift) / 100);
    if (end === '?' && toEnd < 7) p *= 1 + (7 - toEnd) * 0.035;
    if (end === '!') p *= 1.12;
    if (end === '.' && toEnd < 7) p *= 1 - (7 - toEnd) * 0.018;
    blip(m, out, t, p, vowel, v, 0.06 + (v.breath ? 0.03 : 0), r);
    if (v.double) blip(m, out, t + 0.012, p * v.double, vowel, v, 0.06, r);
    blips++;
    t += step * Math.max(1, Math.min(3, j - i));
    i = j;
  }
  return { duration: Math.max(0.2, t - t0), blips };
}
