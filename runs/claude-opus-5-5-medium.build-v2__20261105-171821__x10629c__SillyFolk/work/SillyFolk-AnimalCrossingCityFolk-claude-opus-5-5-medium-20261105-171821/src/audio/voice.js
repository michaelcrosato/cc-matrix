// Gibberish voices: each letter triggers a very short syllable of stacked formant harmonics. Code only.
import { T } from '../dev/tuning.js';
function vowel(f0, f1, f2, f3, dur = 0.09, consonant = null) {
  const amp = (h) => { const f = f0 * h, g = (c, w, a) => a * Math.exp(-((f - c) ** 2) / (2 * w * w)); return g(f1, 90, 1) + g(f2, 120, 0.6) + g(f3, 180, 0.25); };
  const layers = []; for (let h = 2; h * f0 < 4000; h++) { const v = amp(h) * 0.34; if (v > 0.01) layers.push({ wave: 'sine', freq: f0 * h, attack: 0.008, sustain: dur * 0.55, decay: dur * 0.45, volume: v }); }
  if (consonant) layers.push({ wave: 'noise', freq: consonant, attack: 0.001, sustain: 0.006, decay: 0.012, volume: 0.25 });
  return { wave: 'sine', freq: f0, attack: 0.008, sustain: dur * 0.55, decay: dur * 0.45, volume: Math.max(0.08, amp(1) * 0.34), vibrato: { depth: 0.2, rate: 18 }, layers };
}
const VOWELS = [[800, 1200, 2500], [400, 2000, 2800], [300, 2300, 3000], [500, 900, 2400], [350, 800, 2300], [600, 1700, 2600], [700, 1100, 2450], [450, 1500, 2500], [380, 1000, 2200], [650, 1400, 2550]];
const CONS = [null, 7000, null, 3000, 9000, null, 5000, null, 2200, 6000];
const ARCH = [{ f0: 300, dur: 0.075 }, { f0: 165, dur: 0.1 }, { f0: 145, dur: 0.09 }, { f0: 240, dur: 0.11 }, { f0: 210, dur: 0.07 }, { f0: 225, dur: 0.12 }];
export const SYLLABLES = {};
ARCH.forEach((a, i) => VOWELS.forEach((v, j) => { SYLLABLES[`v${i}_${j}`] = vowel(a.f0, v[0], v[1], v[2], a.dur, CONS[j]); }));
export const HONK = { wave: 'square', duty: 0.25, freq: 520, freqEnd: 300, attack: 0.005, sustain: 0.22, decay: 0.08, volume: 0.42, layers: [{ wave: 'square', duty: 0.5, freq: 260, freqEnd: 170, attack: 0.005, sustain: 0.2, decay: 0.08, volume: 0.25 }] };
export const BEEP = { wave: 'square', duty: 0.25, freq: 660, attack: 0.002, decay: 0.03, volume: 0.25 };
export const voiceCfg = { style: 'gibberish', volume: 0.8 };
export function registerVoices(audio) { for (const [k, d] of Object.entries(SYLLABLES)) audio.register(k, d); audio.register('honk', HONK); audio.register('beep', BEEP); }
const VIDX = { a: 0, e: 1, i: 2, o: 3, u: 4, y: 2 };
const charSyll = (ch) => { const l = ch.toLowerCase(); if (VIDX[l] != null) return VIDX[l]; const c = l.charCodeAt(0); return 5 + (c % 5); };
/** Speak one character of a line in a character's voice. */
export function speakChar(audio, cast, ch, i, line, emph = 1, pitchOverride = null) {
  if (voiceCfg.style === 'off' || cast?.silent) return;
  if (!/[a-zA-Z0-9]/.test(ch) || (i % 2 && (cast?.voice?.speed ?? 1) >= 1)) return;
  const v = cast?.voice ?? { arch: 5, pitch: 0, speed: 1, lilt: 1 };
  const rising = line[line.length - 1] === '?' ? (i / line.length) * 4 : 0;
  const lilt = Math.sin(i * 0.9 + ch.charCodeAt(0)) * 2 * v.lilt;
  const pitch = pitchOverride ?? v.pitch + lilt + rising;
  const loud = ch >= 'A' && ch <= 'Z' ? 1.25 : 1;
  const volume = Math.min(1, voiceCfg.volume * loud * emph);
  if (voiceCfg.style === 'beeps') { audio.play('beep', { pitch: pitch * 0.5, volume: volume * 0.6 }); return; }
  audio.play(`v${v.arch}_${charSyll(ch)}`, { pitch, volume });
}
export const textSpeedOf = (cast) => T.textSpeed * (cast?.voice?.speed ?? 1);
