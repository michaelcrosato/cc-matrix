// ---- sound effects: every sound defined as synth voices (no files); MT.sfx caps repeats per frame ----
const N = (freq, to, dur, vol, filter, o) => Object.assign({ wave: 'noise', freq, to, dur, vol, filter: filter || 'bandpass' }, o);
const V = (wave, freq, to, dur, vol, o) => Object.assign({ wave, freq, to, dur, vol }, o);
const SFX = MT.SFX = {
  // weapons: each with its own contour
  pew: [V('square', 1500, 600, .06, .09), V('triangle', 900, 300, .05, .06)],
  triple: [V('pulse', 1100, 500, .07, .08), V('pulse', 1500, 700, .06, .05, { delay: .012 })],
  rocket: [N(900, 2400, .25, .16, 'bandpass'), V('saw', 180, 420, .22, .06)],
  boom: [N(500, 80, .45, .4, 'lowpass'), V('sine', 120, 35, .4, .5)],
  bigboom: [N(400, 60, .8, .5, 'lowpass'), V('sine', 90, 28, .7, .6), N(2000, 300, .3, .2)],
  thunk: [V('sine', 220, 90, .09, .28), N(600, 300, .06, .15)],
  kernel: [N(3000, 1500, .03, .12, 'highpass')],
  laser: [V('saw', 140, 150, .14, .06, { vib: [30, .02] }), V('sine', 880, 890, .14, .04)],
  whirr: [V('triangle', 600, 900, .18, .06, { vib: [18, .1] })],
  shield: [V('sine', 300, 600, .3, .12, { vib: [9, .05] })],
  squeak: [V('square', 1800, 2600, .05, .06), V('square', 2200, 1600, .05, .05, { delay: .06 })],
  // contestants
  whoosh: [N(800, 3000, .2, .2, 'bandpass', { q: .8 })],
  flourish: [V('pulse', 'C5', null, .3, .1, { arp: [0, 4, 7, 12, 16], step: .05 })],
  flashbulb: [N(6000, 2000, .12, .3, 'highpass'), V('sine', 2400, 400, .1, .15), N(400, 70, .6, .4, 'lowpass', { delay: .05 }), V('sine', 110, 30, .5, .5, { delay: .05 })],
  buzzer: [V('square', 140, 120, .35, .14), V('saw', 147, 125, .35, .1)],
  wah: [V('saw', 400, 120, .7, .14, { vib: [6, .06] })],
  zip: [V('saw', 200, 1400, .35, .07)],
  land: [N(300, 100, .1, .25, 'lowpass'), V('sine', 160, 60, .1, .3)],
  kaching: [V('square', 'E6', null, .05, .08), V('square', 'B6', null, .18, .1, { delay: .05 }), N(5000, 7000, .15, .08, 'highpass', { delay: .05 })],
  chime: [V('sine', 'E6', null, .4, .14), V('sine', 'B6', null, .5, .1, { delay: .08 })],
  powerup: [V('square', 'C5', null, .32, .1, { arp: [0, 4, 7, 12, 16, 19, 24], step: .04 })],
  expire: [V('square', 900, 500, .05, .08), V('square', 500, 300, .07, .07, { delay: .07 })],
  oneup: [V('square', 'G5', null, .36, .11, { arp: [0, 4, 7, 12, 16, 19], step: .055 })],
  tick: [V('square', 1600, null, .02, .05)],
  // enemies
  grunt: [V('saw', 140, 90, .12, .07)],
  baton: [N(1200, 400, .12, .12, 'bandpass')],
  hop: [V('square', 300, 700, .06, .05)],
  clap: [N(1500, 1000, .04, .14, 'bandpass', { q: 1.5 }), N(1500, 1000, .04, .1, 'bandpass', { q: 1.5, delay: .05 })],
  hiss: [N(5000, 6000, .55, .1, 'highpass')],
  pop: [V('sine', 700, 120, .08, .25), N(2500, 800, .06, .18)],
  beep: [V('square', 1800, null, .05, .07)],
  pfft: [N(1200, 300, .2, .12, 'lowpass')],
  shimmer: [V('sine', 'C7', null, .3, .05, { arp: [0, 7, 12, 19], step: .05 })],
  zap: [V('saw', 1200, 200, .12, .07)],
  boo: [V('saw', 120, 95, .5, .07, { vib: [5, .05] })],
  splat: [N(700, 150, .22, .28, 'lowpass'), V('sine', 200, 60, .12, .2)],
  whine: [V('sine', 600, 2200, .4, .07)],
  shellboom: [N(450, 90, .4, .35, 'lowpass'), V('sine', 100, 40, .3, .4)],
  snakehiss: [N(4000, 5500, .4, .1, 'highpass', { q: 2 })],
  snap: [N(3000, 900, .05, .2, 'bandpass'), V('square', 900, 300, .04, .06)],
  roar: [V('saw', 110, 70, .7, .16, { vib: [12, .1] }), N(400, 200, .6, .18, 'lowpass')],
  stomp: [V('sine', 90, 40, .2, .45), N(250, 80, .2, .3, 'lowpass')],
  crash: [N(300, 60, .5, .4, 'lowpass'), N(3000, 600, .3, .2), V('sine', 80, 30, .4, .5)],
  confetti: [V('sine', 900, 200, .07, .16), N(5000, 2500, .1, .1, 'highpass')],
  tink: [V('square', 2400, 2300, .04, .06), V('sine', 3600, null, .08, .05)],
  // studio
  klaxon: [V('square', 520, 380, .22, .07), V('square', 520, 380, .22, .07, { delay: .25 })],
  rollup: [N(400, 1200, .35, .12, 'bandpass', { q: 3 })],
  slam: [N(260, 60, .25, .4, 'lowpass'), V('sine', 120, 50, .2, .4)],
  alarm: [V('square', 900, 700, .15, .06), V('square', 900, 700, .15, .06, { delay: .2 }), V('square', 900, 700, .15, .06, { delay: .4 })],
  pyro: [N(300, 1500, .6, .25, 'bandpass', { q: .7 })],
  drumroll: [N(1600, 1600, .9, .12, 'bandpass', { vib: [25, .5] })],
  wheelclick: [V('square', 2200, 1800, .015, .07)],
  static: [N(4000, 3000, .4, .14, 'highpass', { q: .4 })],
  channel: [N(2500, 6000, .08, .12, 'highpass'), V('square', 1200, 600, .04, .05)],
  shutter: [N(4000, 2000, .04, .18, 'highpass'), N(3000, 1500, .05, .14, 'highpass', { delay: .06 })],
  // ui
  blip: [V('square', 1100, null, .03, .07)],
  bell: [V('sine', 'A6', null, .3, .12), V('sine', 'E7', null, .25, .06, { delay: .02 })],
  back: [V('square', 700, 400, .07, .07)],
  page: [N(2500, 5000, .08, .1, 'bandpass')],
  slider: [V('square', 1600, null, .02, .05)],
  count: [V('square', 'A5', null, .09, .09)],
  countgo: [V('square', 'A6', null, .3, .1)],
};
function defineSfx() { for (const k in SFX) game.audio.define('mt_' + k, SFX[k]); }
const SFX_CAP = { frame: -1, counts: {} };
/** play a sound by name (capped at 3 of one sound per frame; nothing headless) */
MT.sfx = (name, o = {}) => {
  if (!game || game.headless) { MT.lastSfx = name; return; }
  if (!SFX[name]) return;
  const f = Math.floor(game.real * 120);
  if (SFX_CAP.frame !== f) { SFX_CAP.frame = f; SFX_CAP.counts = {}; }
  const n = SFX_CAP.counts[name] = (SFX_CAP.counts[name] || 0) + 1; if (n > 3) return;
  MT.lastSfx = name;
  game.audio.sfx('mt_' + name, o);
};
