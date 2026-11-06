// Animalese-style gibberish: one syllable every two letters, formant-filtered, no real speech. Each character has their own voice.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const VOWELS = { a: [730, 1090], e: [530, 1840], i: [270, 2290], o: [570, 840], u: [300, 870] };
const VOICES = { vale: { f: 340, s: .055, w: 'triangle' }, quill: { f: 105, s: .095, w: 'sawtooth', lp: 1400 }, oyelaran: { f: 170, s: .09, w: 'triangle' }, sokolova: { f: 150, s: .08, w: 'sawtooth', trem: 28 }, percy: { f: 210, s: .07, w: 'square', nasal: true }, odalys: { f: 300, s: .05, w: 'triangle' }, hale: { f: 125, s: .11, w: 'sine', vib: 5, breath: true }, clementine: { f: 390, s: .09, w: 'sine' } };
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const voiceOf = id => VOICES[id] || (() => { const h = hash(id); return { f: 130 + h % 230, s: .06 + (h >> 4) % 5 * .01, w: ['triangle', 'sawtooth', 'sine'][(h >> 8) % 3] }; })();
class Babble {
  constructor(game) { this.game = game; this.ok = false; this.last = 'a'; this.t = 0; this.n = 0; }
  init() { if (this.ok) return true; const A = this.game.audio, b = A.bus && A.bus('voice'); if (!b || !A.ctx) return false; this.c = A.ctx; this.bus = b; this.ok = true; const c = this.c; this.nb = c.createBuffer(1, c.sampleRate * .2, c.sampleRate); const d = this.nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return true; }
  // a letter of a line: every second letter speaks
  letter(ch, who, ctx = {}) { if (ch === ' ') { this.t = Math.max(this.t, this.game.real + .04); return; } this.n++; if (this.n % 2) return; if (!this.init()) { return; } const V = voiceOf(who), low = ch.toLowerCase(), isV = !!VOWELS[low]; if (isV) this.last = low; const code = ch.charCodeAt(0), f0 = V.f * (1 + ((code * 37 % 12) - 6) / 48) * (ctx.pitch || 1), now = this.c.currentTime, t = Math.max(now, this.tEnd || 0), dur = V.s;
    this.syll(V, f0, VOWELS[this.last], t, dur, !isV, low, ctx.vol || 1); this.tEnd = t + dur * .75; }
  syll(V, f0, F, t, dur, cons, low, vol) { const c = this.c, o = c.createOscillator(), g = c.createGain(), b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), mix = c.createGain(); o.type = V.w; o.frequency.setValueAtTime(f0, t); if (V.vib) { o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.02, t + dur * .5); } b1.type = b2.type = 'bandpass'; b1.frequency.value = F[0]; b2.frequency.value = F[1]; b1.Q.value = 4; b2.Q.value = 6; mix.gain.value = V.w === 'sine' ? 3 : 1.6; o.connect(b1); o.connect(b2); b1.connect(mix); b2.connect(mix); mix.connect(g);
    let end = g; if (V.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = V.lp; g.connect(lp); end = lp; } end.connect(this.bus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3 * vol, t + .006); g.gain.setValueAtTime(.3 * vol, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur * .6 + .02); if (V.trem && low === 'r') { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = V.trem; lg.gain.value = .15; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t + dur); } o.start(t); o.stop(t + dur + .03);
    if (cons) { const n = c.createBufferSource(), hp = c.createBiquadFilter(), ng = c.createGain(); n.buffer = this.nb; hp.type = 'highpass'; hp.frequency.value = 2200; ng.gain.setValueAtTime(.09 * vol, t); ng.gain.linearRampToValueAtTime(0, t + .012); n.connect(hp); hp.connect(ng); ng.connect(this.bus); n.start(t); n.stop(t + .014); } }
  // a whole short bark, for barks during play and for the tests' rendering
  say(text, who, ctx = {}) { if (!this.init()) return; this.tEnd = this.c.currentTime + .02; const L = text.length; let i = 0; for (const ch of text.slice(0, 40)) { i++; const end = L - i, q = text.trim().slice(-1), pitch = q === '?' && end < 6 ? 1.2 : q === '.' && end < 6 ? .85 : 1, vol = (q === '!' ? 1.3 : 1) * (ctx.vol || 1); this.letter(ch, who, { pitch, vol }); } }
  reversed(text, who) { this.say(text.split('').reverse().join(''), who, { vol: .7 }); }
}
G.Babble = Babble;
})();
