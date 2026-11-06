// Animalese/Simlish gibberish: syllables rendered in pure JS (a glottal pulse through three formants),
// wrapped as WAV data URLs for the engine's buses. Letters pick syllables deterministically; punctuation
// shapes rhythm and pitch. No audio files, no real words. Testable in Node.
const VOWELS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [300, 2290, 3010], o: [570, 840, 2410], u: [320, 870, 2240] };
const ONSETS = ['v', 't', 'm']; // vowel, plosive, nasal
export const TIMBRES = {
  low: { f0: 105, bright: 0.55, shift: 0.9 },
  mid: { f0: 170, bright: 0.7, shift: 1 },
  high: { f0: 250, bright: 0.85, shift: 1.12 },
};
const RATE = 22050;

/** One syllable, 120 ms, as Float32 samples in -1..1. */
export function renderSyllable(timbreId, vowel, onset) {
  const T = TIMBRES[timbreId];
  const n = Math.round(RATE * 0.12);
  const out = new Float32Array(n);
  const F = VOWELS[vowel].map((f) => f * T.shift);
  const bw = [80, 110, 170];
  const res = F.map((f, k) => {
    const r = Math.exp((-Math.PI * bw[k]) / RATE);
    return { a1: 2 * r * Math.cos((2 * Math.PI * f) / RATE), a2: -r * r, g: 1 - r, y1: 0, y2: 0 };
  });
  let phase = 0, seed = (timbreId.length * 31 + vowel.charCodeAt(0) * 7 + onset.charCodeAt(0)) | 0;
  const noise = () => { seed = (seed * 1664525 + 1013904223) | 0; return ((seed >>> 16) & 0x7fff) / 16384 - 1; };
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    phase += (T.f0 * (1 + 0.04 * Math.sin(t * 34))) / RATE;
    if (phase >= 1) phase -= 1;
    // A glottal pulse: quick rise, slow fall.
    let g = phase < 0.4 ? Math.sin((phase / 0.4) * Math.PI) ** 2 : 0;
    g -= 0.3 * T.bright * (phase < 0.08 ? 1 - phase / 0.08 : 0);
    let voiced = 1;
    if (onset === 't' && t < 0.014) { g = noise() * 0.9; voiced = 1; }
    if (onset === 't' && t >= 0.014 && t < 0.03) voiced = 0.25;
    if (onset === 'm' && t < 0.035) voiced = 0.4;
    const input = g * voiced;
    let s = 0;
    res.forEach((f, k) => {
      const y = input * f.g + f.a1 * f.y1 + f.a2 * f.y2;
      f.y2 = f.y1;
      f.y1 = y;
      s += y * (k === 0 ? 1 : k === 1 ? 0.7 * T.bright + 0.15 : 0.3 * T.bright);
    });
    const env = Math.min(1, t / 0.008) * Math.min(1, (0.12 - t) / 0.04);
    out[i] = s * env * 2.6;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * 0.82;
  return out;
}

export function wavDataUrl(samples) {
  const n = samples.length;
  const buf = new Uint8Array(44 + n * 2);
  const v = new DataView(buf.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(buf).toString('base64');
  return `data:audio/wav;base64,${b64}`;
}

export const syllableName = (timbre, vowel, onset) => `syl-${timbre}-${vowel}-${onset}`;
export const ALL_SYLLABLES = Object.keys(TIMBRES).flatMap((t) => Object.keys(VOWELS).flatMap((v) => ONSETS.map((o) => ({ t, v, o, name: syllableName(t, v, o) }))));

// Who sounds like what. basePitch in semitones on top of the timbre; range: how far the melody wanders.
export const VOICES = {
  ilya: { timbre: 'high', basePitch: -2, speed: 1.25, range: 3.2, volume: 0.85 },
  reyes: { timbre: 'mid', basePitch: -3, speed: 1.15, range: 1.6, volume: 0.95 },
  sabine: { timbre: 'low', basePitch: 2, speed: 0.8, range: 0.8, volume: 0.8 },
  bram: { timbre: 'low', basePitch: -4, speed: 0.7, range: 1.4, volume: 0.9 },
  pem: { timbre: 'low', basePitch: 3, speed: 0.75, range: 3.8, volume: 0.8 },
  hesper: { timbre: 'mid', basePitch: 0, speed: 0.72, range: 1.2, volume: 0.65 },
  tomasz: { timbre: 'low', basePitch: 0, speed: 1, range: 2, volume: 0.85 },
  zamboni: { timbre: 'mid', basePitch: 1, speed: 1.1, range: 4, volume: 0.85 },
  anselm: { timbre: 'mid', basePitch: -1, speed: 0.8, range: 0.6, volume: 0.7 },
  ottilie: { timbre: 'mid', basePitch: 2, speed: 0.85, range: 1.5, volume: 0.7 },
  ollie: { timbre: 'high', basePitch: 1, speed: 1.2, range: 2.5, volume: 0.8 },
};

const VOWEL_KEYS = Object.keys(VOWELS);
const isLetter = (c) => /[a-z]/i.test(c);

/** What the voice does at character i of text: null, or a syllable to play. Pure and deterministic. */
export function syllableAt(whoId, text, i) {
  const V = VOICES[whoId] ?? VOICES.reyes;
  const c = text[i];
  if (!c || !isLetter(c)) return null;
  // A syllable every couple of letters, on a vowel where there is one.
  const lower = c.toLowerCase();
  const isV = 'aeiou'.includes(lower);
  if (!isV && i % 3 !== 0) return null;
  const code = lower.charCodeAt(0);
  const vowel = isV ? lower : VOWEL_KEYS[code % 5];
  const onset = ONSETS[(code + i) % 3];
  // Melody: word position plus the sentence's end.
  let end = text.length;
  for (let k = i; k < text.length; k++) if ('.!?'.includes(text[k])) { end = k; break; }
  const mark = text[end] ?? '.';
  const toEnd = end - i;
  let pitch = V.basePitch + Math.sin(i * 1.7 + code) * V.range;
  let volume = V.volume;
  if (mark === '!') { pitch += 2 + (toEnd < 6 ? 2 : 0); volume *= 1.15; }
  if (mark === '?' && toEnd < 6) pitch += (6 - toEnd) * 0.9;
  if (mark === '.' && toEnd < 4) pitch -= (4 - toEnd) * 0.5;
  return { name: syllableName(V.timbre, vowel, onset), pitch, volume: Math.min(1, volume) };
}
/** Pause after a character, in characters of typewriter time. */
export function pauseAfter(c, text, i) {
  if (c === '.' && text[i + 1] === '.') return 3;
  if (c === '.' || c === '!' || c === '?') return 8;
  if (c === ',' || c === ':' || c === ';') return 4;
  if (c === '-') return 3;
  return 0;
}
