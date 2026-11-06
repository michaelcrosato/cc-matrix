// Every sound is synthesized here: no files. One designed sound per moment in table 5.11. Audio is presentation: it never drives the sim.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
class Sfx {
  constructor(game) { this.game = game; this.loops = {}; this.fx = null; this.ok = false; this.mode = 'normal'; }
  init() { if (this.ok) return true; const A = this.game.audio, bus = A.bus && A.bus('sfx'); if (!bus || !A.ctx) return false; const c = this.c = A.ctx; this.ok = true;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000; this.fx = c.createGain(); this.fx.connect(this.lp); this.lp.connect(bus); this.bus = bus;
    this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = this.noiseBuf.getChannelData(0); let a = 12345; for (let i = 0; i < d.length; i++) { a = (a * 1664525 + 1013904223) >>> 0; d[i] = a / 2147483648 - 1; } return true; }
  now() { return this.c.currentTime; }
  // a tone with an envelope: t0, wave, from, to, seconds, volume, pan
  tone(o) { if (!this.init()) return; const c = this.c, t = this.now() + (o.at || 0), n = c.createOscillator(), g = c.createGain(); n.type = o.wave || 'sine'; n.frequency.setValueAtTime(o.f, t); if (o.to) n.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + o.d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.v === undefined ? .3 : o.v, t + (o.a === undefined ? .004 : o.a)); g.gain.exponentialRampToValueAtTime(.0005, t + o.d); n.connect(g); this._out(g, o); n.start(t); n.stop(t + o.d + .02); }
  noise(o) { if (!this.init()) return; const c = this.c, t = this.now() + (o.at || 0), n = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); n.buffer = this.noiseBuf; n.loop = true; f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 2000, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.d); f.Q.value = o.q || 1; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.v === undefined ? .25 : o.v, t + (o.a === undefined ? .004 : o.a)); g.gain.exponentialRampToValueAtTime(.0005, t + o.d); n.connect(f); f.connect(g); this._out(g, o); n.start(t, Math.random() * 1.5); n.stop(t + o.d + .02); }
  _out(g, o) { if (o.pan && this.c.createStereoPanner) { const p = this.c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(o.bus || this.fx); } else g.connect(o.bus || this.fx); }
  pan(x) { return G.clamp((x - 213) / 213, -1, 1) * .7; }
  // a looping noise, opened by set(0..1): suction, cautery, scalpel, ventilator, rain, Staccato hiss
  loop(name, o) { if (!this.init()) return null; let L = this.loops[name]; if (L) return L; const c = this.c, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = this.noiseBuf; n.loop = true; f.type = o.type || 'bandpass'; f.frequency.value = o.f; f.Q.value = o.q || 1; g.gain.value = 0; n.connect(f); f.connect(g); g.connect(this.fx); n.start(); L = this.loops[name] = { f, g, o }; return L; }
  set(name, o, v, freq) { const L = this.loop(name, o); if (!L) return; const t = this.now(); L.g.gain.setTargetAtTime(v * (o.v || .2), t, .02); if (freq) L.f.frequency.setTargetAtTime(freq, t, .03); }
  stopLoops() { for (const k in this.loops) { const L = this.loops[k]; if (this.ok) L.g.gain.setTargetAtTime(0, this.now(), .03); } }
  setSlow(on) { if (!this.init()) return; this.lp.frequency.setTargetAtTime(on ? 900 : 18000, this.now(), .08); }
  setMode(m) { if (!this.init() || this.mode === m) return; this.mode = m; this.fx.gain.setTargetAtTime(m === 'normal' ? 1 : 0, this.now(), m === 'normal' ? .1 : .01); }
  // ---- table 5.11 ----
  clack() { this.noise({ f: 2600, d: .03, v: .22, q: 3 }); this.tone({ f: 190, to: 90, d: .05, v: .22, wave: 'square' }); this.noise({ f: 900, d: .05, v: .16, at: .04, q: 1 }); }
  tick() { this.noise({ f: 5200, d: .02, v: .2, q: 4 }); }
  clink() { this.tone({ f: 2400, to: 2300, d: .12, v: .12, wave: 'triangle' }); this.tone({ f: 3650, d: .09, v: .08, wave: 'sine', at: .01 }); }
  rip() { this.noise({ f: 700, to: 2600, d: .16, v: .34, q: .8 }); this.tone({ f: 120, to: 60, d: .1, v: .2, wave: 'saw' === 0 ? 'sawtooth' : 'sawtooth' }); }
  twang() { this.tone({ f: 660, to: 880, d: .1, v: .16, wave: 'triangle' }); this.tone({ f: 1320, to: 1100, d: .06, v: .08, wave: 'sine' }); }
  loose() { this.tone({ f: 300, to: 180, d: .14, v: .14, wave: 'triangle' }); }
  plunger() { this.noise({ f: 3000, to: 900, d: .22, v: .18, q: 2 }); }
  chime() { this.tone({ f: 988, d: .12, v: .13, wave: 'triangle' }); this.tone({ f: 1480, d: .22, v: .13, wave: 'triangle', at: .08 }); }
  clean() { this.tone({ f: 740, d: .1, v: .1, wave: 'triangle' }); }
  sloppy() { this.tone({ f: 200, to: 170, d: .12, v: .12, wave: 'square' }); }
  thud() { this.tone({ f: 90, to: 44, d: .22, v: .5 }); this.noise({ f: 300, d: .08, v: .2, q: .6 }); }
  sigh() { this.noise({ f: 900, to: 320, d: .5, v: .08, q: .7, a: .1 }); }
  heartbeat(k = 1) { this.tone({ f: 62, to: 42, d: .14, v: .42 * k }); this.tone({ f: 56, to: 38, d: .13, v: .3 * k, at: .19 }); }
  beep(v) { const f = 620 + (99 - v) * 4; this.tone({ f, d: .09, v: v < 30 ? .13 : .08, wave: 'sine' }); }
  alarm() { this.tone({ f: 960, d: .14, v: .1, wave: 'square' }); this.tone({ f: 760, d: .14, v: .1, wave: 'square', at: .16 }); }
  whine() { this.tone({ f: 300, to: 3200, d: .8, v: .1, wave: 'sawtooth', a: .3 }); }
  bang() { this.tone({ f: 110, to: 30, d: .4, v: .7 }); this.noise({ f: 2400, to: 300, d: .35, v: .5, q: .5 }); }
  swell() { this.noise({ f: 300, to: 2400, d: 1.1, v: .14, q: 2, a: .5 }); }
  sizzleBurst() { this.noise({ f: 6000, d: .05, v: .1, q: 2 }); }
  stamp() { this.tone({ f: 70, to: 40, d: .25, v: .7 }); this.noise({ f: 1300, d: .07, v: .35, q: .5 }); }
  chord() { for (const f of [196, 247, 294, 370]) this.tone({ f, d: 2.4, v: .05, wave: 'triangle', a: .05 }); }
  rewindFx() { this.tone({ f: 2400, to: 140, d: 1.1, v: .12, wave: 'sawtooth' }); for (let i = 0; i < 8; i++) this.noise({ f: 3000 - i * 240, d: .07, v: .13, q: 3, at: i * .13 }); }
  lurch() { this.noise({ f: 180, to: 80, d: .8, v: .4, q: .6 }); this.tone({ f: 70, to: 110, d: .7, v: .25, wave: 'sawtooth', a: .15 }); }
  foghorn() { for (const f of [82, 123]) this.tone({ f, d: 2.6, v: .08, wave: 'sawtooth', a: .4 }); }
  creak() { this.tone({ f: 140, to: 230, d: .5, v: .05, wave: 'sawtooth', a: .15 }); }
  pingAt(rate, near) { this.tone({ f: 900 + near * 1100, d: .07, v: .12 }); }
  tk(x) { this.noise({ f: 7000, d: .018, v: .14, q: 4, pan: this.pan(x) }); }
  bite(x) { this.noise({ f: 1500, d: .05, v: .16, q: 1.5, pan: this.pan(x) }); }
  flare(x) { this.tone({ f: 1760, to: 1400, d: .12, v: .05, wave: 'triangle', pan: this.pan(x) }); }
  ui() { this.tone({ f: 880, d: .05, v: .08, wave: 'triangle' }); }
  rising(k) { if (this.c && this.noteOsc) { this.noteOsc.frequency.setTargetAtTime(220 * Math.pow(2, k * 3.2), this.now(), .02); this.noteG.gain.setTargetAtTime(.06 + k * .16, this.now(), .02); } else if (this.init()) { const c = this.c; this.noteOsc = c.createOscillator(); this.noteOsc.type = 'sawtooth'; this.noteG = c.createGain(); this.noteG.gain.value = .05; this.noteOsc.connect(this.noteG); this.noteG.connect(this.bus); this.noteOsc.frequency.value = 220; this.noteOsc.start(); } }
  noteCut() { if (this.noteOsc) { try { this.noteOsc.stop(); } catch (e) { /* already stopped */ } this.noteOsc = null; this.noteG = null; } }
  lastBeep() { if (!this.init()) return; this.tone({ f: 880, d: .22, v: .13, bus: this.bus }); }
}
G.Sfx = Sfx;
})();
