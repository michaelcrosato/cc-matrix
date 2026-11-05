// 70-audio: every sound is made here, in code: bluegrass chiptune songs (banjo rolls on a pulse wave, a square fiddle,
// triangle bass, a washboard of noise), layers that come in when bucks or a trophy show, stings; the rifle's crack and
// its echo down the valley; pumps, shells, calls, animal voices, impacts; the woods' own sounds.
const bar = s => s.trim().split(/\s+/).join(' ');
const SONGS = {
  hoedown: { bpm: 140, steps: 4, tracks: [
    { name: 'banjo', wave: 'pulse', vol: .055, notes: bar('G4 B4 D5 G5 B4 D5 G4 D5 G4 B4 D5 G5 B4 D5 G4 D5 | C5 E5 G5 C5 E5 G5 C5 G5 C5 E5 G5 C5 E5 G5 C5 G5 | D5 F#5 A5 D5 F#5 A5 D5 A5 D5 F#5 A5 D5 F#5 A5 D5 A5 | G4 B4 D5 G5 B4 D5 G4 D5 G4 B4 D5 G5 B4 D5 G4 D5') },
    { name: 'fiddle', wave: 'square', vol: .06, notes: bar('G5 - - A5 B5 - D6 - B5 - A5 - G5 - E5 - | E5 - G5 - C6 - - B5 A5 - G5 - E5 - G5 - | F#5 - A5 - D6 - - C6 B5 - A5 - F#5 - D5 - | G5 - B5 - D6 - B5 - G5 - - - . . D5 E5') },
    { name: 'bass', wave: 'triangle', vol: .17, notes: bar('G2 . . . D3 . . . G2 . . . D3 . . . | C3 . . . G2 . . . C3 . . . G2 . . . | D3 . . . A2 . . . D3 . . . A2 . . . | G2 . . . D3 . . . G2 . . . B2 . C3 .') },
    { name: 'drums', wave: 'drums', vol: .22, notes: bar('k . h . s . h . k . h k s . h . | k . h . s . h . k . h k s . h h') }] },
  lodgefire: { bpm: 84, steps: 4, tracks: [
    { name: 'harmonica', wave: 'square', vol: .045, notes: bar('D5 - - - E5 - G5 - - - E5 - D5 - - - | B4 - - - D5 - E5 - D5 - B4 - A4 - - - | G4 - - - A4 - B4 - D5 - - - B4 - A4 - | G4 - - - - - - - . . . . . . . .') },
    { name: 'chords', wave: 'triangle', vol: .1, notes: bar('G3 - - - - - - - D3 - - - - - - - | E3 - - - - - - - C3 - - - - - - - | C3 - - - - - - - D3 - - - - - - - | G3 - - - - - - - G3 - - - - - - -') },
    { name: 'brush', wave: 'drums', vol: .1, notes: bar('h . . . s . . . h . . h s . . .') }] },
  stalk: { bpm: 96, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .08, notes: bar('E3 - - - - - - - - - - - - - - - | C3 - - - - - - - - - - - - - - - | D3 - - - - - - - - - - - - - - - | B2 - - - - - - - - - - - - - - -') },
    { name: 'ostinato', wave: 'pulse12', vol: .026, notes: bar('E4 . B4 . G4 . B4 . E4 . B4 . G4 . B4 . | C4 . G4 . E4 . G4 . C4 . G4 . E4 . G4 . | D4 . A4 . F#4 . A4 . D4 . A4 . F#4 . A4 . | B3 . F#4 . D#4 . F#4 . B3 . F#4 . D#4 . F#4 .') },
    { name: 'drums', wave: 'drums', vol: .16, on: false, notes: bar('k . . . h . . . k . k . h . . . | k . . . h . . h k . k . h . h .') },
    { name: 'tension', wave: 'drums', vol: .2, on: false, notes: bar('k . k . . . . . k . k . . . . .') },
    { name: 'trem', wave: 'square', vol: .02, on: false, notes: bar('E5 E5 E5 E5 E5 E5 E5 E5 F5 F5 F5 F5 E5 E5 E5 E5 | C5 C5 C5 C5 C5 C5 C5 C5 D5 D5 D5 D5 C5 C5 C5 C5') }] },
  jamboree: { bpm: 160, steps: 4, tracks: [
    { name: 'fiddle', wave: 'square', vol: .06, notes: bar('D5 E5 F#5 G5 A5 - F#5 D5 E5 - C#5 A4 B4 C#5 D5 E5 | F#5 G5 A5 F#5 D5 - A4 - B4 D5 G5 - F#5 E5 D5 - | D5 E5 F#5 G5 A5 - F#5 D5 E5 - C#5 A4 B4 C#5 D5 E5 | F#5 E5 D5 C#5 D5 - A4 - D5 - - - . . A4 C#5') },
    { name: 'banjo', wave: 'pulse', vol: .045, notes: bar('D4 F#4 A4 D5 F#4 A4 D4 A4 | A3 C#4 E4 A4 C#4 E4 A3 E4 | G3 B3 D4 G4 B3 D4 G3 D4 | A3 C#4 E4 A4 C#4 E4 A3 E4') },
    { name: 'bass', wave: 'triangle', vol: .17, notes: bar('D3 . A2 . D3 . A2 . | A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . C#3 .') },
    { name: 'drums', wave: 'drums', vol: .22, notes: bar('k h s h k h s h | k h s h k k s h') }] },
  results: { bpm: 110, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .055, notes: bar('C5 - E5 G5 - E5 C5 - D5 - F5 A5 - F5 D5 - | E5 - G5 C6 - G5 E5 - D5 - B4 G4 - - - - | C5 - E5 G5 - E5 C5 - F5 - A5 C6 - A5 F5 - | G5 - - E5 D5 - B4 - C5 - - - . . . .') },
    { name: 'bass', wave: 'triangle', vol: .16, notes: bar('C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | C3 . G2 . C3 . G2 . | G2 . D3 . G2 . B2 .') },
    { name: 'drums', wave: 'drums', vol: .18, notes: bar('k . s . k k s . | k . s . k . s h') }] },
  fanfare: { bpm: 150, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'G4 B4 D5 G5 - - D5 G5 - - - - - - - -' }, { wave: 'pulse', vol: .05, notes: 'D4 G4 B4 D5 - - B4 D5 - - - - - - - -' }, { wave: 'triangle', vol: .18, notes: 'G2 - - - - - D3 G2 - - - - - - - -' }] },
  siteclear: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: 'C5 E5 G5 C6 - - - - . . . .' }, { wave: 'triangle', vol: .16, notes: 'C3 - G3 C4 - - - - . . . .' }] },
  doe: { bpm: 70, steps: 4, tracks: [{ wave: 'saw', vol: .07, notes: 'D4 - - C#4 - - C4 - - B3 - - - - - - - -' }, { wave: 'triangle', vol: .12, notes: 'D3 - - C#3 - - C3 - - B2 - - - - - - - -' }] },
  escaped: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .06, notes: 'E5 - - C5 - - - - . . .' }] },
  newrecord: { bpm: 170, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: 'C5 E5 G5 C6 E6 G6 - - E6 G6 C7 - - - - -' }, { wave: 'triangle', vol: .16, notes: 'C3 - G3 - C4 - - - G3 - C4 - - - - -' }] }
};
const NZ = (f, dur, vol, o = {}) => Object.assign({ wave: 'noise', freq: f, dur, vol }, o);
const SFX_DEFS = {
  dry: [NZ(5000, .02, .22, { filter: 'highpass' }), { wave: 'square', freq: 1500, dur: .012, vol: .08 }],
  pump: [NZ(1900, .035, .28, { q: 3 }), NZ(900, .07, .12, { to: 1500, delay: .04 }), NZ(2300, .035, .3, { q: 3, delay: .1 })],
  shell: [NZ(2700, .025, .2, { q: 4 }), { wave: 'square', freq: 950, dur: .015, vol: .05, delay: .01 }],
  scope: [NZ(1300, .12, .07, { to: 600 })], breathIn: [NZ(650, .5, .045, { to: 950, attack: .2 })], breathOut: [NZ(950, .7, .05, { to: 380, attack: .05 })],
  grunt: [{ wave: 'saw', freq: 92, to: 80, dur: .32, vol: .22, vib: [13, .09] }, { wave: 'saw', freq: 95, to: 78, dur: .28, vol: .2, vib: [13, .09], delay: .42 }],
  bugle: [{ wave: 'sine', freq: 520, to: 1850, dur: .9, vol: .16, vib: [6, .02] }, NZ(2400, .55, .07, { q: 6, delay: .55 }), { wave: 'sine', freq: 1850, to: 700, dur: .55, vol: .12, delay: 1.1 }, { wave: 'saw', freq: 220, to: 180, dur: .3, vol: .05, delay: 1.5, vib: [20, .1] }],
  moose: [{ wave: 'saw', freq: 68, to: 112, dur: .8, vol: .22, vib: [5, .06] }, { wave: 'saw', freq: 70, to: 52, dur: .4, vol: .16, delay: .85 }],
  fur: [{ wave: 'sine', freq: 120, to: 55, dur: .12, vol: .3 }, NZ(420, .08, .2, { filter: 'lowpass' })],
  wood: [{ wave: 'square', freq: 320, to: 260, dur: .04, vol: .14 }, NZ(900, .06, .2)],
  ricochet: [NZ(3500, .03, .18, { filter: 'highpass' }), { wave: 'sine', freq: 3200, to: 1100, dur: .42, vol: .09 }],
  thud: [NZ(320, .13, .26, { filter: 'lowpass' }), { wave: 'sine', freq: 70, to: 45, dur: .1, vol: .2 }],
  splash: [NZ(1300, .38, .2, { to: 380 }), NZ(3000, .15, .08, { filter: 'highpass', delay: .05 })],
  ping: [{ wave: 'sine', freq: 2800, to: 2400, dur: .3, vol: .12 }, { wave: 'square', freq: 1400, dur: .03, vol: .06 }],
  hoof: [NZ(220, .03, .07, { filter: 'lowpass' })],
  snort: [NZ(520, .22, .14, { to: 380 })], chirp: [{ wave: 'sine', freq: 1200, to: 1650, dur: .15, vol: .07 }],
  gobble: [{ wave: 'square', freq: 420, dur: .45, vol: .07, arp: [0, 5, 0, 7, 0, 5, 0, 3], step: .04 }],
  quack: [{ wave: 'saw', freq: 310, to: 220, dur: .14, vol: .1 }, { wave: 'saw', freq: 300, to: 210, dur: .14, vol: .09, delay: .2 }],
  caw: [{ wave: 'saw', freq: 720, to: 480, dur: .22, vol: .07 }, NZ(900, .2, .05)],
  chatter: [{ wave: 'square', freq: 1800, dur: .32, vol: .05, arp: [0, 3, 0, 3, 0, 5], step: .03 }],
  whistle: [{ wave: 'sine', freq: 2200, to: 2350, dur: .42, vol: .09 }],
  howl: [{ wave: 'sine', freq: 380, to: 720, dur: .8, vol: .08, vib: [5, .02] }, { wave: 'sine', freq: 720, to: 480, dur: .9, vol: .07, delay: .8, vib: [5, .02] }],
  loon: [{ wave: 'sine', freq: 600, to: 920, dur: .7, vol: .08, vib: [5, .02] }, { wave: 'sine', freq: 920, to: 700, dur: 1, vol: .07, delay: .7, vib: [6, .03] }],
  slap: [NZ(520, .16, .34, { filter: 'lowpass' }), NZ(1800, .3, .1, { to: 500, delay: .05 })],
  moo: [{ wave: 'saw', freq: 125, to: 98, dur: .95, vol: .12, vib: [4, .03] }],
  whirr: [NZ(180, .6, .2, { q: 2, to: 260 })], flap: [NZ(300, .08, .1, { filter: 'lowpass' })],
  clay: [NZ(3200, .12, .22, { filter: 'highpass' }), { wave: 'square', freq: 820, to: 300, dur: .06, vol: .08 }],
  bonk: [{ wave: 'square', freq: 210, to: 120, dur: .12, vol: .14 }, NZ(600, .05, .1)],
  splat: [NZ(820, .22, .28, { to: 300, filter: 'lowpass' })], throw: [NZ(700, .18, .08, { to: 1500 })],
  focus: [{ wave: 'square', freq: 1400, dur: .02, vol: .05 }], confirm: [{ wave: 'square', freq: 880, to: 1320, dur: .08, vol: .08 }], back: [{ wave: 'square', freq: 660, to: 440, dur: .08, vol: .07 }],
  tick: [{ wave: 'square', freq: 1800, dur: .014, vol: .045 }], whoosh: [NZ(420, .25, .08, { to: 2400 })],
  stink: [NZ(200, .3, .2, { filter: 'lowpass' }), { wave: 'saw', freq: 110, dur: .6, vol: .06, arp: [0, 1, 6], step: .2 }],
  slowmo: [NZ(2200, 1.2, .1, { to: 180 }), { wave: 'sine', freq: 90, to: 40, dur: 1.2, vol: .14 }],
  crash: [NZ(300, .9, .4, { filter: 'lowpass' }), NZ(1200, .5, .2, { delay: .05 }), { wave: 'square', freq: 90, to: 30, dur: .6, vol: .14 }],
  rockfall: [NZ(500, .9, .18, { filter: 'lowpass' }), NZ(1400, .2, .1, { delay: .2 }), NZ(1100, .2, .1, { delay: .45 }), NZ(900, .25, .1, { delay: .7 })],
  wind: [NZ(380, 4.2, .035, { attack: 1.6, filter: 'lowpass', to: 520 })], creek: [NZ(2400, 1.4, .016, { attack: .5, q: .5 })],
  bird: [{ wave: 'sine', freq: 2600, to: 3400, dur: .09, vol: .03 }, { wave: 'sine', freq: 3000, to: 2400, dur: .08, vol: .025, delay: .12 }],
  bird2: [{ wave: 'pulse12', freq: 2200, dur: .2, vol: .015, arp: [0, 4, 7, 4], step: .05 }], ice: [{ wave: 'sine', freq: 180, to: 900, dur: .5, vol: .03 }, NZ(3000, .08, .02, { delay: .3 })],
  bell: [{ wave: 'sine', freq: 1480, dur: .5, vol: .04 }, { wave: 'sine', freq: 2220, dur: .3, vol: .02 }]
};
const AMB = {
  hollow: [['wind', 3.6], ['creek', 1.2, .6], ['bird', 2.2], ['bird2', 5], ['caw', 11, .35]],
  bugle: [['wind', 3], ['chirp', 6, .5], ['bugle', 24, .12], ['bird', 7]],
  muskeg: [['wind', 3.2], ['loon', 14, .3], ['ice', 9], ['caw', 16, .25]],
  range: [['wind', 4], ['bird', 3]], lodge: []
};
const SFX = G.sfx = {
  amb: null, ambT: {}, layers: {},
  play(name, o = {}) { const v = SFX_DEFS[name]; if (v) G.game.audio.sfx(v, Object.assign({ vary: .04 }, o)); else G.game.audio.sfx(name, o); },
  /** the rifle: a crack, a thump, a tail, and the echo off the far side of the valley */
  shot(H) { const e = (H && H.hunt && H.hunt.echo) || [.35, .8], A = G.game.audio;
    A.sfx([NZ(2600, .05, .55, { filter: 'highpass' }), { wave: 'sine', freq: 62, to: 38, dur: .16, vol: .55 }, NZ(900, .6, .26, { filter: 'lowpass', to: 220 }), NZ(700, .32, .12, { filter: 'lowpass', delay: e[0], to: 260 }), NZ(480, .4, .06, { filter: 'lowpass', delay: e[1], to: 200 })], { vary: .05 }); },
  call(kind, actor, vol = 1) { const v = SFX_DEFS[kind === 'grunt' ? 'grunt' : kind === 'bugle' ? 'bugle' : 'moose']; if (actor) this.panned(v, actor, vol); else G.game.audio.sfx(v, { vol, vary: .02 }); },
  critter(voice, a) { const v = SFX_DEFS[voice]; if (v) this.panned(v, a, .8); },
  /** a sound placed left or right by where it is from the camera (a trophy's bugle from the timber) */
  panned(voices, a, vol = 1) {
    const A = G.game.audio, ctx = A.ctx, bus = A.bus && A.bus('sfx'); if (!ctx || !bus || A.muted || ctx.state !== 'running' || !G.hunt) { if (voices) A.sfx(voices, { vol }); return; }
    const L = G.hunt.lens, dx = a.x - L.x, dy = a.y - L.y, d = Math.hypot(dx, dy) || 1, pan = clamp((dx * L.Rx + dy * L.Ry) / d, -1, 1), dist = clamp(1 - d / (420 * M), .15, 1);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null, t0 = ctx.currentTime + .01;
    if (p) { p.pan.value = pan * .9; p.connect(bus); }
    for (const v of voices) {
      const g = ctx.createGain(), dur = v.dur || .2, t = t0 + (v.delay || 0), f0 = E.note(v.freq || 440);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((v.vol || .2) * vol * dist, t + (v.attack || .01)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
      let src;
      if (v.wave === 'noise') { src = ctx.createBufferSource(); src.buffer = A._noise; src.loop = true; const f = ctx.createBiquadFilter(); f.type = v.filter || 'bandpass'; f.frequency.value = f0; f.Q.value = v.q || 1.1; src.connect(f); f.connect(g); }
      else { src = ctx.createOscillator(); src.type = v.wave === 'saw' ? 'sawtooth' : ['square', 'triangle', 'sine'].includes(v.wave) ? v.wave : 'square'; src.frequency.setValueAtTime(f0, t); if (v.to) src.frequency.exponentialRampToValueAtTime(E.note(v.to), t + dur); if (v.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = v.vib[0]; lg.gain.value = f0 * v.vib[1]; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + dur + .05); } src.connect(g); }
      g.connect(p || bus); src.start(t); src.stop(t + dur + .05);
    }
  },
  music(name, o = {}) { const s = SONGS[name]; if (!s) return; if (G.game.audio.song === s && !o.restart) return; G.game.audio.music(s, { fade: o.fade === undefined ? .6 : o.fade, sync: false }); this.layers = {}; },
  stopMusic(f = .5) { G.game.audio.stopMusic(f); },
  layer(name, on) { if (this.layers[name] === on) return; this.layers[name] = on; if (G.game.audio.song === SONGS.stalk) G.game.audio.layer(name, on ? 1 : 0, on ? .6 : 1.2); },
  sting(name) { const s = SONGS[name]; if (s) G.game.audio.sting(Object.assign({}, s, { loop: false }), { at: 'now', duck: .35 }); },
  ambience(id) { this.amb = id; this.ambT = {}; },
  update(dt) {
    const bed = this.amb && AMB[this.amb]; if (!bed || G.game.paused) return;
    for (const [name, every, vol] of bed) { const k = name; this.ambT[k] = (this.ambT[k] === undefined ? fxr(every) : this.ambT[k]) - dt; if (this.ambT[k] <= 0) { this.ambT[k] = every * fxr(.6, 1.5); G.game.audio.sfx(SFX_DEFS[name], { vol: vol || .9, pitch: fxr(.85, 1.2), vary: .1 }); } }
  }
};
// what the game does, heard
bus.on('pump', () => SFX.play('pump')); bus.on('reload', () => {}); bus.on('shell', () => SFX.play('shell'));
bus.on('scope', () => SFX.play('scope')); bus.on('breathIn', () => SFX.play('breathIn')); bus.on('breathOut', () => SFX.play('breathOut'));
bus.on('impact', e => { const R = e.R; SFX.play(R.kind === 'water' ? 'splash' : R.kind === 'prop' ? (R.prop && R.prop.occ && R.prop.occ[0].k === 'sph' ? 'ricochet' : 'wood') : R.kind === 'ground' ? 'thud' : 'tick', { vol: clamp(1.2 - R.dist / 200, .3, 1) }); });
bus.on('hit', e => SFX.play(e.R.zone === 'antler' ? 'ping' : 'fur'));
bus.on('critter', e => { if (e.a.def.effect === 'stink') SFX.play('stink'); else if (e.a.def.voice) SFX.critter(e.a.def.voice, e.a); });
bus.on('jump', a => SFX.panned && a.cat === 'animal' && SFX.panned(SFX_DEFS.snort, a, .5));
