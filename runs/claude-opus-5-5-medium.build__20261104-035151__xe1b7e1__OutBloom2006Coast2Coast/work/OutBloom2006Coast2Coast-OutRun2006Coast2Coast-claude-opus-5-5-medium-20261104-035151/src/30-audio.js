/* Sound (PLAN §7.14, §7.15): every effect defined in code on the engine's synth, the living engine note per car
 * (continuous loops, engine change E7), tyre squeal, wind, ambience per biome, and the car radio (stations, static
 * between them, the Full Bloom sparkle layer, ducking under speech). No audio files anywhere. */
(() => {
'use strict';
const OB = window.OB, E = OB.E;
const A = () => OB.game && OB.game.audio;
const SFX = {
  pop: [{ wave: 'noise', freq: 3000, dur: .05, vol: .3 }, { wave: 'square', freq: 600, to: 1400, dur: .08, vol: .14 }],
  bonk: [{ wave: 'triangle', freq: 300, to: 900, dur: .14, vol: .3 }, { wave: 'square', freq: 1800, to: 2400, dur: .05, vol: .06, delay: .08 }],
  sting: [{ wave: 'saw', freq: 880, to: 440, dur: .2, vol: .14, vib: [30, .05] }],
  snap: [{ wave: 'noise', freq: 2500, dur: .07, vol: .3 }, { wave: 'square', freq: 700, to: 200, dur: .12, vol: .12 }],
  tok: [{ wave: 'triangle', freq: 520, to: 300, dur: .08, vol: .3 }],
  harp: { wave: 'triangle', freq: 523, arp: [0, 4, 7, 12, 16, 19, 24], step: .04, dur: .35, vol: .2 },
  chime: [{ wave: 'sine', freq: 1568, dur: .4, vol: .2 }, { wave: 'sine', freq: 2093, dur: .3, vol: .12, delay: .05 }],
  shutter: [{ wave: 'noise', freq: 4000, dur: .03, vol: .35 }, { wave: 'noise', freq: 2500, dur: .03, vol: .3, delay: .06 }, { wave: 'sine', freq: 1800, to: 3000, dur: .15, vol: .08, delay: .06 }],
  beep: { wave: 'square', freq: 660, dur: .14, vol: .2 },
  go: [{ wave: 'square', freq: 1320, dur: .5, vol: .22, hold: true }, { wave: 'square', freq: 1980, dur: .5, vol: .1, hold: true }],
  whoosh: [{ wave: 'noise', freq: 600, to: 3000, dur: .35, vol: .3 }],
  tick: { wave: 'square', freq: 1500, dur: .03, vol: .12 },
  heartbeat: [{ wave: 'sine', freq: 70, to: 45, dur: .12, vol: .5 }, { wave: 'sine', freq: 65, to: 40, dur: .1, vol: .35, delay: .18 }],
  zing: [{ wave: 'saw', freq: 1800, to: 900, dur: .16, vol: .12 }, { wave: 'noise', freq: 5000, dur: .1, vol: .1 }],
  sparkle: { wave: 'sine', freq: 1568, arp: [0, 7, 12, 16, 19, 24, 28], step: .045, dur: .4, vol: .14 },
  crowd: [{ wave: 'noise', freq: 1200, dur: 1.2, vol: .22, q: .6 }, { wave: 'noise', freq: 2400, dur: .9, vol: .12, delay: .2 }],
  thunk: [{ wave: 'sine', freq: 160, to: 60, dur: .16, vol: .45 }, { wave: 'noise', freq: 500, dur: .1, vol: .25, filter: 'lowpass' }],
  squeal: [{ wave: 'triangle', freq: 1300, to: 700, dur: .6, vol: .14, vib: [18, .04] }],
  scrape: [{ wave: 'noise', freq: 2500, dur: .25, vol: .22 }, { wave: 'square', freq: 3000, dur: .02, vol: .05, delay: .1 }],
  splash: [{ wave: 'noise', freq: 900, to: 200, dur: .6, vol: .4, filter: 'lowpass' }],
  backfire: [{ wave: 'noise', freq: 400, dur: .07, vol: .4, filter: 'lowpass' }, { wave: 'noise', freq: 300, dur: .06, vol: .3, filter: 'lowpass', delay: .09 }],
  shift: [{ wave: 'noise', freq: 900, dur: .05, vol: .12, filter: 'lowpass' }],
  hornA: [{ wave: 'square', freq: 392, dur: .32, vol: .14, hold: true }, { wave: 'square', freq: 494, dur: .32, vol: .12, hold: true }],
  hornB: [{ wave: 'square', freq: 330, dur: .3, vol: .14, hold: true }, { wave: 'square', freq: 415, dur: .3, vol: .12, hold: true }],
  honk: [{ wave: 'square', freq: 290, dur: .2, vol: .1, hold: true }],
  thump: [{ wave: 'sine', freq: 90, to: 40, dur: .3, vol: .4 }],
  crackle: [{ wave: 'noise', freq: 6000, dur: .5, vol: .1, filter: 'highpass' }],
  air: [{ wave: 'sine', freq: 300, to: 700, dur: .3, vol: .08 }],
  land: [{ wave: 'sine', freq: 120, to: 50, dur: .18, vol: .45 }, { wave: 'noise', freq: 400, dur: .12, vol: .2, filter: 'lowpass' }],
  focus: { wave: 'square', freq: 990, dur: .03, vol: .07 },
  ok: { wave: 'square', freq: 784, arp: [0, 7, 12], step: .045, dur: .15, vol: .16 },
  back: { wave: 'square', freq: 520, to: 330, dur: .1, vol: .14 },
  error: [{ wave: 'square', freq: 200, dur: .1, vol: .16 }, { wave: 'square', freq: 160, dur: .12, vol: .16, delay: .1 }],
  toggle: { wave: 'square', freq: 1200, dur: .03, vol: .1 },
  slide: { wave: 'triangle', freq: 1000, dur: .02, vol: .08 },
  plant: [{ wave: 'sine', freq: 300, to: 600, dur: .1, vol: .3 }, { wave: 'sine', freq: 1568, arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .12, delay: .15 }],
  static: [{ wave: 'noise', freq: 3000, dur: .3, vol: .12, q: .3 }],
  gust: [{ wave: 'noise', freq: 400, to: 1400, dur: .9, vol: .25, q: .5 }],
  cash: [{ wave: 'square', freq: 1568, dur: .05, vol: .1 }, { wave: 'square', freq: 2093, dur: .08, vol: .1, delay: .05 }]
};
OB.SFX = SFX;
OB.Sound = {
  init() { const a = A(); if (!a) return; for (const k in SFX) a.define('ob:' + k, SFX[k]); },
  play(name, o = {}) { const a = A(); if (!a || OB.env.headless) return; if (OB.Sound.mutedFx) return; a.sfx('ob:' + name, o); },
  sting(name) { const a = A(); if (!a || OB.env.headless) return; const j = OB.JINGLES[name]; if (j) a.sting(j, { duck: .45 }); }
};

/* ---- engine notes, tyres, wind, ambience: continuous loops ---- */
class CarSound {
  constructor(car, vol = 1) {
    const a = A(); this.car = car; this.vol = vol; this.L = [];
    if (!a || OB.env.headless || !a.loop) return;
    const c = OB.CARS[car.model];
    this.eng = a.loop({ voices: [{ wave: 'saw', mul: 1, vol: .22 }, { wave: 'saw', mul: 2, vol: .1, detune: 8 }, { wave: 'square', mul: .5, vol: .14 }].concat(c.hybrid ? [{ wave: 'sine', mul: 6, vol: .05 }] : []), lowpass: 900 });
    this.tyre = a.loop({ voices: [{ wave: 'triangle', mul: 1, vol: .2 }, { wave: 'triangle', mul: 1.34, vol: .14 }], lowpass: 3000 });
    this.wind = a.loop({ noise: { filter: 'bandpass', freq: 900, q: .6, vol: .5, direct: true } });
    this.L = [this.eng, this.tyre, this.wind]; this.cyl = c.cyl; this.tone = c.tone; this.lastRpm = 0;
  }
  update(dt, gas, tunnel) {
    if (!this.eng) return;
    const c = this.car, f = Math.max(30, c.rpm / 60 * this.cyl / 2) * (c.crash.t > 0 ? .7 : 1), paused = OB.game.paused;
    this.eng.set({ freq: f, vol: paused ? 0 : (.09 + .07 * gas) * this.vol * (tunnel ? 1.35 : 1), lowpass: 500 + this.tone * (.3 + .7 * gas) }, .05);
    const sq = Math.min(1, Math.abs(c.drift.a) * 1.6 + (c.scrape ? .5 : 0)) * (c.v > 60 ? 1 : 0);
    this.tyre.set({ freq: 1000 + Math.sin(OB.game.time * 37) * 90, vol: paused ? 0 : sq * .07 * this.vol }, .04);
    const w = Math.min(1, c.v / 300);
    this.wind.set({ vol: paused ? 0 : w * w * .09 * this.vol * (c.slip > .5 ? .4 : 1), noiseFreq: c.slip > .5 ? 500 : 900 + w * 900 }, .1);
    if (this.lastRpm > 6000 && c.rpm < this.lastRpm - 900 && gas < .1 && !OB.FX.reduce()) OB.Sound.play('backfire', { vol: .6 * this.vol });
    this.lastRpm = c.rpm;
  }
  stop(f = .3) { for (const l of this.L) l.stop(f); this.L = []; this.eng = null; }
}
OB.CarSound = CarSound;
const AMB = { beach: { filter: 'lowpass', freq: 500, vol: .08 }, lagoon: { filter: 'lowpass', freq: 600, vol: .07 }, lake: { filter: 'lowpass', freq: 400, vol: .05 }, fields: { filter: 'highpass', freq: 5000, vol: .02 }, vineyard: { filter: 'highpass', freq: 6000, vol: .03 }, canyon: { filter: 'highpass', freq: 6500, vol: .03 }, nightcity: { filter: 'lowpass', freq: 250, vol: .06 }, jungle: { filter: 'bandpass', freq: 3500, vol: .03 } };
OB.Ambience = {
  cur: null, kit: null,
  set(kit) {
    if (this.kit === kit) return; this.kit = kit; const a = A(); if (!a || OB.env.headless || !a.loop) return;
    if (this.cur) this.cur.stop(1.5);
    const s = AMB[kit]; if (!s) { this.cur = null; return; }
    this.cur = a.loop({ noise: { filter: s.filter, freq: s.freq, q: .7, vol: 1, direct: true } }); this.base = s.vol; this.cur.set({ vol: s.vol }, 1.5);
  },
  update(t) { if (this.cur && (this.kit === 'beach' || this.kit === 'lagoon')) this.cur.set({ vol: OB.game.paused ? 0 : this.base * (.6 + .4 * Math.sin(t * .7)) }, .3); else if (this.cur) this.cur.set({ vol: OB.game.paused ? 0 : this.base }, .3); },
  stop() { if (this.cur) this.cur.stop(.5); this.cur = null; this.kit = null; }
};

/* ---- the radio ---- */
OB.Radio = {
  i: 0, song: null, duckT: 0,
  available() { const p = OB.Profile.p; return OB.STATIONS.map((s, i) => i).filter(i => p.unlocked.songs.includes(i)); },
  tune(i, o = {}) {
    const st = OB.STATIONS[i]; if (!st) return; this.i = i; this.song = OB.SONGS[st.song];
    OB.Sound.play('static', { vol: .6 });
    const a = A(); if (a) a.music(this.song, { fade: o.fade === undefined ? .4 : o.fade, restart: o.restart });
    OB.bus.emit('radio:tune', { i, name: st.name, song: this.song.name });
  },
  next() { const av = this.available(), k = av.indexOf(this.i); this.tune(av[(k + 1) % av.length], { fade: 1 }); },
  theme(name) { const a = A(); if (a && OB.SONGS[name]) a.music(OB.SONGS[name], { fade: .6 }); },
  bloom(on) { const a = A(); if (a && a.song) a.layer('sparkle', on ? 1 : 0, 1); },
  duck(t) { this.duckT = Math.max(this.duckT, t); },
  update(dt) {
    const a = A(); if (!a) return; const base = OB.game.settings.music;
    if (this.duckT > 0) { this.duckT -= dt; a.musicVolume = base * .6; } else a.musicVolume = base;
    a.applyVolume();
  }
};
})();
