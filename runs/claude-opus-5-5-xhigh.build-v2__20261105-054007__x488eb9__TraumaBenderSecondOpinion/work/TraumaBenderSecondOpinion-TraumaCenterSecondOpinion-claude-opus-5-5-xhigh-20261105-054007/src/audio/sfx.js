// Every sound effect, as a Web Audio graph written in code (section 18). Audio is presentation: it may never drive the sim.
(() => {
const G = (window.GAME ||= {});
const Sfx = G.Sfx = {
  game: null, out: null, ctx: null, noiseBuf: null, loops: {}, lowpass: null, lpOn: false, count: 0,
  init(game) { Sfx.game = game; },
  /** the effects' input: a low-pass (Long Breath closes it) into the engine's sfx bus. Null headless or before the first gesture */
  ready() {
    const a = Sfx.game && Sfx.game.audio; if (!a) return null; const bus = a.bus('sfx'); if (!bus) return null; const ctx = a.ctx; if (!ctx) return null;
    if (Sfx.ctx !== ctx) { Sfx.ctx = ctx; Sfx.lowpass = ctx.createBiquadFilter(); Sfx.lowpass.type = 'lowpass'; Sfx.lowpass.frequency.value = 18000; Sfx.lowpass.connect(bus); Sfx.out = Sfx.lowpass; const n = ctx.sampleRate | 0, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let s = 22222; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; } Sfx.noiseBuf = b; Sfx.loops = {}; }
    return ctx;
  },
  /** Long Breath: the world's sounds go under water */
  breath(on) { const c = Sfx.ready(); if (!c) return; Sfx.lpOn = on; Sfx.lowpass.frequency.cancelScheduledValues(c.currentTime); Sfx.lowpass.frequency.setTargetAtTime(on ? 620 : 18000, c.currentTime, on ? .06 : .12); },
  /** the hush: everything through this filter goes (voices and the choir have their own way out) */
  silence(on) { const c = Sfx.ready(); if (!c) return; Sfx.silenced = on; Sfx.lowpass.frequency.cancelScheduledValues(c.currentTime); Sfx.lowpass.frequency.setTargetAtTime(on ? 8 : Sfx.lpOn ? 620 : 18000, c.currentTime, .03); },
  pan(c, node, p) { if (!p || !c.createStereoPanner) return node; const s = c.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); node.connect(s); return s; },
  tone(f0, f1, dur, type = 'sine', vol = .3, o = {}) {
    const c = Sfx.ready(); if (!c) return; const t = c.currentTime + (o.at || 0), g = c.createGain(), s = c.createOscillator(); s.type = type; s.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) s.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (o.a ?? .004)); g.gain.setValueAtTime(vol, t + Math.max(.004, dur * (o.hold ?? .2))); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    let last = s; if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; s.connect(fl); last = fl; }
    last.connect(g); Sfx.pan(c, g, o.pan).connect(o.out || Sfx.out); s.start(t); s.stop(t + dur + .02);
  },
  noise(dur, f0, f1, q = 1, vol = .3, o = {}) {
    const c = Sfx.ready(); if (!c) return; const t = c.currentTime + (o.at || 0), g = c.createGain(), s = c.createBufferSource(), fl = c.createBiquadFilter(); s.buffer = Sfx.noiseBuf; s.loop = true; s.playbackRate.value = o.rate || 1; fl.type = o.type || 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (o.a ?? .003)); g.gain.setValueAtTime(vol, t + Math.max(.003, dur * (o.hold ?? .15))); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(fl); fl.connect(g); Sfx.pan(c, g, o.pan).connect(o.out || Sfx.out); s.start(t, (Sfx.count++ * .137) % .9); s.stop(t + dur + .02);
  },
  /** a held sound: { set(amount, pitch01), stop() } */
  loop(name) {
    const c = Sfx.ready(); if (!c) return null; let L = Sfx.loops[name]; if (L) return L;
    const g = c.createGain(); g.gain.value = 0; g.connect(Sfx.out);
    const mkNoise = () => { const s = c.createBufferSource(); s.buffer = Sfx.noiseBuf; s.loop = true; s.start(c.currentTime, Math.random() * .9); return s; };
    const fl = c.createBiquadFilter(); let extra = null;
    if (name === 'suck') { const s = mkNoise(); fl.type = 'bandpass'; fl.Q.value = 4; fl.frequency.value = 500; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 17; lg.gain.value = 160; lfo.connect(lg); lg.connect(fl.frequency); lfo.start(); s.connect(fl); fl.connect(g); extra = { rise: (p) => fl.frequency.setTargetAtTime(350 + p * 1500, c.currentTime, .05) }; }
    else if (name === 'burn') { const s = mkNoise(); fl.type = 'highpass'; fl.frequency.value = 3400; const am = c.createGain(); am.gain.value = .5; const lfo = c.createOscillator(), lg = c.createGain(); lfo.type = 'square'; lfo.frequency.value = 37; lg.gain.value = .5; lfo.connect(lg); lg.connect(am.gain); lfo.start(); s.connect(fl); fl.connect(am); am.connect(g); }
    else if (name === 'blade') { const s = mkNoise(); fl.type = 'bandpass'; fl.Q.value = 1.4; fl.frequency.value = 2400; s.connect(fl); fl.connect(g); extra = { rise: (p) => fl.frequency.setTargetAtTime(1500 + p * 4200, c.currentTime, .03) }; }
    else if (name === 'salve') { const s = mkNoise(); fl.type = 'lowpass'; fl.frequency.value = 900; s.connect(fl); fl.connect(g); }
    else if (name === 'vent') { const s = mkNoise(); fl.type = 'bandpass'; fl.Q.value = .8; fl.frequency.value = 800; s.connect(fl); fl.connect(g); }
    else if (name === 'rain') { const s = mkNoise(); fl.type = 'highpass'; fl.frequency.value = 1400; const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 7000; s.connect(fl); fl.connect(f2); f2.connect(g); }
    else if (name === 'static') { const s = mkNoise(); fl.type = 'bandpass'; fl.Q.value = .4; fl.frequency.value = 3200; s.connect(fl); fl.connect(g); }
    else if (name === 'creak') { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 62; fl.type = 'bandpass'; fl.Q.value = 9; fl.frequency.value = 420; o.connect(fl); fl.connect(g); o.start(); }
    L = Sfx.loops[name] = { amt: 0, set(v, p) { g.gain.setTargetAtTime(v, c.currentTime, .025); if (extra && p !== undefined) extra.rise(p); L.amt = v; }, stop() { g.gain.setTargetAtTime(0, c.currentTime, .04); L.amt = 0; } };
    return L;
  },
  stopLoops() { for (const k in Sfx.loops) Sfx.loops[k].stop(); },

  // ---------------------------------------------------------------- one designed sound for everything in table 5.11
  clack() { Sfx.noise(.03, 2600, 1800, 3, .32); Sfx.tone(180, 120, .05, 'square', .12); },
  palm() { Sfx.noise(.05, 700, 300, 1, .32, { at: .02 }); Sfx.tone(120, 70, .08, 'sine', .35, { at: .02 }); },
  tick() { Sfx.tone(2600, 1900, .02, 'square', .09); },
  clink(p = 0) { Sfx.tone(3100, 3000, .22, 'sine', .15, { pan: p }); Sfx.tone(4600, 4500, .15, 'sine', .09, { pan: p, at: .015 }); Sfx.tone(2200, 2100, .18, 'triangle', .07, { pan: p, at: .06 }); },
  rip() { Sfx.noise(.2, 2400, 300, 1.4, .5); Sfx.tone(220, 70, .16, 'sawtooth', .16, { lp: 900 }); },
  twang(i = 0) { const f = 660 + i * 26; Sfx.tone(f, f * .97, .16, 'triangle', .2); Sfx.tone(f * 2, f * 1.9, .1, 'sine', .08); Sfx.noise(.02, 3000, 2000, 2, .12); },
  needle() { Sfx.tone(1400, 1800, .05, 'sine', .08); },
  loose() { Sfx.tone(320, 160, .12, 'triangle', .22); Sfx.noise(.05, 1000, 500, 2, .14); },
  plunger() { Sfx.noise(.5, 1800, 3200, 2, .08, { hold: .8 }); },
  inject() { Sfx.noise(.12, 3200, 900, 2, .18); Sfx.tone(780, 980, .08, 'sine', .13); },
  bubble() { Sfx.tone(520, 1400, .07, 'sine', .22); Sfx.tone(700, 1700, .06, 'sine', .15, { at: .08 }); },
  chime() { Sfx.tone(880, 880, .16, 'triangle', .2); Sfx.tone(1318, 1318, .3, 'triangle', .22, { at: .09 }); Sfx.tone(2637, 2637, .22, 'sine', .05, { at: .09 }); },
  cleanTick() { Sfx.tone(740, 740, .1, 'triangle', .16); },
  sloppy() { Sfx.tone(300, 240, .14, 'triangle', .16); },
  thud() { Sfx.tone(120, 44, .24, 'sine', .55); Sfx.noise(.08, 420, 160, 1, .3); },
  sigh() { Sfx.noise(.5, 900, 260, 1.2, .1, { a: .08, hold: .3, at: .1, out: Sfx.voiceOut() }); },
  voiceOut() { const a = Sfx.game.audio; return a.bus('voice') || Sfx.out; },
  /** the monitor's beep: rate is set by the beat; pitch by vitals */
  beep(vitals) { const f = 920 - (99 - vitals) * 2 + (vitals < 30 ? 240 : 0); Sfx.tone(f, f, .07, 'sine', .13, { a: .002 }); },
  alarm() { Sfx.tone(980, 980, .1, 'square', .08, { lp: 2600 }); Sfx.tone(740, 740, .1, 'square', .08, { at: .12, lp: 2600 }); },
  heart(strength = 1) { Sfx.tone(62, 40, .16, 'sine', .4 * strength); Sfx.tone(52, 34, .14, 'sine', .28 * strength, { at: .17 }); },
  whine() { Sfx.tone(300, 3200, .62, 'sawtooth', .09, { a: .02, hold: .85, lp: 3500 }); },
  bang() { Sfx.noise(.28, 2600, 200, .7, .85); Sfx.tone(120, 34, .34, 'sine', .8); Sfx.tone(1800, 200, .08, 'square', .16); },
  miss() { Sfx.tone(240, 100, .22, 'sawtooth', .16, { lp: 800 }); },
  flatline() { Sfx.tone(880, 880, 2.6, 'sine', .15, { a: .01, hold: .95 }); },
  stamp() { Sfx.tone(90, 36, .3, 'sine', .8); Sfx.noise(.14, 900, 200, .8, .6); Sfx.noise(.03, 3000, 2000, 1, .3); },
  ring() { Sfx.tone(1200, 1500, .08, 'sine', .08); },
  tear() { Sfx.rip(); },
  swell() { Sfx.tone(110, 220, 1, 'sawtooth', .1, { a: .3, hold: .5, lp: 900 }); Sfx.tone(165, 330, 1, 'sawtooth', .08, { a: .3, hold: .5, lp: 900 }); },
  foghorn() { Sfx.tone(82, 78, 2.4, 'sawtooth', .22, { a: .3, hold: .7, lp: 420 }); Sfx.tone(123, 118, 2.4, 'sawtooth', .1, { a: .3, hold: .7, lp: 420 }); },
  ping(rate = 0) { const f = 1400 + rate * 900; Sfx.tone(f, f * .96, .13, 'sine', .14); },
  found() { Sfx.tone(980, 980, .1, 'sine', .2); Sfx.tone(1470, 1470, .22, 'sine', .2, { at: .08 }); },
  tape(up = false) { Sfx.noise(1.1, up ? 400 : 5200, up ? 5200 : 400, 1.2, .3, { hold: .7 }); Sfx.tone(up ? 200 : 2400, up ? 2400 : 180, 1.1, 'sawtooth', .07, { hold: .7, lp: 3000 }); },
  tutDone() { Sfx.tone(660, 660, .1, 'triangle', .22); Sfx.tone(880, 880, .12, 'triangle', .22, { at: .1 }); Sfx.tone(1320, 1320, .22, 'triangle', .22, { at: .2 }); },
  sonarSweep() { Sfx.tone(600, 1800, .06, 'sine', .06); },
  domeNo() { Sfx.tone(140, 138, .12, 'sine', .3); },
  menuMove() { Sfx.tone(1050, 1050, .03, 'square', .05); },
  menuOk() { Sfx.tone(900, 900, .05, 'square', .07); Sfx.tone(1350, 1350, .08, 'square', .07, { at: .05 }); },
  door() { Sfx.noise(.3, 500, 200, 1, .22); Sfx.tone(90, 70, .3, 'sine', .22); },
  gull() { Sfx.tone(1500, 1000, .2, 'sine', .04); Sfx.tone(1700, 1100, .18, 'sine', .04, { at: .24 }); },
};
})();
