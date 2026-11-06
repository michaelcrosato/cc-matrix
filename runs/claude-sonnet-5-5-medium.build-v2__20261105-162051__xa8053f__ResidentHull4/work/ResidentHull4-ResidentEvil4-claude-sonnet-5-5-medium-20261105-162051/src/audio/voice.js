// Animalese/Simlish-style gibberish: syllables pre-registered per speaker, one played every 2 letters.
import { settings } from '../core/settings.js';
export const SPEAKERS = {
  MAX: { wave: 'triangle', freq: 170, decay: 0.09, color: 'sand' },
  DAME: { wave: 'square', duty: 0.25, freq: 320, decay: 0.07, vibrato: { depth: 0.5, rate: 14 }, color: 'mist' },
  COMMODORE: { wave: 'square', duty: 0.5, freq: 260, decay: 0.1, crush: 8, noise: true, color: 'red' },
  FATHOM: { wave: 'triangle', freq: 110, decay: 0.16, bubble: true, color: 'green' },
  PYM: { wave: 'sine', freq: 200, decay: 0.09, crush: 6, color: 'cyan' },
  MENDER: { wave: 'saw', freq: 120, decay: 0.12, color: 'orange' },
  NILS: { wave: 'saw', freq: 140, decay: 0.1, color: 'sky' },
  ISLANDER: { wave: 'saw', freq: 120, decay: 0.13, color: 'orange' },
  MONK: { wave: 'sine', freq: 85, decay: 0.3, chant: true, color: 'mist' },
  BOSUN: { wave: 'saw', freq: 60, decay: 0.7, color: 'red' },
  ANSGAR: { wave: 'saw', freq: 100, decay: 0.12, color: 'orange' },
};
const VOW = [1, 1.12, 0.89, 1.26, 0.79];
export function registerVoices(audio) {
  for (const [name, s] of Object.entries(SPEAKERS)) {
    for (let v = 0; v < 5; v++) {
      for (let c = 0; c < 2; c++) {
        const def = { wave: s.wave, duty: s.duty, freq: s.freq * VOW[v], freqEnd: s.freq * VOW[v] * (c ? 0.9 : 1.06), attack: c ? 0.002 : 0.012, decay: s.decay, volume: 0.35, vibrato: s.vibrato, crush: s.crush };
        const layers = [];
        if (c) layers.push({ wave: 'noise', freq: 3500, decay: 0.03, volume: 0.22 });
        if (s.noise) layers.push({ wave: 'noise', freq: 6000, decay: s.decay * 1.4, volume: 0.1 });
        if (s.chant) { layers.push({ wave: 'sine', freq: s.freq * VOW[v] * 1.5, decay: s.decay, volume: 0.25 }, { wave: 'sine', freq: s.freq * VOW[v] * 2, decay: s.decay, volume: 0.15 }); }
        if (s.bubble && v === 2) layers.push({ wave: 'sine', freq: 500, freqEnd: 1000, decay: 0.08, volume: 0.2, delay: 0.05 });
        if (layers.length) def.layers = layers;
        audio.register(`v_${name}_${v}_${c}`, def);
      }
    }
  }
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function wordAt(text, i) {
  let a = i, b = i;
  while (a > 0 && text[a - 1] !== ' ') a--;
  while (b < text.length && text[b] !== ' ') b++;
  return text.slice(a, b);
}
/** The plan for the blip at character i (pure, testable). Returns null on spaces and silent punctuation. */
export function blipPlan(speaker, text, i) {
  const ch = text[i];
  if (!ch || ch === ' ' || /[.,;:!?'-]/.test(ch)) return null;
  if (i % 2 !== 0) return null;
  const word = wordAt(text, i);
  const h = hash(word.replace(/[^A-Z0-9]/gi, '').toLowerCase());
  const base = ((h % 9) - 4) * 0.9;
  const rest = text.slice(i);
  const endPunct = /^[A-Za-z0-9']*([.?!,])/.exec(rest);
  let bend = 0, vol = 1;
  if (endPunct) { if (endPunct[1] === '.') bend = -2.5; else if (endPunct[1] === '?') bend = 3; else if (endPunct[1] === '!') { vol = 1.3; bend = 1; } }
  const v = (ch.charCodeAt(0) + h) % 5, c = (i >> 1) % 2;
  return { name: `v_${speaker}_${v}_${c}`, pitch: base + bend, volume: vol };
}
export function blip(audio, speaker, text, i, pan = 0) {
  if (!SPEAKERS[speaker]) speaker = 'ISLANDER';
  const p = blipPlan(speaker, text.toUpperCase(), i);
  if (!p) return false;
  audio.play(p.name, { pitch: p.pitch, volume: Math.min(1, p.volume * settings.voice), pan });
  return true;
}
