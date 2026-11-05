/* OutBloom — sound, all in code: instrument presets on the extended engine synth (E.INSTRUMENTS: e-piano, slap and
 * finger bass, brass, stabs, steel drum, marimba, leads, sax, pads, organ, plucks, chorus guitar, bells, trombone),
 * every sound effect, the engine note of each car (a living loop: firing frequency from the rpm, its cylinders and a
 * filter that follows the throttle), tyres, wind, gravel, ambience per biome, and the race's events turned into sound.
 * Headless (no Web Audio) every call is quietly skipped. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp } = E;
const game = OB.game, A = game.audio, INST = E.INSTRUMENTS;
/* ---- instrument helpers ---- */
const env = (g, t, a, peak, d, sus, end, r) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(peak * sus, t + a, d / 3); g.gain.setValueAtTime(peak * sus, Math.max(t + a, end)); g.gain.setTargetAtTime(0, Math.max(t + a, end), r / 3); };
const mkOsc = (c, type, f, t, stop) => { const o = c.createOscillator(); if (type === 'pulse25' || type === 'pulse12') o.setPeriodicWave(A._pulse(type === 'pulse25' ? .25 : .125)); else o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o; };
const mkFilt = (c, type, f, q = 1) => { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; return fl; };
const vib = (c, o, f, t, delay, rate, depth, stop) => { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = rate; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * depth, t + delay + .1); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(stop); };
const slideTo = (o, f, t, on, k = .94, dt = .07) => { if (on) { o.frequency.setValueAtTime(f * k, t); o.frequency.exponentialRampToValueAtTime(f, t + dt); } };
function voiceOf(c, bus, t, dur, vol, a, d, sus, r) { const g = c.createGain(); env(g, t, a, vol, d, sus, t + dur, r); g.connect(bus); return { g, stop: t + dur + r + .1 }; }
INST.epiano = (A, f, t, dur, vol, bus) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol * 1.2, .005, .9, .35, .3);
  const car = mkOsc(c, 'sine', f, t, V.stop), mod = mkOsc(c, 'sine', f, t, V.stop), mg = c.createGain(); mg.gain.setValueAtTime(f * 1.8, t); mg.gain.setTargetAtTime(f * .2, t, .25); mod.connect(mg); mg.connect(car.frequency); car.connect(V.g);
  const tri = mkOsc(c, 'triangle', f, t, V.stop), tg = c.createGain(); tg.gain.value = .25; tri.connect(tg); tg.connect(V.g); };
INST.slapbass = (A, f, t, dur, vol, bus, o) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol * 1.3, .003, .25, .5, .08), fl = mkFilt(c, 'lowpass', 2600, 5); fl.frequency.setValueAtTime(o.accent ? 3600 : 2600, t); fl.frequency.setTargetAtTime(320, t, .06); fl.connect(V.g);
  for (const [type, k] of [['sawtooth', 1], ['square', .5]]) { const s = mkOsc(c, type, f, t, V.stop), sg = c.createGain(); sg.gain.value = k * .5; s.connect(sg); sg.connect(fl); } };
INST.fingerbass = (A, f, t, dur, vol, bus) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol * 1.5, .012, .4, .7, .1), fl = mkFilt(c, 'lowpass', 900); fl.connect(V.g); mkOsc(c, 'triangle', f, t, V.stop).connect(fl); const s = mkOsc(c, 'sine', f / 2, t, V.stop), sg = c.createGain(); sg.gain.value = .4; s.connect(sg); sg.connect(fl); };
INST.sawbass = (A, f, t, dur, vol, bus) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol, .004, .15, .6, .05), fl = mkFilt(c, 'lowpass', 1800, 3); fl.frequency.setTargetAtTime(500, t, .05); fl.connect(V.g); mkOsc(c, 'sawtooth', f, t, V.stop).connect(fl); };
INST.acid = (A, f, t, dur, vol, bus, o) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol, .003, .2, .6, .05), fl = mkFilt(c, 'lowpass', 300, 12); fl.frequency.setValueAtTime(260, t); fl.frequency.linearRampToValueAtTime(o.accent ? 3200 : 2200, t + .03); fl.frequency.setTargetAtTime(300, t + .03, .08); fl.connect(V.g); const s = mkOsc(c, 'sawtooth', f, t, V.stop); slideTo(s, f, t, o.slide); s.connect(fl); };
INST.brass = (A, f, t, dur, vol, bus) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol * .8, .035, .3, .8, .12), fl = mkFilt(c, 'lowpass', 600, 1.5); fl.frequency.setValueAtTime(600, t); fl.frequency.linearRampToValueAtTime(3000, t + .07); fl.frequency.setTargetAtTime(1800, t + .07, .2); fl.connect(V.g);
  for (const dt of [-9, 0, 8]) { const s = mkOsc(c, 'sawtooth', f, t, V.stop); s.detune.value = dt; s.connect(fl); } };
INST.stab = (A, f, t, dur, vol, bus) => { const c = A.ctx, V = voiceOf(c, bus, t, Math.min(dur, .14), vol, .004, .1, .3, .06), fl = mkFilt(c, 'lowpass', 3200, 2); fl.connect(V.g); for (const dt of [-12, 12]) { const s = mkOsc(c, 'sawtooth', f, t, V.stop); s.detune.value = dt; s.connect(fl); } };
INST.steeldrum = (A, f, t, dur, vol, bus) => { const c = A.ctx, g = c.createGain(); g.gain.setValueAtTime(vol * 1.3, t); g.gain.setTargetAtTime(0, t + .01, .22); g.connect(bus); const stop = t + 1.2;
  const car = mkOsc(c, 'sine', f, t, stop), mod = mkOsc(c, 'sine', f * 3.5, t, stop), mg = c.createGain(); mg.gain.setValueAtTime(f * 2.2, t); mg.gain.setTargetAtTime(f * .1, t, .12); mod.connect(mg); mg.connect(car.frequency); car.connect(g); };
INST.marimba = (A, f, t, dur, vol, bus) => { const c = A.ctx, g = c.createGain(); g.gain.setValueAtTime(vol * 1.5, t); g.gain.setTargetAtTime(0, t + .005, .12); g.connect(bus); const stop = t + .8; mkOsc(c, 'sine', f, t, stop).connect(g); const h = mkOsc(c, 'sine', f * 4, t, stop), hg = c.createGain(); hg.gain.setValueAtTime(.3, t); hg.gain.setTargetAtTime(0, t, .03); h.connect(hg); hg.connect(g); };
INST.bell = (A, f, t, dur, vol, bus) => { const c = A.ctx, g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0, t + .005, .35); g.connect(bus); const stop = t + 1.6; mkOsc(c, 'sine', f, t, stop).connect(g); const h = mkOsc(c, 'sine', f * 2.76, t, stop), hg = c.createGain(); hg.gain.value = .35; h.connect(hg); hg.connect(g); };
INST.lead = (A, f, t, dur, vol, bus, o) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol, .01, .2, .75, .08), fl = mkFilt(c, 'lowpass', 4200, 1); fl.connect(V.g); const s = mkOsc(c, 'pulse25', f, t, V.stop); slideTo(s, f, t, o.slide); vib(c, s, f, t, .15, 5.5, .007, V.stop); s.connect(fl); };
INST.softlead = (A, f, t, dur, vol, bus, o) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol * 1.2, .04, .3, .8, .2); const s = mkOsc(c, 'triangle', f, t, V.stop); slideTo(s, f, t, o.slide, .9, .15); vib(c, s, f, t, .2, 5, .008, V.stop); s.connect(V.g); const s2 = mkOsc(c, 'sine', f * 2, t, V.stop), sg = c.createGain(); sg.gain.value = .15; s2.connect(sg); sg.connect(V.g); };
INST.sax = (A, f, t, dur, vol, bus, o) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol * 1.4, .03, .3, .8, .1), bp = mkFilt(c, 'bandpass', 1300, 1.6), lp = mkFilt(c, 'lowpass', 3200); bp.connect(lp); lp.connect(V.g); const s = mkOsc(c, 'sawtooth', f, t, V.stop); slideTo(s, f, t, o.slide, .95, .06); vib(c, s, f, t, .18, 5.2, .009, V.stop); s.connect(bp); const s2 = mkOsc(c, 'square', f, t, V.stop), sg = c.createGain(); sg.gain.value = .2; s2.connect(sg); sg.connect(bp); };
INST.organ = (A, f, t, dur, vol, bus) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol, .008, .1, .9, .04); for (const [k, m] of [[1, .5], [2, .3], [3, .2], [4, .08]]) { const s = mkOsc(c, 'sine', f * k, t, V.stop), sg = c.createGain(); sg.gain.value = m; s.connect(sg); sg.connect(V.g); } };
INST.organlead = (A, f, t, dur, vol, bus, o) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol, .006, .1, .85, .05); for (const [k, m] of [[1, .5], [2, .35], [3, .25], [6, .1]]) { const s = mkOsc(c, k === 1 ? 'triangle' : 'sine', f * k, t, V.stop), sg = c.createGain(); sg.gain.value = m; slideTo(s, f * k, t, o.slide); s.connect(sg); sg.connect(V.g); } };
INST.pad = (A, f, t, dur, vol, bus) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol, .35, .6, .85, .6), fl = mkFilt(c, 'lowpass', 1500, .7); fl.connect(V.g); for (const dt of [-14, -5, 5, 14]) { const s = mkOsc(c, 'sawtooth', f, t, V.stop); s.detune.value = dt; s.connect(fl); } };
INST.pluck = (A, f, t, dur, vol, bus) => { const c = A.ctx, g = c.createGain(); g.gain.setValueAtTime(vol * 2.4, t); g.gain.setTargetAtTime(0, t + .005, .18); g.connect(bus); const stop = t + .9;
  const n = c.createBufferSource(); n.buffer = A._noise; const bp = mkFilt(c, 'bandpass', f, 28); const ng = c.createGain(); ng.gain.setValueAtTime(1, t); ng.gain.setTargetAtTime(0, t, .02); n.connect(ng); ng.connect(bp); bp.connect(g); n.start(t); n.stop(stop); const tri = mkOsc(c, 'triangle', f, t, stop), tg = c.createGain(); tg.gain.value = .25; tri.connect(tg); tg.connect(g); };
INST.chorusgtr = (A, f, t, dur, vol, bus) => { const c = A.ctx, V = voiceOf(c, bus, t, Math.min(dur, .18), vol, .004, .12, .4, .08), fl = mkFilt(c, 'lowpass', 2200); fl.connect(V.g); for (const [dt, p] of [[-10, -.35], [10, .35]]) { const s = mkOsc(c, 'square', f, t, V.stop); s.detune.value = dt; const pn = c.createStereoPanner ? c.createStereoPanner() : null; if (pn) { pn.pan.value = p; s.connect(pn); pn.connect(fl); } else s.connect(fl); } };
INST.trombone = (A, f, t, dur, vol, bus, o) => { const c = A.ctx, V = voiceOf(c, bus, t, dur, vol, .04, .2, .85, .15), fl = mkFilt(c, 'lowpass', 1100, 2); fl.connect(V.g); const s = mkOsc(c, 'sawtooth', f, t, V.stop); if (o.slide) { s.frequency.setValueAtTime(f * 1.06, t); s.frequency.exponentialRampToValueAtTime(f * .84, t + dur); } vib(c, s, f, t, .05, 6, .02, V.stop); s.connect(fl); };

/* ---- sound effects: simple ones as engine voices, the rest synthesised here ---- */
const def = (n, v) => A.define(n, v);
def('focus', { wave: 'triangle', freq: 1320, dur: .03, vol: .1 }); def('tick', { wave: 'square', freq: 900, dur: .02, vol: .07 }); def('back', { wave: 'triangle', freq: 600, to: 300, dur: .08, vol: .14 });
def('error', [{ wave: 'square', freq: 180, dur: .12, vol: .12 }, { wave: 'square', freq: 150, dur: .12, vol: .1, delay: .1 }]); def('toggle', { wave: 'triangle', freq: 700, arp: [0, 7], step: .04, dur: .1, vol: .14 });
def('pop', [{ wave: 'noise', freq: 3000, dur: .03, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 600, to: 1500, dur: .08, vol: .2 }]);
def('boink', [{ wave: 'triangle', freq: 300, to: 900, dur: .14, vol: .3 }, { wave: 'square', freq: 1800, to: 2400, dur: .04, vol: .06, delay: .1 }]);
def('sting', { wave: 'saw', freq: 220, dur: .25, vol: .12, vib: [30, .2] }); def('snap', [{ wave: 'noise', freq: 2400, dur: .05, vol: .3 }, { wave: 'triangle', freq: 800, to: 200, dur: .12, vol: .18 }]);
def('tok', { wave: 'sine', freq: 520, to: 380, dur: .06, vol: .3 }); def('chime', { wave: 'sine', freq: 1568, arp: [0, 4, 7, 12], step: .05, dur: .35, vol: .16 });
def('harp', { wave: 'triangle', freq: 523, arp: [0, 4, 7, 12, 16, 19, 24], step: .03, dur: .4, vol: .16 }); def('shutter', [{ wave: 'noise', freq: 4000, dur: .02, vol: .3, filter: 'highpass' }, { wave: 'noise', freq: 2500, dur: .04, vol: .2, delay: .06 }, { wave: 'sine', freq: 2000, to: 6000, dur: .15, vol: .05, delay: .05 }]);
def('beep', { wave: 'square', freq: 880, dur: .12, vol: .16 }); def('gobeep', { wave: 'square', freq: 1760, dur: .4, vol: .16 }); def('zing', { wave: 'sine', freq: 1800, to: 3200, dur: .1, vol: .14 });
def('whoosh2', { wave: 'noise', freq: 600, to: 2400, dur: .35, vol: .2 }); def('thunk', [{ wave: 'sine', freq: 180, to: 60, dur: .14, vol: .4 }, { wave: 'noise', freq: 800, to: 200, dur: .1, vol: .2, filter: 'lowpass' }]);
def('scrape', { wave: 'noise', freq: 2600, dur: .25, vol: .18, filter: 'bandpass', q: 3 }); def('squealspin', { wave: 'triangle', freq: 1400, to: 600, dur: .9, vol: .12, vib: [18, .05] });
def('splash', [{ wave: 'noise', freq: 1200, to: 300, dur: .6, vol: .35, filter: 'lowpass' }, { wave: 'noise', freq: 4000, dur: .3, vol: .12, filter: 'highpass', delay: .05 }]);
def('tick2', { wave: 'square', freq: 1500, dur: .03, vol: .1 }); def('backfire', [{ wave: 'noise', freq: 400, dur: .06, vol: .3, filter: 'lowpass' }, { wave: 'noise', freq: 300, dur: .05, vol: .25, filter: 'lowpass', delay: .08 }]);
def('shiftchuff', { wave: 'noise', freq: 900, to: 400, dur: .06, vol: .12, filter: 'bandpass' }); def('plant', [{ wave: 'sine', freq: 300, to: 600, dur: .08, vol: .25 }, { wave: 'triangle', freq: 1046, arp: [0, 4, 7, 12, 16], step: .05, dur: .4, vol: .12, delay: .1 }]);
def('static', { wave: 'noise', freq: 3000, dur: .3, vol: .12, filter: 'bandpass', q: .7 }); def('thump', { wave: 'sine', freq: 90, to: 40, dur: .25, vol: .4 });
def('crackle', [{ wave: 'noise', freq: 5000, dur: .05, vol: .14, filter: 'highpass' }, { wave: 'noise', freq: 5000, dur: .05, vol: .12, filter: 'highpass', delay: .08 }, { wave: 'noise', freq: 4000, dur: .05, vol: .1, filter: 'highpass', delay: .17 }, { wave: 'noise', freq: 4500, dur: .05, vol: .1, filter: 'highpass', delay: .26 }]);
def('cheer', [{ wave: 'noise', freq: 1200, dur: 1.2, vol: .22, filter: 'bandpass', q: .6 }, { wave: 'noise', freq: 2400, dur: .9, vol: .14, filter: 'bandpass', q: .8, delay: .15 }]);
def('gull', { wave: 'triangle', freq: 1400, to: 900, dur: .25, vol: .05, vib: [12, .06] }); def('chirp', { wave: 'sine', freq: 3200, to: 4200, dur: .06, vol: .05, arp: [0, 5, 0], step: .03 });
def('rising', { wave: 'sine', freq: 784, arp: [0, 4, 7, 12, 16], step: .06, dur: .45, vol: .16 }); def('deflate', { wave: 'saw', freq: 392, to: 196, dur: .7, vol: .12, vib: [6, .03] });
/** a sound effect: an engine voice by name, at a volume (effects at 60 % in the attract mode) */
OB.sfx = (name, o = {}) => { if (!name) return; const v = (o.vol === undefined ? 1 : o.vol) * (OB.Attract && OB.Attract.on ? .6 : 1); try { A.sfx(name, Object.assign({}, o, { vol: v })); } catch (e) { /* no sound */ } };
OB.horn = car => { const base = { primavera: 520, orchidea: 440, gardenia: 494, magnolia: 392, girasole: 587 }[car] || 440; OB.sfx([{ wave: 'square', freq: base, dur: .35, vol: .1 }, { wave: 'square', freq: base * 1.26, dur: .35, vol: .08 }]); };

/* ---- the race's continuous sounds: the engine note, tyres, wind, gravel; ambience per kit ---- */
const AMB = { beach: ['waves', 'gulls'], fields: ['birds'], sunfields: ['birds', 'cicadas'], cliffs: ['waves', 'gulls'], lake: ['birds'], canyon: ['cicadas'], alpine: ['birds', 'breeze'], town: ['hum'], vineyard: ['cicadas'], lagoon: ['waves'], jungle: ['birds', 'cicadas'], nightcity: ['hum'], nightdesert: ['breeze'], highlands: ['breeze'] };
const Audio = OB.Audio = { loops: {}, race: null, ambT: 0, kit: null };
Audio.boot = () => {};
Audio.music = name => { const s = OB.THEMES[name]; if (!s) return; if (A.song && A.song.src === s) return; A.music(s, { fade: .6 }); };
Audio.loop = (key, spec) => { if (Audio.loops[key] && !Audio.loops[key].dead) return Audio.loops[key]; return (Audio.loops[key] = A.loop(spec)); };
Audio.stopLoops = (fade = .3) => { for (const k in Audio.loops) { Audio.loops[k].stop(fade); } Audio.loops = {}; };
Audio.raceStart = race => {
  Audio.race = race; Audio.stopLoops(.05); Audio.kit = null; A.loops(true);
  if (race.cfg.mode !== 'hub' && race.cfg.mode !== 'attract' && race.cfg.mode !== 'demo') OB.Radio && OB.Radio.play(race.cfg.station || 0);
  if (race.cfg.mode === 'attract') OB.Radio && OB.Radio.play(race.cfg.station || 0);
  if (race.cfg.mode === 'hub') OB.Radio && OB.Radio.play(0);
};
Audio.raceEnd = () => { Audio.stopLoops(.4); Audio.race = null; A.reverb(.15, .3); A.musicLevel && A.musicLevel(1, .3); };
Audio.raceStep = (race, dt) => {
  if (!A.ctx || OB.env.headless) return;
  race.players.forEach((d, i) => {
    const car = d.car, cyl = car.spec.cyl || 8, f = Math.max(25, car.rpm / 60 * cyl / 2) * (car.spec.hybrid ? 1 : 1), gas = d.lastIntent ? clamp(d.lastIntent.gas || 0, 0, 1) : 0, k = race.players.length > 1 ? .7 : 1;
    const eng = Audio.loop('eng' + i, { waves: [{ wave: 'saw', mul: 1, vol: .55 }, { wave: 'saw', mul: 2, vol: .25, detune: 6 }, { wave: 'square', mul: .5, vol: .35 }].concat(car.spec.hybrid ? [{ wave: 'sine', mul: 6, vol: .08 }] : []), freq: f, vol: 0, f: 800, q: 1.2, shape: 2.2 });
    eng.set({ freq: f, f: 500 + gas * 2600 + car.spec.tone * .5, vol: (.07 + gas * .06) * k * (race.phase === 'done' ? 0 : 1) }, .04);
    const sq = Audio.loop('squeal' + i, { waves: [{ wave: 'triangle', mul: 1 }, { wave: 'triangle', mul: 1.31, vol: .7 }], freq: 1150, vol: 0, f: 3000, am: [23, .5] });
    const sk = car.drift.on ? Math.abs(car.drift.a) * 1.4 : car.skid; sq.set({ vol: clamp(sk, 0, 1) * .05 * k, freq: 1000 + Math.abs(car.drift.a) * 500 }, .05);
    const wind = Audio.loop('wind' + i, { waves: [{ wave: 'noise' }], vol: 0, filter: 'bandpass', f: 800, q: .6 });
    wind.set({ vol: Math.pow(car.v / 300, 2) * .06 * (1 - car.slip * .6) * k, f: 500 + car.v * 4 }, .1);
    const grav = Audio.loop('grav' + i, { waves: [{ wave: 'noise' }], vol: 0, filter: 'lowpass', f: 600 });
    grav.set({ vol: car.offroad && car.v > 20 ? .07 * k : 0 }, .08);
  });
  // ambience: the kit's loops, crossfading at a stage change; tunnels raise the reverb
  const d = race.p1, kit = OB.STAGES[d.stage].kit;
  if (kit !== Audio.kit) {
    for (const k of ['waves', 'cicadas', 'hum', 'breeze']) if (Audio.loops['amb_' + k]) { Audio.loops['amb_' + k].stop(1.2); delete Audio.loops['amb_' + k]; }
    Audio.kit = kit;
    for (const a of AMB[kit] || []) {
      if (a === 'waves') Audio.loop('amb_waves', { waves: [{ wave: 'noise' }], vol: .035, filter: 'lowpass', f: 500, am: [.18, .7] });
      if (a === 'cicadas') Audio.loop('amb_cicadas', { waves: [{ wave: 'noise' }], vol: .012, filter: 'bandpass', f: 6200, q: 4, am: [32, .6] });
      if (a === 'hum') Audio.loop('amb_hum', { waves: [{ wave: 'noise' }, { wave: 'sine', mul: 1, vol: .3 }], freq: 60, vol: .02, filter: 'lowpass', f: 300 });
      if (a === 'breeze') Audio.loop('amb_breeze', { waves: [{ wave: 'noise' }], vol: .02, filter: 'bandpass', f: 400, q: .5, am: [.25, .6] });
    }
  }
  Audio.ambT -= dt;
  if (Audio.ambT <= 0) { Audio.ambT = 2 + OB.FX.rnd() * 4; const am = AMB[kit] || []; if (am.includes('gulls')) OB.sfx('gull', { vol: .8 }); if (am.includes('birds')) OB.sfx('chirp', { vol: .7 }); }
  Audio.iceT = (Audio.iceT || 0) - dt;
  if (Audio.iceT <= 0) { const ice = race.traffic.of(d.stage).find(v => v.type === 'icecream' && Math.abs(v.z - d.car.z) < 3000); if (ice) { Audio.iceT = 4; OB.sfx([{ wave: 'triangle', freq: 'E6', arp: [0, 4, 7, 12, 7, 4, 0], step: .12, dur: .84, vol: .05 }]); } }
  const tun = d.road.seg(d.car.z).tunnel; if (tun !== Audio.tun) { Audio.tun = tun; A.reverb(tun ? .6 : .15, .4); }
};
/* ---- the race's events, heard ---- */
OB.bus.on('*', (e, name) => {
  const race = Audio.race; if (!race || !A.ctx) return;
  const mine = e && e.car && race.players.some(p => p.id === e.car);
  switch (name) {
    case 'countdown': OB.sfx(e.n ? 'beep' : 'gobeep'); if (!e.n) OB.Babble && OB.Babble.say('GO!', 'announcer', 'excited'); break;
    case 'checkpoint': if (mine) { A.sting(OB.JINGLES.checkpoint, { duck: .5 }); OB.sfx('whoosh2'); OB.Babble && OB.Babble.say('TIME EXTENDED!', 'announcer', 'excited'); } break;
    case 'time:low': break;
    case 'nearmiss': if (mine) OB.sfx('zing'); break;
    case 'slingshot': if (mine) OB.sfx('whoosh2', { pitch: 1.3 }); break;
    case 'car:bump': if (mine) OB.sfx('thunk'); break;
    case 'car:crash': if (mine) { OB.sfx('thunk'); OB.sfx('squealspin'); game.shake(4); game.input.rumble && game.input.rumble(.6, .3); } break;
    case 'car:scrape': if (mine) OB.sfx('scrape'); break;
    case 'car:backfire': if (mine) OB.sfx('backfire'); break;
    case 'car:shift': if (mine && !e.auto) OB.sfx('shiftchuff'); break;
    case 'air:land': if (mine) { OB.sfx('thump', { vol: e.hard ? 1 : .6 }); if (e.hard) game.shake(2); } break;
    case 'start:perfect': if (mine) { OB.sfx('rising'); OB.Babble && OB.Babble.say('PERFECT START!', 'announcer', 'excited'); } break;
    case 'bloom:level': if (mine && e.n >= 5 && e.up) { A.sting(OB.JINGLES.fullbloom, { duck: .6 }); A.layer && A.song && A.layer('sparkle', 1, 1.5); OB.Babble && OB.Babble.say('FULL BLOOM!', 'announcer', 'excited'); } if (mine && e.n < 5 && A.song) A.layer('sparkle', 0, 1.5); break;
    case 'goal': if (mine) { A.sting(OB.JINGLES.goal, { duck: .3 }); OB.sfx('cheer'); OB.Babble && OB.Babble.say('GOAL!', 'announcer', 'excited'); } break;
    case 'time:up': A.stopMusic(1.2); A.sting(OB.JINGLES.gameover, { duck: 0 }); break;
    case 'req:start': if (mine) A.sting(OB.JINGLES.request, { duck: .7 }); break;
    case 'req:end': if (mine) A.sting(e.rating === 'Miss' ? OB.JINGLES.fail : OB.JINGLES.success, { duck: .6 }); break;
    case 'obj:sting': OB.sfx('sting'); break; case 'obj:snap': OB.sfx('snap'); break; case 'obj:cone': OB.sfx('tok'); break;
    case 'horn': if (mine) OB.horn(race.drivers.find(q => q.id === e.car).carId); break;
    case 'fork:approach': if (mine) A.sting(OB.JINGLES.forktick, { duck: .8 }); break;
    case 'gust': if (mine) OB.sfx('whoosh2', { pitch: .7 }); break;
  }
});
})();
