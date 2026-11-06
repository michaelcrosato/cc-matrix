// HUSH's song: the babble's formants on long vowels, three detuned saws, an "ah to oo" sweep, slow vibrato, a feedback delay. On the
// effects bus, since gameplay depends on it (music defaults to 10%). Each strain has its own figure, panned toward the source.
(() => {
const G = (window.GAME ||= {});
const Choir = G.Choir = {
  game: null, net: null, ctx: null, pad: null, init(game) { Choir.game = game; },
  /** the shared delay, then the effects bus */
  input() {
    const c = G.Sfx.ready(); if (!c) return null;
    if (Choir.ctx !== c) { Choir.ctx = c; const bus = Choir.game.audio.bus('sfx'), out = c.createGain(); out.connect(bus); Choir.outG = out; const d = c.createDelay(1); d.delayTime.value = .31; const fb = c.createGain(); fb.gain.value = .35; const dry = c.createGain(); dry.gain.value = 1; dry.connect(out); dry.connect(d); d.connect(fb); fb.connect(d); d.connect(out); Choir.net = dry; Choir.pad = null; }
    return Choir.net;
  },
  mute(on) { if (Choir.outG) Choir.outG.gain.setTargetAtTime(on ? 0 : 1, Choir.ctx.currentTime, .01); },
  /** one choral note: "ah to oo" */
  note(freq, dur, o = {}) {
    const inp = Choir.input(); if (!inp) return; const c = Choir.ctx, t = c.currentTime + (o.at || 0), g = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), vol = o.vol ?? .14;
    f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 7; f1.frequency.setValueAtTime(730, t); f1.frequency.linearRampToValueAtTime(300, t + dur); f2.frequency.setValueAtTime(1090, t); f2.frequency.linearRampToValueAtTime(870, t + dur);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = o.vib ?? 4.6; lg.gain.value = freq * .012; lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + .05);
    for (const det of [-7, 0, 6]) { const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.setValueAtTime(freq, t); if (o.to) s.frequency.linearRampToValueAtTime(o.to, t + dur); s.detune.value = det; lg.connect(s.frequency); s.connect(f1); s.connect(f2); s.start(t); s.stop(t + dur + .05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.12, dur * .4)); g.gain.setValueAtTime(vol, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur);
    if (o.shake) { const a = c.createOscillator(), ag = c.createGain(); a.frequency.value = o.shake; ag.gain.value = vol * .8; a.connect(ag); ag.connect(g.gain); a.start(t); a.stop(t + dur); }
    f1.connect(g); f2.connect(g); G.Sfx.pan(c, g, o.pan).connect(inp);
  },
  // the figures
  staccato(pan = 0, vol = .1) { const base = 523; Choir.note(base, .09, { pan, vol }); Choir.note(base * 1.19, .08, { pan, vol, at: .1 }); Choir.note(base * .89, .1, { pan, vol: vol * 1.1, at: .2 }); G.Sfx.noise(.012, 4000, 3000, 1, .14, { pan }); G.Sfx.noise(.012, 4200, 3000, 1, .1, { pan, at: .1 }); },
  legato(pan = 0, vol = .1) { Choir.note(330, 1.4, { to: 196, pan, vol, vib: 3 }); },
  tremolo(pan = 0, vol = .12) { Choir.note(247, .6, { pan, vol, shake: 9 }); },
  dacapo(pan = 0, vol = .12, i = 0) { const n = [392, 330, 294, 262]; Choir.note(n[i % 4], .34, { pan, vol }); },
  dacapoAll(pan = 0, vol = .11) { [392, 330, 294, 262].forEach((f, i) => Choir.note(f, .3, { pan, vol, at: i * .32 })); },
  fermata(pan = 0, vol = .1) { Choir.note(294, 3.6, { pan, vol, vib: 2 }); },
  cantorChord(vol = .1, shift = 0) { const b = 110 * Math.pow(2, shift / 12); Choir.note(b, 3.4, { vol, vib: 3 }); Choir.note(b * 1.5, 3.4, { vol: vol * .9, vib: 3.4 }); Choir.note(b * 1.8, 3.4, { vol: vol * .8, vib: 2.6 }); Choir.note(b * 2.4, 3.4, { vol: vol * .6, vib: 4 }); },
  scream(dur = 3.6) { const c = Choir.input(); if (!c) return; Choir.note(220, dur, { to: 1760, vol: .22, vib: 9 }); Choir.note(330, dur, { to: 2640, vol: .16, vib: 11 }); },
  /** a sustained hum that swells under Sonar: returns { set(vol, pan) } */
  hum() {
    const inp = Choir.input(); if (!inp) return null; if (Choir.pad) return Choir.pad; const c = Choir.ctx, g = c.createGain(), f1 = c.createBiquadFilter(), pan = c.createStereoPanner ? c.createStereoPanner() : null; g.gain.value = 0; f1.type = 'bandpass'; f1.Q.value = 5; f1.frequency.value = 520;
    for (const [fr, det] of [[220, -6], [220, 5], [330, 0]]) { const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = fr; s.detune.value = det; s.connect(f1); s.start(); }
    f1.connect(g); if (pan) { g.connect(pan); pan.connect(inp); } else g.connect(inp);
    return Choir.pad = { set(v, p = 0) { g.gain.setTargetAtTime(v, c.currentTime, .08); if (pan) pan.pan.setTargetAtTime(p, c.currentTime, .08); } };
  },
};
})();
