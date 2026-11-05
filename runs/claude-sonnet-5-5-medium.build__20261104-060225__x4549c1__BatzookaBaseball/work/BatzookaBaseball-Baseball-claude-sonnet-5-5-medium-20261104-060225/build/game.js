(() => {
'use strict';
/* ===== 00-core.js ===== */
/* BATZOOKA BASEBALL: core. Namespace, tuning values (the dev sliders), the event bus, seeded streams, sounds,
   songs and the Animalese-style babble voice. Everything else adds to BZ. */
const E = My3D2dge, { px, clamp, lerp, TAU } = E;
const BZ = window.BZ = { version: '1.0', title: 'BATZOOKA BASEBALL', cosmetic: true };
const PI = Math.PI;

/* ---- tuning: every balance number lives here and is read each time it is used, so the dev sliders act at once ---- */
BZ.TUNE_META = {
  pitchSpeed: ['Pitch speed', 'Pitching', .5, 1.8, .05, 1],
  breaking: ['Break on curves', 'Pitching', 0, 2, .05, 1],
  batWindow: ['Swing timing window', 'Batting', .4, 2.5, .05, 1],
  sweet: ['Sweet spot size', 'Batting', .3, 1.4, .02, .62],
  exitPower: ['Hit power', 'Batting', .5, 1.6, .02, 1],
  batzookaPower: ['Batzooka blast', 'Batting', 1, 2.5, .05, 1.55],
  gravity: ['Ball gravity', 'Ball', 120, 520, 10, 260],
  fence: ['Fence distance', 'Ball', .6, 1.4, .02, 1],
  fielderSpeed: ['Fielder speed', 'Field', 50, 180, 2, 98],
  throwSpeed: ['Throw speed', 'Field', 160, 700, 10, 360],
  throwError: ['Throw wildness', 'Field', 0, 3, .05, 1],
  runnerSpeed: ['Runner speed', 'Running', 40, 140, 2, 74],
  turboBoost: ['Turbo boost', 'Running', 1, 1.8, .02, 1.28],
  meterGain: ['Batzooka meter gain', 'Batzooka', .2, 4, .05, 1],
  cpuSkill: ['CPU skill', 'CPU', 0, 1, .02, .5],
  cpuThinks: ['CPU throw delay', 'CPU', .1, 1.5, .05, .45],
  mercy: ['Mercy rule runs', 'Rules', 3, 20, 1, 10]
};
BZ.TUNE = {};
BZ.resetTune = () => { for (const k in BZ.TUNE_META) BZ.TUNE[k] = BZ.TUNE_META[k][5]; };
BZ.resetTune();
const TUNE = BZ.TUNE;

/* ---- the event bus: every outcome is an event; commentary, crowd, audio, HUD, meter, hub and tests listen ---- */
BZ.listeners = {}; BZ.log = [];
BZ.on = (ev, fn) => { (BZ.listeners[ev] = BZ.listeners[ev] || []).push(fn); return () => BZ.off(ev, fn); };
BZ.off = (ev, fn) => { const a = BZ.listeners[ev]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } };
BZ.emit = (ev, data = {}) => {
  BZ.log.push(ev); if (BZ.log.length > 200) BZ.log.shift();
  for (const fn of (BZ.listeners[ev] || []).slice()) { try { fn(data, ev); } catch (e) { if (window.My3D2dge && My3D2dge.current) My3D2dge.current.fail('event ' + ev, e); else throw e; } }
  for (const fn of (BZ.listeners['*'] || []).slice()) { try { fn(data, ev); } catch (e) { /* listeners must not break play */ } }
};
BZ.clearListeners = () => { BZ.listeners = {}; };

/* ---- seeded streams: gameplay randomness never calls Math.random ---- */
BZ.rng = { play: E.rng(1), fx: E.rng(99), deal: E.rng(7) };
BZ.seed = s => { BZ.rng.play = E.rng(s >>> 0 || 1); BZ.rng.deal = E.rng((s * 7 + 13) >>> 0); };
const rnd = () => BZ.rng.play(), rfx = () => BZ.rng.fx();
const rr = (a, b) => a + (b - a) * rnd();
const pickOf = (list, r = rnd) => list[Math.floor(r() * list.length) % list.length];
BZ.feet = u => Math.round(u * .32);
BZ.mph = u => Math.round(u * .26);
const sgn = v => v < 0 ? -1 : 1;
const hyp = Math.hypot;

/* ---- registries: content is data ---- */
BZ.reg = { teams: {}, parks: {}, lessons: {}, songs: {}, lines: {} };
BZ.def = (kind, id, spec) => { (BZ.reg[kind] = BZ.reg[kind] || {})[id] = Object.assign({ id }, spec); return BZ.reg[kind][id]; };
BZ.get = (kind, id) => BZ.reg[kind] && BZ.reg[kind][id];

/* ---- sound: the engine's chip synth only ---- */
BZ.sound = {
  bat: { wave: 'noise', freq: 1400, to: 300, dur: .09, vol: .5, filter: 'lowpass' },
  crack: { wave: 'square', freq: 220, to: 60, dur: .1, vol: .35 },
  mitt: { wave: 'noise', freq: 700, to: 200, dur: .07, vol: .4, filter: 'lowpass' },
  whiff: { wave: 'noise', freq: 600, to: 1500, dur: .14, vol: .22, filter: 'highpass' },
  pitch: { wave: 'saw', freq: 500, to: 180, dur: .22, vol: .12 },
  fire: { wave: 'saw', freq: 200, to: 900, dur: .4, vol: .2, vib: [20, .1] },
  rocket: { wave: 'saw', freq: 120, to: 1400, dur: .6, vol: .3 },
  boom: { wave: 'noise', freq: 300, to: 40, dur: .6, vol: .5, filter: 'lowpass' },
  strike: { wave: 'square', freq: 440, to: 330, dur: .12, vol: .2 },
  ball: { wave: 'triangle', freq: 330, to: 440, dur: .1, vol: .2 },
  out: { wave: 'square', freq: 523, to: 262, dur: .25, vol: .22 },
  safe: { wave: 'triangle', freq: 392, to: 784, dur: .22, vol: .25 },
  step: { wave: 'noise', freq: 400, to: 200, dur: .04, vol: .1, filter: 'lowpass' },
  slide: { wave: 'noise', freq: 800, to: 150, dur: .35, vol: .3, filter: 'lowpass' },
  throw: { wave: 'noise', freq: 900, to: 500, dur: .12, vol: .2, filter: 'highpass' },
  crowd: { wave: 'noise', freq: 500, to: 900, dur: 1.2, vol: .2, filter: 'lowpass' },
  groan: { wave: 'saw', freq: 220, to: 110, dur: .8, vol: .12, vib: [6, .08] },
  horn: { wave: 'square', freq: 311, to: 311, dur: .5, vol: .2, vib: [5, .02] },
  organ: { wave: 'pulse', freq: 392, dur: .15, vol: .15 },
  punch: { wave: 'noise', freq: 300, to: 100, dur: .1, vol: .4, filter: 'lowpass' },
  firework: { wave: 'noise', freq: 2000, to: 200, dur: .5, vol: .3, filter: 'highpass' },
  coin: { wave: 'square', freq: 988, to: 1319, dur: .18, vol: .2 },
  tick: { wave: 'square', freq: 1200, dur: .03, vol: .12 }
};
BZ.initAudio = game => { for (const k in BZ.sound) game.audio.define('bz_' + k, BZ.sound[k]); };
BZ.sfx = (name, o) => { const g = My3D2dge.current; if (g && g.audio) g.audio.sfx('bz_' + name, o); };

/* original songs (chip music with named layers) */
BZ.songs = {
  title: { bpm: 132, steps: 4, tracks: [
    { name: 'organ', wave: 'pulse', vol: .09, notes: 'C5 . E5 . G5 . E5 . | C5 . E5 . G5 - C6 - | B4 . D5 . G5 . D5 . | B4 . D5 . G5 - B5 - | A4 . C5 . F5 . C5 . | A4 . C5 . F5 - A5 - | G4 . B4 . D5 . G5 . | G5 - F5 - E5 - D5 -' },
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'C3 . G2 . C3 . G2 . | C3 . G2 . C3 . E3 . | G2 . D3 . G2 . D3 . | G2 . D3 . G2 . B2 . | F2 . C3 . F2 . C3 . | F2 . C3 . F2 . A2 . | G2 . D3 . G2 . D3 . | G2 . D3 . G2 . G2 .' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . h . s . h k | k . h . s . h h | k . h . s . h k | k . h . s h s s' }
  ] },
  play: { bpm: 112, steps: 4, tracks: [
    { name: 'organ', wave: 'pulse', vol: .075, notes: 'G4 . . G4 C5 . . . | E5 . . D5 C5 . . . | A4 . . A4 D5 . . . | F5 . . E5 D5 . . . | G4 . . G4 C5 . . . | E5 . E5 G5 . . . . | F5 . . D5 B4 . . . | C5 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'C3 . . . G2 . . . | C3 . . . G2 . . . | D3 . . . A2 . . . | D3 . . . A2 . . . | C3 . . . G2 . . . | C3 . . . E3 . . . | F2 . . . G2 . . . | C3 . G2 . C3 . . .' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . . . s . . . | k . . h s . . .' }
  ] },
  tense: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .06, notes: 'E4 . E4 . G4 . E4 . | D4 . D4 . F4 . D4 . | C4 . C4 . E4 . C4 . | B3 . D4 . G4 - - .' },
    { name: 'bass', wave: 'triangle', vol: .25, notes: 'E2 . E2 . E2 . E2 . | D2 . D2 . D2 . D2 . | C2 . C2 . C2 . C2 . | G2 . G2 . G2 . G2 .' },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . h . s . h . | k . h . s . h s' }
  ] },
  moon: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'sine', vol: .12, notes: 'E5 - - . B4 - - . | G5 - - . E5 - - . | D5 - - . A4 - - . | F#5 - - . D5 - - .' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'E2 - - - - - - - | C3 - - - - - - - | D2 - - - - - - - | B2 - - - - - - -' },
    { name: 'drums', wave: 'drums', vol: .05, notes: 'k . . . . . h . | . . . . s . . .' }
  ] },
  derby: { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .06, notes: 'C5 E5 G5 E5 C5 E5 G5 E5 | D5 F5 A5 F5 D5 F5 A5 F5 | E5 G5 B5 G5 E5 G5 B5 G5 | G5 B5 D6 B5 G5 B5 D6 B5' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: 'C3 . C3 . C3 . C3 . | D3 . D3 . D3 . D3 . | E3 . E3 . E3 . E3 . | G3 . G3 . G3 . G3 .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h h s . h h | k . h h s . h s' }
  ] },
  rhubarb: { bpm: 170, steps: 4, tracks: [
    { name: 'lead', wave: 'saw', vol: .06, notes: 'A4 . A4 C5 A4 . G4 . | A4 . A4 C5 D5 . C5 . | A4 . A4 C5 A4 . G4 . | E4 G4 A4 C5 E5 - - .' },
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'A2 A2 . A2 A2 . A2 . | A2 A2 . A2 A2 . C3 . | A2 A2 . A2 A2 . A2 . | E2 E2 . E2 A2 . . .' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k h s h k h s s' }
  ] },
  victory: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .09, notes: 'C5 . E5 . G5 . C6 - | B5 . G5 . E5 . G5 - | A5 . F5 . C5 . F5 . | G5 - - - C6 - - -' },
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'C3 . C3 . E3 . G3 . | G2 . G2 . B2 . D3 . | F2 . F2 . A2 . C3 . | G2 . G2 . G2 . C3 -' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . s . k . s s' }
  ] }
};
BZ.music = (name, o) => { const g = My3D2dge.current; if (g && g.audio) g.audio.music(BZ.songs[name] || null, o); };
/* the stadium organ's charge call, a sting for rallies */
BZ.charge = () => {
  const g = My3D2dge.current; if (!g) return;
  const n = ['G4', 'C5', 'E5', 'G5', 'E5', 'G5'], d = [0, .14, .28, .42, .72, .86];
  n.forEach((f, i) => g.after(d[i], () => g.audio.sfx({ wave: 'pulse', freq: f, dur: i === 3 || i === 5 ? .36 : .12, vol: .16 })));
  g.after(1.1, () => g.audio.sfx('bz_horn'));
};

/* ---- the babble voice: Animalese-style gibberish, one blip per letter, pitch by speaker ---- */
BZ.babble = (text, pitch = 1, vol = .1) => {
  const g = My3D2dge.current; if (!g || !g.audio || !text) return;
  const letters = String(text).replace(/\{[^}]*\}/g, '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 14);
  let t = 0;
  for (let i = 0; i < letters.length; i++) {
    const c = letters.charCodeAt(i) - 97, f = (180 + (c * 37 % 160) + (i % 3) * 18) * pitch;
    g.after(t, () => g.audio.sfx({ wave: c % 5 === 0 ? 'square' : 'triangle', freq: f, to: f * (1 + ((c % 3) - 1) * .12), dur: .055, vol }));
    t += .055 + (c % 4) * .008;
  }
};

/* ---- small helpers ---- */
BZ.tween = (obj, to, s, o) => My3D2dge.current.tween(obj, to, s, o);
BZ.noop = () => {};
BZ.pad = (n, w = 2) => String(n).padStart(w, '0');
BZ.ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
BZ.fmtDist = u => BZ.feet(u) + ' ft';

/* ===== 10-data.js ===== */
/* BATZOOKA BASEBALL: content as data. Teams, parks, the Tour's story, Spring Training lessons, upgrades and the
   play-by-play line pools. Adding a team or a park is a data entry. */

/* player: [name, pos, bat, pow, spd, arm, hair, skin, handedness] stats 1..10 */
const mk = rows => rows.map(r => ({ name: r[0], pos: r[1], bat: r[2], pow: r[3], spd: r[4], arm: r[5], hair: r[6], skin: r[7], lefty: !!r[8], build: r[9] || 'chibi' }));
BZ.def('teams', 'hay', {
  name: 'HAYMAKERS', city: 'Cornfield', short: 'HAY', blurb: 'A barnstorming nine from a cornfield ballpark with a leaky roof and a big heart.',
  colors: { cloth: '#f2d544', pants: '#2f6b3a', boot: '#2a1c12', belt: '#2f6b3a', trim: '#2f6b3a', cap: '#2f6b3a' }, chip: '#f2d544', cap2: '#2f6b3a', hat: 'cap',
  players: mk([
    ['BUSTER', 'P', 5, 6, 4, 8, '#7a4a22', '#e8b890', 0, 'bulky'], ['MABEL', 'C', 6, 5, 3, 9, '#c8402a', '#f0c8a8', 0], ['ROOSTER', '1B', 5, 9, 2, 5, '#2a1a10', '#b07850', 1, 'bulky'],
    ['DOT', '2B', 8, 3, 8, 6, '#1a1a1e', '#e8b890', 0], ['LEFTY LOU', '3B', 6, 6, 5, 7, '#3a2a1a', '#f0c8a8', 1], ['PEPPER', 'SS', 9, 4, 9, 8, '#e8c060', '#8a5a38', 0],
    ['CLEM', 'LF', 7, 7, 6, 5, '#5a3a22', '#e8b890', 0], ['SKEETER', 'CF', 7, 5, 10, 7, '#d8a030', '#f0c8a8', 0], ['BIG ED', 'RF', 4, 10, 3, 9, '#2a2a2a', '#a06a44', 1, 'bulky']
  ])
});
BZ.def('teams', 'lem', {
  name: 'LUNAR LEMURS', city: 'Moon Dome', short: 'LEM', blurb: 'Low gravity, high hopes. They have never lost a game that was happening on the moon.',
  colors: { cloth: '#e8e8f8', pants: '#6a4ab8', boot: '#2a2040', belt: '#6a4ab8', trim: '#a888f0', cap: '#6a4ab8' }, chip: '#a888f0', cap2: '#6a4ab8', hat: 'visor',
  players: mk([
    ['ZIGGY', 'P', 6, 5, 5, 8, '#c8e8f8', '#d8d8f0'], ['NEBULA', 'C', 5, 6, 3, 9, '#a888f0', '#c8b8e0'], ['COMET', '1B', 6, 8, 3, 5, '#f0f0ff', '#b8c8e0', 1, 'bulky'],
    ['ORBIT', '2B', 8, 3, 8, 6, '#3a2a60', '#d8d8f0'], ['QUASAR', '3B', 6, 7, 5, 7, '#f08aa8', '#c8b8e0', 1], ['PULSAR', 'SS', 8, 4, 9, 8, '#40d0e0', '#d8d8f0'],
    ['LUNA', 'LF', 7, 6, 7, 5, '#e0e0ff', '#b8c8e0'], ['SOLAR', 'CF', 7, 5, 10, 7, '#ffd870', '#d8d8f0'], ['TITAN', 'RF', 5, 9, 4, 9, '#2a2060', '#a8b0d0', 1, 'bulky']
  ])
});
BZ.def('teams', 'cin', {
  name: 'CINDER SLUGGERS', city: 'Magma Meadows', short: 'CIN', blurb: 'They hit the ball so hard the ball needs a lawyer. Do not hold the bat. It is hot.',
  colors: { cloth: '#e8402a', pants: '#2a2020', boot: '#1a1010', belt: '#f2a030', trim: '#f2a030', cap: '#2a2020' }, chip: '#e8402a', cap2: '#2a2020', hat: 'cap',
  players: mk([
    ['EMBER', 'P', 6, 7, 5, 9, '#f08030', '#c88060'], ['SOOT', 'C', 5, 7, 3, 9, '#1a1a1a', '#8a5a40', 0, 'bulky'], ['MAGMA MAX', '1B', 5, 10, 2, 6, '#e04020', '#b07850', 1, 'bulky'],
    ['SPARK', '2B', 8, 4, 8, 6, '#ffb040', '#d8a080'], ['CINDY', '3B', 7, 7, 5, 7, '#2a1a1a', '#a06a44', 1], ['FLINT', 'SS', 8, 5, 9, 9, '#802010', '#c88060'],
    ['ASHLEY', 'LF', 7, 7, 6, 6, '#c0c0c0', '#e0b090'], ['BLAZE', 'CF', 8, 6, 10, 7, '#ff6020', '#d8a080'], ['VOLCANO VIC', 'RF', 5, 10, 3, 10, '#301010', '#8a5a40', 1, 'bulky']
  ])
});
BZ.def('teams', 'meg', {
  name: 'MEGAMAX MAVERICKS', city: 'MegaDome', short: 'MEG', blurb: 'Owned, operated and sponsored by Mortimer Megamax, who owns the ball, the bat and the word "fun".',
  colors: { cloth: '#303848', pants: '#c8a030', boot: '#101018', belt: '#c8a030', trim: '#e8c860', cap: '#c8a030' }, chip: '#c8a030', cap2: '#303848', hat: 'helmet',
  players: mk([
    ['UNIT 1', 'P', 8, 7, 6, 10, '#505870', '#c0c8d8'], ['UNIT 2', 'C', 7, 8, 4, 10, '#505870', '#c0c8d8', 0, 'bulky'], ['MR. BRUNT', '1B', 6, 10, 3, 7, '#101018', '#a0785a', 1, 'bulky'],
    ['SYNERGY', '2B', 9, 5, 9, 8, '#e8c860', '#e8b890'], ['DEBIT', '3B', 8, 8, 6, 8, '#303848', '#d8a080', 1], ['CREDIT', 'SS', 9, 6, 10, 9, '#303848', '#f0c8a8'],
    ['PROFIT', 'LF', 8, 8, 7, 7, '#c8a030', '#e8b890'], ['MARGIN', 'CF', 8, 6, 10, 8, '#7a8098', '#d8a080'], ['MORTIMER', 'RF', 7, 10, 4, 10, '#e0e0e0', '#f0c8a8', 1, 'bulky']
  ])
});

/* parks: fence control distances (LF line, LC gap, CF, RC gap, RF line), look, hazards */
BZ.def('parks', 'corn', {
  name: 'CORNFIELD PARK', sub: 'Home of the Haymakers. Seats 400. Smells like summer.', fence: [600, 740, 880, 740, 600], fenceH: 40, wallTop: '#9a6a3a', wallSide: '#7a4a2a',
  grass: [[70, 140, 52], [86, 160, 62]], dirt: [186, 130, 84], track: [150, 106, 70], backdrop: 'day', ambient: 1, lights: false, gravity: 1,
  outside: [188, 168, 70], stand: ['plank', '#8a5a30', '#a87848'], hazard: 'corn', crowd: ['#f2d544', '#2f6b3a', '#c84030', '#ffffff'], weather: 'leaves', song: 'play', lounge: 'a barn with a scoreboard stapled to it'
});
BZ.def('parks', 'moon', {
  name: 'MOON DOME', sub: 'Gravity: thoughtful. Fly balls hang around to chat.', fence: [640, 800, 960, 800, 640], fenceH: 44, wallTop: '#c8d0f0', wallSide: '#8890c0',
  grass: [[96, 96, 124], [108, 108, 140]], dirt: [150, 150, 176], track: [120, 120, 148], backdrop: 'space', ambient: .62, lights: true, gravity: .5,
  outside: [34, 30, 60], stand: ['stone', '#4a4a78', '#6a6aa0'], hazard: 'moon', crowd: ['#e8e8f8', '#a888f0', '#40d0e0', '#ffd870'], weather: null, song: 'moon', lounge: 'a crater with a hot dog stand'
});
BZ.def('parks', 'magma', {
  name: 'MAGMA MEADOWS', sub: 'Geysers of lava. Fans in oven mitts.', fence: [580, 720, 840, 720, 580], fenceH: 42, wallTop: '#4a3a3a', wallSide: '#2a1e1e',
  grass: [[78, 112, 50], [92, 128, 58]], dirt: [128, 78, 56], track: [92, 60, 48], backdrop: 'dusk', ambient: .72, lights: true, gravity: 1,
  outside: [120, 40, 22], stand: ['rock', '#3a2a28', '#5a403a'], hazard: 'magma', crowd: ['#e8402a', '#f2a030', '#2a2020', '#ffffff'], weather: 'ash', song: 'tense', lounge: 'the side of a volcano'
});
BZ.def('parks', 'mega', {
  name: 'MEGADOME', sub: 'A corporate stadium. The wall is 90 feet of synergy.', fence: [620, 760, 900, 760, 620], fenceH: 40, wallTop: '#e8c860', wallSide: '#303848', megaWall: true,
  grass: [[60, 128, 70], [70, 142, 80]], dirt: [150, 112, 88], track: [108, 84, 72], backdrop: 'city-night', ambient: .55, lights: true, gravity: 1,
  outside: [26, 28, 40], stand: ['stone', '#2a3040', '#404860'], hazard: 'mega', crowd: ['#c8a030', '#303848', '#e8e8e8', '#e03a4a'], weather: null, song: 'tense', lounge: 'a sky-box with a very expensive ficus'
});

/* the Tour: five stops would be the full game; the demo's slice is four games and a boss, each with scenes */
BZ.TOUR = [
  { park: 'corn', opp: 'cin', innings: 3, diff: .32, fan: 60, title: 'GAME 1: THE HOMESTAND',
    pre: [['BUSTER', 'Folks, the bank wants our cornfield by Friday. Thirty days. Zero dollars. One big idea.'], ['MABEL', 'The big idea is: we beat everybody. Starting with the Cinder Sluggers, whose bats are on fire. Literally.'], ['BUSTER', 'Fire is just hot enthusiasm. Play ball!']],
    post: [['MABEL', 'We won! The bank has been informed! The bank said "huh".'], ['BUSTER', 'A win is a win. Load the wagon. The moon has a ballpark and the moon has fans.']] },
  { park: 'moon', opp: 'lem', innings: 3, diff: .45, fan: 90, title: 'GAME 2: ONE SMALL STEP, ONE LARGE HOMER',
    pre: [['ZIGGY', 'Welcome to the Moon Dome! Mind the gravity. It is a little shy.'], ['PEPPER', 'The ball goes forever up here! Outfielders, climb the wall if you need to!'], ['ZIGGY', 'Also the hot dogs are freeze-dried. Play ball!']],
    post: [['ZIGGY', 'Wow. You hit it so far it is now in a different time zone.'], ['DOT', 'Next stop: Magma Meadows. They have a stadium on a volcano and a very relaxed safety department.']] },
  { park: 'magma', opp: 'cin', innings: 3, diff: .58, fan: 120, title: 'GAME 3: THE ROCKY ROAD TO MAGMA',
    pre: [['MAGMA MAX', 'Rematch! Last time you got lucky. This time the ground is lava. Same as always, but now on purpose.'], ['SKEETER', 'Watch the geysers! If the grass glows, move your feet!'], ['MAGMA MAX', 'Play ball, and may the best hot potato win!']],
    post: [['MAGMA MAX', 'Fine. Take your trophy. It is slightly melted. You can have it.'], ['BUSTER', 'One more stop. The MegaDome. Mortimer Megamax himself is waiting. And he brought lawyers.']] },
  { park: 'mega', opp: 'meg', innings: 3, diff: .72, fan: 250, boss: true, title: 'FINAL: THE MEGADOME',
    pre: [['MORTIMER', 'Ah, the Haymakers. Quaint. I own the stadium, the ball, the bat and the umpire. Do try to have fun.'], ['MABEL', 'Mister Megamax, you cannot own the umpire.'], ['MORTIMER', 'Read page 94 of the Standard Fun Agreement. Play ball.']],
    post: [['MORTIMER', 'I... lost? To a cornfield? That cannot be in the contract.'], ['BUSTER', 'It is, Mortimer. Page 95. It says, "if the little guys hit it over the wall, the little guys win."'], ['MABEL', 'The cornfield is saved. The bank is sending a fruit basket. It is mostly corn.']] }
];
BZ.UPGRADES = [
  { id: 'bat', name: 'ROCKET BAT POLISH', desc: 'Hit power +6% per level', cost: [40, 90, 160], max: 3 },
  { id: 'legs', name: 'TURBO BOOTS', desc: 'Runners and fielders +4% speed per level', cost: [40, 90, 160], max: 3 },
  { id: 'arm', name: 'LASER ARM TAPE', desc: 'Throws are faster and wilder less often', cost: [40, 90, 160], max: 3 },
  { id: 'meter', name: 'CROWD AMPLIFIER', desc: 'Batzooka meter charges 12% faster per level', cost: [50, 100, 180], max: 3 }
];

/* Spring Training: lessons are a setup, a hint and a goal event */
BZ.def('lessons', 1, { name: 'THE DUEL AT THE PLATE', hint: 'Line up the circle with the ball in the strike zone, then SWING as the ball crosses the plate.', goal: 'hit', need: 2, setup: { role: 'bat', outs: 0 }, done: 'You are a hitter now. The ball is afraid of you.' });
BZ.def('lessons', 2, { name: 'HEAT FROM THE MOUND', hint: 'Pick a pitch and a spot, THROW, then steer the ball in flight. Strike out the batter.', goal: 'strikeout', need: 1, setup: { role: 'pitch', outs: 0 }, done: 'Three strikes! Somewhere, a bat is crying.' });
BZ.def('lessons', 3, { name: 'GLOVES AND ARMS', hint: 'Chase the ball with the stick. Catch it, then throw to a base with the diamond buttons.', goal: 'out', need: 1, setup: { role: 'field', outs: 0, forceHit: 'grounder' }, done: 'Out! Your arm is a rumour that turned out true.' });
BZ.def('lessons', 4, { name: 'THE BASEPATHS', hint: 'Send runners forward, hold them back, hold TURBO and slide. Score a run.', goal: 'run', need: 1, setup: { role: 'run', outs: 0, runners: [1] }, done: 'Safe! The dirt on your jersey is a badge.' });
BZ.def('lessons', 5, { name: 'FIRE THE BATZOOKA', hint: 'The meter is full. Hit the POWER button while you swing for a rocket-powered blast.', goal: 'batzooka', need: 1, setup: { role: 'bat', outs: 0, meter: 100 }, done: 'KABOOM! The ball has left the building and the building is concerned.' });

/* play-by-play: Tex and Dusty, two old radio hands. {b} = batter, {p} = pitcher, {f} = fielder, {d} = distance */
BZ.lines = {
  start: ['Good evening, baseball fans, and a hello to anyone who is also a hot dog!', 'Folks, the sun is out, the grass is green and the umpire is already lying about something.'],
  strike: ['Strike! Right down Broadway!', 'Strike, and the catcher\'s mitt says "thanks for the visit".', 'That one had more heat than a skillet at a family reunion.'],
  ball: ['Ball. High and wide, like a duck with ambitions.', 'Ball! The umpire says "no thank you".', 'Outside. That pitch is still looking for the plate.'],
  whiff: ['Swing and a miss! He cut the air in two.', 'He missed it by a country mile and a state fair.', 'Swung so hard he screwed himself into the ground.'],
  foul: ['Foul ball! Some lucky kid just got a free lesson in ducking.', 'Back it goes, into the cheap seats.', 'Foul! Gets a piece of it, and then a little more of the grandstand.'],
  single: ['A base hit! Falls in like a good rumour!', 'Single! Ropes it through the gap.', 'That one found grass and made friends.'],
  double: ['A double! Slides in with dust on his dust!', 'Two bags! He\'s standing on second like it\'s a stage.'],
  triple: ['A triple! Legs like a jackrabbit on a hot skillet!', 'Three bags! And a lung or two lost along the way.'],
  homer: ['IT IS GONE! Hit it so far it needs a passport!', 'Going, going, GONE! Somebody call the neighbours!', 'Back, back, back! That ball is somebody else\'s problem now!'],
  batzooka: ['BATZOOKA! The ball has been RELOCATED!', 'FIRE IN THE HOLE! The bat has opinions and the opinions are rockets!'],
  robbed: ['ROBBED! He climbed the wall like a cat chasing a pension!', 'He took it away! Home run, meet glove!'],
  out: ['And that\'s an out, ladies and gentlemen. Quiet as a church mouse.', 'Out! Sit down, son, you\'ve had a nice try.'],
  fly: ['A can of corn, and caught!', 'Easy fly ball, and the glove says thanks.'],
  grounder: ['Throws him out by a step! The crowd is on its feet!', 'Scooped and thrown. That is how you do it, kids.'],
  strikeout: ['STRUCK HIM OUT! The big fella is going back to the dugout to think about his choices.', 'Strike three! He\'s been sat down harder than a sofa.'],
  walk: ['Ball four! Take your base, son.', 'A walk. Sometimes patience pays in free real estate.'],
  steal: ['He\'s going! Stolen base! Quick as a rumour in a small town!', 'Safe at second! He stole it fair and square. Mostly square.'],
  doubleplay: ['Double play! Two for the price of one!', 'Around the horn! That is a double play, and you can tell your friends.'],
  run: ['And the run scores! Cash the check!', 'He crosses the plate! Pop the confetti cannons!'],
  rhubarb: ['Oh brother, here come the benches! RHUBARB!', 'The dugouts are emptying! Somebody get the good chairs!'],
  inning: ['Time for the seventh-inning stretch, which is happening early because I said so.', 'We will be right back after the next commercial for a different hot dog.'],
  end: ['And that is the ball game, friends! Drive safe, drive happy!', 'Final score in the books. Tell your mother we said hello.']
};

/* ===== 20-sim.js ===== */
/* BATZOOKA BASEBALL: the simulation. Pure logic, no drawing, no raw input: players act through "intents"
   (BZ.M.intent[side]), so the same sim runs for people, the CPU, tests and the attract mode.
   Coordinates: home plate is (0,0); x east; y negative toward center field; z up. 16 U = one tile. */
const G = BZ.G = {
  BASES: [[0, 0], [212, -212], [0, -424], [-212, -212]], MOUND: [0, -205], SEG: 300, HX: 896, HY: 1214,
  DEF: { P: [0, -200], C: [0, 18], '1B': [196, -232], '2B': [112, -330], '3B': [-196, -232], SS: [-112, -330], LF: [-360, -620], CF: [0, -720], RF: [360, -620] },
  POS: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],
  PITCHES: {
    fast: { name: 'FASTBALL', speed: 360, bx: 0, bz: 0, color: '#ffffff' },
    curve: { name: 'CURVEBALL', speed: 262, bx: .35, bz: -1.0, color: '#ffe08a' },
    slider: { name: 'SLIDER', speed: 305, bx: -1.0, bz: -.15, color: '#9ae0ff' },
    change: { name: 'CHANGE-UP', speed: 215, bx: 0, bz: -.4, color: '#c8ffb0' },
    fire: { name: 'FIREBALL', speed: 540, bx: 0, bz: .12, color: '#ff8a30' }
  },
  ORDER: ['fast', 'curve', 'slider', 'change']
};
const BASES = G.BASES;
const fenceCtl = () => BZ.M.parkDef.fence;
const catmull = (p0, p1, p2, p3, t) => .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const thetaOf = (x, y) => Math.atan2(x, -y);
BZ.fenceR = (th, park) => {
  const f = (park || BZ.M.parkDef).fence, a = clamp((th + PI / 4) / (PI / 2), 0, 1) * 4, i = Math.min(3, Math.floor(a)), t = a - i;
  const g = k => f[clamp(k, 0, 4)];
  return catmull(g(i - 1), g(i), g(i + 1), g(i + 2), t) * TUNE.fence;
};
BZ.fenceH = (th, park) => {
  const p = park || BZ.M.parkDef; let h = p.fenceH;
  if (p.megaWall) { const d = th * 180 / PI; if (d > -32 && d < 8) h = lerp(h, 92, clamp(Math.min(d + 32, 8 - d) / 6, 0, 1)); }
  return h;
};
const inFair = (x, y) => y < 0 && Math.abs(x) <= -y + .01;
BZ.inFair = inFair;
const dist2 = (a, b) => hyp(a.x - b.x, a.y - b.y);
const gravity = () => TUNE.gravity * BZ.M.parkDef.gravity;
const bpos = i => BASES[((i % 4) + 4) % 4];
const segPos = p => { // position on the basepath for pos 0..4
  const i = Math.floor(p), t = p - i, a = bpos(i), b = bpos(i + 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
};

/* ---------------- match construction ---------------- */
function makeActor(teamDef, i, side) {
  const p = teamDef.players[i];
  return { side, i, name: p.name, pos: p.pos, st: p, x: 0, y: 0, z: 0, vz: 0, facing: -PI / 2, anim: null, animT: 0, anim2: null, speedMul: 1, stun: 0, jump: 0, dive: 0, hasBall: false, tgtX: 0, tgtY: 0, duty: null, cool: 0, run: 0, lefty: p.lefty, cheer: 0, mood: null };
}
BZ.newMatch = (o = {}) => {
  const park = BZ.get('parks', o.park || 'corn'), seed = o.seed || ((Date.now() & 0xffff) + 1);
  BZ.seed(seed);
  const mkSide = (s, spec) => {
    const team = BZ.get('teams', spec.team);
    return { team, actors: team.players.map((_, i) => makeActor(team, i, s)), ctl: spec.ctl || null, human: !!spec.human, meter: spec.meter || 0, turbo: 1, up: spec.up || { bat: 0, legs: 0, arm: 0, meter: 0 }, order: 0,
      stat: { h: 0, hr: 0, k: 0, bb: 0, sb: 0, catches: 0, bz: 0, dp: 0, robs: 0 } };
  };
  const M = BZ.M = {
    seed, parkDef: park, mode: o.mode || 'game', innings: o.innings || 3, inn: 1, half: 0, outs: 0, balls: 0, strikes: 0, score: [0, 0], line: [[], []],
    sides: [mkSide(0, o.away || { team: 'hay' }), mkSide(1, o.home || { team: 'cin' })], intent: [{}, {}], phase: 'intro', t: 0, clock: 0, over: false, winner: -1, runners: [],
    ball: { state: 'none', x: 0, y: -205, z: 0, vx: 0, vy: 0, vz: 0, holder: null, trail: [], bounces: 0, landed: false, fair: null, fire: false, bz: false },
    pitch: null, sel: 0, aim: { u: 0, v: 0 }, cur: { u: 0, v: 0 }, sw: null, swCool: 0, bean: false, steal: false, pendingThrow: [-1, -1, 0, 0], diff: o.diff == null ? TUNE.cpuSkill : o.diff, lesson: o.lesson || null,
    batter: null, result: null, resultT: 0, rhubarb: null, playT: 0, calls: [], events: [], pop: [], shake: 0, atk: 0, derby: null, noBetween: !!o.noBetween, extra: o.extra || {}, hazards: [], lastHit: null, wind: 0, flash: null, hrCount: 0, bestDist: 0, attract: !!o.attract, fx: []
  };
  M.sides.forEach(s => s.actors.forEach(a => { a.x = 0; a.y = 40; }));
  if (o.lesson) BZ.applyLesson(o.lesson);
  BZ.setupHazards();
  BZ.startHalf(true);
  return M;
};
const off = () => BZ.M.sides[BZ.M.half], def = () => BZ.M.sides[1 - BZ.M.half];
BZ.off = off; BZ.def = def;
const fielderOf = (pos) => def().actors.find(a => a.pos === pos);
BZ.fielderOf = fielderOf;

BZ.startHalf = (first) => {
  const M = BZ.M; M.outs = 0; M.balls = 0; M.strikes = 0; M.runners = []; M.aim.u = 0; M.aim.v = 0;
  if (!M.line[M.half][M.inn - 1] && M.line[M.half][M.inn - 1] !== 0) M.line[M.half][M.inn - 1] = 0;
  for (const s of M.sides) for (const a of s.actors) { a.hasBall = false; a.anim = null; a.stun = 0; a.jump = 0; a.dive = 0; a.z = 0; a.vz = 0; a.mood = null; }
  const d = def();
  for (const a of d.actors) { const sp = G.DEF[a.pos]; a.x = sp[0]; a.y = sp[1]; a.facing = -PI / 2; a.tgtX = a.x; a.tgtY = a.y; }
  d.actors.find(a => a.pos === 'C').facing = -PI / 2;
  BZ.nextBatter(); M.phase = first ? 'intro' : 'between'; M.t = 0;
  M.ball.state = 'none'; M.ball.holder = null;
  if (M.mode === 'game') BZ.emit('half', { inn: M.inn, half: M.half });
};
BZ.nextBatter = () => {
  const M = BZ.M, o = off(), a = o.actors[o.order % 9];
  M.batter = a; a.x = a.lefty ? 20 : -20; a.y = -2; a.facing = -PI / 2; a.anim = null; a.hasBall = false;
  M.cur.u = 0; M.cur.v = 0; M.sw = null; M.swCool = 0; M.pitch = null; M.steal = false; M.bean = false;
  const p = def().actors.find(x => x.pos === 'P'); M.sel = 0;
  p.x = G.MOUND[0]; p.y = G.MOUND[1] + 6; p.facing = PI / 2; M.ball.state = 'none'; M.ball.holder = null;
  const c = def().actors.find(x => x.pos === 'C'); c.x = 0; c.y = 20; c.facing = -PI / 2;
  // runners stand on their bases
  for (const r of M.runners) { r.pos = Math.round(r.pos); [r.actor.x, r.actor.y] = segPos(r.pos); r.dir = 0; r.origin = r.pos; r.mustReturn = false; r.slide = 0; r.actor.facing = -PI / 2; }
};
const baseRunner = b => BZ.M.runners.find(r => r.state === 'run' && Math.round(r.pos) === b && Math.abs(r.pos - b) < .02);
BZ.baseRunner = baseRunner;
BZ.gain = (side, amt) => {
  const M = BZ.M, s = M.sides[side]; if (!s || M.mode === 'derby') return;
  const was = s.meter; s.meter = clamp(s.meter + amt * TUNE.meterGain * (1 + .12 * s.up.meter), 0, 100);
  if (was < 100 && s.meter >= 100) { BZ.emit('meterfull', { side }); }
};

/* ---------------- pitching ---------------- */
const pitcherSide = () => 1 - BZ.M.half, batterSide = () => BZ.M.half;
BZ.legalPitches = () => { const m = BZ.M, p = def(); return p.meter >= 100 ? G.ORDER.concat(['fire']) : G.ORDER; };
BZ.startWindup = (opt = {}) => {
  BZ.M.stealChecked = false;
  const M = BZ.M, d = def(), P = fielderOf('P'); if (M.phase !== 'setup') return;
  let type = opt.type || G.ORDER[M.sel % 4];
  if (opt.fire && d.meter >= 100) { type = 'fire'; d.meter = 0; BZ.emit('firepitch', { side: 1 - M.half }); BZ.sfx('fire'); }
  M.pitch = { type, aim: { u: opt.u == null ? M.aim.u : opt.u, v: opt.v == null ? M.aim.v : opt.v }, t: -.48, T: 0, aft: { u: 0, v: 0 }, released: false, hbp: !!opt.bean, final: null };
  M.bean = !!opt.bean; M.phase = 'windup'; M.t = 0; P.anim = 'pitch'; P.animT = 0;
  BZ.emit('windup', { type });
};
function releasePitch() {
  const M = BZ.M, p = M.pitch, P = fielderOf('P'), spec = G.PITCHES[p.type];
  const pitchStat = (P.st.pow * .4 + P.st.arm * .6) / 10;
  p.speed = spec.speed * TUNE.pitchSpeed * (.94 + pitchStat * .14);
  p.sx = P.x; p.sy = P.y - 8; p.sz = 26;
  p.T = (p.sy + 6) / p.speed * -1 * -1; p.T = (-6 - p.sy) * -1 / p.speed; p.T = Math.abs(p.sy + 6) / p.speed;
  // break: the ball seems to head to the aim, then breaks late to the final spot
  const dir = P.lefty ? -1 : 1, br = TUNE.breaking * (.7 + pitchStat * .6);
  p.brk = { u: spec.bx * dir * br * (M.batter.lefty ? -1 : 1), v: spec.bz * br };
  // wildness: low-control pitchers miss their spots a little
  const wild = (1 - pitchStat) * .22 * (P.side !== undefined ? 1 : 1);
  p.err = { u: (rnd() - .5) * wild * 2, v: (rnd() - .5) * wild * 2 };
  p.t = 0; p.released = true; M.phase = 'pitch'; M.t = 0; M.swCool = 0;
  M.ball.state = 'pitch'; M.ball.fire = p.type === 'fire'; M.ball.holder = null; M.ball.trail = []; M.ball.bounces = 0; M.ball.landed = false; M.ball.fair = null; M.ball.bz = false;
  P.anim = 'pitchrel'; P.animT = 0;
  BZ.sfx(p.type === 'fire' ? 'fire' : 'pitch');
  BZ.emit('pitch', { type: p.type, speed: p.speed, side: P.side });
}
BZ.pitchUV = (p, t) => { // where the ball is in the strike-zone frame at time t (s = t/T)
  const s = clamp(t / p.T, 0, 1.0), a = p.aim;
  // the pitcher aims where the pitch should CROSS; it heads for a spot offset by the break and bends late into the aim
  const fu = a.u + p.err.u + p.aft.u, fv = a.v + p.err.v + p.aft.v, hu = fu - p.brk.u, hv = fv - p.brk.v;
  return { u: hu * s + p.brk.u * s * s * s, v: hv * s + p.brk.v * s * s * s, fu, fv, s };
};
const zoneToWorld = (u, v) => [u * 9, 22 + v * 15];
BZ.zoneToWorld = zoneToWorld;
BZ.pitchPos = (p, t) => {
  const s = clamp(t / p.T, 0, 1.15), uv = BZ.pitchUV(p, t), w = zoneToWorld(uv.u, uv.v);
  // the ball travels from the release point to the plate, drawn in plate-relative coordinates
  const x = lerp(p.sx, w[0], s), y = lerp(p.sy, -6, s), z0 = lerp(p.sz, 22, s) + (w[1] - 22) * s * s;
  return [x, y, z0 + 0];
};

/* ---------------- batting ---------------- */
BZ.swingNow = (kind = 'normal') => {
  const M = BZ.M; if (M.swCool > 0 || M.sw) return false;
  if (M.phase !== 'pitch' && M.phase !== 'windup') return false;
  const o = off(); let k = kind;
  if (k === 'power') { if (o.meter >= 100) { k = 'bz'; o.meter = 0; M.ball.bz = false; BZ.emit('batzookaswing', { side: M.half }); BZ.sfx('rocket'); } else k = 'normal'; }
  M.sw = { kind: k, t0: M.phase === 'pitch' ? M.pitch.t : -999, start: M.clock, tc: M.phase === 'pitch' ? M.pitch.t + .085 : null };
  if (M.phase === 'windup') { M.sw.t0 = M.pitch.t; M.sw.tc = M.pitch.t + .085; }
  M.batter.anim = k === 'bunt' ? 'bunt' : 'swing'; M.batter.animT = 0; M.batter.swingKind = k;
  BZ.sfx('whiff');
  return true;
};
function resolvePlate() {
  const M = BZ.M, p = M.pitch, sw = M.sw, uv = BZ.pitchUV(p, p.T), bat = M.batter, bs = off();
  M.ball.state = 'catcher';
  const inZone = Math.abs(uv.fu) <= 1.0 && Math.abs(uv.fv) <= 1.0;
  p.final = { u: uv.fu, v: uv.fv, inZone };
  const hbp = M.bean || (Math.abs(uv.fu) > 1.5 && rnd() < .15);
  if (hbp && !sw) return plateResult('hbp');
  if (sw) {
    const k = sw.kind, win = (k === 'bz' ? .17 : k === 'bunt' ? .14 : .105) * TUNE.batWindow * (.9 + bat.st.bat * .025) * (p.type === 'fire' ? .78 : 1) * (1 + .06 * bs.up.bat * 0);
    const terr = (sw.tc || (p.T + 1)) - p.T;
    const cur = M.cur, du = cur.u - uv.fu, dv = cur.v - uv.fv, dd = hyp(du, dv * .9);
    const rad = TUNE.sweet * (k === 'bz' ? 2.4 : k === 'bunt' ? 1.4 : 1) * (.85 + bat.st.bat * .03);
    if (Math.abs(terr) <= win && dd <= rad) return makeContact(k, terr, win, du, dv, dd, rad, uv);
    // swung but missed: strike (or a foul tip when nearly there)
    if (Math.abs(terr) <= win * 1.35 && dd <= rad * 1.5 && k !== 'bunt' && rnd() < .5) return plateResult('foul', { tip: true });
    return plateResult('whiff');
  }
  return plateResult(inZone ? 'called' : 'ball');
}
function makeContact(kind, terr, win, du, dv, dd, rad, uv) {
  const M = BZ.M, b = M.ball, bat = M.batter, bs = off(), e = clamp(-terr / win, -1, 1) /* + = early */;
  const qT = 1 - Math.abs(terr) / win, qZ = 1 - dd / rad, Q = clamp(.52 * qT + .48 * qZ + (qT > .8 && qZ > .6 ? .12 : 0), 0, 1);
  const pw = .78 + bat.st.pow * .042;
  let v, ph, th;
  const pull = bat.lefty ? 1 : -1;
  if (kind === 'bunt') { v = 38 + 62 * (1 - Math.abs(e)) + rr(0, 14); ph = rr(-3, 9) * PI / 180; th = (du * 22 + e * -10 * pull) * PI / 180; }
  else {
    v = (95 + 330 * Math.pow(Q, 1.2)) * pw * TUNE.exitPower * (1 + .06 * bs.up.bat);
    if (kind === 'bz') v = Math.max(v, 330) * TUNE.batzookaPower * (.9 + Q * .3) ;
    ph = (13 + (-dv) * -38 + rr(-4, 4)) * PI / 180;   // cursor below the ball center lifts it; above it tops it
    ph = (14 + (uv.fv - M.cur.v) * 40 + rr(-9, 9) * (1.3 - Q)) * PI / 180;
    if (kind === 'bz') ph = clamp(ph, 16 * PI / 180, 30 * PI / 180);
    th = (pull * e * 44 + (M.cur.u - uv.fu) * -16 + rr(-9, 9) * (1.4 - Q)) * PI / 180;
    if (kind === 'bz') th = clamp(th, -40 * PI / 180, 40 * PI / 180);
    if (Q < .22) { v *= .6; th += rr(-.3, .3); }
  }
  if (M.lessonSpec && M.lessonSpec.setup.forceHit === 'grounder') { ph = rr(-7, 2) * PI / 180; v = rr(200, 270); th = rr(-26, 26) * PI / 180; }
  ph = clamp(ph, -16 * PI / 180, 74 * PI / 180);
  b.x = 0; b.y = -4; b.z = zoneToWorld(uv.fu, uv.fv)[1]; const sp = Math.cos(ph) * v;
  b.vx = Math.sin(th) * sp; b.vy = -Math.cos(th) * sp; b.vz = Math.sin(ph) * v;
  b.state = 'hit'; b.holder = null; b.bounces = 0; b.landed = false; b.fair = null; b.bz = kind === 'bz'; b.fire = kind === 'bz'; b.trail = []; b.hitT = 0; b.peak = 0; b.thetaHit = th; b.wall = false;
  if (M.forceHomer && kind !== 'bunt') { M.forceHomer = false; v = 640; ph = 30 * PI / 180; th = rr(-.15, .15); b.vx = Math.sin(th) * Math.cos(ph) * v; b.vy = -Math.cos(th) * Math.cos(ph) * v; b.vz = Math.sin(ph) * v; }
  M.lastHit = { v, ph, th, Q, kind, e };
  M.playT = 0; M.t = 0; M.phase = 'play'; M.quality = Q;
  BZ.emit('contact', { kind, Q, v, ph, th, bunt: kind === 'bunt', side: M.half, e });
  if (M.lesson && kind === 'bz') BZ.lessonEvent('batzooka');
  BZ.sfx(kind === 'bz' ? 'boom' : 'bat'); BZ.sfx('crack');
  M.shake = Math.max(M.shake, .25 + Q * (kind === 'bz' ? 1.2 : .6));
  startPlay();
}
function plateResult(r, o = {}) {
  const M = BZ.M; M.result = r; M.resultT = 0; M.phase = 'call'; M.t = 0;
  const bs = off(), ds = def();
  const cd = BZ.derby && M.mode === 'derby';
  if (r === 'called') { M.strikes++; BZ.emit('strike', { called: true }); BZ.sfx('strike'); }
  else if (r === 'whiff') { M.strikes++; BZ.emit('whiff', {}); BZ.emit('strike', { swing: true }); BZ.sfx('whiff'); }
  else if (r === 'ball') { M.balls++; BZ.emit('ball', {}); BZ.sfx('ball'); }
  else if (r === 'foul') { if (M.strikes < 2) M.strikes++; BZ.emit('foul', { tip: true }); BZ.sfx('strike'); }
  else if (r === 'hbp') { BZ.emit('hbp', { bean: M.bean }); }
  M.batter.anim = M.batter.anim === 'swing' || M.batter.anim === 'bunt' ? M.batter.anim : null;
  if (M.mode === 'derby') { derbyPitchEnd(r); return; }
  if (M.strikes >= 3) { settleSteal(); return finishAtBat('strikeout'); }
  if (M.balls >= 4) { settleSteal(); return finishAtBat('walk'); }
  if (r === 'hbp') { settleSteal(); return finishAtBat('hbp'); }
  if (M.steal) startStealPlay();
}
function settleSteal() { const M = BZ.M, r = M.steal; if (!r) return; r.stealing = false; r.pos = r.origin + 1; r.origin = r.pos; r.dir = 0; [r.actor.x, r.actor.y] = segPos(r.pos); M.steal = false; }
function startStealPlay() {
  const M = BZ.M, C = fielderOf('C'), b = M.ball;
  M.phase = 'play'; M.playTime = 0; M.stealPlay = true; b.state = 'held'; b.holder = C; C.hasBall = true; C.holdT = 0; b.x = C.x; b.y = C.y; b.z = 14; b.vx = b.vy = b.vz = 0;
  M.batterRun = null; M.caught = false; M.foulDead = false; M.homer = false; M.decided = true; M.throwLog = []; M.manual = [null, null]; M.queued = [-1, -1]; M.primary = C; M.predT = 0; M.fielded = true; M.outsThisPlay = 0;
  for (const a of def().actors) { a.cool = 0; a.duty = null; a.stun = 0; a.jump = 0; a.dive = 0; a.sup = 0; if (a !== C) a.hasBall = false; }
  M.runners.forEach(q => { if (q !== M.steal) { q.origin = Math.round(q.pos); q.dir = 0; } q.mustReturn = false; });
  assignFielders();
}
function stealLogic(ib) {
  const M = BZ.M, o = off();
  if (o.human && o.ctl) { if (ib.steal && !M.steal) BZ.trySteal(); return; }
  if (!M.stealChecked && M.pitch && M.pitch.released) { M.stealChecked = true; if (!M.attract || rnd() < .5) if (rnd() < .035 + .08 * M.diff) BZ.trySteal(); }
  else if (!M.stealChecked && M.phase === 'windup') { M.stealChecked = true; if (rnd() < .03 + .08 * M.diff + (M.attract ? .08 : 0)) BZ.trySteal(); }
}
function finishAtBat(kind) {
  const M = BZ.M, bs = off(), ds = def();
  if (kind === 'strikeout') {
    M.outs++; ds.stat.k++; BZ.gain(1 - M.half, 14); BZ.emit('strikeout', { batter: M.batter, side: M.half }); if (M.lesson) BZ.lessonEvent('strikeout');
    M.batter.anim = 'sulk'; M.batter.animT = 0;
    return endAtBat(false);
  }
  if (kind === 'walk' || kind === 'hbp') {
    bs.stat.bb++; BZ.emit('walk', { batter: M.batter, hbp: kind === 'hbp' });
    if (kind === 'hbp' && M.bean) { startRhubarb(); return; }
    forceWalkRunners();
    return endAtBat(true);
  }
}
function forceWalkRunners() {
  const M = BZ.M, b = M.batter;
  // the batter takes first; runners forced ahead of him advance one base
  const at = n => M.runners.find(r => r.state === 'run' && Math.round(r.pos) === n);
  const r1 = at(1), r2 = at(2), r3 = at(3);
  if (r1 && r2 && r3) { scoreRunner(r3); }
  if (r1 && r2) { r2.pos = 3; if (!r3) { } }
  if (r1 && r2) r2.pos = 3;
  if (r1) r1.pos = 2;
  if (r1 && r2 && r3) { /* the run is already scored */ }
  addRunner(b, 1);
  M.runners.forEach(r => { if (r.state === 'run') { [r.actor.x, r.actor.y] = segPos(r.pos); r.dir = 0; } });
}
function addRunner(actor, pos) {
  const M = BZ.M, r = { actor, pos, origin: pos, dir: 0, state: 'run', mustReturn: false, slide: 0, speed: 1, isBat: false, crossed: false, rest: 0 };
  [actor.x, actor.y] = segPos(pos); M.runners.push(r); return r;
}
function scoreRunner(r) {
  const M = BZ.M; if (r.state !== 'run') return;
  r.state = 'score'; r.actor.mood = 'cheer'; const s = M.half;
  M.score[s]++; M.line[s][M.inn - 1] = (M.line[s][M.inn - 1] || 0) + 1;
  BZ.gain(s, 8); BZ.emit('run', { side: s, actor: r.actor, score: M.score.slice() });
  if (M.lesson) BZ.lessonEvent('run');
}
function endAtBat(batterToBase) {
  const M = BZ.M, bs = off();
  if (M.phase !== 'call' && M.phase !== 'play') M.phase = 'call';
  M.phase = 'resolve'; M.t = 0; M.advance = batterToBase;
  bs.order++;
}

/* ---------------- ball in play ---------------- */
function startPlay() {
  const M = BZ.M, bs = off(), b = M.batter;
  // batter becomes a runner (not for a foul: decided when it is)
  let r = null; if (M.mode !== 'derby') { r = addRunner(b, 0); r.isBat = true; r.pos = 0; r.dir = 1; r.origin = 0; r.state = 'run'; b.facing = Math.atan2(BASES[1][1], BASES[1][0]); }
  M.runners.forEach(q => { q.origin = Math.round(q.pos); q.dir = 0; q.mustReturn = false; });
  M.batterRun = r; M.hold = 0; M.caught = false; M.dead = false; M.foulDead = false; M.homer = false; M.decided = false; M.throwLog = [];
  for (const a of def().actors) { a.hasBall = false; a.cool = 0; a.duty = null; a.stun = 0; a.speedMul = 1; a.jump = 0; a.dive = 0; a.sup = 0; }
  M.manual = [null, null]; M.queued = [-1, -1]; M.queuedT = [0, 0];
  M.pred = null; M.predT = 0; M.primary = null; M.fielded = false; M.playTime = 0;
  assignFielders();
}
BZ.stepBall = (b, dt, live) => {
  const M = BZ.M;
  if (b.state === 'hit' || b.state === 'loose' || b.state === 'homer') {
    const g = gravity(); b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= g * dt;
    if (b.state !== 'homer') {
      if (b.z > b.peak) b.peak = b.z;
      const r = hyp(b.x, b.y);
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -45) { b.vz = -b.vz * .46; b.vx *= .86; b.vy *= .86; b.bounces++; if (live) { BZ.sfx('step'); } if (!b.landed) { b.landed = true; b.landX = b.x; b.landY = b.y; } }
        else { b.vz = 0; const sp = hyp(b.vx, b.vy); if (sp > 2) { const k = Math.max(0, 1 - (70 + sp * .18) * dt / sp); b.vx *= k; b.vy *= k; } else { b.vx = b.vy = 0; } if (!b.landed) { b.landed = true; b.landX = b.x; b.landY = b.y; } }
      }
      // fair / foul is decided at the first touch beyond the infield, or when it rolls past it
      if (b.fair === null && b.state === 'hit') {
        if ((b.landed && r > 70) || r >= 230) b.fair = inFair(b.x, b.y);
        if (b.landed && r > 45 && !inFair(b.x, b.y)) b.fair = false;
      }
      const th = thetaOf(b.x, b.y);
      if (b.y < 0 && Math.abs(th) <= PI / 4 + .001) {
        const R = BZ.fenceR(th), H = BZ.fenceH(th);
        if (r >= R) {
          if (b.z > H && b.fair !== false) { b.state = 'homer'; b.homerAt = { x: b.x, y: b.y, z: b.z, r }; return 'homer'; }
          if (b.z <= H) { // the wall
            const nx = b.x / r, ny = b.y / r, vr = b.vx * nx + b.vy * ny;
            if (vr > 0) { b.vx -= 1.4 * vr * nx; b.vy -= 1.4 * vr * ny; b.vz *= .8; if (live && !b.wall) BZ.emit('wall', { x: b.x, y: b.y }); b.wall = true; }
            b.x = nx * (R - 1); b.y = ny * (R - 1);
          }
        }
      } else if (b.y < -20 && Math.abs(th) > PI / 4) { // beyond the foul pole lines: the stands
        const lim = hyp(b.x, b.y);
        if (Math.abs(b.x) > -b.y + 99 && b.z < 56) { const k = b.x > 0 ? 1 : -1; b.x = k * (-b.y + 99); b.vx = -b.vx * .3; b.vy *= .6; }
        if (lim > 1700) b.dead = true;
      }
      if (b.y > 110 && hyp(b.x, b.y) > 118) { const n = hyp(b.x, b.y); b.vx *= -.2; b.vy *= -.2; b.x *= 117 / n; b.y *= 117 / n; }   // the backstop
    } else if (b.z <= 0 || hyp(b.x, b.y) > 2200) { b.z = Math.max(0, b.z); b.vx *= .3; b.vy *= .3; b.vz = 0; b.state = 'homerdead'; }
  }
  return null;
};
const reachOf = f => 26 + (f.jump > 0 ? f.z : 0) + (f.sup > 0 ? 46 : 0);
function ballHeight(f) { return f.z; }
function updateBallPlay(dt) {
  const M = BZ.M, b = M.ball;
  if (b.state === 'catcher' || b.state === 'none' || b.state === 'pitch') return;
  const ev = BZ.stepBall(b, dt, true);
  if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 14) b.trail.shift(); }
  if (ev === 'homer' && !M.homer) {
    // a leaping fielder may rob it
    const rob = tryRob();
    if (!rob) { homerNow(); }
  }
  if (b.state === 'throw') updateThrow(dt);
  // fielders catch / pick up
  if (b.state === 'hit' || b.state === 'loose') {
    const d = def();
    for (const f of d.actors) {
      if (f.stun > 0 || f.cool > 0) continue;
      const dx = hyp(f.x - b.x, f.y - b.y), rad = f.dive > 0 ? 17 : 11;
      if (dx < rad && b.z <= reachOf(f) + 4 && (b.z >= f.z - 6)) {
        if (!b.landed && b.bounces === 0 && b.state === 'hit' && b.z > 3) { catchFly(f); break; }
        if (b.z <= 14 || b.bounces > 0 || b.landed) { pickUp(f); break; }
      }
    }
  }
  if (b.state === 'homerdead') { /* finished by homerNow's timers */ }
}
function tryRob() {
  const M = BZ.M, b = M.ball, h = b.homerAt, d = def();
  for (const f of d.actors) {
    if (f.stun > 0) continue;
    const dx = hyp(f.x - h.x, f.y - h.y);
    if (dx < 15 && f.jump > 0 && f.z + 30 + (f.sup > 0 ? 46 : 0) >= h.z - BZ.fenceH(thetaOf(h.x, h.y)) + BZ.fenceH(thetaOf(h.x, h.y)) - 0 && h.z <= BZ.fenceH(thetaOf(h.x, h.y)) + f.z + 34 + (f.sup > 0 ? 46 : 0)) {
      b.state = 'hit'; b.x = h.x * .985; b.y = h.y * .985; b.vx = b.vy = 0; b.vz = -10; b.z = Math.min(b.z, 60);
      def().stat.robs++; BZ.emit('robbed', { fielder: f, side: 1 - M.half }); BZ.gain(1 - M.half, 22);
      catchFly(f, true); return true;
    }
  }
  return false;
}
function homerNow() {
  const M = BZ.M, b = M.ball; M.homer = true; M.phase = 'homer'; M.t = 0;
  const bs = off(); bs.stat.h++; bs.stat.hr++;
  const dist = hyp(b.homerAt.x, b.homerAt.y);
  const full = dist + (b.vz > 0 ? 0 : 0) + b.vz * 0.0;
  // distance estimate: where it would land
  const g = gravity(), tl = (b.vz + Math.sqrt(b.vz * b.vz + 2 * g * Math.max(0, b.z))) / g, lx = b.x + b.vx * tl, ly = b.y + b.vy * tl;
  M.homerDist = Math.max(dist, hyp(lx, ly)); M.bestDist = Math.max(M.bestDist, M.homerDist);
  BZ.gain(M.half, 26); M.hrCount++;
  BZ.emit('homer', { batter: M.batter, dist: M.homerDist, bz: b.bz, side: M.half, runners: M.runners.filter(r => r.state === 'run').length });
  if (M.mode === 'derby') { derbyHomer(); return; }
  if (M.lesson) BZ.lessonEvent('homer');
  // every runner scores
  M.runners.forEach(r => { if (r.state === 'run') { scoreRunner(r); } });
  M.batterRun = null; off().order += 0;
}
function catchFly(f, robbed) {
  const M = BZ.M, b = M.ball; if (M.outs >= 3 && M.mode !== 'derby') { b.state = 'held'; b.holder = f; f.hasBall = true; f.holdT = 0; return; } b.state = 'held'; b.holder = f; f.hasBall = true; M.caught = true; M.fielded = true;
  b.vx = b.vy = b.vz = 0; b.z = 20;
  def().stat.catches++; BZ.sfx('mitt');
  const r = M.batterRun; if (r && r.state === 'run') { r.state = 'out'; }
  M.outs++; BZ.gain(1 - M.half, 10);
  if (!robbed) BZ.emit('catch', { fielder: f, foul: b.fair === false, fly: true });
  BZ.emit('out', { how: 'fly', fielder: f, side: M.half });
  if (M.lesson) BZ.lessonEvent('out');
  // runners must tag up: those off their base must go back
  for (const q of M.runners) if (q.state === 'run' && q !== r) { q.mustReturn = q.pos > q.origin + .03; q.tagWait = true; }
  M.decided = true;
  if (M.mode === 'derby') derbyOut('fly');
}
function pickUp(f) {
  const M = BZ.M, b = M.ball; if (b.state === 'held') return;
  b.state = 'held'; b.holder = f; f.hasBall = true; M.fielded = true; b.vx = b.vy = b.vz = 0; b.z = 14; f.thinkT = 0; f.holdT = 0;
  if (b.fair === null) b.fair = inFair(b.x, b.y);
  BZ.sfx('mitt');
  if (M.mode === 'derby') { if (b.fair === false) foulBall(); else derbyOut('inplay'); return; }
  if (b.fair === false && !M.homer) { foulBall(); return; }
  if (!M.decided) M.decided = true;
  BZ.emit('fielded', { fielder: f });
}
function foulBall() {
  const M = BZ.M, b = M.ball; if (M.foulDead) return;
  M.foulDead = true; M.phase = 'foul'; M.t = 0; const r = M.batterRun;
  if (r) { r.state = 'gone'; M.runners = M.runners.filter(q => q !== r); }
  for (const q of M.runners) { q.pos = q.origin; [q.actor.x, q.actor.y] = segPos(q.pos); q.dir = 0; q.mustReturn = false; }
  if (M.strikes < 2 || M.lastHit.kind === 'bunt') { if (M.strikes < 2) M.strikes++; else if (M.lastHit.kind === 'bunt') { M.strikes = 3; } }
  BZ.emit('foul', {}); BZ.sfx('strike');
  if (M.strikes >= 3) { M.phase = 'call'; M.t = 0; M.result = 'foul'; finishAtBat('strikeout'); return; }
  if (M.mode === 'derby') derbyOut('foul');
}
BZ.catchFly = catchFly;

/* ---------------- throws ---------------- */
BZ.throwTo = (f, base, o = {}) => {
  const M = BZ.M, b = M.ball; if (b.state !== 'held' || b.holder !== f) return false;
  const recv = receiverFor(base, f), tgt = recv ? [recv.x, recv.y] : bpos(base);
  const sx = f.x, sy = f.y, d0 = hyp(tgt[0] - sx, tgt[1] - sy);
  if (d0 < 6) return false;
  if (!recv && !o.force) return false;
  const arm = f.st.arm / 10, sup = f.sup > 0 || o.super;
  const err = (sup ? 0 : .045 * TUNE.throwError * (1.25 - arm * .6) * (1 - .1 * def().up.arm)) * (.5 + d0 / 500);
  const ang = Math.atan2(tgt[1] - sy, tgt[0] - sx) + (rnd() - .5) * 2 * err;
  const spd = TUNE.throwSpeed * (.88 + arm * .22) * (1 + .06 * def().up.arm) * (sup ? 2.0 : 1);
  const T = d0 / spd;
  b.state = 'throw'; b.holder = null; f.hasBall = false; f.anim = 'throw'; f.animT = 0; f.cool = .45; f.facing = ang;
  b.thr = { sx, sy, ex: sx + Math.cos(ang) * d0, ey: sy + Math.sin(ang) * d0, T, t: 0, apex: 6 + d0 * .035, recv, base, from: f, spd, dir: ang };
  b.z = 24; b.x = sx; b.y = sy; b.fire = sup;
  M.throwLog.push(base);
  BZ.emit('throw', { fielder: f, base, super: sup });
  BZ.sfx('throw');
  return true;
};
function receiverFor(base, from) {
  const M = BZ.M, d = def();
  let best = null, bd = 1e9;
  const t = bpos(base);
  for (const f of d.actors) { if (f === from || f.stun > 0) continue; const dd = hyp(f.x - t[0], f.y - t[1]) ; if (dd < bd) { bd = dd; best = f; } }
  return bd < 38 ? best : null;
}
function updateThrow(dt) {
  const M = BZ.M, b = M.ball, t = b.thr; if (!t) { b.state = 'loose'; return; }
  t.t += dt; const s = t.t / t.T;
  b.x = lerp(t.sx, t.ex, Math.min(s, 1)); b.y = lerp(t.sy, t.ey, Math.min(s, 1));
  b.z = lerp(24, 20, Math.min(s, 1)) + 4 * t.apex * Math.min(s, 1) * (1 - Math.min(s, 1));
  // catch by the receiver / any fielder crossing the line of the throw
  for (const f of def().actors) {
    if (f === t.from && s < .4) continue;
    if (f.stun > 0) continue;
    const d = hyp(f.x - b.x, f.y - b.y);
    if (d < (f === t.recv ? 15 : 11) && Math.abs(f.z + 14 - b.z) < 34 + (f.jump > 0 ? 20 : 0) && (f === t.recv || s > .25)) { b.state = 'held'; b.holder = f; f.hasBall = true; b.vx = b.vy = b.vz = 0; b.z = 16; f.thinkT = 0; f.holdT = 0; BZ.sfx('mitt'); BZ.emit('fielded', { fielder: f, thrown: true }); return; }
  }
  if (s >= 1) {   // nobody got it: it sails on
    b.state = 'loose'; const sp = t.spd * .6; b.vx = Math.cos(t.dir) * sp; b.vy = Math.sin(t.dir) * sp; b.vz = 10; b.bounces = 1; b.landed = true; b.fair = true;
    BZ.emit('wildthrow', {}); M.errors = (M.errors || 0) + 1;
  }
}
BZ.throwChoice = (f) => {
  // the smartest base for the ball holder: the lead runner who can still be beaten, else the force
  const M = BZ.M; let best = -1, bestScore = -1e9;
  const sp = TUNE.throwSpeed * (.88 + f.st.arm * .022);
  for (const r of M.runners) {
    if (r.state !== 'run') continue;
    let tb = null;
    if (r.mustReturn) tb = r.origin;
    else if (r.dir > 0 || (r.dir === 0 && r.isBat && r === M.batterRun)) tb = Math.ceil(r.pos - 1e-6);
    else if (r.dir < 0) tb = Math.floor(r.pos + 1e-6);
    if (tb === null) continue;
    if (tb <= r.pos - 0.02 && !r.mustReturn && r.dir >= 0) tb = Math.ceil(r.pos + 1e-6);
    const b = tb % 4, tgt = bpos(b), dT = hyp(tgt[0] - f.x, tgt[1] - f.y) / sp + .22;
    const rT = Math.abs(tb - r.pos) * G.SEG / (runnerSpeed(r) || 70);
    if (hyp(tgt[0] - f.x, tgt[1] - f.y) < 8 || !receiverFor(b, f)) continue;
    const margin = rT - dT, sc = r.pos * 10 + (margin > -.12 ? 100 : -100) + (isForced(r) ? 30 : 0);
    if (margin > -.35 && sc > bestScore) { bestScore = sc; best = b; }
  }
  return best;
};

/* ---------------- fielders ---------------- */
function predictBall() {
  const M = BZ.M, b = M.ball, c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, state: b.state === 'throw' ? 'loose' : b.state, bounces: b.bounces, landed: b.landed, fair: b.fair, peak: b.peak, trail: null };
  const out = []; for (let t = 0; t < 7; t += .08) { const ev = BZ.stepBall(c, .08, false); out.push({ t: t + .08, x: c.x, y: c.y, z: c.z, vz: c.vz, bounces: c.bounces, homer: ev === 'homer' || c.state === 'homer' || c.state === 'homerdead' }); if (ev === 'homer' || (c.vx === 0 && c.vy === 0 && c.z === 0)) break; }
  return out;
}
const fSpeed = f => TUNE.fielderSpeed * (.9 + f.st.spd * .02) * (1 + .04 * def().up.legs) * (f.sup > 0 ? 2.5 : 1) * f.speedMul;
function assignFielders() {
  const M = BZ.M, d = def(), b = M.ball; if (b.state === 'homer' || b.state === 'homerdead') { M.primary = null; return; }
  if (b.state === 'held') { M.primary = b.holder; const taken = new Set([b.holder]); for (const f of d.actors) f.duty = null; for (const [bs, cands] of [[2, ['2B', 'SS']], [1, ['1B', '2B', 'P']], [3, ['3B', 'SS']], [0, ['C', 'P']]]) for (const pos of cands) { const f = d.actors.find(x => x.pos === pos); if (f && !taken.has(f) && f.stun <= 0) { f.duty = bs; taken.add(f); break; } } for (const f of d.actors) if (!taken.has(f)) f.duty = 'back'; return; }
  const pred = predictBall(); M.pred = pred;
  let best = null, bestT = 1e9, bestF = null;
  for (const f of d.actors) {
    if (f.stun > 0) continue; const sp = fSpeed(f);
    for (const p of pred) {
      if (p.homer) break;
      const isFly = p.z > 26 || (p.bounces === 0 && p.z > 8);
      if (isFly && p.z > 36) continue;
      const need = hyp(p.x - f.x, p.y - f.y) / sp;
      if (need <= p.t + .12) { if (p.t < bestT) { bestT = p.t; best = f; bestF = p; } break; }
    }
  }
  if (!best) { // nobody makes it: the nearest to where it ends
    const last = pred[pred.length - 1]; let bd = 1e9;
    for (const f of d.actors) { const dd = hyp(f.x - last.x, f.y - last.y); if (dd < bd) { bd = dd; best = f; } }
    bestF = last;
  }
  M.primary = best; M.primaryPt = bestF;
  // base coverage for the others
  for (const f of d.actors) f.duty = null;
  const taken = new Set([best]), cover = [[2, ['2B', 'SS']], [1, ['1B', '2B', 'P']], [3, ['3B', 'SS']], [0, ['C', 'P']]];
  for (const [bs, cands] of cover) for (const pos of cands) { const f = d.actors.find(x => x.pos === pos); if (f && !taken.has(f) && f.stun <= 0) { f.duty = bs; taken.add(f); break; } }
  for (const f of d.actors) if (!taken.has(f)) f.duty = 'back';
}
function fielderMove(f, dt, ix, iy, mag, turbo) {
  // acceleration toward the wanted velocity
  const sp = fSpeed(f) * (turbo ? 1.2 : 1);
  const want = [ix * sp * mag, iy * sp * mag];
  f.vx = (f.vx || 0) + (want[0] - (f.vx || 0)) * Math.min(1, dt * 10); f.vy = (f.vy || 0) + (want[1] - (f.vy || 0)) * Math.min(1, dt * 10);
  f.x += f.vx * dt; f.y += f.vy * dt;
  if (mag > .05) f.facing = Math.atan2(iy, ix);
  // stay on the field: inside the fence
  const th = thetaOf(f.x, f.y), r = hyp(f.x, f.y);
  if (f.y < 0) { const R = BZ.fenceR(clamp(th, -PI / 4, PI / 4)) - 8; if (r > R) { const k = R / r; f.x *= k; f.y *= k; } }
  if (f.y > 80) f.y = 80;
}
function updateFielders(dt) {
  const M = BZ.M, d = def(), b = M.ball, sideIdx = 1 - M.half, ctl = M.intent[sideIdx] || {};
  M.predT -= dt; if (M.predT <= 0 && b.state !== 'held' && b.state !== 'throw') { assignFielders(); M.predT = .16; }
  if (b.state === 'held') M.primary = b.holder;
  for (const f of d.actors) {
    f.cool = Math.max(0, f.cool - dt); f.stun = Math.max(0, f.stun - dt); f.sup = Math.max(0, f.sup - dt);
    // jump / dive physics
    if (f.jump > 0) { f.vz -= (gravity() > 150 ? 720 * BZ.M.parkDef.gravity : 720) * dt; f.z += f.vz * dt; f.jump -= dt; if (f.z <= 0) { f.z = 0; f.jump = 0; f.vz = 0; } }
    if (f.dive > 0) { f.dive -= dt; f.x += Math.cos(f.facing) * 90 * dt * (f.dive > .25 ? 1 : 0); f.y += Math.sin(f.facing) * 90 * dt * (f.dive > .25 ? 1 : 0); }
    if (f.stun > 0) { f.vx = f.vy = 0; continue; }
    if (f.jump > 0 || f.dive > 0) continue;
    const human = d.ctl && (ctl.mx || ctl.my || ctl.swing);
    const isCtl = d.human && f === controlled(sideIdx);
    let tx, ty, mag = 1;
    if (b.state === 'held' && b.holder === f) {
      // ball holder: tag a runner nearby, run at the lead runner, else wait for the throw
      const chase = M.runners.find(r => r.state === 'run' && !onBase(r) && dist2(r.actor, f) < 70 && (r.dir !== 0));
      if (chase && !(isCtl && (ctl.mx || ctl.my))) { tx = chase.actor.x; ty = chase.actor.y; } else { tx = f.x; ty = f.y; mag = 0; }
      if (isCtl && (ctl.mx || ctl.my)) { fielderMove(f, dt, ctl.mx, ctl.my, Math.min(1, hyp(ctl.mx, ctl.my)), ctl.turbo); continue; }
    } else if (f === M.primary) {
      if (isCtl && (ctl.mx || ctl.my)) { fielderMove(f, dt, ctl.mx, ctl.my, Math.min(1, hyp(ctl.mx, ctl.my)), ctl.turbo); aiJump(f, true); continue; }
      const pt = M.primaryPt || b; tx = pt.x; ty = pt.y;
      if (b.state === 'hit' && b.z > 20 && M.primaryPt) { tx = M.primaryPt.x; ty = M.primaryPt.y; }
      if (b.state === 'loose') { tx = b.x + b.vx * .2; ty = b.y + b.vy * .2; }
      if (!isCtl || !d.human) aiJump(f, false);
    } else if (typeof f.duty === 'number') {
      const t = bpos(f.duty); tx = t[0] + (f.duty === 0 ? 0 : 0); ty = t[1] + (f.duty === 0 ? 12 : 0);
      if (f.duty > 0) { const o = def().actors.find(a => a === f); /* stand on the bag, inside edge */ tx = t[0] * .96; ty = t[1] + 2; }
    } else if (f.duty === 'back') {
      const pr = M.primary; if (pr && pr !== f) { tx = lerp(f.x, (pr.x + G.DEF[f.pos][0]) / 2, .5); ty = lerp(f.y, pr.y - 30, .3); } else { tx = G.DEF[f.pos][0]; ty = G.DEF[f.pos][1]; }
    } else { tx = G.DEF[f.pos][0]; ty = G.DEF[f.pos][1]; }
    const dx = tx - f.x, dy = ty - f.y, dd = hyp(dx, dy);
    if (dd > 2.5 && mag > 0) fielderMove(f, dt, dx / dd, dy / dd, Math.min(1, dd / 8), false); else { f.vx = f.vy = 0; if (b.state !== 'held') f.facing = Math.atan2(b.y - f.y, b.x - f.x); }
    // the human can ask for a jump/dive/super with the fielder they hold
  }
  // human actions on the controlled fielder
  const cf = controlled(sideIdx);
  if (cf && d.human) {
    if (ctl.jump && cf.jump <= 0 && cf.dive <= 0 && cf.z === 0) doJump(cf, ctl.mx || ctl.my);
    if (ctl.super && d.meter >= 100) { d.meter = 0; cf.sup = 1.8; BZ.emit('superfield', { side: sideIdx }); BZ.sfx('rocket'); }
    if (ctl.next) { const list = d.actors.filter(a => a !== M.primary).sort((a, c) => hyp(a.x - b.x, a.y - b.y) - hyp(c.x - b.x, c.y - b.y)); M.manual[sideIdx] = { f: list[0], t: 1.6 }; }
  }
  if (M.manual[sideIdx]) { M.manual[sideIdx].t -= dt; if (M.manual[sideIdx].t <= 0 || b.state === 'held') M.manual[sideIdx] = null; }
  // throws
  const h = b.state === 'held' ? b.holder : null;
  if (h && !M.over) {
    const hSide = h.side, isHuman = d.human && h === controlled(sideIdx) && ctl;
    h.holdT = (h.holdT || 0) + dt;
    const want = isHuman ? (ctl.throwBase >= 0 ? ctl.throwBase : -1) : -1;
    if (isHuman && want >= 0) { BZ.throwTo(h, want, { super: h.sup > 0 }); }
    else if (M.queued[sideIdx] >= 0 && isHuman && h.holdT > .08) { BZ.throwTo(h, M.queued[sideIdx]); M.queued[sideIdx] = -1; }
    else {
      const delay = isHuman ? 1.15 : TUNE.cpuThinks * (1.3 - (M.diff || .5) * .7) * (h === M.primary || true ? 1 : 1);
      if (h.holdT > delay) {
        const c = BZ.throwChoice(h);
        if (c >= 0 && !M.dead) { const near = bpos(c); if (hyp(near[0] - h.x, near[1] - h.y) > 10) BZ.throwTo(h, c); }
        else if (!M.dead && M.decided && allStill()) { /* nobody running: the play can end */ }
      }
    }
  }
}
function controlled(sideIdx) {
  const M = BZ.M; if (M.manual && M.manual[sideIdx] && M.manual[sideIdx].f) return M.manual[sideIdx].f;
  return M.ball.state === 'held' ? M.ball.holder : M.primary;
}
BZ.controlled = controlled;
function aiJump(f, human) {
  const M = BZ.M, b = M.ball; if (human) return;
  if (f.jump > 0 || f.dive > 0 || f.z > 0) return;
  const d = hyp(f.x - b.x, f.y - b.y);
  if (b.state === 'hit' && b.z > 34 && d < 38 && b.vz < 120 && b.landed === false) doJump(f);
  else if (b.state === 'hit' && b.z < 18 && d < 30 && d > 14 && hyp(b.vx, b.vy) > 140 && f.cool <= 0 && rnd() < .5 + .3 * (M.diff || .5)) doJump(f, true);
  else if (b.state === 'hit' && b.y < 0 && hyp(b.x, b.y) > BZ.fenceR(clamp(thetaOf(b.x, b.y), -PI / 4, PI / 4)) - 70 && b.z > 36 && d < 60) doJump(f);
}
function doJump(f, dive) {
  const M = BZ.M, b = M.ball;
  const low = b.z < 18 && hyp(f.x - b.x, f.y - b.y) > 8 && dive !== false;
  if (low && f.cool <= 0 && b.state === 'hit' && hyp(f.x - b.x, f.y - b.y) < 44) { f.dive = .55; f.facing = Math.atan2(b.y - f.y, b.x - f.x); f.cool = .3; f.anim = 'dive'; f.animT = 0; BZ.sfx('slide'); return; }
  f.jump = 1; f.vz = Math.sqrt(2 * 720 * 44 / (BZ.M.parkDef.gravity < 1 ? 1 : 1)) * (BZ.M.parkDef.gravity < 1 ? 1.28 : 1); f.anim = 'jump'; f.animT = 0; f.cool = .2; BZ.sfx('step');
}
BZ.doJump = doJump;

/* ---------------- runners ---------------- */
const runnerSpeed = r => TUNE.runnerSpeed * (.82 + r.actor.st.spd * .036) * (1 + .04 * off().up.legs) * (r.turbo ? TUNE.turboBoost : 1) * (r.slide > 0 ? 1.04 : 1);
const onBase = r => Math.abs(r.pos - Math.round(r.pos)) < .015;
function isForced(r) {
  const M = BZ.M; if (r.state !== 'run') return false;
  if (r.isBat && r.origin === 0) return true;
  const q = M.runners.find(x => x !== r && x.state === 'run' && x.origin === r.origin - 1);
  if (r.origin === 0) return true;
  return !!(q && (q.origin === 0 ? true : isForced(q)));
}
function updateRunners(dt) {
  const M = BZ.M, o = off(), ctl = M.intent[M.half] || {}, d = def(), b = M.ball;
  for (const r of M.runners) {
    if (r.state !== 'run') continue;
    const prev = r.pos; r.turbo = !!(o.human && ctl.turbo && o.turbo > 0);
    if (!(M.phase === 'play' || r.stealing)) continue;
    // decide direction
    let want = r.dir;
    const human = o.human && !!o.ctl;
    if (r.mustReturn) want = -1;
    else if (M.caught && r.tagWait) { r.tagWait = false; r.dir = 0; }
    if (!r.mustReturn) {
      if (r.isBat && r === M.batterRun && !r.crossed) { want = M.foulDead ? 0 : 1; }
      else if (M.caught && r.tagWait === false || (!M.caught && !M.foulDead)) { want = runnerAI(r, ctl, human); }
      else want = r.dir;
    }
    if (M.caught && r.mustReturn && r.pos <= r.origin + .001) { r.mustReturn = false; r.dir = 0; r.pos = r.origin; want = 0; }
    r.dir = want;
    if (r.dir !== 0) {
      let np = r.pos + r.dir * runnerSpeed(r) / G.SEG * dt;
      // not past the runner ahead
      const ahead = M.runners.filter(x => x !== r && x.state === 'run' && x.pos > r.pos - .001 && x.dir === 0 && onBase(x)).sort((a, c) => a.pos - c.pos)[0];
      if (ahead && np > ahead.pos - .02 && r.dir > 0) np = Math.min(np, ahead.pos - .02);
      // a runner never goes behind where the batter-runner stands, or before his origin when returning
      np = clamp(np, r.mustReturn ? r.origin : (r.dir < 0 ? r.floorBase || r.origin : 0), 4);
      if (r.dir < 0) np = Math.max(np, Math.floor(r.floorBase !== undefined ? r.floorBase : r.origin));
      r.pos = np;
      [r.actor.x, r.actor.y] = segPos(r.pos);
      r.actor.facing = Math.atan2(...(() => { const a = segPos(r.pos + r.dir * .02), c = segPos(r.pos); return [a[1] - c[1], a[0] - c[0]]; })());
      if (r.pos >= 4 - .001) { r.pos = 4; scoreRunner(r); }
      // arrived at a base: stop (the AI decides to go on)
      const rb = Math.round(r.pos);
      if (Math.abs(r.pos - rb) < .012 && rb !== Math.round(prev) || (Math.abs(r.pos - rb) < .012 && r.dir !== 0 && Math.abs(prev - rb) >= .012)) {
        if (rb < 4) { r.pos = rb; r.origin = rb; r.floorBase = rb; r.dir = 0; r.crossed = true; r.slide = 0; if (r.isBat && rb === 1) { /* batter on first */ } r.stealing = false; BZ.emit('arrive', { runner: r, base: rb }); if (r.wasSteal) { r.wasSteal = false; off().stat.sb++; BZ.gain(M.half, 10); BZ.emit('steal', { runner: r, base: rb }); } }
      }
    }
    r.slide = Math.max(0, r.slide - dt);
  }
  M.runners = M.runners.filter(r => r.state === 'run' || r.state === 'score' && false);
  // refill list: keep scored/out out
}
function runnerAI(r, ctl, human) {
  const M = BZ.M, b = M.ball, d = def();
  const forced = isForced(r);
  const nextBase = Math.floor(r.pos + 1e-6) + 1;
  const moving = !onBase(r);
  // a human sends and recalls with advance/retreat
  if (human) {
    if (ctl.advance) { r.hold = false; r.ordered = 1; }
    if (ctl.retreat) { r.ordered = -1; }
  }
  if (r.ordered === -1) { if (moving || r.pos > r.origin + 1e-6) { r.floorBase = Math.floor(r.pos + 1e-6); return -1; } r.ordered = 0; }
  if (moving) { // between bases: carry on unless a recall or a rundown turns him
    const holder = b.state === 'held' ? b.holder : null;
    if (r.dir > 0) {
      const nb = Math.ceil(r.pos), tgt = bpos(nb);
      if (holder && hyp(holder.x - tgt[0], holder.y - tgt[1]) < 14 && !forced && (nb - r.pos) * G.SEG > 40 && r.pos - Math.floor(r.pos) < .5) { r.floorBase = Math.floor(r.pos + 1e-6); return -1; }
    }
    return r.dir || 1;
  }
  // on a base
  if (r.ordered === 1) { r.ordered = 0; return 1; }
  if (M.foulDead) return 0;
  if (forced && !M.caught && M.ball.fair !== false) return 1;
  if (r.isBat && r === M.batterRun && !r.crossed) return 1;
  if (M.caught) { // tag up when the catch was deep enough, human or CPU
    if (r.tagWait === false || r.tagWait === undefined) {
      if (!human && r.tagReady) return 1;
    }
    return 0;
  }
  if (human) return 0;
  // CPU runner: go on a ball that is past the infield and not yet in hand
  if (b.state === 'held' || b.state === 'throw') return 0;
  if (b.fair === null || b.state === 'hit' && b.z > 20) return 0;
  const tgt = bpos(nextBase), pr = M.primary;
  if (!pr) return 0;
  const tField = hyp(pr.x - b.x, pr.y - b.y) / fSpeed(pr) + hyp(tgt[0] - b.x, tgt[1] - b.y) / (TUNE.throwSpeed * .95) + .6;
  const tRun = G.SEG / runnerSpeed(r) + .2;
  return tField > tRun * (1.05 - (M.diff || .5) * .2) && b.landed ? 1 : 0;
}
function allStill() { return BZ.M.runners.every(r => r.state !== 'run' || r.dir === 0); }

function resolveOuts() {
  const M = BZ.M, b = M.ball, h = b.state === 'held' ? b.holder : null; if (!h) return;
  const ds = def();
  for (const r of M.runners) {
    if (r.state !== 'run') continue;
    let out = null;
    // force or tag-up: the holder with the ball on the bag before the runner
    for (let bi = 0; bi < 4; bi++) {
      const tgt = bpos(bi); if (hyp(h.x - tgt[0], h.y - tgt[1]) > 11) continue;
      const b4 = bi === 0 ? 4 : bi;
      if (r.mustReturn && r.origin === (bi === 0 ? 0 : bi) && !onBase(r)) out = 'tagup';
      else if (!r.mustReturn && isForced(r) && Math.ceil(r.pos - 1e-6) === b4 && r.pos < b4 - .02 && r.dir > 0 && r.pos >= r.origin) out = 'force';
      else if (!r.mustReturn && isForced(r) && r.isBat && r === M.batterRun && b4 === 1 && r.pos < .98 && r.origin === 0) out = 'force';
    }
    // a tag
    if (!out && !onBase(r) && dist2(h, r.actor) < (r.slide > 0 ? 7 : 10) && r.actor.z === 0) out = 'tag';
    if (out) putOut(r, out, h);
  }
}
function putOut(r, how, h) {
  const M = BZ.M, d = def(); if (r.state !== 'run' || M.outs >= 3) return;
  r.state = 'out'; r.actor.anim = 'out'; r.actor.animT = 0; M.outs++; BZ.gain(1 - M.half, 10);
  BZ.emit('out', { how, runner: r, fielder: h, side: M.half, isBat: r.isBat });
  if (how === 'force' || how === 'tag' || how === 'tagup') BZ.sfx('out');
  M.outsThisPlay = (M.outsThisPlay || 0) + 1;
  if (M.outsThisPlay >= 2) { d.stat.dp++; BZ.emit('doubleplay', {}); BZ.gain(1 - M.half, 20); }
  if (M.lesson) BZ.lessonEvent('out');
  // a play can leave a runner where he stands; remove from list at the end
  r.removed = true;
}

/* ---------------- phases ---------------- */
BZ.updateSim = (dt) => {
  const M = BZ.M; if (!M || M.over) return;
  M.clock += dt; M.t += dt; M.shake = Math.max(0, M.shake - dt * 2);
  for (const s of M.sides) { s.turbo = clamp(s.turbo + dt * .18, 0, 1); }
  updateAnims(dt);
  updateHazards(dt);
  const ph = M.phase;
  const ib = M.intent[batterSide()] || {}, ip = M.intent[pitcherSide()] || {};
  if (ph === 'intro') { if (M.t > (M.noIntro ? .1 : 1.6) && !M.hold) { M.phase = 'setup'; M.t = 0; BZ.emit('batterup', { batter: M.batter }); if (M.mode === 'derby') derbyNext(); } }
  else if (ph === 'between') { if (M.t > 2.8) { M.phase = 'setup'; M.t = 0; BZ.emit('batterup', { batter: M.batter }); } }
  else if (ph === 'setup') {
    // pitcher chooses; the batter may warm up the cursor
    batterCursor(dt, ib);
    const ps = def(), pitchSide = 1 - M.half;
    if (ps.human && ps.ctl && !M.autoPitch) {
      if (ip.next) M.sel = (M.sel + 1) % 4; if (ip.prev) M.sel = (M.sel + 3) % 4;
      M.aim.u = clamp(M.aim.u + (ip.mx || 0) * 2 * dt, -1.35, 1.35); M.aim.v = clamp(M.aim.v + (ip.my || 0) * 2 * dt * -1 * -1 * 1, -1.35, 1.35);
      if (ip.swing) BZ.startWindup({ bean: ip.bean, fire: ip.power });
    } else if (M.mode === 'derby') { if (M.t > .55 && !M.hold && M.dMach) BZ.startWindup({ type: M.dMach.type, u: M.dMach.u, v: M.dMach.v }); }
    else if (M.t > .7 + (M.attract ? 0 : .5) && !M.hold) cpuPitch();
  } else if (ph === 'windup') {
    batterCursor(dt, ib);
    M.pitch.t += dt; if (M.pitch.t >= 0) releasePitch();
    cpuBatterPlan(dt, ib); stealLogic(ib);
    if (!M.sw && ib.swing) BZ.swingNow(ib.bunt ? 'bunt' : 'normal');
    if (!M.sw && ib.power) BZ.swingNow('power');
  } else if (ph === 'pitch') {
    const p = M.pitch;
    batterCursor(dt, ib);
    // aftertouch from the pitcher
    if (def().human && ip.mx !== undefined) { p.aft.u = clamp(p.aft.u + (ip.mx || 0) * 1.1 * dt, -.55, .55); p.aft.v = clamp(p.aft.v + (ip.my || 0) * -1 * -1 * 1.1 * dt, -.55, .55); }
    cpuBatterPlan(dt, ib); stealLogic(ib); if (M.steal) updateRunners(dt);
    if (!M.sw) { if (ib.swing && M.swCool <= 0) BZ.swingNow(ib.bunt ? 'bunt' : 'normal'); else if (ib.power && M.swCool <= 0) BZ.swingNow('power'); }
    p.t += dt;
    const pos = BZ.pitchPos(p, p.t); M.ball.x = pos[0]; M.ball.y = pos[1]; M.ball.z = pos[2];
    M.ball.trail.push([pos[0], pos[1], pos[2]]); if (M.ball.trail.length > 10) M.ball.trail.shift();
    if (p.t >= p.T) resolvePlate();
  } else if (ph === 'call') {
    M.resultT += dt; batterCursor(dt, ib); if (M.steal) updateRunners(dt);
    if (M.t > (M.mode === 'derby' ? .5 : 1.05)) {
      if (M.outs >= 3 || (M.strikes >= 3) || (M.balls >= 4) || M.result === 'hbp') { /* handled in finishAtBat */ }
      M.phase = 'setup'; M.t = 0; M.sw = null; M.swCool = 0; M.pitch = null; M.ball.state = 'none'; M.cur.u = 0; M.cur.v = 0;
      const P = fielderOf('P'); P.anim = null; M.batter.anim = null; BZ.emit('nextpitch', {});
      if (M.mode === 'derby') derbyNext();
    }
  } else if (ph === 'play') {
    M.playTime += dt;
    updateBallPlay(dt); updateFielders(dt); updateRunners(dt);
    if (M.phase === 'play') {
      resolveOuts(); stepPlayEnd(dt);
      if (M.mode === 'derby') derbyPlayStep(dt);
    }
  } else if (ph === 'homer') {
    const b = M.ball; BZ.stepBall(b, dt, false); if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 18) b.trail.shift(); }
    updateFielders(dt);
    if (M.t > (M.mode === 'derby' ? 1.6 : 3.6)) { if (M.mode === 'derby') { derbyNext2(); } else { finishPlay(); } }
    // runners trot
    for (const r of M.runners) if (r.state === 'run') { r.pos = Math.min(4, r.pos + dt * .55); [r.actor.x, r.actor.y] = segPos(r.pos); }
  } else if (ph === 'foul') {
    updateBallPlay(dt); updateFielders(dt);
    if (M.t > 1.5) { M.phase = 'setup'; M.t = 0; M.sw = null; M.swCool = 0; M.pitch = null; M.ball.state = 'none'; M.cur.u = 0; M.cur.v = 0; fielderOf('P').anim = null; M.batter.anim = null; fieldersHome(); M.batter.hasBall = false; if (M.mode === 'derby') derbyNext(); }
  } else if (ph === 'resolve') {
    if (M.t > .7) { applyAtBat(); }
  } else if (ph === 'rhubarb') { updateRhubarb(dt); }
  else if (ph === 'steal') { /* handled in play */ }
  if (M.sw) {
    M.sw.age = (M.sw.age || 0) + dt;
    if (M.sw.age > .55) { M.sw = null; }
  }
  M.swCool = Math.max(0, M.swCool - dt);
};
function batterCursor(dt, ib) {
  const M = BZ.M, s = off(), c = M.cur;
  if (s.human && s.ctl) {
    if (ib.mouse) { c.u = lerp(c.u, ib.mouse[0], Math.min(1, dt * 9)); c.v = lerp(c.v, ib.mouse[1], Math.min(1, dt * 9)); }
    else { c.u += (ib.mx || 0) * 2.3 * dt; c.v += (ib.my || 0) * 2.3 * dt * -1 * -1; }
    c.u = clamp(c.u, -1.6, 1.6); c.v = clamp(c.v, -1.6, 1.6);
  }
}
function cpuPitch() {
  const M = BZ.M, d = def(), P = fielderOf('P'), sk = M.diff;
  let type = pickOf(G.ORDER);
  const fire = d.meter >= 100 && rnd() < .5;
  const corner = rnd() < .45 + sk * .3;
  const u = corner ? pickOf([-.85, .85, 0, -.7, .7]) : rr(-.6, .6), v = corner ? pickOf([-.85, .8, 0, -.7]) : rr(-.5, .5);
  const wide = rnd() < .22 - sk * .1;
  M.aim.u = wide ? pickOf([-1.35, 1.35]) : u; M.aim.v = wide ? pickOf([-1.3, 1.3]) : v;
  M.sel = G.ORDER.indexOf(type);
  BZ.startWindup({ type: fire ? 'fire' : type, u: M.aim.u, v: M.aim.v, fire });
}
function cpuBatterPlan(dt, ib) {
  const M = BZ.M, s = off(); if (s.human && s.ctl) return;
  const p = M.pitch; if (!p || !p.released) { if (M.phase === 'windup') { M.cpu = null; } return; }
  if (!M.cpu || M.cpu.pitchId !== p.t0id) {
    const sk = clamp(M.diff * .7 + M.batter.st.bat * .04 + (M.attract ? .5 : 0), 0, 1);
    const swing = true && (rnd() < (.35 + sk * .45)) ;
    M.cpu = { pitchId: p.t0id = (p.t0id || (BZ.pid = (BZ.pid || 0) + 1)), swing, err: (rnd() - .5) * 2 * (.15 * (1 - sk) + .012), cu: 0, plan: false, power: s.meter >= 100 && rnd() < .6 || M.attract && s.meter >= 100, sk };
    const uv = BZ.pitchUV(p, p.T);
    const isStrike = Math.abs(uv.fu) <= 1.05 && Math.abs(uv.fv) <= 1.05;
    M.cpu.swing = isStrike ? rnd() < .5 + sk * .45 : rnd() < .12 * (1 - sk);
    if (M.attract) M.cpu.swing = isStrike || rnd() < .3;
    M.cpu.target = { u: uv.fu + (rnd() - .5) * (1 - sk) * 2.4, v: uv.fv + (rnd() - .5) * (1 - sk) * 2.4 };
  }
  const c = M.cpu;
  M.cur.u = lerp(M.cur.u, c.target.u, Math.min(1, dt * 8)); M.cur.v = lerp(M.cur.v, c.target.v, Math.min(1, dt * 8));
  if (c.swing && !M.sw && M.swCool <= 0 && p.t >= p.T - .085 + c.err - 0.0) { BZ.swingNow(c.power ? 'power' : 'normal'); c.swing = false; }
}
function updateAnims(dt) {
  const M = BZ.M;
  for (const s of M.sides) for (const a of s.actors) { if (a.anim) { a.animT += dt; } }
}
function fieldersHome() {
  const M = BZ.M; for (const a of def().actors) { const sp = G.DEF[a.pos]; a.x = sp[0]; a.y = sp[1]; a.z = 0; a.jump = 0; a.dive = 0; a.hasBall = false; a.facing = -PI / 2; a.vx = a.vy = 0; a.stun = 0; a.sup = 0; }
  const P = fielderOf('P'); P.facing = PI / 2; P.y = G.MOUND[1] + 6;
  const c = fielderOf('C'); c.x = 0; c.y = 20; c.facing = -PI / 2;
}
function stepPlayEnd(dt) {
  const M = BZ.M, b = M.ball; if (M.mode === 'derby') return;
  if (M.homer || M.foulDead) return;
  const h = b.state === 'held' ? b.holder : null;
  if (M.outs >= 3 && M.outsTimer === undefined) M.outsTimer = 0;
  if (M.outs >= 3) { M.outsTimer = (M.outsTimer || 0) + dt; if (M.outsTimer > .9) { M.outsTimer = undefined; finishPlay(); } return; }
  if (b.dead && b.state !== 'held') { }
  if (h) {
    const still = M.runners.every(r => r.state !== 'run' || (r.dir === 0 && onBase(r)));
    // a pitcher / catcher with the ball and nobody going: dead
    if (still && h.holdT > .5 && !(M.caught && M.runners.some(r => r.state === 'run' && r.mustReturn))) { finishPlay(); return; }
    // fly caught: a runner may still tag up
    if (M.caught && still && h.holdT > 1.6) { finishPlay(); return; }
  }
  if (M.playTime > 22) { finishPlay(true); }
  // CPU runners tag up on a deep catch
  if (M.caught && b.state === 'held') { for (const r of M.runners) if (r.state === 'run' && r.tagWait !== true && r.tagReady === undefined) { const dist = hyp(b.holder.x, b.holder.y); r.tagReady = dist > 520 && r.origin >= 1 && r.dir === 0 ? true : false; } }
  if (M.caught && b.state === 'held') for (const r of M.runners) if (r.state === 'run' && r.tagWait === true && onBase(r)) { r.tagWait = false; }
}
function finishPlay(force) {
  const M = BZ.M, b = M.ball, bs = off();
  if (M.phase === 'resolved') return;
  if (M.stealPlay) {
    M.stealPlay = false; M.steal = false; M.outsThisPlay = 0; M.outsTimer = undefined;
    M.runners = M.runners.filter(q => q.state === 'run');
    for (const q of M.runners) { q.stealing = false; q.pos = clamp(Math.round(q.pos), 1, 3); [q.actor.x, q.actor.y] = segPos(q.pos); q.dir = 0; q.origin = q.pos; q.mustReturn = false; q.floorBase = undefined; }
    const seen = new Set(); M.runners.sort((a, c) => c.pos - a.pos).forEach(q => { while (seen.has(q.pos) && q.pos < 3) q.pos++; seen.add(q.pos); [q.actor.x, q.actor.y] = segPos(q.pos); });
    M.phase = 'resolved'; M.ball.state = 'none'; return checkHalfEnd(true);
  }
  // classify the hit for the stats and commentary
  const r = M.batterRun;
  let how = 'out';
  if (M.homer) how = 'homer';
  else if (r && r.state === 'run') {
    const base = Math.round(r.pos); how = ['out', 'single', 'double', 'triple', 'homer'][clamp(base, 0, 4)] || 'single';
    if (base >= 1) { bs.stat.h++; BZ.gain(M.half, 10); BZ.emit(how, { batter: M.batter }); if (M.lesson) BZ.lessonEvent('hit'); }
  } else if (r && r.state === 'out' && !M.caught) { BZ.emit('groundout', { batter: M.batter }); }
  if (M.lastHit && M.lastHit.kind === 'bunt' && r && r.state === 'run') BZ.emit('bunthit', {});
  if (M.lesson) BZ.lessonEvent('playend');
  M.outsThisPlay = 0; M.outsTimer = undefined;
  M.runners = M.runners.filter(q => q.state === 'run');
  for (const q of M.runners) { if (!onBase(q)) { q.pos = Math.round(q.pos) === 0 ? Math.max(1, Math.ceil(q.pos)) : Math.round(q.pos); } q.pos = clamp(Math.round(q.pos), 1, 3); [q.actor.x, q.actor.y] = segPos(q.pos); q.dir = 0; q.origin = q.pos; q.mustReturn = false; q.isBat = false; q.crossed = false; q.tagWait = undefined; q.tagReady = undefined; q.floorBase = undefined; }
  // two runners on the same base: the front one moves up
  const seen = new Set(); M.runners.sort((a, c) => c.pos - a.pos).forEach(q => { while (seen.has(q.pos) && q.pos < 3) q.pos++; seen.add(q.pos); [q.actor.x, q.actor.y] = segPos(q.pos); });
  M.batterRun = null; bs.order++;
  endPlayToNext();
}
function endPlayToNext() {
  const M = BZ.M;
  M.phase = 'resolved'; M.t = 0; M.ball.state = 'none';
  setTimeout; checkHalfEnd();
}
function applyAtBat() {
  const M = BZ.M;
  // after a strikeout / walk: place the batter, move on
  if (M.advance) { addRunner(M.batter, 1); }
  M.runners = M.runners.filter(q => q.state === 'run');
  M.advance = false;
  // a walk into a full house is handled in forceWalkRunners
  checkHalfEnd();
}
function checkHalfEnd(keep) {
  const M = BZ.M;
  if (M.mode === 'derby') return;
  const ending = M.outs >= 3;
  const lead = M.score[1] - M.score[0];
  const last = M.inn >= M.innings;
  // walk-off
  if (M.half === 1 && last && lead > 0) return endGame();
  if (ending) {
    M.runners = [];
    if (M.half === 0 && last && lead > 0) return endGame();
    if (M.half === 1 && last && lead !== 0) return endGame();
    if (M.half === 1 && M.inn >= 3 && Math.abs(lead) >= TUNE.mercy) return endGame();
    if (M.half === 1 && M.inn >= M.innings + 3) return endGame();
    if (M.half === 1) { M.inn++; M.half = 0; } else M.half = 1;
    BZ.startHalf(false); fieldersHome();
    return;
  }
  if (keep) { const rs = M.runners; M.cur.u = 0; M.cur.v = 0; M.sw = null; M.swCool = 0; M.pitch = null; fieldersHome(); M.phase = 'setup'; M.t = 0; M.ball.state = 'none'; M.batter.anim = null; return; }
  BZ.nextBatter(); fieldersHome(); M.phase = 'setup'; M.t = 0; M.pitch = null;
  M.ball.state = 'none'; M.sw = null; M.swCool = 0; M.outsThisPlay = 0;
  BZ.emit('batterup', { batter: M.batter });
}
function endGame() {
  const M = BZ.M; M.over = true; M.phase = 'over'; M.t = 0;
  M.winner = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
  BZ.emit('gameover', { winner: M.winner, score: M.score.slice() });
}
BZ.endGame = endGame;

/* ---------------- the Rhubarb: a bench-clearing dust-cloud scrum ---------------- */
function startRhubarb() {
  const M = BZ.M; M.phase = 'rhubarb'; M.t = 0;
  M.rhubarb = { t: 0, dur: 7, bar: 0, taps: [0, 0], done: false, from: M.half, rot: 0 };
  BZ.emit('rhubarb', {}); BZ.sfx('horn');
}
function updateRhubarb(dt) {
  const M = BZ.M, R = M.rhubarb; R.t += dt;
  const b0 = M.intent[0] || {}, b1 = M.intent[1] || {};
  for (let s = 0; s < 2; s++) {
    const sd = M.sides[s], it = M.intent[s] || {};
    if (sd.human && sd.ctl) { if (it.swing || it.power) { R.taps[s]++; R.bar += (s === 0 ? 1 : -1) * .045; BZ.sfx('punch'); } }
    else if (!sd.human || !sd.ctl) { R.cpuAcc = (R.cpuAcc || [0, 0]); R.cpuAcc[s] += dt * (3.2 + (s === 1 - M.half ? 1 : 0) * 0 + (M.attract ? 3 : 0) * (s === 0 ? 1 : 0) + rnd()); if (R.cpuAcc[s] >= 1) { R.cpuAcc[s] -= 1; R.taps[s]++; R.bar += (s === 0 ? 1 : -1) * .04; if (rnd() < .5) BZ.sfx('punch'); } }
  }
  R.bar = clamp(R.bar * (1 - dt * .15), -1, 1);
  if (R.t >= R.dur) {
    const w = R.bar > .02 ? 0 : R.bar < -.02 ? 1 : (rnd() < .5 ? 0 : 1);
    R.winner = w; M.sides[w].meter = 100; BZ.emit('rhubarbend', { winner: w }); BZ.emit('meterfull', { side: w });
    M.rhubarb = null; M.phase = 'rhubarbwin'; M.t = 0; M.rwin = w;
    setPhaseAfter(1.6, () => { forceWalkRunners(); endAtBat(true); });
  }
}
function setPhaseAfter(s, fn) { const g = My3D2dge.current; if (g) g.after(s, fn); else fn(); }

/* ---------------- stealing ---------------- */
BZ.trySteal = () => {
  const M = BZ.M; if (M.phase !== 'pitch' && M.phase !== 'windup') return false;
  if (M.steal) return false;
  const r = M.runners.filter(x => x.state === 'run' && x.dir === 0 && onBase(x) && Math.round(x.pos) < 3 && !M.runners.find(y => y !== x && y.state === 'run' && y.pos === x.pos + 1)).sort((a, c) => c.pos - a.pos)[0];
  if (!r) return false;
  M.steal = r; r.stealing = true; r.wasSteal = true; r.dir = 1; r.origin = Math.round(r.pos); r.floorBase = r.origin; BZ.emit('stealgo', { runner: r });
  return true;
};

/* ---------------- hazards (per park) ---------------- */
BZ.setupHazards = () => {
  const M = BZ.M, p = M.parkDef; M.hazards = [];
  if (p.hazard === 'magma') [[-250, -540], [260, -520], [-80, -620], [120, -430], [-300, -420]].forEach((h, i) => M.hazards.push({ kind: 'geyser', x: h[0], y: h[1], phase: i * 2.1, state: 'idle', t: 3 + i * 1.7 }));
  if (p.hazard === 'corn') M.hazards.push({ kind: 'corn', x: 470, y: -600, r: 70 });
  if (p.hazard === 'moon') M.hazards.push({ kind: 'crater', x: -210, y: -520, r: 46 }, { kind: 'crater', x: 250, y: -640, r: 38 });
  if (p.hazard === 'mega') M.hazards.push({ kind: 'drone', x: 0, y: -400, t: 0 });
};
function updateHazards(dt) {
  const M = BZ.M;
  for (const h of M.hazards) {
    if (h.kind === 'geyser') {
      h.t -= dt;
      if (h.state === 'idle' && h.t <= 0) { h.state = 'warn'; h.t = 1.2; }
      else if (h.state === 'warn' && h.t <= 0) { h.state = 'blast'; h.t = .7; BZ.emit('geyser', { h }); if (M.phase === 'play') for (const f of def().actors) if (hyp(f.x - h.x, f.y - h.y) < 26 && f.stun <= 0) { f.stun = 1.4; f.anim = 'burn'; f.animT = 0; BZ.emit('burn', { f }); } }
      else if (h.state === 'blast' && h.t <= 0) { h.state = 'idle'; h.t = 5 + (BZ.rng.fx() * 4); }
    } else if (h.kind === 'corn') {
      const b = M.ball;
      if (M.phase === 'play' && (b.state === 'hit' || b.state === 'loose') && b.landed && hyp(b.x - h.x, b.y - h.y) < h.r) { b.vx *= .1; b.vy *= .1; if (!h.lost) { h.lost = true; BZ.emit('lostincorn', {}); } }
      if (M.phase !== 'play') h.lost = false;
    } else if (h.kind === 'moon') { }
    else if (h.kind === 'crater') {
      const b = M.ball;
      if (M.phase === 'play' && (b.state === 'hit' || b.state === 'loose') && b.landed && hyp(b.x - h.x, b.y - h.y) < h.r) { b.vx *= .5; b.vy *= .5; }
    }
  }
}

/* ---------------- Home Run Derby (shares the pitch/bat/ball code) ---------------- */
BZ.newDerby = (o = {}) => {
  const players = o.players || [{ name: 'P1', ctl: null, human: true }];
  const M = BZ.newMatch({ park: o.park || 'corn', mode: 'derby', away: { team: 'hay', ctl: players[0].ctl, human: players[0].human }, home: { team: 'cin' }, seed: o.seed, innings: 99, noBetween: true });
  M.derby = { players: players.map(p => ({ name: p.name, ctl: p.ctl, human: p.human, hr: 0, dist: 0, best: 0, outs: 0, swings: 0, score: 0, streak: 0 })), cur: 0, outsMax: o.outs || 7, over: false, round: 1, pitches: 0, longest: 0, hub: !!o.hub, pitchSeq: o.pitchSeq || null, clockLimit: o.clockLimit || 0 };
  M.sides[0].human = true; M.sides[1].human = false;
  M.phase = 'intro'; M.noIntro = true;
  M.sides[0].ctl = players[0].ctl; M.sides[0].meter = 0;
  derbyPrep();
  return M;
};
function derbyPrep() {
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  M.sides[0].ctl = p.ctl; M.sides[0].human = p.human;
  M.batter = M.sides[0].actors[(D.cur * 2) % 9]; M.batter.x = M.batter.lefty ? 20 : -20; M.batter.y = -2; M.batter.facing = -PI / 2;
  M.half = 0; M.outs = 0; M.balls = 0; M.strikes = 0; M.runners = []; M.cur.u = 0; M.cur.v = 0;
  for (const a of M.sides[1].actors) { const sp = G.DEF[a.pos]; a.x = sp[0]; a.y = sp[1]; }
  M.sides[1].actors.forEach(a => { if (a.pos !== 'P' && a.pos !== 'C') { a.x = 9999; a.y = 9999; } });
}
function derbyMachine() {
  // the machine throws the same sequence to every player in a hub round
  const M = BZ.M, D = M.derby, r = D.pitchSeq ? D.pitchSeq : BZ.rng.deal;
  const u = (r() - .5) * 1.4, v = (r() - .5) * .8;
  return { type: r() < .2 ? 'curve' : 'fast', u, v };
}
function derbyNext() {
  const M = BZ.M, D = M.derby; if (D.over) return;
  const mach = derbyMachine(); M.aim.u = mach.u; M.aim.v = mach.v; M.sel = G.ORDER.indexOf(mach.type);
  M.dMach = mach;
  M.phase = 'setup'; M.t = 0; M.sw = null; M.swCool = 0; M.ball.state = 'none'; M.hold = false;
  D.pitches++;
}
function derbyNext2() { derbyAfterBall(); }
function derbyPitchEnd(r) { // a pitch the batter took or missed
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  if (r === 'whiff' || r === 'called') { if (r === 'whiff') { p.swings++; p.outs++; derbyCheckOver(); } else { /* a taken strike costs nothing */ } }
  else if (r === 'foul') { }
  M.strikes = 0; M.balls = 0;
}
function derbyHomer() {
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  p.hr++; p.streak++; const d = Math.round(BZ.feet(M.homerDist)); p.best = Math.max(p.best, d); D.longest = Math.max(D.longest, d);
  p.score += 100 + Math.round(d / 4) + (M.ball.bz ? 50 : 0) + p.streak * 10;
  M.derbyPopup = { t: 0, text: d + ' FT' };
  BZ.emit('derbyhr', { player: D.cur, dist: d });
}
function derbyOut(how) {
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  if (how === 'foul') { M.phase = 'foul'; return; }
  p.outs++; p.streak = 0; BZ.emit('derbyout', { how }); derbyCheckOver();
  M.phase = 'call'; M.t = 0; M.derbyOutAt = M.clock; M.result = 'out';
}
function derbyPlayStep(dt) {
  const M = BZ.M, b = M.ball, D = M.derby;
  if (M.homer) return;
  // a ball that lands in the field without clearing the fence is an out for the batter once it rests or is caught
  if (b.landed && (b.vx === 0 && b.vy === 0 || hyp(b.vx, b.vy) < 8 || M.playTime > 5)) { if (M.phase === 'play') { derbyOut('inplay'); } }
  if (M.playTime > 9 && M.phase === 'play') derbyOut('inplay');
}
function derbyCheckOver() {
  const M = BZ.M, D = M.derby, p = D.players[D.cur];
  if (p.outs >= D.outsMax) {
    p.done = true;
    if (D.cur + 1 < D.players.length) { D.cur++; derbyPrep(); BZ.emit('derbynext', { player: D.cur }); M.sides[0].meter = 0; }
    else { D.over = true; M.over = true; M.phase = 'over'; BZ.emit('derbyover', {}); }
  }
}
function derbyAfterBall() {
  const M = BZ.M, D = M.derby; if (D.over) return;
  M.phase = 'call'; M.t = 0; M.result = 'hr'; M.ball.state = 'none';
}
// in the derby the "call" phase afterwards starts the next pitch
BZ.afterCallDerby = derbyNext;

/* ---------------- Spring Training lessons ---------------- */
BZ.applyLesson = (n) => {
  const M = BZ.M, L = BZ.get('lessons', n); if (!L) return;
  M.lessonSpec = L; M.lessonCount = 0;
  const s = L.setup;
  if (s.meter) { M.sides[0].meter = s.meter; M.sides[1].meter = 0; }
  if (s.role === 'field') M.autoPitch = true;
  if (s.role === 'bat' || s.role === 'run') { M.sides[0].human = true; M.sides[1].human = false; }
  else if (s.role === 'pitch' || s.role === 'field') { M.half = 1; M.sides[1].human = false; M.sides[0].human = false; M.sides[1].human = false; }
  M.noBetween = true;
};
BZ.lessonEvent = (ev) => {
  const M = BZ.M, L = M.lessonSpec; if (!L || M.lessonDone) return;
  const goal = L.goal;
  if (ev === goal || (goal === 'hit' && ev === 'homer') || (goal === 'strikeout' && ev === 'strikeout')) {
    M.lessonCount++; if (M.lessonCount >= L.need) { M.lessonDone = true; BZ.emit('lessondone', { lesson: L }); }
  }
};

/* ===== 30-park.js ===== */
/* BATZOOKA BASEBALL: the ballpark. A park def becomes a TileMap: the floor is painted from the park's geometry
   (mown stripes, infield dirt, basepaths, chalk, warning track), walls are the fence, the foul walls and the stands. */
const COLS = 112, ROWS = 84, T16 = 16;
BZ.parkCache = {};
function parkInside(x, y, park) {
  const r = hyp(x, y);
  if (r <= 112) return true;
  if (y >= -4) return false;
  const th = thetaOf(x, y), R = BZ.fenceR(clamp(th, -PI / 4, PI / 4), park);
  return r <= R && Math.abs(x) <= -y + 99;
}
BZ.buildPark = (park) => {
  const key = park.id + ':' + TUNE.fence.toFixed(2);
  if (BZ.parkCache[key]) return BZ.parkCache[key];
  const HX = G.HX, HY = G.HY, inside = [], rows = [];
  for (let cy = 0; cy < ROWS; cy++) { const row = []; for (let cx = 0; cx < COLS; cx++) row.push(parkInside(cx * T16 + 8 - HX, cy * T16 + 8 - HY, park)); inside.push(row); }
  // distance from the playing area, up to 5 tiles
  const dist = inside.map(r => r.map(v => v ? 0 : 99));
  let frontier = []; for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) if (inside[cy][cx]) frontier.push([cx, cy]);
  for (let d = 1; d <= 5; d++) { const nf = []; for (const [cx, cy] of frontier) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue; if (dist[ny][nx] > d) { dist[ny][nx] = d; nf.push([nx, ny]); } } frontier = nf; }
  const megaRange = [-32 * PI / 180, 8 * PI / 180];
  for (let cy = 0; cy < ROWS; cy++) {
    let s = '';
    for (let cx = 0; cx < COLS; cx++) {
      const d = dist[cy][cx];
      if (d === 0) s += '.';
      else if (d > 5) s += 'o';
      else if (d === 1) {
        const x = cx * T16 + 8 - HX, y = cy * T16 + 8 - HY, th = thetaOf(x, y), r = hyp(x, y);
        if (y < -40 && r > BZ.fenceR(clamp(th, -PI / 4, PI / 4), park) - 18 && Math.abs(th) < PI / 4 + .12) s += (park.megaWall && th > megaRange[0] && th < megaRange[1]) ? 'M' : 'F';
        else s += 'B';
      } else s += String(d);
    }
    rows.push(s);
  }
  const rgb = a => a.map(v => v), jit = (x, y, k) => (E.hash2(Math.floor(x / 2), Math.floor(y / 2)) - .5) * k;
  const G0 = park.grass[0], G1 = park.grass[1];
  const floorTex = (wx, wy, tag) => {
    const x = wx - HX, y = wy - HY, n = jit(wx, wy, 14), m = (E.noise2(wx * .05, wy * .05) - .5) * 16;
    if (tag === 'o') { const o = park.outside; const row = park.hazard === 'corn' && (Math.floor(wx / 12) % 2 === 0) ? -14 : 0; return [o[0] + n + row, o[1] + n * 1.2 + m * .5 + row, o[2] + n]; }
    const r = hyp(x, y), th = thetaOf(x, y), R = BZ.fenceR(clamp(th, -PI / 4, PI / 4), park);
    const chalk = () => { const w = 228 + n; return [w, w, w - 6]; };
    // foul lines
    if (y < 0 && r < R + 4 && Math.abs(Math.abs(x) + y) < 1.6) return chalk();
    // batter's boxes and catcher's box
    const bx = Math.abs(x);
    if (y > -22 && y < 16 && bx > 5 && bx < 31 && (Math.abs(bx - 5) < 1 || Math.abs(bx - 31) < 1 || Math.abs(y + 22) < 1 || Math.abs(y - 16) < 1)) return chalk();
    // home dirt circle and plate
    if (r < 42) { const w = park.dirt; return [w[0] + n, w[1] + n, w[2] + n]; }
    // mound
    const dm = hyp(x, y + 200);
    if (dm < 24) { const w = park.dirt; return [w[0] + 10 + n, w[1] + 10 + n, w[2] + 10 + n]; }
    // grass diamond inset, basepath strips
    const dd = Math.abs(x) + Math.abs(y + 212);
    const ip = dd <= 190 && y > -440 && y < -20;
    const path = dd > 186 && dd <= 218 && y > -440 && y <= 4;
    const dirtArea = hyp(x, y + 205) <= 262 && y > -470 && y < 70 && !ip;
    const trackBand = y < 0 && r > R - 46 && r <= R + 2 && Math.abs(x) <= -y + 99;
    if (path || dirtArea) { const w = park.dirt, k = (path ? 4 : 0) + n + m * .3; return [w[0] + k, w[1] + k, w[2] + k]; }
    if (trackBand) { const w = park.track; return [w[0] + n, w[1] + n, w[2] + n]; }
    if (r > R + 2 && y < 0) { const w = park.track; return [w[0] * .8, w[1] * .8, w[2] * .8]; }
    // mowing pattern
    const band = (Math.floor(r / 34) + (park.hazard === 'moon' ? Math.floor((th + 3) * 12) : 0)) % 2 ? G0 : G1;
    const foul = Math.abs(th) > PI / 4 || y > -4;
    const sh = foul ? .9 : 1;
    return [(band[0] + n + m) * sh, (band[1] + n * 1.1 + m) * sh, (band[2] + n) * sh];
  };
  const stand = park.stand;
  const mk = (h, top, side, face) => ({ h, top, side, face, cut: true, cutH: 8, line: 'rgba(0,0,0,.25)' });
  const types = {
    F: { h: park.fenceH + 6, top: park.wallTop, side: park.wallSide, face: stand[0] === 'rock' ? 'rock' : 'plank', roof: 'plain', cut: true, cutH: 10 },
    M: { h: 96, top: '#f2d86a', side: '#303848', face: 'plank', roof: 'plain', cut: true, cutH: 10 },
    B: { h: 30, top: '#c8c8d0', side: '#505870', face: 'plank', roof: 'plain', cut: true, cutH: 8 },
    2: mk(44, stand[2], stand[1], stand[0]), 3: mk(54, stand[2], stand[1], stand[0]), 4: mk(64, stand[2], stand[1], stand[0]), 5: mk(74, stand[2], stand[1], stand[0])
  };
  const map = new E.TileMap({ rows, legend: { '.': { floor: 'f' }, o: { floor: 'o' }, F: 'F', M: 'M', B: 'B', 2: 2, 3: 3, 4: 4, 5: 5 }, types, floorTex, outside: '#' + park.outside.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''), ao: 3 });
  // stand cells for the crowd
  const crowd = [];
  for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
    const d = dist[cy][cx]; if (d < 2 || d > 5) continue;
    const h = types[d].h, hs = E.hash2(cx * 7, cy * 13);
    for (let k = 0; k < 2; k++) crowd.push({ x: cx * T16 + 4 + k * 8 + (hs * 3), y: cy * T16 + 9, z: h, tier: d, col: Math.floor(E.hash2(cx + k * 31, cy * 3) * 4), seed: E.hash2(cx * 3 + k, cy * 5) });
  }
  const o = { map, crowd, dist, key, park };
  BZ.parkCache[key] = o; return o;
};
BZ.rebuildPark = () => { BZ.parkCache = {}; };

/* ---- drawing helpers that work in the park's world coordinates ---- */
const W = (x, y) => [G.HX + x, G.HY + y];
BZ.W = W;
function queuePoly(r, x, y, z, pts, color, shadeCol) {
  r.queue(G.HX + x, G.HY + y, z, g => { const P = pts.map(p => { const w = r.w(G.HX + p[0], G.HY + p[1], p[2] || z); return [w[0], w[1]]; }); px.poly(g, P, color); if (shadeCol) { for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; px.line(g, a[0], a[1], b[0], b[1], shadeCol, 1); } } }, { bias: -2 });
}
BZ.drawField = (r, M, P) => {
  const park = M.parkDef;
  // bases, plate, rubber
  const base = (x, y) => queuePoly(r, x, y, 1, [[x - 7, y, 1], [x, y - 7, 1], [x + 7, y, 1], [x, y + 7, 1]], '#f4f4ec', '#9a9a90');
  for (let i = 1; i <= 3; i++) base(BASES[i][0] * (i === 2 ? 1 : (BASES[i][0] > 0 ? .965 : .965)), BASES[i][1] + (i === 2 ? 3 : 0));
  queuePoly(r, 0, 0, 1, [[-6, 4, 1], [6, 4, 1], [6, -1, 1], [0, -6, 1], [-6, -1, 1]], '#ffffff', '#a0a098');
  queuePoly(r, 0, -205, 1, [[-8, -207, 1], [8, -207, 1], [8, -203, 1], [-8, -203, 1]], '#f4f4ec', '#9a9a90');
  // the mound rises a little
  r.queue(G.HX, G.HY - 200, 0, g => { const c = r.w(G.HX, G.HY - 200, 3); px.ell(g, c[0], c[1], 17, 7, ((park.dirt) ? 'rgb(' + (park.dirt[0] + 14) + ',' + (park.dirt[1] + 14) + ',' + (park.dirt[2] + 12) + ')' : '#c8a070')); }, { bias: -3 });
  // foul poles
  for (const s of [-1, 1]) {
    const R = BZ.fenceR(s * PI / 4, park), px0 = s * R * Math.SQRT1_2, py0 = -R * Math.SQRT1_2;
    r.queue(G.HX + px0, G.HY + py0, 0, g => { const a = r.w(G.HX + px0, G.HY + py0, 0), b = r.w(G.HX + px0, G.HY + py0, 150); px.line(g, a[0], a[1], b[0], b[1], '#ffd23a', 2); px.rect(g, b[0] - 1, b[1] - 1, 3, 3, '#fff6a0'); }, { bias: 1 });
  }
  // hazards
  for (const h of M.hazards) {
    if (h.kind === 'geyser') {
      const lit = h.state === 'warn' ? .5 + .5 * Math.sin(M.clock * 24) : h.state === 'blast' ? 1 : 0;
      r.queue(G.HX + h.x, G.HY + h.y, 0, g => {
        const c = r.w(G.HX + h.x, G.HY + h.y, 0); px.ell(g, c[0], c[1], 10, 5, h.state === 'idle' ? '#3a1810' : (lit > .6 ? '#ffd040' : '#ff6020'));
        if (h.state === 'blast') { const top = r.w(G.HX + h.x, G.HY + h.y, 70 * Math.min(1, (.7 - h.t) * 6)); for (let i = 0; i < 5; i++) px.line(g, c[0] + (i - 2) * 2, c[1], top[0] + (i - 2) * 3 + Math.sin(M.clock * 30 + i) * 2, top[1], i % 2 ? '#ffd040' : '#ff5020', 2); }
      }, { bias: -1, emissive: h.state !== 'idle' });
    } else if (h.kind === 'corn') {
      for (let i = 0; i < 26; i++) { const ax = h.x + ((i * 53) % 130) - 65, ay = h.y + ((i * 37) % 110) - 55; if (hyp(ax - h.x, ay - h.y) > h.r) continue; r.prop('tree', G.HX + ax, G.HY + ay, 0, { size: .5, color: '#d8c040' }); }
    } else if (h.kind === 'crater') {
      r.queue(G.HX + h.x, G.HY + h.y, 0, g => { const c = r.w(G.HX + h.x, G.HY + h.y, 0); px.ell(g, c[0], c[1], h.r * .8, h.r * .4, '#50507c'); px.ell(g, c[0] + 1, c[1] + 1, h.r * .6, h.r * .28, '#34345a'); }, { bias: -3 });
    }
  }
};
/* the big scoreboard, jumbotron and banners above the center-field stands */
BZ.drawScenery = (r, M) => {
  const park = M.parkDef, R = BZ.fenceR(0, park), cx = G.HX, cy = G.HY - R - 96;
  r.queue(cx, cy, 20, g => {
    r.box(g, cx - 56, cy - 4, 80, cx + 56, cy + 4, 130, '#202636', '#10141e');
    const a = r.w(cx - 50, cy + 5, 124), b = r.w(cx + 50, cy + 5, 88);
    px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#101a30');
    const fw = Math.max(2, (b[0] - a[0]) / 14);
    E.font.text(g, M.score[0] + '  ' + M.score[1], (a[0] + b[0]) / 2, a[1] + 2, '#ffe070', { align: 'center', outline: false });
  }, { bias: 3 });
  // light towers
  for (const s of [-1, 1]) for (const k of [.55, 1]) {
    const lx = G.HX + s * (R * .7 * k + 40), ly = G.HY - R * .62 * k - 70;
    if (park.lights || true) r.prop('streetlamp', lx, ly, 0, { size: 2.6, light: park.lights });
  }
  // banners on the wall
  for (let i = -4; i <= 4; i++) { const th = i * .16, rr_ = BZ.fenceR(th, park) + 2; if (Math.abs(th) < PI / 4 - .1) r.prop('banner', G.HX + Math.sin(th) * rr_, G.HY - Math.cos(th) * rr_, BZ.fenceH(th, park) - 8, { size: .55, color: i % 2 ? M.sides[0].team.chip : M.sides[1].team.chip }); }
};
BZ.drawCrowd = (r, M, hype) => {
  const P = BZ.parkCache[Object.keys(BZ.parkCache).find(k => k.startsWith(M.parkDef.id + ':'))]; if (!P) return;
  const cols = M.parkDef.crowd, t = M.clock;
  for (const f of P.crowd) {
    if (!r.visible(f.x, f.y, f.z)) continue;
    const bob = Math.sin(t * (3 + f.seed * 3) + f.seed * 30) * (1 + hype * 2.4) * (hype > .5 ? 1 : .35), up = hype > .6 && Math.sin(t * 5 + f.seed * 20) > .5;
    r.queue(f.x, f.y, f.z + 3, g => {
      const w = r.w(f.x, f.y, f.z + Math.max(0, bob)); const c = cols[f.col];
      px.rect(g, w[0] - 1, w[1] - 3, 3, 3, c); px.rect(g, w[0] - 1, w[1] - 5, 3, 2, f.seed > .5 ? '#e0b090' : '#a87050');
      if (up) { px.rect(g, w[0] - 2, w[1] - 7, 1, 3, c); px.rect(g, w[0] + 2, w[1] - 7, 1, 3, c); }
    }, { bias: 0 });
  }
};

/* ===== 32-input.js ===== */
/* BATZOOKA BASEBALL: input. One action preset, intents for the sim, and the glyph prompts that follow the device
   used last (PlayStation or Xbox symbols for a pad, key caps for the keyboard, mouse buttons for the mouse). */
const DEF_IN = E.Input.DEFAULT;
BZ.PRESET = {
  up: DEF_IN.up, down: DEF_IN.down, left: DEF_IN.left, right: DEF_IN.right,
  swing: ['Space', 'Mouse0', 'Pad0'], power: ['KeyE', 'Mouse2', 'Pad2'], tri: ['KeyF', 'Pad3'], cir: ['KeyG', 'Pad1'],
  dive: ['KeyQ', 'Pad4'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad5'], next: ['KeyR', 'Pad5'], sup: ['KeyC', 'Pad6', 'Pad7'],
  t1: ['Digit1', 'Pad1'], t2: ['Digit2', 'Pad3'], t3: ['Digit3', 'Pad2'], th: ['Digit4', 'Pad0'],
  view: ['KeyV', 'Pad11'], start: DEF_IN.start, pause: DEF_IN.pause, confirm: DEF_IN.confirm, cancel: DEF_IN.cancel
};
BZ.ACTION_NAMES = { swing: 'Swing / Pitch', power: 'Batzooka / Fireball', tri: 'Bunt / Advance', cir: 'Steal / Recall', dive: 'Pitch select / Dive', turbo: 'Turbo', next: 'Next pitch / Switch fielder', sup: 'Super glove', t1: 'Throw to 1st', t2: 'Throw to 2nd', t3: 'Throw to 3rd', th: 'Throw home', view: 'Camera' };

/* ---- a button glyph, drawn with pixels (the 5x7 font has no PlayStation symbols) ---- */
const PAD_COL = { ps: ['#6ab0ff', '#ff6a6a', '#ff9ad0', '#6af0a0'], xb: ['#4ad060', '#ff5050', '#5a9aff', '#ffd030'] };
function padGlyph(g, cx, cy, idx, style, size = 5) {
  if (idx <= 3) {
    const cols = style === 'xbox' ? PAD_COL.xb : PAD_COL.ps, c = cols[idx];
    px.disc(g, cx, cy, size + 1, '#10101c'); px.disc(g, cx, cy, size, '#202030');
    if (style === 'xbox') { const ch = ['A', 'B', 'X', 'Y'][idx]; E.font.text(g, ch, cx - 2, cy - 3, c, { outline: false }); return; }
    const s = size - 2;
    if (idx === 0) { px.line(g, cx - s, cy - s, cx + s, cy + s, c, 1); px.line(g, cx - s, cy + s, cx + s, cy - s, c, 1); }
    else if (idx === 1) { px.disc(g, cx, cy, s, c); px.disc(g, cx, cy, s - 1, '#202030'); }
    else if (idx === 2) { px.rect(g, cx - s, cy - s, s * 2 + 1, 1, c); px.rect(g, cx - s, cy + s, s * 2 + 1, 1, c); px.rect(g, cx - s, cy - s, 1, s * 2 + 1, c); px.rect(g, cx + s, cy - s, 1, s * 2 + 1, c); }
    else { px.line(g, cx, cy - s, cx - s, cy + s - 1, c, 1); px.line(g, cx, cy - s, cx + s, cy + s - 1, c, 1); px.line(g, cx - s, cy + s - 1, cx + s, cy + s - 1, c, 1); }
    return;
  }
  const names = { 4: style === 'xbox' ? 'LB' : 'L1', 5: style === 'xbox' ? 'RB' : 'R1', 6: style === 'xbox' ? 'LT' : 'L2', 7: style === 'xbox' ? 'RT' : 'R2', 9: style === 'xbox' ? 'MENU' : 'OPT', 11: 'R3', 10: 'L3' };
  const t = names[idx] || ('B' + idx), w = E.font.width(t) + 6;
  px.rect(g, cx - w / 2, cy - 5, w, 10, '#10101c'); px.rect(g, cx - w / 2 + 1, cy - 4, w - 2, 8, '#2a2a40');
  E.font.text(g, t, cx - w / 2 + 3, cy - 3, '#e8e8ff', { outline: false });
}
/* draws "[glyph] label"; returns the width used. action: an input action name or a literal like 'stick' */
BZ.promptW = (game, action, label) => 22 + E.font.width(label || '');
BZ.prompt = (g, game, x, y, action, label, o = {}) => {
  const I = (o.input || game.input), dev = I.lastDevice === 'touch' ? 'keyboard' : I.lastDevice;
  let w = 0;
  if (action === 'stick') {
    if (dev === 'gamepad') { px.disc(g, x + 6, y + 5, 6, '#10101c'); px.disc(g, x + 6, y + 5, 4, '#303048'); px.disc(g, x + 6, y + 5, 2, '#9090c0'); w = 14; }
    else if (dev === 'mouse') { px.rect(g, x, y - 1, 10, 13, '#10101c'); px.rect(g, x + 1, y, 8, 11, '#e8e8f8'); px.rect(g, x + 4, y, 1, 5, '#10101c'); w = 12; }
    else { for (const [k, dx, dy] of [['W', 7, 0], ['A', 0, 9], ['S', 7, 9], ['D', 14, 9]]) { px.rect(g, x + dx, y + dy - 2, 8, 8, '#10101c'); px.rect(g, x + dx + 1, y + dy - 1, 6, 6, '#e8e8f8'); E.font.text(g, k, x + dx + 2, y + dy - 1, '#1a1a2a', { outline: false }); } w = 24; }
  } else {
    const codes = (I.map[action] || []).filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    const pads = codes.filter(c => c.startsWith('Pad')), keys = codes.filter(c => !c.startsWith('Pad'));
    if (dev === 'gamepad' && pads.length) { const idx = +pads[0].slice(3), st = I.padStyle(); padGlyph(g, x + 6, y + 5, idx, st); w = idx <= 3 ? 14 : E.font.width(['L1', 'R1', 'L2', 'R2'][idx - 4] || 'B') + 10; }
    else if (dev === 'mouse' && keys.some(c => c.startsWith('Mouse'))) {
      const m = keys.find(c => c.startsWith('Mouse')), left = m === 'Mouse0';
      px.rect(g, x, y - 1, 11, 13, '#10101c'); px.rect(g, x + 1, y, 9, 11, '#e8e8f8'); px.rect(g, x + 5, y, 1, 5, '#10101c'); px.rect(g, left ? x + 1 : x + 6, y, 4, 5, '#ff7a5a'); w = 13;
    } else {
      const k = keys.find(c => !c.startsWith('Mouse')) || keys[0] || 'Enter', t = I.codeLabel(k), tw = Math.max(9, E.font.width(t) + 6);
      px.rect(g, x, y - 1, tw, 12, '#10101c'); px.rect(g, x + 1, y, tw - 2, 10, '#e8e8f8'); px.rect(g, x + 1, y + 8, tw - 2, 2, '#a8a8c0');
      E.font.text(g, t, x + (tw - E.font.width(t)) / 2 + 0, y + 1, '#1a1a2a', { outline: false }); w = tw + 2;
    }
  }
  if (label) E.font.text(g, label, x + w + 3, y + 2, o.color || '#ffffff', { shadow: '#000', outline: false });
  return w + 4 + (label ? E.font.width(label) : 0);
};

/* ---- intents: what a human is asking for this step ---- */
BZ.zoneFromPointer = (game, I) => {
  const p = I.pointer && I.pointer(); if (!p) return null;
  const W_ = game.W, H_ = game.H, k = game.screen.S / (game.screen.dpr || 1);
  // pointer is in screen pixels (canvas buffer coordinates): map to a zone around the screen centre
  const bx = (p[0] / (game.screen.S) ), by = (p[1] / (game.screen.S));
  const px_ = (p[0] - (game.screen.canvas.width / 2)) / (game.screen.canvas.width / 2), py_ = (p[1] - (game.screen.canvas.height / 2)) / (game.screen.canvas.height / 2);
  return [clamp(px_ * 1.7, -1.6, 1.6), clamp(py_ * 1.7, -1.6, 1.6)];
};
BZ.readIntent = (game, I, sideIdx) => {
  const M = BZ.M, m = I.move(), it = { mx: m[0], my: m[1] };
  it.swing = I.pressed('swing'); it.power = I.pressed('power'); it.bunt = I.down('tri'); it.steal = I.pressed('cir');
  it.next = I.pressed('next'); it.prev = I.pressed('dive'); it.bean = I.down('dive');
  it.jump = I.pressed('dive'); it.turbo = I.down('turbo'); it.super = I.pressed('sup');
  it.advance = I.pressed('tri'); it.retreat = I.pressed('cir');
  it.throwBase = I.pressed('t1') ? 1 : I.pressed('t2') ? 2 : I.pressed('t3') ? 3 : I.pressed('th') ? 0 : -1;
  if (I.lastDevice === 'mouse') {
    const z = BZ.zoneFromPointer(game, I); if (z) it.mouse = z;
    // clicking a base throws there; a click is also the swing, so only in the field
    if (M && (M.phase === 'play') && sideIdx === 1 - M.half && I.pressed('swing') && game.mouseGround) {
      const gp = game.mouseGround(); if (gp) {
        const lx = gp[0] - G.HX, ly = gp[1] - G.HY; let best = -1, bd = 60;
        BASES.forEach((b, i) => { const d = hyp(b[0] - lx, b[1] - ly); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { it.throwBase = best; it.swing = false; }
      }
    }
  }
  return it;
};
/* which input drives a side: player 1 (and the keyboard) the first human side, player 2 the other */
BZ.ctlFor = (game, sideIdx, M) => {
  const sd = M.sides[sideIdx]; return sd.human ? (sd.ctl || game.players[0]) : null;
};

/* ===== 33-rigs.js ===== */
/* BATZOOKA BASEBALL: rigs and animation. Humanoid players dressed per team, with baseball motion (swing, windup,
   throw, dive, jump, slide, cheer, sulk) layered over the engine's rig. Rigs are cosmetic: gameplay never reads joints. */
const HAIRS = ['short', 'spiky', 'long', 'ponytail', 'short', 'spiky', 'bald'];
BZ.rigCache = new Map();
BZ.makeRig = (team, p, bat) => {
  const hs = Math.abs([...p.name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % HAIRS.length;
  const hatStyle = team.hat === 'visor' ? 'helmet' : team.hat === 'helmet' ? 'helmet' : 'cap';
  const rig = new E.Humanoid({
    size: p.build === 'bulky' ? 1.28 : 1.12, build: p.build, weapon: bat ? 'staff' : null, outfit: 'shirt', sleeves: 'short', hair: HAIRS[hs],
    hat: { style: hatStyle, color: team.cap2 === '#303848' ? '#c8a030' : team.cap2 }, speedRef: 90,
    colors: Object.assign({}, team.colors, { hair: p.hair, skin: p.skin, metal: '#c89a5a', hilt: '#8a5a2a', glove: '#8a5a2a', staff: '#c89a5a', orb: '#a8743a' })
  });
  rig.lefty = p.lefty; return rig;
};
BZ.rigFor = (a, team, bat) => {
  const key = a.side + ':' + a.i + (bat ? 'b' : '') + ':' + team.id;
  let r = BZ.rigCache.get(key); if (!r) { r = BZ.makeRig(team, a.st, bat); BZ.rigCache.set(key, r); }
  return r;
};
BZ.umpireRig = new E.Humanoid({ size: 1.15, weapon: null, outfit: 'shirt', hat: 'cap', sleeves: 'short', colors: { cloth: '#1c1c24', pants: '#2a2a34', hair: '#888888', skin: '#e8b890', belt: '#101010', boot: '#101010' } });
const SWING = { rel: true, hand: 'both', a0: 2.4, a1: -1.5, z0: 2, z1: 0, reach: 9, wind: .12, active: .1, recover: .34, lunge: 1.6, twist: 1.2, blade: 1 };
const BUNT = { rel: true, hand: 'both', a0: .3, a1: .1, z0: -1, z1: -1, reach: 7, wind: .1, active: .15, recover: .4, blade: 0 };
const PITCH_WIND = E.MOVES.overhead, THROW = E.MOVES.throw;
function atk(spec, t) { const w = spec.wind, ac = spec.active, rc = spec.recover; if (t < w) return { spec, phase: 'wind', u: t / w }; if (t < w + ac) return { spec, phase: 'active', u: (t - w) / ac }; if (t < w + ac + rc) return { spec, phase: 'recover', u: (t - w - ac) / rc }; return null; }
BZ.animState = (a, dt, M) => {
  const o = { x: a.x, y: a.y, z: a.z, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing };
  const t = a.animT || 0;
  switch (a.anim) {
    case 'swing': o.attack = atk(SWING, t); if (!o.attack && t > .8) a.anim = null; o.vx = o.vy = 0; break;
    case 'bunt': o.attack = atk(BUNT, t); if (!o.attack && t > .9) a.anim = null; o.vx = o.vy = 0; break;
    case 'pitch': { const T = .48, u = clamp(t / T, 0, 1); o.attack = { spec: PITCH_WIND, phase: 'wind', u: u * .95 }; o.vx = o.vy = 0; break; }
    case 'pitchrel': o.attack = t < .1 ? { spec: PITCH_WIND, phase: 'active', u: t / .1 } : t < .45 ? { spec: PITCH_WIND, phase: 'recover', u: (t - .1) / .35 } : null; o.vx = o.vy = 0; break;
    case 'throw': o.attack = atk(THROW, t); if (!o.attack) a.anim = null; break;
    case 'jump': o.air = true; if (t > 1.2) a.anim = null; break;
    case 'dive': o.pose = 'down'; o.down = .95; if (t > 1) a.anim = null; break;
    case 'slide': o.pose = 'down'; o.down = .8; if (t > .7) a.anim = null; break;
    case 'out': o.pose = 'kneel'; if (t > 1.4) a.anim = null; break;
    case 'burn': o.pose = 'down'; o.down = .6; o.hurt = true; if (t > 1.4) a.anim = null; break;
    case 'sulk': o.pose = 'kneel'; if (t > 1.6) a.anim = null; break;
    default: break;
  }
  if (a.mood === 'cheer') o.pose = 'cheer';
  if (a.sup > 0) o.dash = true;
  return o;
};
/* run every rig's update (called once per step by the match scene when BZ.cosmetic) */
BZ.updateRigs = (dt, M) => {
  const bs = M.sides[M.half], ds = M.sides[1 - M.half];
  const all = [];
  for (const a of ds.actors) {
    if (M.mode === 'derby' && a.pos !== 'P' && a.pos !== 'C') continue;
    all.push([a, ds, false]);
  }
  for (const a of bs.actors) {
    const run = M.runners.find(r => r.actor === a);
    if (run || a === M.batter) all.push([a, bs, a === M.batter && !run && M.phase !== 'play']);
  }
  for (const [a, sd, bat] of all) {
    const rig = BZ.rigFor(a, sd.team, bat); a.rig = rig;
    const st = BZ.animState(a, dt, M);
    if (a.pos === 'C' && sd === ds && !a.anim) st.pose = 'crouch';
    if (bat && !st.attack) { st.stance = 'ready'; }
    const spd = hyp(st.vx, st.vy); st.run = clamp(spd / 100, 0, 1);
    rig.update(dt, st);
  }
};
BZ.umpireUpdate = dt => BZ.umpireRig.update(dt, { x: 0, y: 34, z: 0, facing: -PI / 2, vx: 0, vy: 0, pose: 'crouch' });

/* ---- the world draw for a match ---- */
BZ.drawActor = (r, a, rig, M) => {
  if (!rig) return;
  const X = G.HX + a.x, Y = G.HY + a.y, Z = a.z;
  r.shadow(X, Y, 8, .45);
  r.actor(X, Y, Z, (g, ox, oy) => {
    rig.draw(g, ox, oy, r.view);
    if (a.sup > 0) { px.ddisc(g, ox, oy - 14, 16, '#ffd070', .35 + Math.sin(M.clock * 30) * .15); }
  }, { flash: a.stun > 0 ? '#ff6a30' : null, flashMix: .5, outline: a === M.primary && M.phase === 'play' && M.sides[1 - M.half].human ? '#ffee66' : undefined, key: a });
  if (M.attractLabel) { }
};
BZ.drawBall = (r, M) => {
  const b = M.ball; if (b.state === 'none' || b.state === 'held' && !b.holder) return;
  let x = b.x, y = b.y, z = b.z;
  if (b.state === 'held' && b.holder) { x = b.holder.x + Math.cos(b.holder.facing) * 6; y = b.holder.y + Math.sin(b.holder.facing) * 6; z = 16; }
  if (b.state === 'catcher') { const C = fielderOf('C'); x = C.x; y = C.y - 4; z = 14; }
  const X = G.HX + x, Y = G.HY + y;
  if (z > .5) r.shadow(X, Y, 3, .5, '#000000', 0);
  if (b.trail && b.trail.length > 2 && (b.state === 'hit' || b.state === 'homer' || b.state === 'pitch' || b.state === 'throw')) {
    const tr = b.trail;
    r.queue(X, Y, z, g => {
      for (let i = 0; i < tr.length - 1; i++) { const p = r.w(G.HX + tr[i][0], G.HY + tr[i][1], tr[i][2]); const k = i / tr.length; px.disc(g, p[0], p[1], b.fire ? 1 + k * 2.5 : 1, b.fire ? (k > .6 ? '#ffd050' : k > .3 ? '#ff7a20' : '#a02010') : 'rgba(255,255,255,' + (k * .5) + ')'); }
    }, { emissive: b.fire, bias: -1 });
  }
  r.queue(X, Y, z + 2, g => {
    const w = r.w(X, Y, z), big = M.phase === 'pitch' || M.phase === 'windup' ? 1 : 0;
    px.disc(g, w[0], w[1], b.fire ? 4 : 3, b.fire ? '#ffd050' : '#f6f6f0'); px.disc(g, w[0], w[1], b.fire ? 3 : 2, b.fire ? '#ff7a20' : '#ffffff');
    px.dot(g, w[0] - 1, w[1] + 1, b.fire ? '#c03010' : '#d84a3a');
  }, { emissive: b.fire, bias: 2 });
  if (b.fire && (b.state === 'hit' || b.state === 'pitch' || b.state === 'homer')) { game_.particles.fire(X, Y, z, 1, { size: 3 }); }
};
let game_ = null; BZ.bindGame = g => { game_ = g; };

/* ---- the mascot: a blob that patrols the foul line and hops when the crowd goes wild ---- */
const MASCOTS = { corn: { dk: '#b89818', base: '#f2d544', lt: '#fff0a0', spec: '#ffffff', eye: '#ffffff', pupil: '#201810' }, moon: { dk: '#5a4a98', base: '#a888f0', lt: '#d8c8ff', spec: '#ffffff', eye: '#ffffff', pupil: '#201840' }, magma: { dk: '#a02a10', base: '#ff6a30', lt: '#ffb070', spec: '#ffffff', eye: '#ffffff', pupil: '#301008' }, mega: { dk: '#a08020', base: '#e8c860', lt: '#fff0b0', spec: '#ffffff', eye: '#ffffff', pupil: '#101018' } };
BZ.mascotInit = M => {
  const blob = new E.Blob({ R: 7, colors: MASCOTS[M.parkDef.id] || MASCOTS.corn, ears: M.parkDef.id === 'moon' ? 'rabbit' : null, horns: M.parkDef.id === 'magma', feet: true, mouth: true, face: 'front' });
  BZ.mascot = { blob, x: 140, y: -40, dir: 1, t: 0, hop: 0,
    tick(dt) { this.t += dt; this.x += this.dir * 14 * dt; if (this.x > 230) this.dir = -1; if (this.x < 110) this.dir = 1; this.y = -this.x + 50; const hype = BZ.hud.hype; this.hop = hype > .4 ? Math.abs(Math.sin(this.t * 7)) * 10 : 0; blob.update(dt, { squash: Math.sin(this.t * 6) * .12, walk: hype > .4 ? 0 : 1, look: [this.dir, 1] }); },
    draw(r) { const x = G.HX + this.x, y = G.HY + this.y; r.shadow(x, y, 6, .4); r.actor(x, y, this.hop, (g, ox, oy) => blob.draw(g, ox, oy, r.view)); } };
};

/* ===== 34-hud.js ===== */
/* BATZOOKA BASEBALL: the HUD, call stamps, play-by-play and crowd reactions. Everything here listens to the bus. */
BZ.hud = { stamps: [], radio: null, radioQ: [], radioCool: 0, hype: 0, banner: null, flashT: 0, mph: 0, lastType: '' };
BZ.hudReset = () => { Object.assign(BZ.hud, { stamps: [], radio: null, radioQ: [], radioCool: 0, hype: 0, banner: null, mph: 0, lastType: '' }); };
const stamp = (text, color = '#ffffff', big = 1, secs = 1.1) => { BZ.hud.stamps.push({ text, color, t: 0, life: secs, big }); if (BZ.hud.stamps.length > 3) BZ.hud.stamps.shift(); };
const say = (pool, pri = 1, vars = {}) => {
  const H = BZ.hud, lines = BZ.lines[pool]; if (!lines) return;
  let t = lines[Math.floor(BZ.rng.fx() * lines.length)];
  for (const k in vars) t = t.replace('{' + k + '}', vars[k]);
  if (H.radioCool > 0 && pri < 3) return;
  const gm = My3D2dge.current; if (gm && gm.settings && gm.settings.commentary === false) return;
  const who = (BZ.rng.fx() < .5) ? 'TEX' : 'DUSTY';
  H.radio = { text: t, who, t: 0, life: Math.min(5.5, 2.2 + t.length * .045) }; H.radioCool = 2.4;
  BZ.babble(t, who === 'TEX' ? .8 : 1.15, .06);
};
BZ.say = say;
BZ.hudBind = () => {
  const H = BZ.hud, hype = v => { H.hype = clamp(H.hype + v, 0, 1); };
  const M = () => BZ.M;
  BZ.on('strike', d => { stamp(d.swing ? 'STRIKE!' : 'STRIKE!', '#ff8a8a', 1); say('strike', 1); });
  BZ.on('whiff', () => { say('whiff', 2); });
  BZ.on('ball', () => { stamp('BALL', '#9ad0ff', 1); say('ball', 1); });
  BZ.on('foul', () => { stamp('FOUL!', '#ffd070', 1); say('foul', 1); });
  BZ.on('contact', d => { H.flashT = d.kind === 'bz' ? .3 : .05; hype(d.Q > .7 ? .25 : .08); if (d.kind === 'bz') { stamp('BATZOOKA!!', '#ff7a2a', 2, 1.6); say('batzooka', 3); BZ.sfx('boom'); } });
  BZ.on('single', () => { stamp('BASE HIT!', '#9aff9a', 1.3, 1.2); say('single', 2); hype(.25); BZ.sfx('crowd'); });
  BZ.on('double', () => { stamp('DOUBLE!', '#9aff9a', 1.5, 1.4); say('double', 2); hype(.3); BZ.sfx('crowd'); });
  BZ.on('triple', () => { stamp('TRIPLE!', '#9aff9a', 1.8, 1.5); say('triple', 2); hype(.4); BZ.sfx('crowd'); });
  BZ.on('homer', d => { stamp('HOME RUN!', '#ffd23a', 2.4, 2.4); say('homer', 4, { d: BZ.feet(d.dist) }); hype(.7); BZ.sfx('crowd'); BZ.charge(); const g = My3D2dge.current; if (g) { g.flash('#ffffff', .25, .5); g.shake(d.bz ? 7 : 4); } });
  BZ.on('robbed', () => { stamp('ROBBED!', '#7affc0', 2, 1.8); say('robbed', 4); hype(.4); BZ.sfx('crowd'); });
  BZ.on('catch', d => { if (!d.robbed) { stamp('CAUGHT!', '#ffffff', 1.2); say('fly', 1); } });
  BZ.on('out', d => { if (d.how !== 'fly') { stamp('OUT!', '#ff6a6a', 1.5); BZ.sfx('out'); say('grounder', 1); } hype(.1); BZ.sfx('groan', { vol: .3 }); });
  BZ.on('strikeout', () => { stamp('STRIKEOUT!', '#ff6a6a', 2, 1.5); say('strikeout', 3); hype(.25); });
  BZ.on('walk', d => { stamp(d.hbp ? 'HIT BY PITCH!' : 'WALK', '#9ad0ff', 1.3, 1.3); say('walk', 2); });
  BZ.on('steal', () => { stamp('STOLEN BASE!', '#9aff9a', 1.5, 1.4); say('steal', 3); hype(.2); BZ.sfx('safe'); });
  BZ.on('run', d => { stamp('RUN SCORES!', '#ffd23a', 1.5, 1.3); say('run', 2); hype(.3); BZ.sfx('safe'); });
  BZ.on('doubleplay', () => { stamp('DOUBLE PLAY!', '#ff9ad0', 2, 1.6); say('doubleplay', 3); });
  BZ.on('rhubarb', () => { H.banner = { text: 'RHUBARB!', sub: 'The benches have cleared! MASH the button!', t: 0, life: 2.4, color: '#ff7a2a' }; say('rhubarb', 4); });
  BZ.on('meterfull', d => { stamp('BATZOOKA READY!', '#ffb030', 1.4, 1.5); BZ.sfx('coin'); });
  BZ.on('firepitch', () => { stamp('FIREBALL!', '#ff7a2a', 1.8, 1.2); });
  BZ.on('superfield', () => { stamp('ROCKET GLOVE!', '#ffd070', 1.8, 1.4); });
  BZ.on('wildthrow', () => { stamp('WILD THROW!', '#ffb08a', 1.3); BZ.sfx('groan', { vol: .2 }); });
  BZ.on('geyser', () => { BZ.sfx('boom', { vol: .2 }); });
  BZ.on('burn', () => { stamp('HOT FOOT!', '#ff7a2a', 1.4); });
  BZ.on('lostincorn', () => { stamp('LOST IN THE CORN!', '#e8d048', 1.6, 1.5); });
  BZ.on('half', d => { H.banner = { text: (d.half ? 'BOTTOM ' : 'TOP ') + 'OF THE ' + BZ.ord(d.inn), sub: BZ.M.sides[d.half].team.name + ' AT BAT', t: 0, life: 2.4, color: '#ffffff' }; if (d.inn > 1 || d.half) say('inning', 1); else say('start', 3); });
  BZ.on('gameover', d => { H.banner = { text: 'FINAL', sub: '', t: 0, life: 99, color: '#ffd23a' }; say('end', 4); });
  BZ.on('pitch', d => { H.mph = BZ.mph(d.speed); H.lastType = G.PITCHES[d.type].name; });
  BZ.on('wall', () => { BZ.sfx('mitt'); });
  BZ.on('batterup', () => { });
};
BZ.hudUpdate = dt => {
  const H = BZ.hud;
  H.hype = Math.max(0, H.hype - dt * .08); H.radioCool -= dt; H.flashT = Math.max(0, H.flashT - dt);
  for (const s of H.stamps) s.t += dt; H.stamps = H.stamps.filter(s => s.t < s.life);
  if (H.radio) { H.radio.t += dt; if (H.radio.t > H.radio.life) H.radio = null; }
  if (H.banner) { H.banner.t += dt; if (H.banner.t > H.banner.life) H.banner = null; }
};

/* ---- drawing ---- */
const shadowText = (g, t, x, y, c, o = {}) => E.font.text(g, t, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
function diamond(g, x, y, M) {
  px.poly(g, [[x + 11, y], [x + 22, y + 11], [x + 11, y + 22], [x, y + 11]], 'rgba(30,34,70,.9)');
  const occ = [false, false, false]; for (const r of M.runners) if (r.state === 'run' && onBaseSafe(r)) occ[Math.round(r.pos) - 1] = true;
  [[1, 22, 11], [2, 11, 0], [3, 0, 11]].forEach(([b, dx, dy]) => { px.rect(g, x + dx - 3, y + dy - 3, 7, 7, occ[b - 1] ? '#ffd23a' : '#4a4a68'); });
}
const onBaseSafe = r => Math.abs(r.pos - Math.round(r.pos)) < .06 && Math.round(r.pos) >= 1 && Math.round(r.pos) <= 3;
BZ.drawScorebug = (g, M, W_) => {
  const x = 4, y = 4, w = 124, h = 44;
  px.rect(g, x, y, w, h, 'rgba(8,10,26,.82)'); px.rect(g, x, y, w, 1, '#ffd23a');
  for (let i = 0; i < 2; i++) {
    const s = M.sides[i], yy = y + 4 + i * 11, at = M.half === i;
    px.rect(g, x + 4, yy + 1, 5, 7, s.team.chip); shadowText(g, s.team.short, x + 12, yy + 1, at ? '#ffffff' : '#a8a8c8');
    shadowText(g, String(M.score[i]), x + 44, yy + 1, '#ffe070', { align: 'right' });
    px.rect(g, x + 50, yy + 2, 40, 5, '#14162a'); px.rect(g, x + 51, yy + 3, Math.round(38 * s.meter / 100), 3, s.meter >= 100 ? (Math.floor(M.clock * 6) % 2 ? '#ffee66' : '#ff7a2a') : '#ff9a30');
    if (at) shadowText(g, '\u25b8', x + 92, yy + 1, '#ffd23a');
  }
  shadowText(g, (M.half ? 'BOT ' : 'TOP ') + M.inn, x + 4, y + 29, '#ffd23a');
  shadowText(g, M.balls + '-' + M.strikes, x + 40, y + 29, '#e8e8ff');
  for (let i = 0; i < 3; i++) px.disc(g, x + 66 + i * 7, y + 32, 2, i < M.outs ? '#ff5a5a' : '#3a3a58');
  diamond(g, x + w - 26, y + 14, M);
};
BZ.drawZone = (g, game, M, role, x, y, w, h) => {
  const u = w / 3.4, cx = x + w / 2, cy = y + h / 2;
  px.rect(g, x, y, w, h, 'rgba(8,10,26,.72)'); px.rect(g, x, y, w, 1, '#8888cc'); px.rect(g, x, y + h - 1, w, 1, '#8888cc'); px.rect(g, x, y, 1, h, '#8888cc'); px.rect(g, x + w - 1, y, 1, h, '#8888cc');
  // the strike zone
  const zx0 = cx - u, zy0 = cy - u, zs = u * 2;
  px.rect(g, zx0, zy0, zs, 1, '#ffffff'); px.rect(g, zx0, zy0 + zs, zs + 1, 1, '#ffffff'); px.rect(g, zx0, zy0, 1, zs, '#ffffff'); px.rect(g, zx0 + zs, zy0, 1, zs + 1, '#ffffff');
  for (let i = 1; i < 3; i++) { px.rect(g, zx0 + zs * i / 3, zy0, 1, zs, 'rgba(255,255,255,.22)'); px.rect(g, zx0, zy0 + zs * i / 3, zs, 1, 'rgba(255,255,255,.22)'); }
  const p = M.pitch;
  // the aim reticle (pitcher) and bat ring (batter)
  const showAim = role === 'pitch' && (M.phase === 'setup' || M.phase === 'windup' || M.phase === 'pitch');
  if (showAim) { const ax = cx + (p ? p.aim.u + p.aft.u : M.aim.u) * u, ay = cy + (p ? p.aim.v + p.aft.v : M.aim.v) * u; px.line(g, ax - 5, ay, ax + 5, ay, '#ff7a5a', 1); px.line(g, ax, ay - 5, ax, ay + 5, '#ff7a5a', 1); px.disc(g, ax, ay, 4, 'rgba(255,122,90,.25)'); }
  const rad = TUNE.sweet * u * (M.sw && M.sw.kind === 'bz' ? 2.4 : 1);
  const kx = cx + M.cur.u * u, ky = cy + M.cur.v * u, hot = M.sw ? '#ffee66' : '#7aff9a';
  if (role === 'bat' || role === 'both') {
    for (let a = 0; a < 16; a++) { const t = a / 16 * TAU; px.dot(g, kx + Math.cos(t) * rad, ky + Math.sin(t) * rad, hot); }
    px.dot(g, kx, ky, hot);
  }
  if (M.pitch && M.pitch.released && (M.phase === 'pitch' || M.phase === 'call')) {
    const uv = BZ.pitchUV(M.pitch, Math.min(M.pitch.t, M.pitch.T)), s = uv.s, bx = cx + uv.u * u, by = cy + uv.v * u, rr_ = 1.5 + 5 * s * s;
    px.disc(g, bx, by, rr_ + 1, 'rgba(0,0,0,.5)'); px.disc(g, bx, by, rr_, M.pitch.type === 'fire' ? '#ff8a30' : '#ffffff');
  }
  shadowText(g, role === 'pitch' ? 'AIM' : 'ZONE', x + 3, y + 3, '#aaaadd');
};
function radioBox(g, M, W_, H_) {
  const R = BZ.hud.radio; if (!R) return;
  const w = Math.min(W_ - 270, 250), x = Math.max(BZ.M && BZ.M.mode === 'derby' ? 162 : 136, (W_ - w) / 2), y = 4;
  px.rect(g, x, y, w, 20, 'rgba(8,10,26,.85)'); px.rect(g, x, y, w, 1, R.who === 'TEX' ? '#ffb070' : '#70c0ff');
  shadowText(g, R.who, x + 3, y + 3, R.who === 'TEX' ? '#ffb070' : '#70c0ff');
  const lines = E.font.wrap(R.text, w - 8); shadowText(g, lines[0] || '', x + 5, y + 10, '#ffffff');
  if (lines[1]) shadowText(g, lines[1], x + 5, y + 18, '#ffffff');
}
BZ.drawStamps = (g, W_, H_) => {
  const H = BZ.hud, ys = [H_ * .3, H_ * .3 + 24, H_ * .3 + 46];
  H.stamps.forEach((s, i) => {
    const k = s.t / s.life, pop = Math.min(1, s.t * 8), sc = Math.max(1, Math.round(s.big * (1.4 - .4 * pop))), a = k > .8 ? 1 - (k - .8) * 5 : 1;
    if (a <= 0) return;
    E.font.title(g, s.text, W_ / 2, ys[i] || ys[2], { scale: sc, colors: [s.color, shade(s.color, .6)], outline: '#101020', depth: 1, depthColor: '#000', align: 'center' });
  });
  if (H.banner) {
    const b = H.banner, k = b.t / b.life, wipe = Math.min(1, b.t * 6) * (k > .85 ? 1 - (k - .85) / .15 : 1);
    const h = 40 * wipe, y = H_ / 2 - h / 2; px.rect(g, 0, y, W_, h, 'rgba(8,10,26,.85)'); px.rect(g, 0, y, W_, 1, '#ffd23a'); px.rect(g, 0, y + h - 1, W_, 1, '#ffd23a');
    if (wipe > .6) { E.font.title(g, b.text, W_ / 2, y + 6, { scale: 2, colors: [b.color, shade(b.color, .7)], outline: '#101020', align: 'center' }); if (b.sub) shadowText(g, b.sub, W_ / 2, y + 28, '#e8e8ff', { align: 'center' }); }
  }
};
function shade(hex, k) { const c = E.hex ? E.hex(hex) : [255, 255, 255]; return '#' + c.map(v => clamp(Math.round(v * k), 0, 255).toString(16).padStart(2, '0')).join(''); }
BZ.shade = shade;
/* the prompts line under the action: what can I press now */
BZ.drawPrompts = (g, game, M, W_, H_, ctl) => {
  const items = BZ.promptsFor(M, game);
  let x = 6; const y = H_ - 14;
  px.rect(g, 0, y - 3, W_, 17, 'rgba(8,10,26,.6)');
  for (const [a, label] of items) { x += BZ.prompt(g, game, x, y, a, label, { input: ctl }) + 5; if (x > W_ - 60) break; }
};
BZ.promptsFor = (M, game) => {
  const bs = M.sides[M.half], ds = M.sides[1 - M.half], ph = M.phase;
  if (M.mode === 'derby') return [['stick', 'Aim'], ['swing', 'Swing'], ['power', M.sides[0].meter >= 100 ? 'BATZOOKA!' : 'Power swing']];
  const humanBat = bs.human, humanDef = ds.human;
  if (ph === 'setup' || ph === 'windup' || ph === 'pitch' || ph === 'call') {
    if (humanDef && !humanBat) return [['stick', 'Aim pitch'], ['dive', 'Pitch type'], ['swing', 'Throw'], ['power', ds.meter >= 100 ? 'FIREBALL!' : ''], ['dive', 'hold: Beanball']].filter(x => x[1]);
    if (humanBat && !humanDef) return [['stick', 'Aim bat'], ['swing', 'Swing'], ['tri', 'hold: Bunt'], ['power', bs.meter >= 100 ? 'BATZOOKA!' : 'Power swing'], ['cir', 'Steal']].filter(x => x[1]);
    if (humanBat && humanDef) return [['stick', 'Aim'], ['swing', 'Swing / Throw'], ['power', 'Power']];
    return [['pause', 'Pause']];
  }
  if (ph === 'play') {
    const out = [];
    if (humanDef) out.push(['stick', 'Chase'], ['dive', 'Dive / Jump'], ['turbo', 'Turbo'], ['th', 'Home'], ['t3', '3rd'], ['t2', '2nd'], ['t1', '1st']);
    if (humanBat) out.push(['tri', 'Advance'], ['cir', 'Recall'], ['turbo', 'Turbo']);
    return out.length ? out : [['pause', 'Pause']];
  }
  if (ph === 'rhubarb') return [['swing', 'MASH!']];
  return [['pause', 'Pause']];
};

/* ===== 35-game.js ===== */
/* BATZOOKA BASEBALL: the game object, its settings and the pause menu's extras. */
const game = BZ.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#06060c', input: BZ.PRESET,
  menu: {
    quit: (window.AIHub && window.AIHub.active) ? false : 'title',
    items: () => [BZ.inSession() ? null : ['Dev Mode', () => { game.resume(); if (game.scene && game.scene.openDev) game.scene.openDev(); }], game.scene && game.scene.canHelp ? ['Playbook', () => { game.resume(); if (game.scene.openHelp) game.scene.openHelp(); }] : null].filter(Boolean),
    settings: [
      { key: 'commentary', label: 'Radio commentary', value: true, group: 'Game' },
      { key: 'cpuLevel', label: 'CPU level', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star']], value: 'pro', type: 'select', group: 'Game' },
      { key: 'camMode', label: 'Camera in play', options: [['follow', 'Follow the ball'], ['wide', 'Wide']], value: 'follow', type: 'select', group: 'Game' },
      { key: 'crowdFx', label: 'Crowd detail', value: true, group: 'Game' }
    ]
  }
});
BZ.bindGame(game);
BZ.inSession = () => !!(window.AIHub && window.AIHub.active);
BZ.levelDiff = () => ({ rookie: .22, pro: .5, allstar: .82 }[game.settings.cpuLevel] ?? .5);
BZ.initAudio(game);
BZ.scenes = {};

/* ===== 36-dev.js ===== */
/* BATZOOKA BASEBALL: dev mode (from the pause menu). Live sliders for the balance numbers with a reset to defaults,
   plus tools: fill the meter, force a homer, set the count, load the bases, skip a half-inning, slow motion, god mode. */
BZ.devTools = [
  ['Fill Batzooka meters', M => { M.sides[0].meter = M.sides[1].meter = 100; }],
  ['Next hit is a home run', M => { M.forceHomer = !M.forceHomer; }],
  ['Load the bases', M => { M.runners = []; for (let b = 1; b <= 3; b++) { const o = BZ.off(), a = o.actors[(o.order + b) % 9]; addRunner(a, b); } }],
  ['Clear the bases', M => { M.runners = []; }],
  ['Add a run (batting team)', M => { M.score[M.half]++; M.line[M.half][M.inn - 1] = (M.line[M.half][M.inn - 1] || 0) + 1; }],
  ['Add an out', M => { M.outs = Math.min(2, M.outs + 1); }],
  ['Set count 3-2', M => { M.balls = 3; M.strikes = 2; }],
  ['Clear count', M => { M.balls = 0; M.strikes = 0; }],
  ['End this half-inning', M => { M.outs = 3; }],
  ['Skip to the last inning', M => { M.inn = Math.max(M.inn, M.innings); }],
  ['Slow motion on / off', M => { game.timeScale = game.timeScale < 1 ? 1 : .35; }],
  ['Auto-play my side (CPU)', M => { for (const s of M.sides) if (s.human) { s.wasHuman = true; s.human = false; } else if (s.wasHuman) { s.human = true; s.wasHuman = false; } }],
  ['Show the hit box / sweet spot', M => { BZ.showBox = !BZ.showBox; }],
  ['Close dev mode', M => { }]
];
BZ.devTools.unshift(['Reset sliders to defaults', M => { BZ.resetTune(); BZ.rebuildPark(); }]);
BZ.openDev = (scene) => {
  scene.dev = { open: true, running: false, i: 0, scroll: 0, keys: Object.keys(BZ.TUNE_META), msg: 'DEV MODE' };
  game.input.consumeAll();
};
BZ.devRows = scene => {
  const d = scene.dev, rows = [];
  rows.push({ kind: 'toggle', label: 'Keep the game running', get: () => d.running, set: v => { d.running = v; } });
  for (const k of d.keys) { const m = BZ.TUNE_META[k]; rows.push({ kind: 'slider', key: k, label: m[0], min: m[2], max: m[3], step: m[4], def: m[5], group: m[1] }); }
  BZ.devTools.forEach((t, i) => rows.push({ kind: 'btn', label: t[0] + (t[0].startsWith('Next hit') && BZ.M.forceHomer ? '  [ON]' : ''), fn: t[1], close: i === BZ.devTools.length - 1 }));
  return rows;
};
BZ.devUpdate = (scene, dt) => {
  const d = scene.dev, I = game.input, rows = BZ.devRows(scene), n = rows.length, vis = d.vis || 14;
  if (I.pressed('cancel') || I.pressed('pause') || I.pressed('start')) { d.open = false; game.timeScale = game.timeScale; I.consumeAll(); return; }
  if (I.repeat('up', .3, .09)) d.i = (d.i + n - 1) % n;
  if (I.repeat('down', .3, .09)) d.i = (d.i + 1) % n;
  const row = rows[d.i];
  d.scroll = clamp(d.scroll, d.i - vis + 1, d.i);
  const dir = (I.repeat('right', .3, .05) ? 1 : 0) - (I.repeat('left', .3, .05) ? 1 : 0);
  if (row.kind === 'slider' && dir) { const v = clamp(Math.round((BZ.TUNE[row.key] + dir * row.step * (I.down('turbo') ? 5 : 1)) / row.step) * row.step, row.min, row.max); BZ.TUNE[row.key] = +v.toFixed(4); if (row.key === 'fence') BZ.rebuildPark(); }
  if (row.kind === 'toggle' && (dir || I.pressed('confirm'))) row.set(!row.get());
  if (row.kind === 'btn' && I.pressed('confirm')) { row.fn(BZ.M); BZ.sfx('coin'); d.msg = row.label.toUpperCase(); if (row.close) d.open = false; I.consumeAll(); }
  // the mouse: hover picks a row, a click acts; the wheel scrolls
  const ptr = I.pointer && I.pointer();
  if (ptr && I.lastDevice === 'mouse' && d.rects) {
    const S = game.screen.S; const px_ = ptr[0] / S, py_ = ptr[1] / S;
    for (const rc of d.rects) if (px_ >= rc.x && px_ <= rc.x + rc.w && py_ >= rc.y && py_ <= rc.y + rc.h) {
      d.i = rc.i; const rw = rows[rc.i];
      if (I.pressed('swing')) { if (rw.kind === 'btn') { rw.fn(BZ.M); if (rw.close) d.open = false; } else if (rw.kind === 'toggle') rw.set(!rw.get()); else if (rw.kind === 'slider') { const k = clamp((px_ - rc.sx) / rc.sw, 0, 1); const v = rw.min + (rw.max - rw.min) * k; BZ.TUNE[rw.key] = +(Math.round(v / rw.step) * rw.step).toFixed(4); if (rw.key === 'fence') BZ.rebuildPark(); } }
    }
  }
  if (!d.open) { game.input.consumeAll(); }
};
BZ.devDraw = (scene, g, r) => {
  const d = scene.dev, rows = BZ.devRows(scene), W_ = r.W, H_ = r.H, rh = 11, vis = Math.max(6, Math.floor((H_ - 56) / rh)); d.vis = vis;
  const x = 4, y = 18, w = Math.min(250, W_ - 8);
  px.rect(g, x, y - 14, w, vis * rh + 40, 'rgba(6,8,22,.94)'); px.rect(g, x, y - 14, w, 1, '#7affc0');
  E.font.text(g, 'DEV MODE  -  ' + (d.running ? 'LIVE' : 'FROZEN'), x + 4, y - 10, '#7affc0', { shadow: '#000', outline: false });
  d.rects = [];
  d.scroll = clamp(d.scroll, d.i - vis + 1, d.i); const start = clamp(d.scroll, 0, Math.max(0, rows.length - vis));
  for (let k = 0; k < vis; k++) {
    const i = start + k, row = rows[i]; if (!row) break; const yy = y + k * rh, sel = i === d.i;
    if (sel) px.rect(g, x + 2, yy - 1, w - 4, rh - 1, 'rgba(122,255,192,.18)');
    E.font.text(g, row.label, x + 6, yy + 2, sel ? '#ffffff' : '#b8b8d8', { shadow: '#000', outline: false });
    let sx = 0, sw = 0;
    if (row.kind === 'slider') {
      const v = BZ.TUNE[row.key]; sw = 70; sx = x + w - sw - 36;
      px.rect(g, sx, yy + 4, sw, 3, '#2a2a48'); px.rect(g, sx, yy + 4, sw * (v - row.min) / (row.max - row.min), 3, v === row.def ? '#8888cc' : '#ffb030');
      px.rect(g, sx + sw * (row.def - row.min) / (row.max - row.min), yy + 2, 1, 7, '#ffffff');
      E.font.text(g, String(+v.toFixed(2)), x + w - 32, yy + 2, '#ffe070', { shadow: '#000', outline: false });
    } else if (row.kind === 'toggle') E.font.text(g, row.get() ? 'ON' : 'OFF', x + w - 28, yy + 2, row.get() ? '#7aff9a' : '#ff8a8a', { shadow: '#000', outline: false });
    d.rects.push({ i, x, y: yy - 1, w, h: rh - 1, sx, sw });
  }
  const f = y + vis * rh + 2;
  BZ.prompt(g, game, x + 4, f, 'up', ''); E.font.text(g, 'Move', x + 30, f + 2, '#aaaacc', { outline: false });
  BZ.prompt(g, game, x + 70, f, 'left', ''); E.font.text(g, 'Adjust (hold Turbo = x5)', x + 96, f + 2, '#aaaacc', { outline: false });
  E.font.text(g, d.msg || '', x + 4, f + 12, '#7affc0', { outline: false });
  if (BZ.showBox) { }
};

/* ---- derby HUD and the Playbook ---- */
BZ.drawDerbyHud = (g, game, M, W_, H_) => {
  const D = M.derby, p = D.players[D.cur];
  px.rect(g, 4, 4, 150, 46, 'rgba(8,10,26,.82)'); px.rect(g, 4, 4, 150, 1, '#ffd23a');
  E.font.text(g, 'HOME RUN DERBY', 8, 8, '#ffd23a', { shadow: '#000', outline: false });
  E.font.text(g, p.name + '   OUTS ' + (D.outsMax - p.outs) + '/' + D.outsMax, 8, 19, '#ffffff', { shadow: '#000', outline: false });
  E.font.text(g, 'HR ' + p.hr + '   BEST ' + p.best + ' FT', 8, 30, '#9aff9a', { shadow: '#000', outline: false });
  E.font.text(g, 'SCORE ' + p.score + (p.streak > 1 ? '  x' + p.streak : ''), 8, 41, '#ffe070', { shadow: '#000', outline: false });
  if (D.players.length > 1) D.players.forEach((q, i) => E.font.text(g, q.name + ' ' + q.score, W_ - 6, 6 + i * 10, i === D.cur ? '#ffe070' : '#9898b8', { align: 'right', shadow: '#000', outline: false }));
  if (D.clockLimit) { const left = Math.max(0, D.clockLimit - M.clock); E.font.text(g, 'TIME ' + Math.ceil(left), W_ / 2, 6, left < 15 ? '#ff6a6a' : '#ffffff', { align: 'center', shadow: '#000', outline: false }); }
  const m = M.sides[0].meter; px.rect(g, 4, 52, 100, 6, '#14162a'); px.rect(g, 5, 53, 98 * (m / 100), 4, m >= 100 ? '#ffee66' : '#ff9a30'); E.font.text(g, 'BATZOOKA', 108, 51, '#ffb030', { shadow: '#000', outline: false });
};
BZ.drawHelp = (g, game, W_, H_) => {
  px.rect(g, 0, 0, W_, H_, 'rgba(6,8,22,.94)');
  E.font.title(g, 'THE PLAYBOOK', W_ / 2, 8, { scale: 2, colors: ['#fff6c8', '#ffd23a'], outline: '#101020', align: 'center' });
  const I = game.input;
  const rows = [
    ['BATTING', [['stick', 'Move the bat ring to where the ball will cross'], ['swing', 'Swing as the ball reaches the plate'], ['tri', 'Hold + swing: bunt'], ['power', 'Full meter: BATZOOKA swing'], ['cir', 'Steal with a runner on']]],
    ['PITCHING', [['stick', 'Aim the pitch, then steer it in flight'], ['dive', 'Change pitch (hold: beanball!)'], ['swing', 'Throw'], ['power', 'Full meter: FIREBALL']]],
    ['FIELDING', [['stick', 'Chase the ball (the ring is you)'], ['th', 'Throw home'], ['t3', '3rd'], ['t2', '2nd'], ['t1', '1st'], ['dive', 'Dive / leap the wall'], ['sup', 'Full meter: ROCKET GLOVE']]],
    ['RUNNING', [['tri', 'Send runners forward'], ['cir', 'Recall them'], ['turbo', 'Turbo']]]
  ];
  let y = 30;
  for (const [h, items] of rows) {
    E.font.text(g, h, 14, y, '#7affc0', { shadow: '#000', outline: false }); y += 10;
    for (const [a, t] of items) { BZ.prompt(g, game, 20, y - 1, a, t); y += 12; }
    y += 3;
  }
  BZ.prompt(g, game, W_ / 2 - 40, H_ - 14, 'confirm', 'Back to the game');
};

/* ===== 40-match.js ===== */
/* BATZOOKA BASEBALL: the match scene (exhibition, tour, lessons, derby and the attract mode all run here). */
const ring = (r, x, y, rad, col, t = 0) => r.queue(x, y, 0, g => { const c = r.w(x, y, 0); const k = r.view && r.view.sy || .82; for (let a = 0; a < 20; a++) { const th = a / 20 * TAU + t; px.rect(g, Math.round(c[0] + Math.cos(th) * rad), Math.round(c[1] + Math.sin(th) * rad * .55), 2, 2, col); } }, { bias: -1, emissive: true });
function bindFx(scene) {
  const M = BZ.M, H = BZ.hud;
  BZ.on('homer', d => { scene.cheerTeam(d.side, 3.5); });
  BZ.on('run', d => { scene.cheerTeam(d.side, 1.4); });
  BZ.on('strikeout', () => { });
  BZ.on('meterfull', d => { if (M.sides[d.side].human && game.input.rumble) game.input.rumble(.5, .2); });
  BZ.on('contact', d => { if (M.sides[d.side === undefined ? M.half : d.side].human) game.input.rumble && game.input.rumble(clamp(d.Q, .2, 1) * .8, .12); });
  BZ.on('gameover', d => { scene.overT = 0; });
  BZ.on('lessondone', () => { scene.lessonDoneT = 0; if (scene.data.lesson) BZ.markLesson(scene.data.lesson); BZ.sfx('coin'); BZ.charge(); });
  BZ.on('batterup', d => { if (M.mode !== 'derby' && BZ.hud.radioCool < 0 && rfx() < .25) BZ.say('start', 1); });
  BZ.on('rhubarbend', d => { game.flash('#ffffff', .2, .5); });
}
BZ.scenes.match = {
  pausable: true, view: 'threequarter', input: BZ.PRESET, res: 'ps1', canHelp: true, camera: false,
  enter(data) {
    data = this.data = data || {};
    const humans = data.humans || [true, false];
    const lv = data.diff == null ? BZ.levelDiff() : data.diff;
    const aw = Object.assign({ team: 'hay' }, data.away), ho = Object.assign({ team: 'cin' }, data.home);
    if (data.derby) {
      const pl = (data.players || ['P1']).map((n, i) => ({ name: n, ctl: game.players[Math.min(i, game.players.length - 1)] || game.input, human: true }));
      BZ.M = null; BZ.newDerby({ park: data.park, players: pl, outs: data.outs || 7, seed: data.seed, hub: data.hub, pitchSeq: data.pitchSeq });
    } else {
      BZ.newMatch({ park: data.park || 'corn', away: aw, home: ho, innings: data.innings || 3, seed: data.seed, diff: lv, attract: !!data.attract, lesson: data.lesson, mode: 'game', noBetween: false });
      const M0 = BZ.M;
      M0.sides[0].human = !!humans[0] && !data.attract; M0.sides[1].human = !!humans[1] && !data.attract;
      M0.sides[0].ctl = M0.sides[0].human ? game.players[0] : null;
      M0.sides[1].ctl = M0.sides[1].human ? (game.players[1] || game.players[0]) : null;
      if (data.lesson) BZ.applyLessonSides(data.lesson);
      if (data.tour) { M0.sides[0].up = data.tour.up; }
    }
    const M = BZ.M; this.M = M; M.attract = !!data.attract;
    BZ.clearListeners(); BZ.hudReset(); BZ.hudBind(); bindFx(this);
    BZ.cosmetic = true; this.park = BZ.buildPark(M.parkDef);
    game.cam.bounds = v => this.park.map.bounds(v);
    game.follow(null); game.resetCamera(); game.cam.smooth = .12;
    this.camX = G.HX; this.camY = G.HY - 100;
    const pd = M.parkDef;
    game.lights.enabled = !!pd.lights; game.lights.ambient = pd.ambient;
    game.weather = pd.weather ? { kind: pd.weather, amount: .35, wind: .2 } : null;
    BZ.music(pd.song || 'play');
    this.over = false; this.overT = 0; this.lessonDoneT = -1; this.dev = null; this.cheer = [0, 0]; this.talkT = 0;
    this.rhubarbRigs = null; this.endCalled = false; this.attractT = 0; this.hubT = 0;
    if (M.mode === 'game') BZ.emit('half', { inn: 1, half: 0 });
    game.input.consumeAll();
    if (data.onEnter) data.onEnter(this);
    if (data.lesson) BZ.hud.banner = { text: 'LESSON ' + data.lesson, sub: BZ.get('lessons', data.lesson).name, t: 0, life: 2.6, color: '#7affc0' };
    BZ.mascotInit && BZ.mascotInit(M);
  },
  exit() { game.weather = null; game.lights.enabled = false; BZ.clearListeners(); if (BZ.M) BZ.M.derbyLeave = true; },
  cheerTeam(side, s) { this.cheer[side] = s; },
  openDev() { BZ.openDev(this); },
  openHelp() { this.helpOpen = true; },
  update(dt) {
    const M = this.M;
    if (this.helpOpen) { if (game.input.pressed('confirm') || game.input.pressed('cancel') || game.input.pressed('start')) { this.helpOpen = false; game.input.consumeAll(); } return; }
    if (this.dev && this.dev.open) { BZ.devUpdate(this, dt); if (!this.dev.running) return; }
    // attract: any input leaves
    if (M.attract) { this.attractT += dt; if (this.attractT > .6 && (game.input.anyPressed() || game.input.pointerMoved && game.input.pointerMoved())) { game.go('title'); return; } if (M.over && this.overT > 3) { this.restartAttract(); return; } }
    // intents: humans through their controller; the bot or tests may override
    for (let i = 0; i < 2; i++) {
      const sd = M.sides[i];
      M.intent[i] = BZ.botIntent ? BZ.botIntent(i, M) : (sd.human && sd.ctl) ? BZ.readIntent(game, sd.ctl, i) : {};
    }
    if (this.data.hub && BZ.hubTick(this, dt) === 'wait') { BZ.hudUpdate(dt); this.updateCosmetics(dt); this.updateCamera(dt); return; }
    BZ.hudUpdate(dt);
    BZ.updateSim(dt);
    if (M.over) { this.overT += dt; if (!this.endCalled && this.overT > (M.attract ? 3 : 3.2)) { this.endCalled = true; this.finish(); } }
    if (this.lessonDoneT >= 0) { this.lessonDoneT += dt; if (this.lessonDoneT > 3) { game.go('training'); return; } }
    this.cheer[0] = Math.max(0, this.cheer[0] - dt); this.cheer[1] = Math.max(0, this.cheer[1] - dt);
    for (const a of M.sides[0].actors.concat(M.sides[1].actors)) { if (a.mood === 'cheer' && M.phase !== 'homer' && M.phase !== 'rhubarbwin' && (M.phase === 'setup')) a.mood = null; }
    this.updateCosmetics(dt);
    this.updateCamera(dt);
    this.updateAudio(dt);
    if (M.shake > 0) game.shake(M.shake * 3), M.shake = 0;
    if (this.data.onUpdate) this.data.onUpdate(this, dt);
  },
  restartAttract() { game.go('match', Object.assign({}, this.data, { seed: (this.data.seed || 1) + 1, park: pickOf(['corn', 'moon', 'magma', 'mega'], rfx), away: { team: pickOf(['hay', 'lem'], rfx) }, home: { team: pickOf(['cin', 'meg'], rfx) } })); },
  finish() {
    const M = this.M;
    if (this.data.onFinish) return this.data.onFinish(this, M);
    if (M.attract) return;
    if (this.data.derby) { if (this.data.hub) return; return game.go('derbyend', { players: M.derby.players.map(p => Object.assign({}, p, { ctl: null })) }); }
    game.go('results', { M: BZ.summary(M), data: this.data });
  },
  updateCosmetics(dt) {
    const M = this.M;
    if (BZ.cosmetic) {
      BZ.updateRigs(dt, M); BZ.umpireUpdate(dt);
      if (M.phase === 'rhubarb' || M.phase === 'rhubarbwin') this.updateRhubarbRigs(dt);
    }
    // the dugouts, the mascot, the crowd cheer
    if (BZ.mascot) BZ.mascot.tick && BZ.mascot.tick(dt);
  },
  updateRhubarbRigs(dt) {
    const M = this.M;
    if (!this.rhubarbRigs) {
      this.rhubarbRigs = [];
      for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) { const a = M.sides[s].actors[(i * 2 + s) % 9], rig = BZ.rigFor(a, M.sides[s].team, false); this.rhubarbRigs.push({ a, rig, s, i, t: rfx() * 3 }); }
    }
    for (const q of this.rhubarbRigs) {
      q.t += dt; const ang = q.i / 5 * TAU + (q.s ? PI / 5 : 0) + Math.sin(M.clock * 3 + q.i) * .3, rad = 16 + Math.sin(q.t * 6) * 4;
      q.x = Math.cos(ang) * rad; q.y = Math.sin(ang) * rad * .6 - 6;
      const u = (q.t * 2.2) % 1, attack = { spec: E.MOVES[['haymaker', 'cross', 'hook', 'jab'][q.i % 4]], phase: u < .35 ? 'wind' : u < .6 ? 'active' : 'recover', u: u < .35 ? u / .35 : u < .6 ? (u - .35) / .25 : (u - .6) / .4 };
      q.rig.update(dt, { x: q.x, y: q.y, z: 0, facing: ang + PI, vx: 0, vy: 0, attack });
    }
  },
  updateCamera(dt) {
    const M = this.M, ph = M.phase;
    let tx, ty;
    if (ph === 'play' && game.settings.camMode !== 'wide') {
      const b = M.ball; let bx = b.x, by = b.y;
      if (b.state === 'held' && b.holder) { bx = b.holder.x; by = b.holder.y; }
      const rn = M.runners.filter(r => r.state === 'run' && r.dir !== 0)[0];
      tx = G.HX + (rn ? (bx + rn.actor.x) / 2 : bx); ty = G.HY + (rn ? (by + rn.actor.y) / 2 : by);
      if (M.stealPlay) { tx = G.HX; ty = G.HY - 230; }
    } else if (ph === 'play' || ph === 'foul' || ph === 'resolved') { tx = G.HX; ty = G.HY - 300; }
    else if (ph === 'homer') { const b = M.ball; tx = G.HX + b.x * .7; ty = G.HY + b.y * .75 - 30; }
    else if (ph === 'between') { tx = G.HX; ty = G.HY - 230; }
    else if (ph === 'over') { tx = G.HX; ty = G.HY - 200; }
    else if (ph === 'rhubarb' || ph === 'rhubarbwin') { tx = G.HX; ty = G.HY - 10; }
    else { tx = G.HX; ty = G.HY - 96; }
    const k = Math.min(1, dt * (ph === 'play' ? 5 : 3.5));
    this.camX = lerp(this.camX, tx, k); this.camY = lerp(this.camY, ty, k);
    game.focus(this.camX, this.camY, 0);
    const zz = ph === 'play' ? (game.settings.camMode === 'wide' ? .42 : 0.6) : ph === 'homer' ? .42 : ph === 'between' || ph === 'resolved' ? .45 : ph === 'foul' ? .5 : .66;
    this.zoomT = lerp(this.zoomT || 1, zz, Math.min(1, dt * 1.5));
    if (Math.abs((game.zoom || 1) - this.zoomT) > .03) game.setZoom(this.zoomT);
  },
  updateAudio(dt) {
    const M = this.M, H = BZ.hud;
    this.audT = (this.audT || 0) - dt;
    if (this.audT <= 0) {
      this.audT = .5;
      const tense = M.runners.some(r => r.state === 'run' && r.pos >= 2) || H.hype > .45;
      try { game.audio.layer('drums', tense ? 1 : 0, 1.2); } catch (e) { /* no such layer in this song */ }
      if (H.hype > .3 && rfx() < .1) BZ.sfx('crowd', { vol: .5 * H.hype });
    }
  },
  draw(r) {
    const M = this.M, P = this.park, H = BZ.hud;
    // light the park
    if (M.parkDef.lights) {
      for (const s of [-1, 1]) for (const k of [.55, 1]) game.lights.add(G.HX + s * (BZ.fenceR(0) * .7 * k + 40), G.HY - BZ.fenceR(0) * .62 * k - 70, 90, 330, .9, { color: '#fff4d0' });
      game.lights.add(G.HX, G.HY - 200, 40, 280, .8, { color: '#fff0c0' }); game.lights.add(G.HX, G.HY - 10, 40, 160, .7, { color: '#fff0c0' });
      const b = M.ball; if (b.fire) game.lights.add(G.HX + b.x, G.HY + b.y, b.z + 8, 80, 1, { color: '#ff9a40' });
    }
    P.map.drawFloor(r);
    BZ.drawField(r, M);
    P.map.queueWalls(r);
    BZ.drawScenery(r, M);
    if (game.settings.crowdFx) BZ.drawCrowd(r, M, H.hype);
    // players
    const bs = M.sides[M.half], ds = M.sides[1 - M.half];
    const ctlF = M.phase === 'play' && ds.human ? BZ.controlled(1 - M.half) : null;
    for (const a of ds.actors) { if (M.mode === 'derby' && a.pos !== 'P' && a.pos !== 'C') continue; if (a.rig) BZ.drawActor(r, a, a.rig, M); }
    for (const rn of M.runners) if ((rn.state === 'run' || rn.state === 'score') && rn.actor.rig) BZ.drawActor(r, rn.actor, rn.actor.rig, M);
    if (M.batter && !M.runners.find(q => q.actor === M.batter) && M.batter.rig && M.phase !== 'over') BZ.drawActor(r, M.batter, M.batter.rig, M);
    r.actor(G.HX, G.HY + 36, 0, (g, ox, oy) => BZ.umpireRig.draw(g, ox, oy, r.view));
    if (BZ.mascot && BZ.mascot.draw) BZ.mascot.draw(r);
    if (this.rhubarbRigs && (M.phase === 'rhubarb' || M.phase === 'rhubarbwin')) {
      for (const q of this.rhubarbRigs) r.actor(G.HX + q.x, G.HY + q.y, 0, (g, ox, oy) => q.rig.draw(g, ox, oy, r.view));
      const R = M.rhubarb;
      r.queue(G.HX, G.HY - 2, 30, g => { const c = r.w(G.HX, G.HY - 2, 12); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + M.clock * 2.6, rad = 14 + Math.sin(M.clock * 9 + i * 1.7) * 5; px.disc(g, c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad * .6, 7 + (i % 3) * 2, i % 2 ? 'rgba(230,214,170,.78)' : 'rgba(200,180,140,.82)'); } if (rfx() < .5) E.font.text(g, ['POW', 'BAM', 'WHAP', 'OOF'][Math.floor(M.clock * 9) % 4], c[0] + Math.sin(M.clock * 8) * 14 - 8, c[1] - 20, '#ffe070', { outline: '#a02010' }); }, { bias: 5 });
    }
    // controlled fielder ring, landing marker
    if (ctlF && !M.over) ring(r, G.HX + ctlF.x, G.HY + ctlF.y, 11, '#ffee66', M.clock * 2);
    if (M.phase === 'play' && ds.human && M.pred && M.ball.state === 'hit' && M.ball.z > 12) {
      const lp = M.pred.find(p => p.z <= 3 && p.bounces >= 0 && p.t > .05) || M.pred[M.pred.length - 1];
      if (lp && !lp.homer) ring(r, G.HX + lp.x, G.HY + lp.y, 9 + Math.sin(M.clock * 12) * 2, '#ffffff', 0);
    }
    BZ.drawBall(r, M);
    r.overlay(g => this.drawHud(g, r));
  },
  drawHud(g, r) {
    const M = this.M, W_ = r.W, H_ = r.H, H = BZ.hud, bs = M.sides[M.half], ds = M.sides[1 - M.half];
    if (H.flashT > 0) px.rect(g, 0, 0, W_, H_, 'rgba(255,255,255,' + Math.min(.6, H.flashT * 2) + ')');
    if (this.data.derby) { BZ.drawDerbyHud(g, game, M, W_, H_); }
    else BZ.drawScorebug(g, M, W_);
    // pitch info
    const ph = M.phase;
    if (!M.over) {
      const batMode = bs.human && !(M.mode === 'derby' ? false : false), pitchMode = ds.human && M.mode !== 'derby';
      if (ph === 'setup' || ph === 'windup' || ph === 'pitch' || ph === 'call') {
        const role = M.mode === 'derby' ? 'bat' : (bs.human && ds.human) ? 'both' : ds.human ? 'pitch' : 'bat';
        const zw = 66, zh = 70;
        BZ.drawZone(g, game, M, role, W_ - zw - 6, H_ - zh - 56, zw, zh);
        if (M.mode !== 'derby') {
          const nm = G.PITCHES[M.pitch ? M.pitch.type : G.ORDER[M.sel % 4]].name;
          if (ds.human && (ph === 'setup' || ph === 'windup')) { shadowText2(g, nm, W_ - zw / 2 - 6, H_ - zh - 66, '#ffe070'); }
          else if (M.pitch && M.pitch.released) shadowText2(g, H.lastType + ' ' + H.mph + ' MPH', W_ - zw / 2 - 6, H_ - zh - 66, '#ffffff');
          const p = fielderOf('P'), b = M.batter;
          shadowText2(g, p.name + ' vs ' + b.name, W_ - zw / 2 - 6, H_ - zh - 76, '#e8e8ff');
        }
      } else if (ph === 'play' || ph === 'homer') {
        if (H.mph && ph === 'play' && M.lastHit) shadowText2(g, 'EXIT ' + BZ.mph(M.lastHit.v) + ' MPH  ' + (M.lastHit.kind === 'bz' ? 'BATZOOKA' : ''), W_ - 60, 6, '#ffe070');
      }
    }
    radioBox(g, M, W_, H_);
    BZ.drawStamps(g, W_, H_);
    if (!M.attract) BZ.drawPrompts(g, game, M, W_, H_, bs.human ? bs.ctl : ds.ctl);
    if (M.derbyPopup && M.derbyPopup.t < 2) { M.derbyPopup.t += .016; E.font.title(g, M.derbyPopup.text, W_ / 2, H_ * .48, { scale: 3, colors: ['#ffffff', '#ffd23a'], outline: '#101020', align: 'center' }); }
    if (M.phase === 'rhubarb' && M.rhubarb) {
      const R = M.rhubarb, w = Math.min(220, W_ - 40), x = (W_ - w) / 2, y = H_ * .22;
      px.rect(g, x - 1, y - 1, w + 2, 12, '#000'); px.rect(g, x, y, w, 10, '#202040'); px.rect(g, x + w / 2, y, w / 2 * R.bar, 10, M.sides[0].team.chip === '#f2d544' ? '#f2d544' : M.sides[0].team.chip);
      px.rect(g, x + w / 2 + w / 2 * R.bar * 0, y, 1, 10, '#fff');
      shadowText2(g, M.sides[0].team.short, x - 20, y + 2, M.sides[0].team.chip); shadowText2(g, M.sides[1].team.short, x + w + 20, y + 2, M.sides[1].team.chip);
      shadowText2(g, 'MASH ' + game.input.label('swing') + '!   TIME ' + Math.ceil(R.dur - R.t), W_ / 2, y + 16, '#ffe070');
    }
    if (this.lessonDoneT >= 0 || this.data.lesson) {
      const L = BZ.get('lessons', this.data.lesson);
      if (L) { px.rect(g, W_ / 2 - 150, 52, 300, 22, 'rgba(8,10,26,.8)'); const ls = E.font.wrap(this.lessonDoneT >= 0 ? L.done : L.hint, 292); shadowText2(g, ls[0] || '', W_ / 2, 55, this.lessonDoneT >= 0 ? '#7affc0' : '#ffffff'); if (ls[1]) shadowText2(g, ls[1], W_ / 2, 64, this.lessonDoneT >= 0 ? '#7affc0' : '#ffffff'); }
    }
    if (M.attract) { if (Math.floor(game.time * 1.4) % 2) E.font.title(g, 'DEMO', W_ - 38, 10, { scale: 2, colors: ['#ffffff', '#ffd23a'], outline: '#101020', align: 'center' }); shadowText2(g, 'PRESS ANY BUTTON', W_ / 2, H_ - 14, '#ffffff'); }
    if (M.over && !M.derby) {
      const w = M.winner; E.font.title(g, w < 0 ? 'A TIE!' : M.sides[w].team.name + ' WIN!', W_ / 2, H_ * .38, { scale: 2, colors: ['#ffffff', '#ffd23a'], outline: '#101020', align: 'center' });
    }
    if (this.helpOpen) BZ.drawHelp(g, game, W_, H_);
    if (this.dev && this.dev.open) BZ.devDraw(this, g, r);
  }
};
const shadowText2 = (g, t, x, y, c) => E.font.text(g, t, x, y, c, { align: 'center', shadow: '#000', outline: false });
BZ.summary = M => ({ score: M.score.slice(), line: M.line.map(l => l.slice()), winner: M.winner, teams: M.sides.map(s => s.team.id), stat: M.sides.map(s => Object.assign({}, s.stat)), park: M.parkDef.id, inn: M.inn, humans: M.sides.map(s => s.human), best: M.bestDist, innings: M.innings });
BZ.applyLessonSides = n => {
  const M = BZ.M, L = BZ.get('lessons', n), s = L.setup;
  if (s.role === 'bat' || s.role === 'run') { M.sides[0].human = true; M.sides[0].ctl = game.players[0]; M.sides[1].human = false; M.half = 0; }
  else { // pitching and fielding lessons: you defend (the second side is the home team in the field)
    M.sides[0].human = false; M.sides[1].human = true; M.sides[1].ctl = game.players[0]; M.sides[0].ctl = null; M.half = 0;
  }
  if (s.runners) for (const b of s.runners) { const a = M.sides[M.half].actors[(b + 3) % 9]; addRunner(a, b); a.rig = null; }
  if (s.meter) M.sides[M.half].meter = s.meter;
  M.innings = 99; BZ.startHalfKeep && 0;
  M.sides[M.half].order = 0; BZ.nextBatter();
};

/* ===== 45-screens.js ===== */
/* BATZOOKA BASEBALL: the menu scenes. Title (with a live CPU game behind it and the attract mode after 10 idle
   seconds), exhibition setup, results, Spring Training, Home Run Derby setup, About, and the touch-only notice. */
BZ.touchOnly = () => { try { return location.hash === '#touch' || (('ontouchstart' in window || navigator.maxTouchPoints > 0) && !matchMedia('(any-pointer: fine)').matches && !(navigator.getGamepads && [...navigator.getGamepads()].some(Boolean))); } catch (e) { return false; } };
const TEAM_IDS = ['hay', 'lem', 'cin', 'meg'], PARK_IDS = ['corn', 'moon', 'magma', 'mega'];

/* a list of rows that change with left/right (or a click on the arrows), buttons that run on confirm; mouse hover moves the focus */
class OptionList {
  constructor(rows, o = {}) { this.rows = rows; this.i = o.start || 0; this.o = o; this.rects = []; }
  value(k) { const r = this.rows.find(x => x.key === k); return r ? r.vals[r.idx][0] : null; }
  update(dt) {
    const I = game.input, n = this.rows.length;
    let moved = false;
    if (I.repeat('up', .3, .1)) { this.i = (this.i + n - 1) % n; moved = true; }
    if (I.repeat('down', .3, .1)) { this.i = (this.i + 1) % n; moved = true; }
    const row = this.rows[this.i];
    const dir = (I.repeat('right', .3, .12) ? 1 : 0) - (I.repeat('left', .3, .12) ? 1 : 0);
    if (dir && row.vals) this.change(row, dir);
    if (I.pressed('confirm') || I.pressed('start')) { if (row.vals && !row.fn) this.change(row, 1); else if (row.fn) { BZ.sfx('coin'); row.fn(this); } }
    if (I.pressed('cancel') && this.o.onCancel) this.o.onCancel();
    const p = I.pointer && I.pointer();
    if (p && I.lastDevice === 'mouse') {
      const S = game.screen.S, mx = p[0] / S, my = p[1] / S;
      for (const rc of this.rects) if (mx >= rc.x && mx <= rc.x + rc.w && my >= rc.y && my <= rc.y + rc.h) {
        const was = this.i; if (rc.i !== this.i && (this.lastMx !== mx || this.lastMy !== my)) this.i = rc.i;
        if (I.pressed('swing') || I.pressed('confirm')) { this.i = rc.i; const rw = this.rows[rc.i]; if (rw.vals) this.change(rw, mx > rc.x + rc.w / 2 ? 1 : -1); else if (rw.fn) { BZ.sfx('coin'); rw.fn(this); } }
      }
      this.lastMx = mx; this.lastMy = my;
    }
    if (moved) BZ.sfx('tick');
  }
  change(row, dir) { row.idx = (row.idx + dir + row.vals.length) % row.vals.length; BZ.sfx('tick'); if (row.onChange) row.onChange(row.vals[row.idx][0], this); }
  draw(g, x, y, w, rh = 17) {
    this.rects = [];
    this.rows.forEach((row, i) => {
      const yy = y + i * rh, sel = i === this.i;
      if (sel) { px.rect(g, x, yy - 2, w, rh - 2, 'rgba(255,210,58,.22)'); px.rect(g, x, yy - 2, 2, rh - 2, '#ffd23a'); }
      E.font.text(g, row.label, x + 8, yy + 2, sel ? '#ffffff' : '#b8b8d8', { shadow: '#000', outline: false });
      if (row.vals) {
        const t = row.vals[row.idx][1], tw = E.font.width(t);
        E.font.text(g, '←', x + w - tw - 24, yy + 2, sel ? '#ffd23a' : '#6a6a8a', { outline: false }); E.font.text(g, t, x + w - tw - 12, yy + 2, '#ffe070', { shadow: '#000', outline: false }); E.font.text(g, '→', x + w - 9, yy + 2, sel ? '#ffd23a' : '#6a6a8a', { outline: false });
      }
      this.rects.push({ i, x, y: yy - 2, w, h: rh - 2 });
    });
  }
}
BZ.OptionList = OptionList;
const optRow = (label, key, vals, idx = 0, extra = {}) => Object.assign({ label, key, vals, idx }, extra);
const frameBox = (g, x, y, w, h, title) => { px.rect(g, x, y, w, h, 'rgba(8,10,26,.88)'); px.rect(g, x, y, w, 1, '#ffd23a'); px.rect(g, x, y + h - 1, w, 1, '#ffd23a'); px.rect(g, x, y, 1, h, '#ffd23a'); px.rect(g, x + w - 1, y, 1, h, '#ffd23a'); if (title) E.font.title(g, title, x + w / 2, y + 6, { scale: 2, colors: ['#fff6c8', '#ffd23a'], outline: '#101020', align: 'center' }); };
BZ.frameBox = frameBox; BZ.optRow = optRow;

/* ---- a field backdrop shared by menu scenes: the park from a high camera, a CPU game running quietly ---- */
BZ.stage = {
  start(parkId, seedOff) {
    const ids = PARK_IDS; BZ.clearListeners();
    BZ.newMatch({ park: parkId || 'corn', attract: true, diff: .9, innings: 9, seed: 40 + (seedOff || 0), away: { team: 'hay' }, home: { team: 'cin' } });
    BZ.M.noIntro = true; BZ.M.attract = true; BZ.hudReset(); BZ.hudBind(); BZ.stage.park = BZ.buildPark(BZ.M.parkDef); BZ.M.mute = true;
    BZ.cosmetic = true; BZ.stage.t = 0;
  },
  update(dt) { const M = BZ.M; if (!M) return; BZ.hudUpdate(dt); BZ.updateSim(dt); BZ.updateRigs(dt, M); BZ.umpireUpdate(dt); if (M.over) BZ.stage.start(M.parkDef.id, Math.floor(game.time)); BZ.stage.t += dt; },
  draw(r, cx, cy) {
    const M = BZ.M; if (!M) return; const P = BZ.stage.park || BZ.buildPark(M.parkDef);
    P.map.drawFloor(r); BZ.drawField(r, M); P.map.queueWalls(r); BZ.drawScenery(r, M); BZ.drawCrowd(r, M, .25);
    const bs = M.sides[M.half], ds = M.sides[1 - M.half];
    for (const a of ds.actors) if (a.rig) BZ.drawActor(r, a, a.rig, M);
    for (const rn of M.runners) if (rn.state === 'run' && rn.actor.rig) BZ.drawActor(r, rn.actor, rn.actor.rig, M);
    if (M.batter && M.batter.rig && !M.runners.find(q => q.actor === M.batter)) BZ.drawActor(r, M.batter, M.batter.rig, M);
    r.actor(G.HX, G.HY + 36, 0, (g, ox, oy) => BZ.umpireRig.draw(g, ox, oy, r.view));
    BZ.drawBall(r, M);
  },
  camera(dt, mode) {
    const M = BZ.M; let tx = G.HX, ty = G.HY - 170;
    if (M && M.phase === 'play') { tx = G.HX + M.ball.x * .6; ty = G.HY + M.ball.y * .6; }
    BZ.stage.cx = lerp(BZ.stage.cx || tx, tx, Math.min(1, dt * 2)); BZ.stage.cy = lerp(BZ.stage.cy || ty, ty, Math.min(1, dt * 2));
    game.focus(BZ.stage.cx, BZ.stage.cy, 0);
  }
};

/* ---- the title ---- */
BZ.scenes.title = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 0); game.lights.enabled = false; game.weather = { kind: 'leaves', amount: .25, wind: .3 }; game.resetCamera(); game.setZoom(.5); BZ.stage.cx = G.HX; BZ.stage.cy = G.HY - 170;
    const touch = BZ.touchOnly();
    this.touch = touch; this.idle = 0; this.sub = null;
    const items = touch ? [] : ['PLAY BALL', 'THE TOUR', 'HOME RUN DERBY', 'SPRING TRAINING', 'OPTIONS', 'ABOUT'];
    this.menu = new E.Menu(game, items, { x: 'center', y: 118, onPick: (i, it) => this.pick(it) });
    BZ.music('title'); game.cam.bounds = null; this.t = 0;
    this.best = E.store.get('bz.derbybest', 0);
    game.input.consumeAll();
    if (BZ.deepLink) BZ.deepLink();
  },
  exit() { game.weather = null; },
  pick(label) {
    BZ.sfx('coin');
    if (label === 'PLAY BALL') game.go('setup'); else if (label === 'THE TOUR') game.go('tour'); else if (label === 'HOME RUN DERBY') game.go('derbysetup');
    else if (label === 'SPRING TRAINING') game.go('training'); else if (label === 'OPTIONS') game.menu('settings'); else if (label === 'ABOUT') game.go('about');
  },
  update(dt) {
    this.t += dt; BZ.stage.update(dt); BZ.stage.camera(dt);
    const I = game.input;
    if (I.anyPressed() || (I.pointerMoved && I.pointerMoved()) || (I.move()[0] || I.move()[1])) this.idle = 0; else this.idle += dt;
    if (!this.touch) this.menu.update(dt);
    if (this.touch && (I.pressed('start') || I.clicked && I.clicked())) game.menu('settings');
    if (this.idle >= 10) { this.startAttract(); }
  },
  startAttract() {
    const n = (this.attractN = (this.attractN || 0) + 1), parks = PARK_IDS, teams = [['hay', 'cin'], ['lem', 'meg'], ['cin', 'hay'], ['meg', 'lem']];
    game.go('match', { attract: true, park: parks[n % 4], seed: 100 + n, away: { team: teams[n % 4][0] }, home: { team: teams[n % 4][1] }, innings: 9, diff: .8, humans: [false, false] });
  },
  draw(r) {
    game.lights.enabled = false;
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H;
      px.rect(g, 0, 0, W_, 92, 'rgba(6,8,22,.55)');
      E.font.title(g, 'BATZOOKA', W_ / 2, 8, { scale: 4, colors: ['#fff6c8', '#ffd23a', '#ff8a2a'], outline: '#2a0c10', depth: 3, depthColor: '#7a2a10', align: 'center' });
      E.font.title(g, 'BASEBALL', W_ / 2, 46, { scale: 3, colors: ['#ffffff', '#9ad0ff', '#4a7ae0'], outline: '#0c1230', depth: 2, depthColor: '#1a2a70', align: 'center' });
      // a rocket-bat flourish
      const bx = W_ / 2 + 120, by = 34; px.line(g, bx - 18, by + 12, bx + 16, by - 12, '#c89a5a', 4); px.line(g, bx - 18, by + 12, bx + 16, by - 12, '#e8c080', 1); px.poly(g, [[bx - 20, by + 14], [bx - 30, by + 22], [bx - 24, by + 10]], (Math.floor(game.time * 12) % 2) ? '#ffd23a' : '#ff6a20');
      if (this.touch) {
        px.rect(g, 0, H_ / 2 - 20, W_, 40, 'rgba(6,8,22,.85)'); E.font.title(g, 'CONTROLLER OR KEYBOARD REQUIRED', W_ / 2, H_ / 2 - 8, { scale: 1, colors: ['#ffffff', '#ffd23a'], outline: '#101020', align: 'center' });
        E.font.text(g, 'Tap the menu button (top right) for settings', W_ / 2, H_ / 2 + 8, '#b8b8d8', { align: 'center', shadow: '#000', outline: false });
      } else {
        this.menu.y = Math.max(96, H_ - 6 * 20 - 24);
        px.rect(g, W_ / 2 - 74, this.menu.y - 8, 148, 6 * 20 + 8, 'rgba(6,8,22,.7)');
      }
      E.font.text(g, 'v' + BZ.version + '   (c) 2026 Barnstorm Games   ' + (this.idle > 5 ? 'Demo in ' + Math.ceil(10 - this.idle) : ''), W_ / 2, H_ - 8, '#8888aa', { align: 'center', shadow: '#000', outline: false });
      if (this.best) E.font.text(g, 'DERBY BEST ' + this.best, W_ - 6, H_ - 18, '#ffe070', { align: 'right', shadow: '#000', outline: false });
      if (!this.touch) { let x = 6; const y = H_ - 20; x += BZ.prompt(g, game, x, y, 'confirm', 'Select', {}) + 4; }
    });
    if (!this.touch) this.menu.draw(r);
  }
};

/* ---- exhibition setup ---- */
BZ.scenes.setup = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 3); game.setZoom(.5); game.lights.enabled = false; this.pi = 0;
    const teams = TEAM_IDS.map(t => [t, BZ.get('teams', t).name]), parks = PARK_IDS.map(p => [p, BZ.get('parks', p).name]);
    const inn = [[1, '1'], [3, '3'], [5, '5'], [9, '9']], lv = [['rookie', 'ROOKIE'], ['pro', 'PRO'], ['allstar', 'ALL-STAR']];
    this.list = new OptionList([
      optRow('YOUR TEAM', 'away', teams, 0), optRow('OPPONENT', 'home', teams, 2), optRow('BALLPARK', 'park', parks, 0, { onChange: () => this.refreshPark() }),
      optRow('INNINGS', 'inn', inn, 1), optRow('CPU LEVEL', 'lv', lv, ['rookie', 'pro', 'allstar'].indexOf(game.settings.cpuLevel) < 0 ? 1 : ['rookie', 'pro', 'allstar'].indexOf(game.settings.cpuLevel), { onChange: v => game.settings.set('cpuLevel', v) }),
      optRow('PLAYERS', 'pl', [[1, '1 PLAYER'], [2, '2 PLAYERS']], 0),
      { label: 'PLAY BALL!', fn: l => this.go() }, { label: 'BACK', fn: l => game.go('title') }], { onCancel: () => game.go('title') });
  },
  refreshPark() { const id = this.list.value('park'); BZ.stage.start(id, 5); },
  go() {
    const L = this.list, pl = L.value('pl');
    if (pl === 2 && game.players.length < 2) game.addPlayer({ keys: 'right' });
    game.go('match', { away: { team: L.value('away') }, home: { team: L.value('home') }, park: L.value('park'), innings: L.value('inn'), humans: [true, pl === 2], diff: BZ.levelDiff() });
  },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = 238, x = (W_ - w) / 2, y = 22;
      frameBox(g, x - 6, y - 4, w + 12, 8 * 17 + 76, 'PLAY BALL');
      this.list.draw(g, x, y + 24, w);
      const P = BZ.get('parks', this.list.value('park')), T = BZ.get('teams', this.list.value('away'));
      E.font.text(g, P.sub, W_ / 2, y + 8 * 17 + 32, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      const wr = E.font.wrap(T.blurb, w); E.font.text(g, wr[0] || '', W_ / 2, y + 8 * 17 + 44, '#b8b8d8', { align: 'center', shadow: '#000', outline: false }); if (wr[1]) E.font.text(g, wr[1], W_ / 2, y + 8 * 17 + 54, '#b8b8d8', { align: 'center', shadow: '#000', outline: false });
      if (this.list.value('pl') === 2) E.font.text(g, 'P2: keyboard arrows + . / ,  or a second controller', W_ / 2, H_ - 26, '#9aff9a', { align: 'center', shadow: '#000', outline: false });
      BZ.prompt(g, game, 6, H_ - 14, 'confirm', 'Choose'); BZ.prompt(g, game, 80, H_ - 14, 'cancel', 'Back');
    });
  }
};

/* ---- results ---- */
BZ.scenes.results = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter(d) {
    this.d = d; this.S = d.M; this.t = 0; BZ.stage.start(this.S.park, 8); game.setZoom(.5);
    const win = this.S.winner, human = this.S.humans;
    const you = human[0] ? 0 : human[1] ? 1 : 0;
    this.won = win === you; this.tie = win < 0;
    BZ.music(this.won ? 'victory' : 'tense');
    const tour = d.data && d.data.tour;
    const rows = [];
    if (tour) { rows.push({ label: this.won ? 'CONTINUE THE TOUR' : 'TRY AGAIN', fn: () => d.data.tour.after(this.won, this.S) }); if (this.won || true) rows.push({ label: 'TOUR MAP', fn: () => d.data.tour.after(this.won, this.S, true) }); }
    else { rows.push({ label: 'REMATCH', fn: () => game.go('match', Object.assign({}, d.data, { seed: (d.data.seed || 1) + 7 })) }); rows.push({ label: 'NEW GAME SETUP', fn: () => game.go('setup') }); }
    rows.push({ label: 'MAIN MENU', fn: () => game.go('title') });
    this.list = new OptionList(rows, { onCancel: () => game.go('title') });
    this.fan = 0; if (tour && this.won) this.fan = tour.reward || 0;
  },
  update(dt) { this.t += dt; BZ.stage.update(dt); BZ.stage.camera(dt); if (this.t > .6) this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    const S = this.S, T = S.teams.map(t => BZ.get('teams', t));
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = 270, x = (W_ - w) / 2, y = 10;
      frameBox(g, x, y, w, H_ - 20, this.tie ? 'IT\'S A TIE' : this.won ? 'YOU WIN!' : 'GAME OVER');
      // line score
      const n = Math.max(S.innings, S.line[0].length, S.line[1].length, 3), cw = 14, ly = y + 30;
      E.font.text(g, 'TEAM', x + 8, ly, '#8888bb', { outline: false });
      for (let i = 0; i < n; i++) E.font.text(g, String(i + 1), x + 100 + i * cw, ly, '#8888bb', { outline: false });
      E.font.text(g, 'R', x + 104 + n * cw, ly, '#ffd23a', { outline: false }); E.font.text(g, 'H', x + 120 + n * cw, ly, '#9ad0ff', { outline: false });
      for (let s = 0; s < 2; s++) {
        const yy = ly + 12 + s * 12; px.rect(g, x + 8, yy + 1, 5, 7, T[s].chip); E.font.text(g, T[s].short + (S.humans[s] ? ' *' : ''), x + 16, yy, '#ffffff', { outline: false });
        for (let i = 0; i < n; i++) E.font.text(g, S.line[s][i] === undefined ? (i < S.inn ? '-' : '') : String(S.line[s][i]), x + 100 + i * cw, yy, '#e8e8ff', { outline: false });
        E.font.text(g, String(S.score[s]), x + 104 + n * cw, yy, '#ffd23a', { outline: false }); E.font.text(g, String(S.stat[s].h), x + 120 + n * cw, yy, '#9ad0ff', { outline: false });
      }
      let sy = ly + 42;
      const stats = [['HOME RUNS', 'hr'], ['STRIKEOUTS', 'k'], ['WALKS', 'bb'], ['STOLEN BASES', 'sb'], ['CATCHES', 'catches'], ['DOUBLE PLAYS', 'dp'], ['BATZOOKA ROBS', 'robs']];
      for (const [lab, k] of stats) { E.font.text(g, lab, x + 20, sy, '#b8b8d8', { outline: false }); E.font.text(g, String(S.stat[0][k]), x + 150, sy, '#ffffff', { align: 'right', outline: false }); E.font.text(g, String(S.stat[1][k]), x + 200, sy, '#ffffff', { align: 'right', outline: false }); sy += 10; }
      if (S.best) E.font.text(g, 'LONGEST HOMER ' + BZ.feet(S.best) + ' FT', x + w / 2, sy + 2, '#ffe070', { align: 'center', outline: false });
      if (this.fan) E.font.text(g, '+' + this.fan + ' FAN BUCKS', x + w / 2, sy + 14, '#9aff9a', { align: 'center', shadow: '#000', outline: false });
      this.list.draw(g, x + 30, H_ - 24 - this.list.rows.length * 16, w - 60, 16);
    });
  }
};

/* ---- Spring Training ---- */
BZ.scenes.training = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 11); game.setZoom(.5); game.lights.enabled = false;
    const done = E.store.get('bz.lessons', {});
    const rows = [1, 2, 3, 4, 5].map(n => { const L = BZ.get('lessons', n); return { label: (done[n] ? '★ ' : '') + n + '. ' + L.name, fn: () => game.go('match', { lesson: n, humans: [true, false], park: 'corn', away: { team: 'hay' }, home: { team: 'cin' }, innings: 99, diff: n === 3 ? 1 : .35, onUpdate: (sc) => { } }) }; });
    rows.push({ label: 'BACK', fn: () => game.go('title') });
    this.list = new OptionList(rows, { onCancel: () => game.go('title') });
  },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = 270, x = (W_ - w) / 2, y = 24;
      frameBox(g, x - 4, y - 8, w + 8, 190, 'SPRING TRAINING');
      this.list.draw(g, x + 4, y + 22, w - 8, 18);
      const i = this.list.i, L = BZ.get('lessons', i + 1);
      if (L) { const ls = E.font.wrap(L.hint, w - 10); ls.slice(0, 3).forEach((t, k) => E.font.text(g, t, W_ / 2, y + 140 + k * 10, '#ffe7a8', { align: 'center', shadow: '#000', outline: false })); }
      BZ.prompt(g, game, 6, H_ - 14, 'confirm', 'Start lesson'); BZ.prompt(g, game, 96, H_ - 14, 'cancel', 'Back');
    });
  }
};
BZ.on0 = null;
BZ.markLesson = n => { const d = E.store.get('bz.lessons', {}); d[n] = true; E.store.set('bz.lessons', d); };

/* ---- Derby setup ---- */
BZ.scenes.derbysetup = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 17); game.setZoom(.5); game.lights.enabled = false;
    this.list = new OptionList([
      optRow('PLAYERS', 'pl', [[1, '1'], [2, '2'], [3, '3'], [4, '4']], 0), optRow('OUTS', 'outs', [[5, '5'], [7, '7'], [10, '10']], 1),
      optRow('BALLPARK', 'park', PARK_IDS.map(p => [p, BZ.get('parks', p).name]), 0, { onChange: () => BZ.stage.start(this.list.value('park'), 9) }),
      { label: 'STEP UP!', fn: () => this.go() }, { label: 'BACK', fn: () => game.go('title') }], { onCancel: () => game.go('title') });
    BZ.music('derby');
  },
  go() {
    const n = this.list.value('pl'); while (game.players.length < n) { if (!game.addPlayer({ keys: game.players.length === 1 ? 'right' : undefined })) break; }
    game.go('match', { derby: true, park: this.list.value('park'), players: ['P1', 'P2', 'P3', 'P4'].slice(0, n), outs: this.list.value('outs'), humans: [true, false], seed: (Date.now() & 0xfff) + 1, innings: 99 });
  },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = 230, x = (W_ - w) / 2, y = 34;
      frameBox(g, x - 6, y - 8, w + 12, 150, 'HOME RUN DERBY');
      this.list.draw(g, x, y + 24, w);
      E.font.text(g, 'Pitches come straight down the pipe. Hit them far.', W_ / 2, y + 128, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, 'Players take turns on one screen.', W_ / 2, y + 138, '#b8b8d8', { align: 'center', shadow: '#000', outline: false });
    });
  }
};
/* derby ending: initials on the engine's letter wheel, then the table */
BZ.scenes.derbyend = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter(d) {
    this.d = d; BZ.stage.start('corn', 2); game.setZoom(.5); this.arc = new E.Arcade(game, { id: 'batzooka-derby', lives: 1, hud: false });
    this.arc.start(1); this.step = 0; this.t = 0;
    const res = d.players.slice().sort((a, b) => b.score - a.score); this.res = res; this.pi = 0;
    BZ.music('victory');
    this.next();
  },
  next() {
    const p = this.res[this.pi]; if (!p) { this.step = 2; return; }
    if (this.arc.qualifies(p.score, 'derby')) { this.step = 1; this.arc.enter(p.score, 'derby', name => { this.pi++; this.next(); }); }
    else { this.pi++; this.next(); }
    const best = E.store.get('bz.derbybest', 0); if (p.score > best) E.store.set('bz.derbybest', p.score);
  },
  update(dt) {
    BZ.stage.update(dt); BZ.stage.camera(dt); this.t += dt; this.arc.update(dt);
    if (this.step === 2 && this.t > .8 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.pressed('cancel'))) game.go('title');
  },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W;
      if (this.step === 2) {
        frameBox(g, W_ / 2 - 130, 14, 260, 210, 'DERBY RESULTS');
        this.res.forEach((p, i) => E.font.text(g, (i + 1) + '. ' + p.name + '   ' + p.score + ' pts   ' + p.hr + ' HR   best ' + p.best + ' ft', W_ / 2, 44 + i * 11, i === 0 ? '#ffe070' : '#e8e8ff', { align: 'center', shadow: '#000', outline: false }));
        this.arc.drawTable(r, 'derby', 100, 'HALL OF FAME');
        BZ.prompt(g, game, W_ / 2 - 30, 218, 'confirm', 'Done');
      }
    });
    if (this.step === 1) this.arc.draw(r);
  }
};

/* ---- About / Credits (the Source Information and feedback live here) ---- */
BZ.scenes.about = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() { BZ.stage.start('moon', 4); game.setZoom(.5); this.page = 0; this.scroll = 0; game.lights.enabled = false; BZ.music('title'); },
  update(dt) {
    BZ.stage.update(dt); BZ.stage.camera(dt);
    const I = game.input;
    if (I.pressed('cancel') || I.pressed('pause')) { game.go('title'); return; }
    if (I.pressed('left')) { this.page = (this.page + BZ.ABOUT.length - 1) % BZ.ABOUT.length; this.scroll = 0; }
    if (I.pressed('right') || I.pressed('confirm')) { this.page = (this.page + 1) % BZ.ABOUT.length; this.scroll = 0; }
    if (I.repeat('down', .2, .03)) this.scroll += 4; if (I.repeat('up', .2, .03)) this.scroll = Math.max(0, this.scroll - 4);
    const p = I.pointer && I.pointer();
    if (p && I.lastDevice === 'mouse' && I.pressed('swing')) { const S = game.screen.S; if (p[0] / S > game.W / 2) this.page = (this.page + 1) % BZ.ABOUT.length; else this.page = (this.page + BZ.ABOUT.length - 1) % BZ.ABOUT.length; this.scroll = 0; }
  },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, w = Math.min(W_ - 20, 380), x = (W_ - w) / 2, pg = BZ.ABOUT[this.page];
      frameBox(g, x, 6, w, H_ - 12, pg[0]);
      const lines = []; for (const para of pg[1].split('\n')) { if (!para) { lines.push(''); continue; } for (const l of E.font.wrap(para, w - 20)) lines.push(l); }
      const top = 30, bottom = H_ - 26, rows = Math.floor((bottom - top) / 9), maxS = Math.max(0, lines.length - rows) * 9;
      this.scroll = Math.min(this.scroll, maxS);
      const start = Math.floor(this.scroll / 9);
      for (let i = 0; i < rows; i++) { const l = lines[start + i]; if (l !== undefined) E.font.text(g, l, x + 10, top + i * 9, '#e8e8ff', { shadow: '#000', outline: false }); }
      if (maxS > 0) { px.rect(g, x + w - 6, top, 2, bottom - top, '#2a2a48'); px.rect(g, x + w - 6, top + (bottom - top - 12) * (this.scroll / maxS), 2, 12, '#ffd23a'); }
      E.font.text(g, (this.page + 1) + ' / ' + BZ.ABOUT.length, W_ / 2, H_ - 22, '#8888aa', { align: 'center', outline: false });
      BZ.prompt(g, game, x + 8, H_ - 14, 'left', ''); E.font.text(g, '← → Page   ↑ ↓ Scroll', x + 26, H_ - 12, '#aaaacc', { outline: false });
      BZ.prompt(g, game, x + w - 62, H_ - 14, 'cancel', 'Back');
    });
  }
};

/* ===== 46-tour.js ===== */
/* BATZOOKA BASEBALL: the Tour. Four ballparks and a boss, story scenes with babbling voices, Fan Bucks and the
   clubhouse's upgrades. Progress is saved. */
BZ.tourLoad = () => E.store.get('bz.tour', null);
BZ.tourSave = t => E.store.set('bz.tour', t);
BZ.tourNew = () => ({ stop: 0, bucks: 0, up: { bat: 0, legs: 0, arm: 0, meter: 0 }, finished: false });
const voiceOf = name => { const h = [...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 3); return .7 + (Math.abs(h) % 70) / 100; };
const portraitCache = {};
function portraitFor(name) {
  if (portraitCache[name]) return portraitCache[name];
  for (const id of TEAM_IDS) { const T = BZ.get('teams', id), p = T.players.find(x => x.name === name); if (p) { const rig = BZ.makeRig(T, p, false); rig.update(.01, { x: 0, y: 0, z: 0, facing: PI / 2, vx: 0, vy: 0 }); return portraitCache[name] = rig; } }
  return null;
}
/* a story scene: a list of [speaker, line] told in a dialog box over the park; then next() */
BZ.scenes.story = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter(d) {
    this.d = d; BZ.stage.start(d.park || 'corn', 6); game.setZoom(.85); game.lights.enabled = false;
    this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd23a' });
    this.i = 0; this.done = false; this.title = d.title || ''; this.t = 0;
    BZ.music(d.park === 'moon' ? 'moon' : 'tense'); this.show();
  },
  show() {
    const L = this.d.lines[this.i]; if (!L) { this.done = true; return; }
    const [who, text] = L; BZ.babble(text, voiceOf(who), .08);
    this.talk.say(text, { name: who, portrait: portraitFor(who), onDone: () => { this.i++; this.show(); } });
  },
  update(dt) {
    this.t += dt; BZ.stage.update(dt); BZ.stage.camera(dt);
    this.talk.update(dt);
    if (this.t > .5 && game.input.pressed('cancel')) { this.talk.close(); this.done = true; }
    if (this.done) { this.done = false; this.d.next && this.d.next(); }
  },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => { if (this.title) { px.rect(g, 0, 0, r.W, 18, 'rgba(6,8,22,.75)'); E.font.title(g, this.title, r.W / 2, 4, { scale: 1, colors: ['#fff6c8', '#ffd23a'], outline: '#101020', align: 'center' }); } BZ.prompt(g, game, r.W - 130, 4, 'cancel', 'Skip'); });
    this.talk.draw(r);
  }
};
BZ.scenes.tour = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    BZ.stage.start('corn', 21); game.setZoom(.8); game.lights.enabled = false; this.save = BZ.tourLoad();
    const rows = [];
    if (this.save) rows.push({ label: this.save.finished ? 'TOUR COMPLETE - PLAY AGAIN' : 'CONTINUE THE TOUR', fn: () => this.save.finished ? this.fresh() : game.go('tourmap') });
    rows.push({ label: this.save ? 'NEW TOUR (ERASES SAVE)' : 'BEGIN THE TOUR', fn: () => this.fresh() });
    rows.push({ label: 'BACK', fn: () => game.go('title') });
    this.list = new OptionList(rows, { onCancel: () => game.go('title') });
  },
  fresh() { BZ.tourSave(BZ.tourNew()); const intro = [['BUSTER', 'Folks, gather round. The bank wants the cornfield ballpark by Friday, and my banjo is not worth much.'], ['MABEL', 'So we take the Haymakers on the road, win four ballgames, and bring home enough hay to pay it off.'], ['BUSTER', 'Four games. Four parks. One cornfield to save. Load the wagon!']]; game.go('story', { park: 'corn', title: 'THE BARNSTORMING TOUR', lines: intro, next: () => game.go('tourmap') }); },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => { const W_ = r.W, w = 236, x = (W_ - w) / 2; frameBox(g, x - 8, 30, w + 16, 130, 'THE TOUR'); this.list.draw(g, x, 62, w, 20); E.font.text(g, 'Save the cornfield. Four parks. One boss.', W_ / 2, 140, '#ffe7a8', { align: 'center', shadow: '#000', outline: false }); });
  }
};
BZ.scenes.tourmap = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    this.t = BZ.tourLoad() || BZ.tourNew(); BZ.stage.start((BZ.TOUR[Math.min(this.t.stop, 3)] || BZ.TOUR[0]).park, 31); game.setZoom(.8); game.lights.enabled = false;
    const st = this.t.stop;
    const rows = [];
    if (st < BZ.TOUR.length) rows.push({ label: 'PLAY: ' + BZ.TOUR[st].title, fn: () => this.play() });
    rows.push({ label: 'CLUBHOUSE', fn: () => game.go('clubhouse') }, { label: 'BACK', fn: () => game.go('tour') });
    this.list = new OptionList(rows, { onCancel: () => game.go('tour') });
    BZ.music('title');
  },
  play() {
    const t = this.t, S = BZ.TOUR[t.stop];
    const startGame = () => game.go('match', {
      park: S.park, away: { team: 'hay' }, home: { team: S.opp }, innings: S.innings, diff: S.diff, humans: [true, false], seed: 500 + t.stop * 17,
      tour: { up: t.up, reward: S.fan, after: (won, M, toMap) => this.after(won, M, toMap) }
    });
    game.go('story', { park: S.park, title: S.title, lines: S.pre, next: startGame });
  },
  after(won, M, toMap) {
    const t = BZ.tourLoad() || BZ.tourNew(), S = BZ.TOUR[t.stop];
    if (!won) return game.go(toMap ? 'tourmap' : 'tourmap');
    t.bucks += S.fan; t.stop++; if (t.stop >= BZ.TOUR.length) t.finished = true; BZ.tourSave(t);
    const lines = S.post.slice(); if (t.finished) lines.push(['BUSTER', 'And that is a wrap on the Great Cornfield Tour. Thanks for playing, friend. Go hit one into orbit.']);
    game.go('story', { park: S.park, title: 'FULL TIME', lines, next: () => game.go(t.finished ? 'about' : 'clubhouse') });
  },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, H_ = r.H, t = this.t, w = 280, x = (W_ - w) / 2;
      frameBox(g, x - 6, 8, w + 12, H_ - 16, 'THE TOUR');
      // the road: four stops and a boss
      BZ.TOUR.forEach((s, i) => {
        const cx = x + 30 + i * 74, cy = 62, done = i < t.stop, cur = i === t.stop;
        if (i) px.line(g, cx - 74 + 10, cy, cx - 10, cy, done ? '#9aff9a' : '#444466', 2);
        px.disc(g, cx, cy, 11, '#10101c'); px.disc(g, cx, cy, 9, done ? '#3a9a5a' : cur ? '#ffd23a' : '#2a2a48');
        E.font.text(g, done ? '✓' : String(i + 1), cx - 2, cy - 3, '#ffffff', { outline: false });
        E.font.text(g, BZ.get('parks', s.park).name.split(' ')[0], cx, cy + 14, cur ? '#ffd23a' : '#9898b8', { align: 'center', outline: false });
        if (s.boss) E.font.text(g, 'BOSS', cx, cy - 22, '#ff6a6a', { align: 'center', outline: false });
      });
      E.font.text(g, 'FAN BUCKS ' + t.bucks, x + 12, 96, '#9aff9a', { shadow: '#000', outline: false });
      const up = t.up; E.font.text(g, 'BAT ' + up.bat + '  LEGS ' + up.legs + '  ARM ' + up.arm + '  CROWD ' + up.meter, x + w - 12, 96, '#b8b8d8', { align: 'right', outline: false });
      this.list.draw(g, x + 8, 118, w - 16, 20);
      if (t.stop < BZ.TOUR.length) { const S = BZ.TOUR[t.stop]; E.font.text(g, BZ.get('parks', S.park).sub, W_ / 2, 176, '#ffe7a8', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, 'vs ' + BZ.get('teams', S.opp).name + ' - ' + S.innings + ' innings', W_ / 2, 188, '#ffffff', { align: 'center', shadow: '#000', outline: false }); }
      else E.font.text(g, 'TOUR COMPLETE. THE CORNFIELD IS SAVED!', W_ / 2, 180, '#9aff9a', { align: 'center', shadow: '#000', outline: false });
    });
  }
};
BZ.scenes.clubhouse = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() { this.t = BZ.tourLoad() || BZ.tourNew(); BZ.stage.start('corn', 33); game.setZoom(.8); game.lights.enabled = false; this.msg = 'Spend your Fan Bucks. The crowd pays for polish.'; this.build(); },
  build() {
    const rows = BZ.UPGRADES.map(u => { const lv = this.t.up[u.id], cost = u.cost[lv]; return { label: u.name + '  Lv ' + lv + '/' + u.max, fn: () => this.buy(u), tail: lv >= u.max ? 'MAXED' : cost + ' FB', desc: u.desc }; });
    rows.push({ label: 'TOUR MAP', fn: () => game.go('tourmap') });
    this.list = new OptionList(rows, { onCancel: () => game.go('tourmap'), start: this.list ? this.list.i : 0 }); this.rows = rows;
  },
  buy(u) { const lv = this.t.up[u.id]; if (lv >= u.max) { this.msg = 'Already maxed out. You are a legend.'; return; } const c = u.cost[lv]; if (this.t.bucks < c) { this.msg = 'Not enough Fan Bucks. Go win something.'; BZ.sfx('groan'); return; } this.t.bucks -= c; this.t.up[u.id]++; BZ.tourSave(this.t); this.msg = u.name + ' bought!'; BZ.sfx('coin'); this.build(); },
  update(dt) { BZ.stage.update(dt); BZ.stage.camera(dt); this.list.update(dt); },
  draw(r) {
    BZ.stage.draw(r);
    r.overlay(g => {
      const W_ = r.W, w = 280, x = (W_ - w) / 2;
      frameBox(g, x - 6, 14, w + 12, 190, 'CLUBHOUSE');
      E.font.text(g, 'FAN BUCKS ' + this.t.bucks, W_ / 2, 34, '#9aff9a', { align: 'center', shadow: '#000', outline: false });
      this.list.draw(g, x + 8, 50, w - 16, 20);
      this.rows.forEach((rw, i) => { if (rw.tail) E.font.text(g, rw.tail, x + w - 14, 50 + i * 20 + 2, rw.tail === 'MAXED' ? '#9aff9a' : '#ffe070', { align: 'right', outline: false }); });
      const cur = this.rows[this.list.i]; if (cur && cur.desc) E.font.text(g, cur.desc, W_ / 2, 160, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, this.msg, W_ / 2, 176, '#ffffff', { align: 'center', shadow: '#000', outline: false });
    });
  }
};

/* ===== 47-hub.js ===== */
/* BATZOOKA BASEBALL: AI Hub session (protocol v1, mode "parallel"). In a session the game opens straight into a
   Batzooka Derby round: every player faces the same pitches (AIHub.rng('pitches')), and reports the derby score. */
BZ.hub = { info: null, started: false, reported: false };
BZ.scenes.hub = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    this.state = 'connecting'; this.t = 0; BZ.stage.start('moon', 12); game.setZoom(.8); game.lights.enabled = false;
    const H = window.AIHub;
    if (!H || !H.active) { game.go('title'); return; }
    H.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
      if (!info) { this.state = 'solo'; game.go('title'); return; }
      BZ.hub.info = info; this.state = 'ready';
      const me = info.players.find(p => p.id === info.me);
      this.go(me ? me.name : 'YOU');
      H.on('start', () => { BZ.hub.started = true; });
      H.on('time-up', () => { BZ.hub.report(true); });
      H.on('end', () => { BZ.hub.ended = true; try { game.audio.mute(); } catch (e) { /* silent */ } });
      H.on('leave', () => { });
      H.ready();
    }).catch(e => { H.fail && H.fail('AI Hub connect failed: ' + e); });
  },
  go(name) {
    const info = BZ.hub.info;
    game.go('match', { derby: true, hub: true, park: 'moon', players: [name], outs: 7, seed: info.seed >>> 0 || 5, pitchSeq: window.AIHub.rng('pitches'), humans: [true, false], innings: 99, hubLimit: 75 });
  },
  update(dt) { this.t += dt; BZ.stage.update(dt); BZ.stage.camera(dt); },
  draw(r) { BZ.stage.draw(r); r.overlay(g => { frameBox(g, r.W / 2 - 100, r.H / 2 - 20, 200, 40, ''); E.font.text(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2 - 4, '#ffffff', { align: 'center', outline: false, shadow: '#000' }); }); }
};
BZ.hub.report = (timeUp) => {
  const H = window.AIHub, M = BZ.M; if (!H || !H.active || BZ.hub.reported || !M || !M.derby) return;
  BZ.hub.reported = true;
  const D = M.derby, p = D.players[0];
  H.result({ score: p.score, stats: { 'Home runs': p.hr, 'Longest (ft)': p.best, 'Outs used': p.outs }, awards: p.best >= 450 ? [{ title: 'Moonshot', detail: p.best + ' ft' }] : [] });
};
/* the derby inside a session: waits for the hub's clock, reports progress each second and the result at the end */
BZ.hubTick = (scene, dt) => {
  const H = window.AIHub, M = scene.M; if (!H || !H.active || !M || !M.derby) return;
  const D = M.derby;
  if (!scene.hubInit) {
    scene.hubInit = true; M.hold = true; D.hub = true; D.clockLimit = scene.data.hubLimit || 75; scene.hubWait = true; M.sides[0].ctl = game.players[0];
  }
  const tm = H.time();
  if (scene.hubWait) {
    if (BZ.hub.started && tm >= 0) { scene.hubWait = false; M.hold = false; M.clock = 0; }
    else { M.hold = true; return 'wait'; }
  }
  const now = performance.now();   // wall clock: the hub reads about one report a second, however slowly this copy runs
  if (!scene.hubLast || now - scene.hubLast > 900) { scene.hubLast = now; H.progress({ score: D.players[0].score, label: D.players[0].hr + ' HR' }); }
  if (M.over || (D.clockLimit && M.clock >= D.clockLimit)) { if (!M.over) { M.over = true; M.phase = 'over'; } BZ.hub.report(); }
  // the hub's own Create + Options chord belongs to the hub
  try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p && p.buttons[8] && p.buttons[8].pressed) game.input.suppress('pause'); } catch (e) { /* no pads */ }
};

/* ===== 48-bot.js ===== */
/* BATZOOKA BASEBALL: a bot that plays through the same intents a person produces (tests, and checking the human paths). */
BZ.bot = { skill: .9, enabled: false };
BZ.botIntent = null;
BZ.enableBot = (on, skill = .9) => {
  BZ.bot.skill = skill;
  if (!on) { BZ.botIntent = null; return; }
  BZ.botIntent = (i, M) => {
    const it = { mx: 0, my: 0, throwBase: -1 }, ph = M.phase, batSide = M.half, pitchSide = 1 - M.half;
    if (!M.sides[i].human) return it;
    if (i === batSide) {
      if ((ph === 'windup' || ph === 'pitch') && M.pitch && M.pitch.released) {
        const uv = BZ.pitchUV(M.pitch, M.pitch.T); it.mouse = [uv.fu + (BZ.bot.skill < 1 ? (rnd() - .5) * (1 - BZ.bot.skill) * 2 : 0), uv.fv];
        if (!M.sw && M.pitch.t >= M.pitch.T - .09 && M.swCool <= 0 && M.pitch.t < M.pitch.T + .02) { it.swing = true; it.power = M.sides[i].meter >= 100; }
        if (M.pitch.t < M.pitch.T - .3 && !M.steal && rnd() < .0007) it.steal = true;
      }
      if (ph === 'play') { it.advance = M.playTime > .5 && Math.floor(M.playTime * 3) % 2 === 0 && rnd() < .04; it.turbo = true; }
      if (ph === 'rhubarb') it.swing = Math.floor(M.clock * 12) % 2 === 0;
    }
    if (i === pitchSide) {
      if (ph === 'setup' && M.t > .6) { M.aim.u = rr(-.7, .7); M.aim.v = rr(-.7, .7); it.swing = true; it.next = rnd() < .3; it.power = M.sides[i].meter >= 100; }
      if (ph === 'play') {
        const f = BZ.controlled(i), b = M.ball;
        if (f) {
          const tgt = b.state === 'held' ? null : (M.primaryPt || b), dx = tgt ? tgt.x - f.x : 0, dy = tgt ? tgt.y - f.y : 0, d = hyp(dx, dy);
          if (tgt && d > 3) { it.mx = dx / d; it.my = dy / d; }
          it.turbo = true;
          if (b.state === 'held' && b.holder === f) { const c = BZ.throwChoice(f); if (c >= 0 && f.holdT > .1) it.throwBase = c; }
          if (b.state === 'hit' && b.z > 30 && d < 40 && f.jump <= 0) it.jump = true;
        }
      }
      if (ph === 'rhubarb') it.swing = Math.floor(M.clock * 10) % 2 === 0;
    }
    return it;
  };
};

/* ===== 49-about.js ===== */
/* BATZOOKA BASEBALL: About / Credits text: Source Information and the feedback sections (also saved in exit-interview.json). */
BZ.SOURCE_INFO = {
  date: '2026-11-04 06:02:25',
  source: 'baseball (over the top arcade style)',
  plan: 'PLAN.md (written by claude-opus-5-5 at max effort; followed where it fits, TASK.md won where they differ)',
  genre: 'Arcade sports (baseball) with a slapstick brawl mini-game (the Rhubarb) and a short story Tour with light upgrades',
  perspective: 'A three-quarter broadcast camera over a textured ballpark, framed behind the plate for the pitch duel with a strike-zone inset, pulling out to follow the ball in play',
  tech: 'my-3D2dge v0.85.2 handoff engine (one file, small modified copy), pixel canvas at ps1 resolution with expand, plain JavaScript concatenated into one IIFE, AI Hub client 1.4.0 pasted unmodified, Playwright 1.63.0 for the tests',
  artDirection: 'The engine\'s native HD Humanoid pixel-art rigs dressed per team, on ballparks generated from geometry (mown stripes, infield dirt, chalk, fence, stands with a crowd) in four themed parks: a cornfield, the moon, a volcano and a corporate megadome; lights, ash, leaves, fire trails and dust clouds',
  animation: 'The engine\'s Humanoid rig and E.MOVES (overhead, throw, haymaker, cross, hook, jab), custom swing and bunt specs, poses (cheer, kneel, down, crouch) and a Blob mascot; all baseball motion is composed in code, no motion-capture files',
  audio: 'All in code with the engine\'s chip synth: six original songs with a drum layer that comes in with the tension, sound effects, a stadium-organ charge call, and Animalese-style babble voices for the radio duo and the story scenes. No audio files',
  online: 'AI Hub session protocol v1, mode parallel: in a hub session the game opens straight into a Batzooka Derby round where every player faces the same pitches and reports a derby score. Outside the hub it plays on its own, 1 to 4 players on one machine',
  testing: 'Headless only: node scripts that play whole seeded games and a bot that plays through the same input intents as a person, one command (node tests/run.mjs --browser) that prints only failures and a count, a Chromium smoke test of every scene and a scripted playthrough, the AI Hub harness; no subagents',
  research: 'Read TASK.md, PLAN.md, the engine card, the sports kit and the AI Hub protocol; no other research',
  environment: 'Claude Code CLI (headless); Linux; browser unknown (tested in headless Chromium 153)',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
  usage: 'unknown (no estimate available in this session)'
};
BZ.FEEDBACK = {
  testing: [
    'About nine real issues: a derby soft-lock when a pitcher fielded the ball, more than three outs after a double play, a pitch model that put 40 balls a game outside the zone, exit speeds that made 58 runs a game, wild throws caused by aiming at the base instead of the baseman, a deep link that the first scene change cancelled, a mascot update call that threw, camera framing that hid the batter, and a test harness that forgot to feed the bot its inputs.',
    'Three: the derby soft-lock, the unplayable balance (walk-fests and 58-run games) and the deep link that dropped the scene.',
    'Thirty seeded CPU-versus-CPU games across all four parks with a per-game event count. It showed in seconds that strikeouts never happened, that walks and wild throws were far too common and that scores were off by a factor of ten.',
    'Screenshots of timing-dependent moments. The headless browser ran at about 12 frames a second, so the game state drifted from the wall clock; they only became useful once I stepped the game with game.advance and polled for a condition.'
  ],
  engine: [
    'The Humanoid rigs with E.MOVES (a readable swing, throw and punch from a name), the TileMap floorTex hook that let me paint a whole ballpark from geometry, the fixed-step game.advance for headless play, and that pause, settings, rebinding and full screen are simply there.',
    'Yes. The three-quarter view is not one pixel per unit, so my first framing hid the plate; the Backdrop does not show in a ground view; game.after timers die with a scene change (it ate my deep link); and the staff weapon draws a glowing gem, so my bat looked like a wand until I found the orb color.',
    'The whole baseball: rules, the pitch and contact model, ball physics with fence and foul geometry, fielding AI, force and tag logic, baserunning, the Batzooka meter, the CPU players and a bot. Also the ballpark generator and the button-glyph renderer for PlayStation, Xbox, keyboard and mouse.',
    'Keeping a 240-pixel-tall buffer legible: framing a pitch duel and a fielding scramble with one camera, and fitting HUD, zone inset and prompts without hiding the players.',
    'One small change: the Button symbols setting now defaults to PlayStation and offers PlayStation or Xbox only, as the prompt asks. Everything else (bat, mitts, hats) was done in game code with colors and overdraw, so the engine stayed untouched.',
    'A first-class perspective "plate cam": a ground view with a lower camera and depth scaling for rigs that works with the TileMap, so a behind-the-batter view does not need Mode 7 billboards. A bat and a glove as Humanoid weapon types would be next.'
  ],
  prompt: [
    'The shape of the ask: a real vertical slice with attract mode, dev mode with sliders, hub integration and a one-command headless test, and the exit-interview JSON that makes the result machine readable. The plan was thorough about rules.',
    'The plan is about 150 KB, far more than fits in working memory, and it asks for things that conflict with medium effort (Mode 7 plate cam, motion-capture clips, engine edits). Its file names use an older stamp than TASK.md. Hub mode was ghost in the plan and parallel in my build; it was not clear which mattered.',
    'Scope. A baseball sim with fielding, running, a CPU, four modes, a tour and a hub round has a lot of rules that all interact, and every one needs a play-feel pass without a human at the controller.',
    'Add a short ranked list of must-have versus nice-to-have to the plan, say exactly which of the plan and the task wins for each conflict in one place, and say how much of the plan is expected at each effort level.'
  ]
};
BZ.ABOUT = [
  ['ABOUT', 'BATZOOKA BASEBALL is an over-the-top arcade baseball game. Pitch fireballs, swing a rocket-powered bat, rob homers by leaping the wall, and empty the benches in a slapstick dust cloud.\n\nPLAY BALL is a full game against the CPU or a friend. THE TOUR is a short story across four ballparks (a cornfield, the moon, a volcano and a corporate megadome) with Fan Bucks to spend. HOME RUN DERBY is for sluggers (1 to 4 players, one screen). SPRING TRAINING teaches batting, pitching, fielding, running and the Batzooka in five short lessons.\n\nThe Batzooka meter fills with big plays. Full, it fires a rocket-powered swing, a fireball pitch or the rocket glove.\n\nAfter 10 seconds idle on the title screen a CPU game plays as a demo; any button ends it. Open the pause menu for the Playbook, Dev Mode (live balance sliders, with a reset) and Settings. Button symbols can be PlayStation or Xbox in Settings.'],
  ['SOURCE INFORMATION', Object.entries({ Date: BZ.SOURCE_INFO.date, Source: BZ.SOURCE_INFO.source, Plan: BZ.SOURCE_INFO.plan, 'Genre and perspective': BZ.SOURCE_INFO.genre + '. ' + BZ.SOURCE_INFO.perspective, Tech: BZ.SOURCE_INFO.tech, 'Art direction': BZ.SOURCE_INFO.artDirection, Animation: BZ.SOURCE_INFO.animation, Audio: BZ.SOURCE_INFO.audio, Online: BZ.SOURCE_INFO.online, Testing: BZ.SOURCE_INFO.testing, Research: BZ.SOURCE_INFO.research, Environment: BZ.SOURCE_INFO.environment, Model: BZ.SOURCE_INFO.model, Usage: BZ.SOURCE_INFO.usage }).map(([k, v]) => k.toUpperCase() + ': ' + v).join('\n\n')],
  ['TESTING FEEDBACK', ['How many issues did testing catch?', 'How many were critical?', 'Most helpful test?', 'Least helpful test?'].map((q, i) => q + '\n' + BZ.FEEDBACK.testing[i]).join('\n\n')],
  ['ENGINE FEEDBACK', ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'].map((q, i) => q + '\n' + BZ.FEEDBACK.engine[i]).join('\n\n')],
  ['PROMPT FEEDBACK', ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'].map((q, i) => q + '\n' + BZ.FEEDBACK.prompt[i]).join('\n\n')],
  ['CREDITS', 'GAME: Batzooka Baseball, built by Claude (claude-sonnet-5-5) from a plan by claude-opus-5-5.\n\nENGINE: my-3D2dge by Michael Crosato.\n\nONLINE: AI Hub session client 1.4.0.\n\nPLAY-BY-PLAY: Tex and Dusty, who are not real people and are not responsible for what they said.\n\nSPECIAL THANKS: the Haymakers, the Lunar Lemurs, the Cinder Sluggers and Mortimer Megamax, who owns the ball, the bat and the word "fun".\n\nEverything you saw and heard was drawn and played by code: no image files, no audio files.']
];

/* ===== 90-start.js ===== */
/* BATZOOKA BASEBALL: boot and start. Deep links: #title #attract #match #derby #training/<n> #tour #about #touch #hub */
BZ.debugApi = () => ({
  snapshot() { const M = BZ.M; return { scene: game.sceneName, phase: M && M.phase, score: M && M.score, inn: M && M.inn, half: M && M.half, outs: M && M.outs, balls: M && M.balls, strikes: M && M.strikes, over: M && M.over, errors: game.errors.length }; },
  M: () => BZ.M, BZ, setup(o) { game.go('match', o); }
});
game.debug = BZ.debugApi();
const hash = (location.hash || '').replace('#', '').split('/');
const startScene = (window.AIHub && window.AIHub.active) ? 'hub' : hash[0] === 'hub' ? 'hub' : 'title';
const scenes = BZ.scenes;
for (const k in scenes) { scenes[k].name = k; }
game.start({
  scene: startScene, scenes,
  boot: { title: 'BATZOOKA BASEBALL', steps: [['Painting the ballpark', () => { BZ.buildPark(BZ.get('parks', 'corn')); }], ['Warming up the organ', () => { BZ.initAudio(game); }]] }
});
// deep links: the title follows one once, on its first frame (#match, #derby, #attract, #training/<n>, ...)
BZ.deepLink = () => {
  const h = hash[0]; BZ.deepLink = null;
  if (startScene === 'hub') return false;
  if (h === 'match') game.go('match', { park: hash[1] || 'corn', away: { team: 'hay' }, home: { team: 'cin' }, innings: 3, humans: [true, false] });
  else if (h === 'derby') game.go('match', { derby: true, park: hash[1] || 'corn', players: ['P1'], outs: 7, humans: [true, false], innings: 99 });
  else if (h === 'attract') game.scene.startAttract();
  else if (h === 'training' && hash[1]) game.go('match', { lesson: +hash[1], humans: [true, false], park: 'corn', away: { team: 'hay' }, home: { team: 'cin' }, innings: 99, diff: .4 });
  else if (['tour', 'about', 'setup', 'training', 'derbysetup', 'tourmap', 'clubhouse', 'results'].includes(h)) game.go(h);
  else return false;
  return true;
};

})();
