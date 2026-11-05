/* ---- AUDIO (all synthesized; no audio files). SFX through the engine's chip synth (audio.define), a crowd engine of
 * our own on the engine's audio context (ambient murmur, applause grains, a formant "AAAH" roar and "OOOH", the
 * KER-FUF-FLE chant on the beat) routed to audio.bus('sfx'), and the music director (each ground's song, layers for
 * Hype and ON FIRE, stings). Headless, the structure runs and nothing sounds. ---- */
const SFX = {
  bat: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35, filter: 'bandpass' }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .4 }, { wave: 'triangle', freq: 1240, dur: .05, vol: .15 }],
  batSweet: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35, filter: 'bandpass' }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .4 }, { wave: 'triangle', freq: 1240, dur: .05, vol: .15 }, { wave: 'sine', freq: 880, to: 1320, dur: .12, vol: .2 }],
  edge: [{ wave: 'noise', freq: 5200, dur: .02, vol: .25, filter: 'highpass' }, { wave: 'triangle', freq: 2400, dur: .02, vol: .12 }],
  pitchThud: [{ wave: 'sine', freq: 140, to: 80, dur: .06, vol: .3 }, { wave: 'noise', freq: 400, dur: .04, vol: .1, filter: 'lowpass' }],
  stumps: [{ wave: 'triangle', freq: 700, dur: .05, vol: .3 }, { wave: 'triangle', freq: 540, dur: .06, vol: .25, delay: .025 }, { wave: 'triangle', freq: 860, dur: .05, vol: .22, delay: .05 }, { wave: 'noise', freq: 1800, dur: .08, vol: .2, filter: 'bandpass' }],
  bails: [{ wave: 'triangle', freq: 2200, dur: .02, vol: .15 }, { wave: 'triangle', freq: 2600, dur: .02, vol: .12, delay: .05 }],
  gloves: { wave: 'noise', freq: 300, dur: .06, vol: .3, filter: 'lowpass' },
  throwWhoosh: { wave: 'noise', freq: 600, to: 2200, dur: .18, vol: .14, filter: 'bandpass' },
  dive: { wave: 'noise', freq: 900, to: 200, dur: .35, vol: .16, filter: 'lowpass' },
  board: [{ wave: 'triangle', freq: 300, to: 180, dur: .08, vol: .3 }, { wave: 'noise', freq: 800, dur: .05, vol: .12, filter: 'lowpass' }],
  glass: [{ wave: 'noise', freq: 6000, dur: .25, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 2600, dur: .12, vol: .1 }, { wave: 'sine', freq: 3400, dur: .1, vol: .08, delay: .06 }, { wave: 'sine', freq: 4100, dur: .1, vol: .07, delay: .12 }],
  splash: [{ wave: 'noise', freq: 3000, to: 400, dur: .35, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 60, dur: .15, vol: .3 }, { wave: 'sine', freq: 1800, dur: .03, vol: .06, delay: .25 }],
  gull: { wave: 'square', freq: 1400, to: 900, dur: .3, vol: .08, vib: [14, .08] },
  moo: { wave: 'saw', freq: 110, to: 95, dur: .9, vol: .14, vib: [5, .03], filter: 'lowpass' },
  bees: { wave: 'saw', freq: 220, dur: .6, vol: .06, vib: [40, .05] },
  steam: [{ wave: 'noise', freq: 4000, to: 2000, dur: .5, vol: .18, filter: 'highpass' }, { wave: 'sine', freq: 70, dur: .1, vol: .3 }],
  firework: [{ wave: 'sine', freq: 600, to: 2400, dur: .4, vol: .08 }, { wave: 'noise', freq: 400, to: 100, dur: .5, vol: .3, filter: 'lowpass', delay: .4 }],
  hypeFull: { wave: 'square', freq: 'C5', dur: .4, vol: .12, arp: [0, 4, 7, 12], step: .06 },
  fireOn: { wave: 'saw', freq: 'A4', dur: .5, vol: .12, arp: [0, 3, 7, 12, 15], step: .05 },
  special: { wave: 'pulse', freq: 'E5', dur: .5, vol: .12, arp: [0, 7, 12, 19], step: .06 },
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .1 },
  bell: [{ wave: 'sine', freq: 520, dur: 1.2, vol: .2 }, { wave: 'sine', freq: 1040, dur: .9, vol: .08 }],
  coin: { wave: 'triangle', freq: 1800, to: 2600, dur: .15, vol: .12, vib: [24, .1] },
  meterTick: { wave: 'square', freq: 1600, dur: .02, vol: .05 },
  ringTick: { wave: 'triangle', freq: 1200, dur: .03, vol: .08 },
  catchPop: [{ wave: 'noise', freq: 500, dur: .07, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 200, dur: .06, vol: .2 }],
  drop: { wave: 'triangle', freq: 400, to: 150, dur: .3, vol: .2 },
  item: { wave: 'square', freq: 'G5', dur: .3, vol: .1, arp: [0, 5, 12], step: .05 },
  target: [{ wave: 'square', freq: 'C6', dur: .5, vol: .1, arp: [0, 4, 7, 12, 16], step: .05 }, { wave: 'noise', freq: 3000, dur: .3, vol: .2, filter: 'highpass' }],
  thunder: { wave: 'noise', freq: 120, to: 40, dur: 1.4, vol: .35, filter: 'lowpass' },
  pageTurn: { wave: 'noise', freq: 2000, to: 800, dur: .08, vol: .08, filter: 'bandpass' }
};
const Audio = {
  ready: false, crowd: null, level: 0, target: .2, roar: 0, ooh: 0, applause: 0, chant: 0, rainMute: 1, song: null,
  init() { const A = K.game.audio; for (const [k, v] of Object.entries(SFX)) A.define(k, v); this.ready = true; },
  sfx(name, o) { if (!K.game || !K.game.audio) return; try { K.game.audio.sfx(name, o); } catch (e) { /* sound off */ } },
  /** the crowd's graph, made lazily after the first gesture */
  ensure() {
    if (this.crowd !== null) return this.crowd;
    const A = K.game.audio, bus = A.bus && A.bus('sfx'), c = A.ctx;
    if (!bus || !c) return null;
    try {
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
      const rnd = E.rng(77); for (let i = 0; i < len; i++) { const w = rnd() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const bed = c.createGain(); bed.gain.value = 0;
      for (const f of [200, 800, 2000]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = .8; src.connect(bp); bp.connect(bed); }
      bed.connect(bus); src.start();
      // the roar: detuned saws through vowel formants
      const roar = c.createGain(); roar.gain.value = 0; const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = f2.Q.value = 5; f1.frequency.value = 750; f2.frequency.value = 1250;
      const mixr = c.createGain(); mixr.gain.value = .25; mixr.connect(f1); mixr.connect(f2); f1.connect(roar); f2.connect(roar); roar.connect(bus);
      const oscs = []; for (let i = 0; i < 6; i++) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 160 + i * 23 + rnd() * 10; o.connect(mixr); o.start(); oscs.push(o); }
      this.crowd = { c, bed, roar, f1, f2, oscs, src, bus };
    } catch (e) { this.crowd = false; }
    return this.crowd;
  },
  /** each frame: levels follow the moment */
  tick(dt, crowdSize) {
    const C = this.ensure(); this.roar = Math.max(0, this.roar - dt * .45); this.ooh = Math.max(0, this.ooh - dt * .8); this.chant = Math.max(0, this.chant - dt * .3);
    this.applause = Math.max(0, this.applause - dt * .5); this.level = lerp(this.level, this.target, Math.min(1, dt * 2)); this.target = lerp(this.target, .2, dt * .03);
    K.crowdMood = clamp(this.roar + this.applause * .6, 0, 1);
    if (!C) return;
    const t = C.c.currentTime, size = crowdSize === undefined ? .6 : crowdSize;
    C.bed.gain.setTargetAtTime((.15 + this.level * .15 + this.applause * .25) * size * this.rainMute, t, .2);
    const vowel = this.ooh > this.roar ? [400, 800] : [750, 1250];
    C.f1.frequency.setTargetAtTime(vowel[0], t, .1); C.f2.frequency.setTargetAtTime(vowel[1], t, .1);
    C.roar.gain.setTargetAtTime(Math.max(this.roar, this.ooh * .7, this.chant * .5 * (Math.floor(K.game.time * 4) % 4 < 3 ? 1 : 0)) * .35 * size * this.rainMute, t, .08);
    if (this.applause > .1 && RNG.cosmetic() < this.applause * .6) Audio.sfx({ wave: 'noise', freq: 1500 + RNG.cosmetic() * 2000, dur: .02, vol: .05 * this.applause * size, filter: 'bandpass' });
  },
  cheer(n = 1) { this.roar = Math.min(1, this.roar + .6 * n); this.applause = Math.min(1, this.applause + .7 * n); this.target = Math.min(1, this.target + .3 * n); },
  oooh() { this.ooh = 1; },
  groan() { this.ooh = .6; this.roar = 0; },
  stopAll() { try { K.game.audio.stopMusic(); K.game.audio.mute(true); } catch (e) { /* off */ } if (this.crowd) { try { this.crowd.bed.gain.value = 0; this.crowd.roar.gain.value = 0; } catch (e) { /* off */ } } },
  /** the music director */
  music(id, o = {}) { if (!K.game) return; const s = SONGS[id] || id; if (this.song === s && !o.restart) return; this.song = s; try { K.game.audio.music(s, Object.assign({ fade: .6 }, o)); } catch (e) { /* off */ } },
  /** a layer of the song playing in or out; a song without that layer is left alone (ON FIRE can end after the match
   *  has moved on to the title's or tea interval's music). Every song a match plays has both layers (unit-ui checks) */
  layer(name, v) { const s = this.song; if (!s || !s.tracks || !s.tracks.some(t => t.name === name)) return; try { K.game.audio.layer(name, v, .6); } catch (e) { /* off */ } },
  sting(id) { const s = STINGS[id]; if (!s) return; try { K.game.audio.sting(s, { at: 'now' }); } catch (e) { /* off */ } }
};
K.Audio = Audio; K.sfx = (n, o) => Audio.sfx(n, o); K.SFX = SFX;
