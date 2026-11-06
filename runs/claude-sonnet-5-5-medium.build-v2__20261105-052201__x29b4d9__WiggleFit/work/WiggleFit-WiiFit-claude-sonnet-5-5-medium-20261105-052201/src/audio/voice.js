import { noise } from './instruments.js';
import { cosmetic } from '../core/rng.js';
export const VOICES = {
  trudy: { pitch: 420, rate: 16, wave: 'square', gain: 0.5, q: 7, drift: 0.04, breath: 0 },
  stillwater: { pitch: 170, rate: 7, wave: 'triangle', gain: 1.5, q: 2.5, drift: 0.02, breath: 0.35 },
  bolster: { pitch: 95, rate: 11, wave: 'sawtooth', gain: 1.4, q: 3, drift: 0.05, breath: 0 },
  guest1: { pitch: 240, rate: 12, wave: 'square', gain: 0.8, q: 4, drift: 0.05, breath: 0 }, guest2: { pitch: 300, rate: 12, wave: 'triangle', gain: 1.1, q: 4, drift: 0.05, breath: 0 }, guest3: { pitch: 205, rate: 12, wave: 'sawtooth', gain: 0.8, q: 4, drift: 0.05, breath: 0 },
  gary: { pitch: 650, rate: 9, wave: 'sawtooth', gain: 0.5, q: 3, drift: 0.2, breath: 0 },
};
const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700] };
const SIMLISH = ['Wobba-la!', 'Oof-ah.', 'Nee nee!', 'Doo-bee!', 'Hmm-ba.'];
// the blips for a line, as data (also what the on-screen typing follows)
export function plan(text, voice) {
  const v = VOICES[voice] || VOICES.guest1; const letters = text.toLowerCase().replace(/[^a-z?!.,' ]/g, '');
  const out = []; let t = 0; const step = 1 / v.rate; let pitch = v.pitch; let i = 0; const total = letters.length;
  while (i < letters.length) {
    const ch = letters[i];
    if (ch === ' ') { t += step * 0.5; i++; continue; }
    if (ch === ',' ) { t += step * 1.2; i++; continue; }
    if (ch === '.' || ch === '?' || ch === '!') { t += step * 2.2; i++; continue; }
    // syllable group: consonants then a vowel
    let j = i, cons = ''; while (j < letters.length && !/[aeiou]/.test(letters[j]) && /[a-z]/.test(letters[j])) { cons += letters[j]; j++; }
    let vow = 'a'; if (j < letters.length && /[aeiou]/.test(letters[j])) { vow = letters[j]; j++; } else if (!cons) { i++; continue; }
    const rest = letters.slice(j).search(/[.?!]/); const lastWords = letters.slice(i).replace(/[^a-z ]/g, '').length < 14;
    let p = pitch * (0.85 + (vow.charCodeAt(0) % 5) * 0.06);
    if (letters.slice(i).search(/\?/) >= 0 && rest < 0 && lastWords) p *= 1 + 0.25 * (1 - letters.slice(i).length / 14);
    if (letters.slice(i).indexOf('!') >= 0 && letters.slice(i).indexOf('!') < 3) p *= 1.2;
    if (rest >= 0 && rest < 6) p *= 0.88;
    out.push({ t, vowel: vow, cons: cons.length > 0, f: p });
    t += step; i = j;
  }
  return { blips: out, duration: t + 0.1 };
}
export function speak(ctx, out, t0, text, voice) {
  const v = VOICES[voice] || VOICES.guest1; const pl = plan(text, voice);
  const nodes = [];
  for (const b of pl.blips) {
    const t = t0 + b.t; const f = b.f * (1 + (cosmetic() - 0.5) * 2 * v.drift);
    const o = ctx.createOscillator(); o.type = v.wave; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.97, t + 0.06);
    const [f1, f2] = FORM[b.vowel] || FORM.a; const s = voice === 'trudy' ? 1.25 : voice === 'bolster' ? 0.85 : 1;
    const b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.frequency.value = f1 * s; b2.frequency.value = f2 * s; b1.Q.value = b2.Q.value = v.q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28 * v.gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.connect(out); o.start(t); o.stop(t + 0.08);
    if (b.cons) { const n = ctx.createBufferSource(); n.buffer = noise(ctx); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const ng = ctx.createGain(); ng.gain.setValueAtTime(0.1 * v.gain, t - 0.006); ng.gain.linearRampToValueAtTime(0.0001, t + 0.012); n.connect(hp); hp.connect(ng); ng.connect(out); n.start(Math.max(0, t - 0.006), cosmetic()); n.stop(t + 0.02); }
    if (v.breath) { const n = ctx.createBufferSource(); n.buffer = noise(ctx); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f1; bp.Q.value = 1; const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.1 * v.breath * v.gain, t + 0.03); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t, cosmetic()); n.stop(t + 0.14); }
  }
  return pl.duration;
}
export { SIMLISH };
