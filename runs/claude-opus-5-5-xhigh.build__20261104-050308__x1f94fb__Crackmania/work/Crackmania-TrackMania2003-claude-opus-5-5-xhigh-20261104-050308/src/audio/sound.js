// CRACKMANIA sound (PLAN §8.1): the car synth (WebAudio nodes made once per voice: two detuned oscillators and a sub
// through a waveshaper and a lowpass, a five-speed gearbox with a dip on each shift; tyres, wind and scrape from
// filtered noise), and the one-shots on the engine's chip synth (game.audio.sfx). Silent headless, muted or paused
import { ctx, E } from '../ctx.js';
import { CFG } from '../config.js';
const SFX = {
  move: { wave: 'square', freq: 'E6', dur: .03, vol: .08 }, tick: { wave: 'square', freq: 'A6', dur: .02, vol: .06 },
  confirm: [{ wave: 'square', freq: 'C6', dur: .05, vol: .12 }, { wave: 'square', freq: 'G6', dur: .08, vol: .12, delay: .05 }],
  back: [{ wave: 'square', freq: 'G5', dur: .05, vol: .1 }, { wave: 'square', freq: 'C5', dur: .08, vol: .1, delay: .05 }],
  error: [{ wave: 'saw', freq: 'C3', dur: .12, vol: .16 }, { wave: 'saw', freq: 'B2', dur: .14, vol: .16, delay: .1 }],
  coin: [{ wave: 'square', freq: 'B5', dur: .04, vol: .1 }, { wave: 'square', freq: 'E6', dur: .1, vol: .1, delay: .04 }],
  cp: [{ wave: 'triangle', freq: 'E6', dur: .09, vol: .3 }, { wave: 'triangle', freq: 'B6', dur: .2, vol: .3, delay: .08 }, { wave: 'sine', freq: 'E7', dur: .25, vol: .1, delay: .08 }],
  boost: [{ wave: 'noise', freq: 600, to: 4000, dur: .35, vol: .35, filter: 'bandpass', q: 2 }, { wave: 'saw', freq: 'C4', to: 'C6', dur: .3, vol: .08 }],
  restart: [{ wave: 'saw', freq: 'C5', to: 'C3', dur: .15, vol: .12 }],
  respawn: { wave: 'triangle', freq: 'C5', dur: .4, vol: .2, arp: [0, 4, 7, 12, 16, 19, 24], step: .05 },
  finish: [{ wave: 'square', freq: 'C5', dur: .12, vol: .16 }, { wave: 'square', freq: 'E5', dur: .12, vol: .16, delay: .12 }, { wave: 'square', freq: 'G5', dur: .12, vol: .16, delay: .24 }, { wave: 'square', freq: 'C6', dur: .45, vol: .18, delay: .36, vib: [6, .02] }],
  flop: [{ wave: 'noise', freq: 300, dur: .3, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 'G3', to: 'C3', dur: .3, vol: .2 }],
  splash: [{ wave: 'noise', freq: 1200, to: 300, dur: .6, vol: .45, filter: 'bandpass', q: .8 }],
  fall: { wave: 'sine', freq: 'C5', to: 'C2', dur: .9, vol: .2 },
  pop: [{ wave: 'noise', freq: 900, dur: .25, vol: .3, filter: 'bandpass' }, { wave: 'square', freq: 'C6', to: 'C7', dur: .1, vol: .05 }],
  place: [{ wave: 'noise', freq: 220, dur: .12, vol: .4, filter: 'lowpass' }, { wave: 'square', freq: 'G3', dur: .06, vol: .12 }],
  remove: [{ wave: 'square', freq: 'G5', to: 'C5', dur: .1, vol: .12 }],
  rotate: { wave: 'square', freq: 'D6', dur: .03, vol: .1 }, level: { wave: 'triangle', freq: 'A5', to: 'E6', dur: .06, vol: .15 },
  click: [{ wave: 'square', freq: 'E6', dur: .03, vol: .14 }, { wave: 'triangle', freq: 'B6', dur: .12, vol: .16, delay: .04 }],
  unlock: [{ wave: 'noise', freq: 180, dur: .18, vol: .5, filter: 'lowpass' }, { wave: 'square', freq: 'G5', dur: .1, vol: .15, delay: .12 }, { wave: 'square', freq: 'D6', dur: .25, vol: .15, delay: .2 }],
  out: { wave: 'saw', freq: 'G4', to: 'C3', dur: .8, vol: .2, vib: [7, .04] },
  rankup: { wave: 'square', freq: 'C5', dur: .5, vol: .15, arp: [0, 7, 12, 16, 19, 24], step: .07 },
  count: { wave: 'square', freq: 'A4', dur: .18, vol: .2 }, go: { wave: 'square', freq: 'A5', dur: .5, vol: .22, hold: true },
  land: { wave: 'noise', freq: 140, dur: .18, vol: .5, filter: 'lowpass' }, crash: [{ wave: 'noise', freq: 400, dur: .35, vol: .6, filter: 'bandpass', q: .7 }, { wave: 'square', freq: 'C2', dur: .15, vol: .2 }]
};
const MODEL_VOICE = { coyote: { a: 'sawtooth', b: 'sawtooth', idle: 38, red: 210, sub: .7, cut: 900 }, pebble: { a: 'square', b: 'square', idle: 55, red: 290, sub: .35, cut: 1500 }, moose: { a: 'sawtooth', b: 'triangle', idle: 32, red: 170, sub: .6, cut: 700, growl: true } };
export class Sound {
  constructor(game) { this.game = game; this.voices = new Map(); for (const [k, v] of Object.entries(SFX)) game.audio.define(k, v); }
  get A() { return this.game.audio; }
  sfx(name, o) { if (this.game.headless) return; this.A.sfx(name, o); }
  count(n) { this.sfx('count'); if (ctx.babble) ctx.babble.say(['','one','two','three'][n] || '', 'drapeau', { vol: .5 }); }
  go() { this.sfx('go'); }
  land(k) { this.sfx('land', { vol: Math.min(1, k / 18) }); }
  wall(k) { this.sfx(k > 15 ? 'crash' : 'land', { vol: Math.min(1, k / 12), pitch: 1.6 }); }
  horn(P) { this.sfx({ wave: 'square', freq: 'E4', dur: .18, vol: .2 }); this.sfx({ wave: 'square', freq: 'C4', dur: .25, vol: .2, delay: .2 }); if (ctx.babble) ctx.babble.say('beep beep', 'drapeau', { vol: .4 }); }
  raceStart() {}
  _voice(P) {
    const A = this.A; if (this.game.headless || !A._init || !A._init() || A.ctx.state !== 'running') return null;
    let v = this.voices.get(P.i); if (v && v.model === P.model) return v;
    if (v) this._kill(v);
    const c = A.ctx, M = MODEL_VOICE[P.model] || MODEL_VOICE.coyote, out = c.createGain(); out.gain.value = 0; out.connect(A._sfxBus);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = M.cut; lp.Q.value = 3;
    const sh = c.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.2); } sh.curve = curve;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), sub = c.createOscillator(), g1 = c.createGain(), g2 = c.createGain(), gs = c.createGain();
    o1.type = M.a; o2.type = M.b; sub.type = 'sine'; o2.detune.value = 12; g1.gain.value = .3; g2.gain.value = .22; gs.gain.value = M.sub * .5;
    o1.connect(g1); o2.connect(g2); sub.connect(gs); g1.connect(sh); g2.connect(sh); gs.connect(lp); sh.connect(lp); lp.connect(out);
    const noise = c.createBufferSource(); noise.buffer = A._noise; noise.loop = true;
    const tyre = c.createBiquadFilter(); tyre.type = 'bandpass'; tyre.frequency.value = 1800; tyre.Q.value = 3; const tg = c.createGain(); tg.gain.value = 0;
    const wind = c.createBiquadFilter(); wind.type = 'lowpass'; wind.frequency.value = 500; const wg = c.createGain(); wg.gain.value = 0;
    const scr = c.createBiquadFilter(); scr.type = 'highpass'; scr.frequency.value = 2500; const sg = c.createGain(); sg.gain.value = 0;
    noise.connect(tyre); tyre.connect(tg); tg.connect(A._sfxBus); noise.connect(wind); wind.connect(wg); wg.connect(A._sfxBus); noise.connect(scr); scr.connect(sg); sg.connect(A._sfxBus);
    const t = c.currentTime; for (const o of [o1, o2, sub]) o.start(t); noise.start(t);
    v = { model: P.model, M, out, lp, o1, o2, sub, tg, tyre, wg, sg, noise, gear: 1, shiftT: 0 };
    this.voices.set(P.i, v); return v;
  }
  _kill(v) { try { for (const o of [v.o1, v.o2, v.sub, v.noise]) o.stop(); v.out.disconnect(); v.tg.disconnect(); v.wg.disconnect(); v.sg.disconnect(); } catch (e) { /* gone */ } }
  /** each step for a player's car: the engine, gears, tyres, wind, scrape */
  car(P, dt) {
    const v = this._voice(P); if (!v) return;
    const c = this.A.ctx, t = c.currentTime, car = P.run.car, M = v.M, vtop = CFG.cars[P.model].vtop, kmh = car.kmh, paused = this.game.paused, split = (ctx.session && ctx.session.players.filter(q => q.input).length) || 1;
    const band = Math.max(1, Math.min(5, 1 + Math.floor(kmh / (vtop / 5.2))));
    if (band !== v.gear) { v.shiftT = .06; v.gear = band; }
    v.shiftT = Math.max(0, v.shiftT - dt);
    const lo = (band - 1) * vtop / 5.2, hi = band * vtop / 5.2, k = Math.max(0, Math.min(1, (kmh - lo) / (hi - lo)));
    const running = P.run.phase === 'countdown' ? (P.run.held || P.driver && P.driver.input.analog && P.driver.input.analog('gas')) : car.gasOn;
    let rpm = M.idle + (P.run.phase === 'countdown' ? (running ? .8 : 0) : (.25 + k * .75)) * (M.red - M.idle);
    if (!car.grounded && car.gasOn) rpm = M.red * .95;
    if (v.shiftT > 0) rpm *= .82;
    const vol = paused ? 0 : (.16 + (car.gasOn ? .1 : 0)) / Math.sqrt(split);
    v.o1.frequency.setTargetAtTime(rpm, t, .03); v.o2.frequency.setTargetAtTime(rpm * 1.005, t, .03); v.sub.frequency.setTargetAtTime(rpm / 2, t, .03);
    v.lp.frequency.setTargetAtTime(M.cut * (car.gasOn ? 1.6 : .8), t, .05);
    v.out.gain.setTargetAtTime(vol, t, .05);
    const slide = car.grounded ? Math.min(1, (car.slideAmt || 0) / 8) : 0, surf = car.surface;
    v.tyre.frequency.setTargetAtTime(surf === 'ice' ? 3400 : surf === 'dirt' || surf === 'sand' ? 700 : surf === 'snow' ? 1100 : 1800, t, .05);
    v.tg.gain.setTargetAtTime(paused ? 0 : slide * .22 + (car.grounded && (surf === 'dirt' || surf === 'sand' || surf === 'snow') ? Math.min(.08, kmh / 1500) : 0), t, .05);
    v.wg.gain.setTargetAtTime(paused ? 0 : Math.min(.12, (kmh / 260) ** 2 * .12), t, .1);
    v.sg.gain.setTargetAtTime(paused ? 0 : car.scrape * .2, t, .03);
  }
  stopCar() { for (const v of this.voices.values()) this._kill(v); this.voices.clear(); }
}
