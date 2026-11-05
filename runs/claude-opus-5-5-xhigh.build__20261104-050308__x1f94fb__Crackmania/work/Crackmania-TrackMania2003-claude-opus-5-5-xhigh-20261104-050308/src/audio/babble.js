// CRACKMANIA gibberish voices (PLAN §8.4), Animalese-style: each letter one syllable; vowels pick two formants (band-pass
// filters over the speaker's oscillator), consonants add a tick (noise for s f h z, a click for b d g k p t); the pitch
// rises on '?' and falls on '.' and '!'; pauses at commas and full stops. Headless: nothing
import { ctx, E } from '../ctx.js';
const FORM = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 2100] };
export const VOICES = {
  coco: { wave: 'triangle', f: 330, len: .058, q: 6, vol: .5 }, drapeau: { wave: 'square', f: 200, len: .07, q: 6, vol: .3 },
  tex: { wave: 'pulse12', f: 240, len: .062, q: 9, vol: .35 }, gravillon: { wave: 'sine', f: 300, len: .05, q: 6, vol: .55, clip: true },
  bobo: { wave: 'sawtooth', f: 120, len: .09, q: 5, vol: .4 }, crowd: { wave: 'triangle', f: 260, len: .05, q: 4, vol: .08 }
};
const hash = ch => { let h = ch.charCodeAt(0) * 2654435761 >>> 0; return (h % 1000) / 1000; };
export class Babble {
  constructor(game) { this.game = game; this._pulse = null; this.t = 0; }
  get ok() { const A = this.game.audio; return !this.game.headless && A._init && A._init() && A.ctx.state === 'running' && !A.muted; }
  /** one syllable for a letter, now (dialog typewriter) */
  letter(ch, who = 'coco', o = {}) {
    if (!this.ok || !ch || ch === ' ') return;
    const A = this.game.audio, c = A.ctx, V = VOICES[who] || VOICES.coco, t = o.at || c.currentTime + .005, l = ch.toLowerCase();
    if (!/[a-z0-9]/.test(l)) return;
    const vowel = FORM[l] || FORM['aeiou'[Math.floor(hash(l) * 5)]], f0 = V.f * (1 + .15 * hash(l)) * (o.pitch || 1) * (1 + (o.var || 0));
    const out = c.createGain(), vol = V.vol * (o.vol ?? 1) * .5; out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + .008); out.gain.exponentialRampToValueAtTime(.001, t + V.len); out.connect(A._sfxBus);
    const osc = c.createOscillator();
    if (V.wave === 'pulse12') { if (!this._pulse) { const N = 30, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) { const a = 2 / (n * Math.PI) * Math.sin(n * Math.PI * .125); re[n] = a * Math.cos(n * Math.PI * .125); im[n] = a * Math.sin(n * Math.PI * .125); } this._pulse = c.createPeriodicWave(re, im); } osc.setPeriodicWave(this._pulse); } else osc.type = V.wave;
    osc.frequency.setValueAtTime(f0, t); if (o.bend) osc.frequency.linearRampToValueAtTime(f0 * o.bend, t + V.len);
    for (const fq of vowel) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = V.q; osc.connect(bp); bp.connect(out); }
    if (V.clip) { const g2 = c.createGain(); g2.gain.value = .25; osc.connect(g2); g2.connect(out); }
    osc.start(t); osc.stop(t + V.len + .02);
    if (/[sfhzcx]/.test(l) || /[bdgkpt]/.test(l)) {   // the consonant's tick
      const n = c.createBufferSource(); n.buffer = A._noise; const f = c.createBiquadFilter(); f.type = /[sfhzcx]/.test(l) ? 'highpass' : 'bandpass'; f.frequency.value = /[sfhzcx]/.test(l) ? 4000 : 1500; const g = c.createGain();
      g.gain.setValueAtTime(vol * .6, t); g.gain.exponentialRampToValueAtTime(.001, t + (/[sfhzcx]/.test(l) ? .018 : .012)); n.connect(f); f.connect(g); g.connect(A._sfxBus); n.start(t, hash(l + 'x') * .5); n.stop(t + .03);
    }
  }
  /** a whole line, scheduled now (horns, the countdown, the crowd) */
  say(text, who = 'coco', o = {}) {
    if (!this.ok) return; const c = this.game.audio.ctx, V = VOICES[who] || VOICES.coco; let t = c.currentTime + .01;
    const s = String(text); for (let i = 0; i < s.length; i++) { const ch = s[i], end = i === s.length - 1; if (ch === ' ') { t += .04; continue; } if (ch === ',') { t += .12; continue; } if (ch === '.' || ch === '!') { t += .22; continue; }
      this.letter(ch, who, Object.assign({}, o, { at: t, bend: end ? (s.endsWith('?') ? 1.3 : .8) : 1 })); t += V.len * (o.slow || 1); }
  }
  /** the crowd: many short babbles at random pitches, quiet */
  crowd(n = 8) { if (!this.ok) return; const c = this.game.audio.ctx; for (let i = 0; i < n; i++) this.letter('aeiouy'[i % 6], 'crowd', { at: c.currentTime + i * .03 + (i % 3) * .05, pitch: .7 + (i % 5) * .15 }); }
}
