// Animalese/Simlish gibberish: syllables rendered in pure JS (a glottal pulse through formants).
export const VOWELS = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [500, 900], u: [350, 750] };
export const CONSONANTS = ['b', 's', 'm']; // onset shapes: plosive, hiss, hum
const TIMBRES = [ { name: 'low', f0: 110, br: 0.12 }, { name: 'mid', f0: 165, br: 0.08 }, { name: 'high', f0: 235, br: 0.06 } ];

function resonate(input, freq, bw, sr) {
  const out = new Float32Array(input.length);
  const r = Math.exp((-Math.PI * bw) / sr), c = 2 * r * Math.cos((2 * Math.PI * freq) / sr), d = -r * r, g = 1 - c - d;
  let y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) { const y = g * input[i] + c * y1 + d * y2; out[i] = y; y2 = y1; y1 = y; }
  return out;
}
/** One syllable as mono samples. */
export function renderSyllable(timbre, vowel, cons, sr = 22050, dur = 0.12) {
  const n = Math.round(sr * dur), t = TIMBRES[timbre], src = new Float32Array(n);
  let phase = 0, seed = 12345 + timbre * 7 + vowel.charCodeAt(0) * 13 + cons.charCodeAt(0);
  const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };
  for (let i = 0; i < n; i++) {
    const f = t.f0 * (1 + 0.08 * Math.sin((i / n) * Math.PI));
    phase += f / sr;
    if (phase >= 1) phase -= 1;
    src[i] = (phase < 0.4 ? Math.sin((phase / 0.4) * Math.PI) : -0.25) + noise() * t.br;
  }
  const [f1, f2] = VOWELS[vowel];
  const scale = 1 + timbre * 0.09;
  const a = resonate(src, f1 * scale, 90, sr), b = resonate(src, f2 * scale, 130, sr), out = new Float32Array(n);
  let peak = 0.0001;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    let env = Math.min(1, p / 0.06) * Math.min(1, (1 - p) / 0.25);
    let v = a[i] * 0.9 + b[i] * 0.45;
    if (cons === 'b' && p < 0.14) env *= p / 0.14;
    if (cons === 's' && p < 0.25) v = v * (p / 0.25) + noise() * 0.12 * (1 - p / 0.25);
    if (cons === 'm' && p < 0.28) v = a[i] * 0.5;
    out[i] = v * env;
    if (Math.abs(out[i]) > peak) peak = Math.abs(out[i]);
  }
  for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * 0.8;
  return out;
}
export function wavDataUrl(samples, sr = 22050) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return `data:audio/wav;base64,${btoa(bin)}`;
}
export const syllableName = (t, v, c) => `syl-${t}${v}${c}`;
const VKEYS = Object.keys(VOWELS);
/** Letter -> syllable: deterministic, so a line always sounds like itself. */
export function syllableFor(ch) {
  const c = ch.toLowerCase().charCodeAt(0);
  return { vowel: VKEYS[c % VKEYS.length], cons: CONSONANTS[(c >> 1) % CONSONANTS.length] };
}
export async function loadSyllables(audio) {
  const jobs = [];
  for (let t = 0; t < 3; t++) for (const v of VKEYS) for (const c of CONSONANTS) jobs.push(audio.load(syllableName(t, v, c), wavDataUrl(renderSyllable(t, v, c))));
  await Promise.all(jobs);
}
/** Plays a line letter by letter as the typewriter reveals it. */
export class Voice {
  constructor(app) { this.app = app; }
  letter(audio, ch, who, cast, i, punct) {
    if (!/[a-z]/i.test(ch) || i % 2) return false;
    const v = cast?.voice ?? { timbre: 1, base: 0, speed: 1, range: 2 };
    const { vowel, cons } = syllableFor(ch);
    const c = ch.toLowerCase().charCodeAt(0);
    const pitch = v.base + ((c * 7) % 5) * (v.range / 4) - v.range / 2 + (punct === '?' ? 2 + (i % 3) : punct === '!' ? 2 : 0);
    const vol = (punct === '!' ? 0.75 : 0.5) * (this.app.settings.voices ?? 0.8);
    if (vol <= 0) return false;
    audio.play(syllableName(v.timbre, vowel, cons), { pitch, volume: vol });
    return true;
  }
}
