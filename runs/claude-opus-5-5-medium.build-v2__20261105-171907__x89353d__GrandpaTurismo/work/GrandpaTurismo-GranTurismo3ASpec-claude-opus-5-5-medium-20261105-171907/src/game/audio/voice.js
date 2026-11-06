// Animalese-style gibberish: each letter becomes a syllable of 65 to 85 ms. The same words always make the same sound.
export const SPEAKERS = {
  arai: { id: 'arai', name: 'MS. ARAI', pitch: 210, wave: 'sawtooth', rate: 1, drift: 0 },
  benno: { id: 'benno', name: 'BENNO', pitch: 130, wave: 'square', rate: 0.95, drift: 0.02 },
  fenn: { id: 'fenn', name: 'MR. FENN', pitch: 180, wave: 'sawtooth', rate: 1, drift: 0, lilt: true },
  dell: { id: 'dell', name: 'DELL', pitch: 160, wave: 'sawtooth', rate: 1.25, drift: 0.04 },
};
const FORMANTS = { a: [800, 1150], e: [400, 2000], i: [300, 2400], o: [450, 800], u: [325, 700] };
export const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** Schedule a line on any audio context; returns how long it takes (s). */
export function sayLine(actx, dest, text, speakerId, noise, when = actx.currentTime + 0.02) {
  const sp = SPEAKERS[speakerId] ?? SPEAKERS.arai, clean = text.toLowerCase().slice(0, 140), n = clean.length; let t = when, seed = hash(clean), count = 0;
  const rise = clean.trim().endsWith('?');
  for (let i = 0; i < n; i++) {
    const ch = clean[i]; seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
    if (ch === ' ') { t += 0.03; continue; }
    if (!/[a-z0-9]/.test(ch)) { t += 0.09; continue; }
    const vowelKeys = 'aeiou', isV = vowelKeys.includes(ch), v = isV ? ch : vowelKeys[seed % 5], dur = (0.065 + ((seed >> 3) % 21) / 1000) / sp.rate, f = FORMANTS[v], fr = i / Math.max(1, n - 1);
    let pitch = sp.pitch * (1 + ((seed >> 5) % 13 - 6) * 0.012 + Math.sin(i * 0.7) * sp.drift);
    if (fr > 0.82) pitch *= rise ? 1 + (fr - 0.82) * 1.6 : 1 - (fr - 0.82) * 1.1;
    if (sp.lilt && fr > 0.78) pitch *= 1 + Math.sin((fr - 0.78) * 16) * 0.12;
    if (!isV && noise) { const b = actx.createBufferSource(); b.buffer = noise; const bf = actx.createBiquadFilter(); bf.type = 'highpass'; bf.frequency.value = 2200; const g = actx.createGain(); g.gain.setValueAtTime(0.16, t); g.gain.linearRampToValueAtTime(0, t + 0.012); b.connect(bf); bf.connect(g); g.connect(dest); b.start(t, (seed % 900) / 1000, 0.014); }
    const o = actx.createOscillator(); o.type = sp.wave; o.frequency.setValueAtTime(pitch, t);
    const g = actx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.008); g.gain.setValueAtTime(0.5, t + dur * 0.6); g.gain.linearRampToValueAtTime(0, t + dur);
    for (const [fq, q] of [[f[0], 7], [f[1], 9]]) { const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; o.connect(bp); bp.connect(g); }
    g.connect(dest); o.start(t); o.stop(t + dur + 0.01);
    t += dur; count++;
  }
  return { duration: t - when, syllables: count };
}
