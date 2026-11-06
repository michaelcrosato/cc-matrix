// Gibberish voices, in code. Each letter is a syllable of 65-85 ms; vowels pick formants through two band-pass filters over a
// saw; consonants add a 12 ms noise click; the sentence end falls and a question rises. The same words always make the same sound.
import { SPEAKERS } from '../data/text.js';
const FORMANTS = { A: [800, 1150], E: [400, 2000], I: [300, 2400], O: [450, 800], U: [325, 700] };
const VOWELS = Object.keys(FORMANTS);
export function syllables(text) {
  const out = []; let h = 2166136261;
  for (const ch of String(text).toUpperCase()) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    if (/[A-Z]/.test(ch)) { const vowel = VOWELS.includes(ch); out.push({ vowel, f: vowel ? FORMANTS[ch] : FORMANTS[VOWELS[h % 5]], length: 0.065 + ((h >>> 8) % 21) / 1000, detune: ((h >>> 13) % 13) - 6, click: !vowel }); }
    else if (/[0-9]/.test(ch)) out.push({ vowel: true, f: FORMANTS[VOWELS[+ch % 5]], length: 0.07, detune: (+ch % 7) - 3, click: true });
    else if (ch === ' ') out.push({ gap: 0.03 });
    else if (/[.,;:!?]/.test(ch)) out.push({ gap: ch === ',' ? 0.09 : 0.16 });
  }
  return out;
}
export function speak(actx, dest, noise, text, speakerId, gain = 0.5) {
  const sp = SPEAKERS[speakerId] ?? SPEAKERS.arai, list = syllables(text), rises = /\?\s*$/.test(text), rate = sp.manner === 'fast' ? 0.72 : sp.manner === 'gravel' ? 0.95 : 1; let t = actx.currentTime + 0.02; const total = list.length, started = t, nodes = [];
  list.forEach((s, i) => {
    if (s.gap) { t += s.gap * rate; return; }
    const pos = i / Math.max(1, total), end = pos > 0.82 ? (pos - 0.82) / 0.18 : 0, len = s.length * rate;
    let pitch = sp.pitch * Math.pow(2, s.detune / 48);
    if (rises) pitch *= 1 + end * 0.45; else pitch *= 1 - end * 0.3;
    if (sp.manner === 'lilt' && end > 0) pitch *= 1 + Math.sin(end * 3.14) * 0.25;
    const o = actx.createOscillator(); o.type = sp.wave === 'square' ? 'square' : 'sawtooth'; o.frequency.value = pitch;
    const f1 = actx.createBiquadFilter(), f2 = actx.createBiquadFilter(); f1.type = 'bandpass'; f2.type = 'bandpass'; f1.frequency.value = s.f[0]; f2.frequency.value = s.f[1]; f1.Q.value = 5; f2.Q.value = 7;
    const g = actx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.setValueAtTime(gain, t + len * 0.7); g.gain.linearRampToValueAtTime(0, t + len);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.01); nodes.push(o);
    if (s.click && noise) { const n = actx.createBufferSource(); n.buffer = noise; n.loopStart = (i % 7) * 0.1; const c = actx.createGain(), hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400; c.gain.setValueAtTime(gain * 0.55, t); c.gain.linearRampToValueAtTime(0, t + 0.012); n.connect(hp); hp.connect(c); c.connect(dest); n.start(t, (i % 13) * 0.05, 0.016); nodes.push(n); }
    t += len;
  });
  return { until: t, started, stop() { for (const n of nodes) { try { n.stop(); } catch { /* done already */ } } } };
}
