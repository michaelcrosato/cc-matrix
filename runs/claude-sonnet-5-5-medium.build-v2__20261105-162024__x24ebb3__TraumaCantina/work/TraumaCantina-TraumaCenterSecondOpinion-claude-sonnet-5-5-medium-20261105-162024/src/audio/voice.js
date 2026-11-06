// Animalese/Simlish gibberish: syllables rendered as PCM at boot (pure JS, testable in Node).
export const SR = 22050;
const VOWELS = [[800, 1200], [400, 2000], [300, 2300], [500, 900], [350, 800]]; // a e i o u (F1, F2)
const TIMBRES = [{ f0: 130, f3: 2600, bw: 1.0 }, { f0: 190, f3: 3100, bw: 0.85 }, { f0: 105, f3: 2400, bw: 1.2 }];
export const VOICE_NAMES = ['mid', 'high', 'low'];
function res(f, bw) { const r = Math.exp(-Math.PI * bw * 90 / SR), c = 2 * r * Math.cos(2 * Math.PI * f / SR); return { a1: c, a2: -r * r, g: 1 - r }; }
export function renderSyllable(timbre, vowel, onset, len = 0.12) {
  const T = TIMBRES[timbre % 3], V = VOWELS[vowel % 5], n = Math.floor(SR * len), out = new Float32Array(n);
  const rs = [res(V[0], T.bw), res(V[1], T.bw), res(T.f3, T.bw)], st = rs.map(() => [0, 0]);
  let seed = 1234 + timbre * 77 + vowel * 13 + onset * 5, ph = 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
  const on = onset === 1 ? Math.floor(SR * 0.035) : onset === 2 ? Math.floor(SR * 0.012) : 0;
  for (let i = 0; i < n; i++) {
    const t = i / n; const f0 = T.f0 * (1 + 0.08 * Math.sin(t * Math.PI)); ph += f0 / SR; if (ph > 1) ph -= 1;
    let x = (ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4) * 0.7 + (ph < 0.1 ? 0.6 : 0); // glottal-ish pulse
    if (i < on) x = rnd() * (onset === 1 ? 1.4 : 2.2) * (1 - i / on);
    let y = 0; for (let k = 0; k < 3; k++) { const s = st[k], q = rs[k], o = q.g * x + q.a1 * s[0] + q.a2 * s[1]; s[1] = s[0]; s[0] = o; y += o * (k === 0 ? 1 : k === 1 ? 0.7 : 0.35); }
    const env = Math.min(1, i / (SR * 0.012)) * Math.min(1, (n - i) / (SR * 0.03));
    out[i] = Math.max(-1, Math.min(1, y * env * 0.9));
  }
  return out;
}
export function toWav(f32, sr = SR) {
  const n = f32.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, f32[i])) * 32767, true);
  return new Uint8Array(buf);
}
export function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'); }
export const sylName = (t, v, o) => `syl-${t}${v}${o}`;
export async function loadVoices(audio) {
  for (let t = 0; t < 3; t++) for (let v = 0; v < 5; v++) for (let o = 0; o < 3; o++) await audio.load(sylName(t, v, o), 'data:audio/wav;base64,' + b64(toWav(renderSyllable(t, v, o))));
}
// Letter -> syllable, deterministic. Returns { name, pitch, volume } for the syllable made by the letter pair at `i`.
export function syllableFor(text, i, voice) {
  const ch = text[i] || 'a', code = ch.toUpperCase().charCodeAt(0), nx = (text[i + 1] || 'e').toUpperCase().charCodeAt(0);
  const vow = 'AEIOU'.indexOf(ch.toUpperCase()); const v = vow >= 0 ? vow : (code + nx) % 5, o = vow >= 0 ? 0 : (code % 2) + 1;
  let pitch = voice.base + ((code * 7 + nx * 3) % (voice.range * 2 + 1)) - voice.range, vol = 0.8;
  const rest = text.slice(i, i + 12);
  if (rest.includes('?') ) pitch += 3; if (rest.includes('!')) { pitch += 2; vol = 1; }
  return { name: sylName(voice.timbre, v, o), pitch, volume: vol };
}
export const CAST_VOICES = {
  ilya: { timbre: 1, base: 3, range: 3, speed: 1.1 }, reyes: { timbre: 0, base: -1, range: 2, speed: 1.25 }, sabine: { timbre: 2, base: 1, range: 1, speed: 0.8 },
  bram: { timbre: 2, base: -6, range: 1, speed: 0.7 }, pem: { timbre: 0, base: -3, range: 3, speed: 0.9 }, hesper: { timbre: 1, base: -2, range: 1, speed: 0.75 },
  tomasz: { timbre: 2, base: -2, range: 2, speed: 0.9 }, ollie: { timbre: 1, base: 1, range: 3, speed: 1.1 }, anselm: { timbre: 0, base: -1, range: 1, speed: 0.8 }, ottilie: { timbre: 0, base: 2, range: 2, speed: 1 },
  narrator: { timbre: 0, base: 0, range: 2, speed: 1 }, zamboni: { timbre: 1, base: 1, range: 4, speed: 1.1 }, system: { timbre: 0, base: 0, range: 1, speed: 1 },
};
