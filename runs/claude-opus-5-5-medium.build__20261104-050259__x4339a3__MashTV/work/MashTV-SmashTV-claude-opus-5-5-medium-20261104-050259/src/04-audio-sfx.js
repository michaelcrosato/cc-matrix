// ---------------------------------------------------------------- sound effects (all synthesized; each with its own contour)
MT.SFX = {
  // weapons
  pew: [{ wave: 'square', freq: 1400, to: 520, dur: .07, vol: .09 }],
  triple: [{ wave: 'pulse', freq: 1100, to: 400, dur: .08, vol: .08 }, { wave: 'pulse', freq: 1500, to: 600, dur: .06, vol: .05, delay: .015 }],
  rocket: [{ wave: 'noise', freq: 900, to: 300, dur: .25, vol: .14, filter: 'bandpass' }, { wave: 'saw', freq: 140, to: 260, dur: .2, vol: .06 }],
  boom: [{ wave: 'noise', freq: 600, to: 60, dur: .45, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 120, to: 35, dur: .4, vol: .25 }],
  bigboom: [{ wave: 'noise', freq: 500, to: 40, dur: .9, vol: .36, filter: 'lowpass' }, { wave: 'triangle', freq: 90, to: 25, dur: .8, vol: .3 }, { wave: 'noise', freq: 3000, to: 400, dur: .3, vol: .12, delay: .05 }],
  thunk: [{ wave: 'triangle', freq: 220, to: 90, dur: .12, vol: .2 }, { wave: 'noise', freq: 500, dur: .06, vol: .08 }],
  kernel: [{ wave: 'noise', freq: 2400, to: 1200, dur: .05, vol: .12, filter: 'highpass' }],
  hum: [{ wave: 'saw', freq: 110, dur: .14, vol: .05, hold: true, vib: [30, .05] }, { wave: 'sine', freq: 880, dur: .14, vol: .03, hold: true }],
  whirr: [{ wave: 'triangle', freq: 300, to: 900, dur: .3, vol: .08, vib: [20, .1] }],
  shieldUp: [{ wave: 'sine', freq: 300, to: 1200, dur: .35, vol: .12, vib: [12, .05] }],
  squeak: [{ wave: 'square', freq: 1800, to: 2600, dur: .06, vol: .06 }],
  // contestants
  whoosh: [{ wave: 'noise', freq: 600, to: 2400, dur: .2, vol: .12, filter: 'bandpass', q: 2 }],
  flourish: [{ wave: 'square', freq: 'C5', dur: .3, vol: .08, arp: [0, 4, 7, 12, 16], step: .05 }],
  flashbulb: [{ wave: 'noise', freq: 5000, to: 1200, dur: .12, vol: .2, filter: 'highpass' }, { wave: 'sine', freq: 2400, to: 300, dur: .2, vol: .1 }],
  buzzer: [{ wave: 'saw', freq: 110, dur: .32, vol: .14, hold: true }, { wave: 'square', freq: 116, dur: .32, vol: .08, hold: true }],
  wah: [{ wave: 'saw', freq: 330, to: 110, dur: .6, vol: .12, vib: [6, .04] }],
  zip: [{ wave: 'saw', freq: 2000, to: 400, dur: .35, vol: .06 }],
  land: [{ wave: 'triangle', freq: 160, to: 60, dur: .12, vol: .2 }, { wave: 'noise', freq: 400, dur: .08, vol: .08 }],
  kaching: [{ wave: 'square', freq: 'B5', dur: .05, vol: .08 }, { wave: 'square', freq: 'E6', dur: .22, vol: .09, delay: .05 }, { wave: 'noise', freq: 6000, dur: .05, vol: .05, filter: 'highpass', delay: .05 }],
  chime: [{ wave: 'sine', freq: 'E6', dur: .5, vol: .12 }, { wave: 'sine', freq: 'B6', dur: .5, vol: .08, delay: .08 }],
  powerup: [{ wave: 'square', freq: 'C5', dur: .4, vol: .09, arp: [0, 4, 7, 12, 16, 19, 24], step: .05 }],
  expire: [{ wave: 'square', freq: 800, to: 300, dur: .15, vol: .07 }],
  tick: [{ wave: 'square', freq: 2200, dur: .03, vol: .05 }],
  oneup: [{ wave: 'square', freq: 'E5', dur: .5, vol: .1, arp: [0, 3, 12, 8, 10, 15], step: .07 }],
  // enemies
  grunt: [{ wave: 'saw', freq: 140, to: 90, dur: .12, vol: .07 }],
  swish: [{ wave: 'noise', freq: 1500, to: 600, dur: .1, vol: .08 }],
  hop: [{ wave: 'square', freq: 400, to: 800, dur: .06, vol: .05 }],
  clap: [{ wave: 'noise', freq: 1800, dur: .04, vol: .1, filter: 'bandpass', q: 1.5 }],
  hiss: [{ wave: 'noise', freq: 5000, dur: .5, vol: .06, filter: 'highpass', hold: true }],
  pop: [{ wave: 'square', freq: 900, to: 140, dur: .08, vol: .12 }, { wave: 'noise', freq: 2000, dur: .05, vol: .1 }],
  beep: [{ wave: 'square', freq: 1500, dur: .06, vol: .07 }],
  pfft: [{ wave: 'noise', freq: 800, to: 300, dur: .2, vol: .1 }],
  shimmer: [{ wave: 'sine', freq: 'C6', dur: .4, vol: .06, arp: [0, 7, 12, 19], step: .04, loop: true }],
  zap: [{ wave: 'saw', freq: 1600, to: 200, dur: .12, vol: .07 }],
  boo: [{ wave: 'saw', freq: 120, to: 95, dur: .4, vol: .06, vib: [5, .05] }],
  splat: [{ wave: 'noise', freq: 400, to: 120, dur: .18, vol: .16, filter: 'lowpass' }],
  whine: [{ wave: 'sine', freq: 600, to: 2400, dur: .4, vol: .07 }],
  shell: [{ wave: 'square', freq: 200, to: 80, dur: .15, vol: .14 }, { wave: 'noise', freq: 900, dur: .1, vol: .12 }],
  snap: [{ wave: 'noise', freq: 3000, dur: .04, vol: .12, filter: 'highpass' }, { wave: 'square', freq: 600, to: 200, dur: .05, vol: .06 }],
  roar: [{ wave: 'saw', freq: 90, to: 60, dur: .6, vol: .14, vib: [18, .12] }, { wave: 'noise', freq: 300, dur: .5, vol: .1, filter: 'lowpass' }],
  stomp: [{ wave: 'triangle', freq: 90, to: 40, dur: .2, vol: .25 }, { wave: 'noise', freq: 250, dur: .15, vol: .12, filter: 'lowpass' }],
  crash: [{ wave: 'noise', freq: 1200, to: 200, dur: .35, vol: .2 }, { wave: 'triangle', freq: 70, to: 30, dur: .3, vol: .25 }],
  confetti: [{ wave: 'noise', freq: 3500, to: 1500, dur: .08, vol: .1, filter: 'bandpass' }, { wave: 'square', freq: 700, to: 1400, dur: .05, vol: .04 }],
  tink: [{ wave: 'sine', freq: 3200, dur: .06, vol: .06 }],
  // studio
  klaxon: [{ wave: 'square', freq: 520, dur: .18, vol: .07, hold: true }, { wave: 'square', freq: 440, dur: .18, vol: .07, hold: true, delay: .18 }],
  rollup: [{ wave: 'noise', freq: 300, to: 900, dur: .32, vol: .1, filter: 'bandpass' }],
  slam: [{ wave: 'noise', freq: 400, to: 80, dur: .2, vol: .2, filter: 'lowpass' }, { wave: 'triangle', freq: 80, dur: .15, vol: .2 }],
  alarm: [{ wave: 'square', freq: 900, to: 600, dur: .25, vol: .07 }, { wave: 'square', freq: 900, to: 600, dur: .25, vol: .07, delay: .3 }],
  pyro: [{ wave: 'noise', freq: 300, to: 1200, dur: .5, vol: .18, filter: 'bandpass' }],
  click: [{ wave: 'square', freq: 3000, dur: .015, vol: .05 }],
  static: [{ wave: 'noise', freq: 4000, dur: .3, vol: .08, filter: 'highpass', hold: true }],
  channel: [{ wave: 'noise', freq: 2000, dur: .08, vol: .08 }, { wave: 'square', freq: 1200, dur: .03, vol: .04, delay: .08 }],
  shutter: [{ wave: 'noise', freq: 4000, dur: .03, vol: .1, filter: 'highpass' }, { wave: 'noise', freq: 2500, dur: .03, vol: .08, delay: .05 }],
  // ui
  blip: [{ wave: 'square', freq: 880, dur: .03, vol: .05 }],
  bell: [{ wave: 'sine', freq: 'A5', dur: .25, vol: .1 }, { wave: 'sine', freq: 'E6', dur: .25, vol: .06, delay: .02 }],
  back: [{ wave: 'square', freq: 500, to: 300, dur: .08, vol: .06 }],
  page: [{ wave: 'noise', freq: 1500, to: 3000, dur: .08, vol: .06 }],
  slider: [{ wave: 'square', freq: 1200, dur: .02, vol: .04 }],
  type: [{ wave: 'square', freq: 1500, dur: .015, vol: .03 }],
  countdown: [{ wave: 'square', freq: 660, dur: .12, vol: .08 }],
  go: [{ wave: 'square', freq: 1320, dur: .3, vol: .1 }]
};
MT._sfxFrame = { n: {}, t: -1 };
MT.sfx = (name, o = {}) => {
  const g = MT.game; if (!g || g.headless || !g.audio) return;
  if (MT.run && MT.run.mode === 'session' && MT.net && MT.net.ended) return;
  const f = MT._sfxFrame; if (f.t !== g.real) { f.t = g.real; f.n = {}; }
  f.n[name] = (f.n[name] || 0) + 1; if (f.n[name] > 3) return;
  const v = MT.SFX[name]; if (!v) throw new Error('no sound ' + name);
  g.audio.sfx(v, o);
};
