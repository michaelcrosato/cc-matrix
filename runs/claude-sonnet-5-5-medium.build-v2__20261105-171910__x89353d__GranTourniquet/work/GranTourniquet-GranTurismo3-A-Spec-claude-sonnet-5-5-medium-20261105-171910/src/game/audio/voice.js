// Animalese-style gibberish: each letter is a syllable of 65-85 ms; vowels pick formants; consonants add a click. Same words, same sound.
const FORMANTS = { a: [800, 1150], e: [400, 2000], i: [300, 2400], o: [450, 800], u: [325, 700] };
export const SPEAKERS = {
  arai: { pitch: 210, wave: 'sawtooth', rate: 1.0, lilt: 0, name: 'MS. ARAI' }, benno: { pitch: 130, wave: 'square', rate: 0.92, lilt: 0, name: 'BENNO' },
  fenn: { pitch: 180, wave: 'sawtooth', rate: 1.0, lilt: 12, name: 'MR. FENN' }, dell: { pitch: 160, wave: 'sawtooth', rate: 0.78, lilt: 6, name: 'DELL' },
};
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// Schedules the syllables of `text` on `ctx` into `dest` starting at `when`. Returns { duration, syllables }.
export function say(ctx, dest, text, speaker = 'arai', when = ctx.currentTime, volume = 1) {
  const sp = SPEAKERS[speaker] ?? SPEAKERS.arai, s = String(text).toLowerCase(); let t = when, count = 0; const maxLen = 5.5; const letters = s.replace(/[^a-z?.!, ]/g, '').split(''); const base = 0.075 / sp.rate; const total = letters.reduce((a, ch) => a + (ch === ' ' ? 0.04 : ch === ',' ? 0.1 : base), 0), sq = total > maxLen ? maxLen / total : 1;
  const nL = letters.length; const q = s.trim().endsWith('?');
  for (let i = 0; i < nL; i++) {
    const ch = letters[i], prog = i / Math.max(1, nL - 1);
    if (ch === ' ') { t += 0.04 * sq; continue; } if (ch === ',') { t += 0.1 * sq; continue; } if (ch === '.' || ch === '!' || ch === '?') { t += 0.12 * sq; continue; }
    const h = hash(s.slice(0, i + 1)), vowel = FORMANTS[ch] ? ch : 'aeiou'[h % 5], F = FORMANTS[vowel], dur = (0.065 + ((h >> 3) % 20) / 1000) * sq / sp.rate;
    let pitch = sp.pitch * (1 + ((h >> 8) % 100) / 1000 - 0.05 + (((h >> 5) % 5) - 2) * 0.03);
    pitch *= 1 - 0.18 * prog * (q ? -1 : 1); if (sp.lilt && prog > 0.8) pitch *= 1 + sp.lilt / 100; if (q && prog > 0.85) pitch *= 1.2;
    const osc = ctx.createOscillator(); osc.type = sp.wave; osc.frequency.setValueAtTime(pitch, t); osc.frequency.linearRampToValueAtTime(pitch * (1 + ((h >> 12) % 7 - 3) / 60), t + dur);
    const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0]; f2.frequency.value = F[1]; f1.Q.value = 6; f2.Q.value = 8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55 * volume, t + 0.012); g.gain.setValueAtTime(0.55 * volume, t + dur - 0.02); g.gain.linearRampToValueAtTime(0, t + dur);
    const mix = ctx.createGain(); mix.gain.value = 1.4; osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g); g.connect(mix).connect(dest); osc.start(t); osc.stop(t + dur + 0.02);
    if (!'aeiou '.includes(ch)) { const len = Math.floor(ctx.sampleRate * 0.012), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); let z = h; for (let k = 0; k < len; k++) { z = (z * 1664525 + 1013904223) >>> 0; d[k] = ((z / 4294967296) * 2 - 1) * (1 - k / len); } const n = ctx.createBufferSource(); n.buffer = b; const ng = ctx.createGain(); ng.gain.value = 0.3 * volume; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000 + (h % 1500); n.connect(hp).connect(ng).connect(dest); n.start(t); }
    t += dur; count++;
  }
  return { duration: t - when, syllables: count };
}
