// Music, stings, sound effects and the crowd, all synthesized: the engine's chip synth for songs and effects (every
// melody original), and Web Audio nodes on the crowd bus for the crowd's bed, its reactions and its chants.
(() => {
'use strict';
const FF = window.FF, game = FF.game, A = game.audio;
const S = (bpm, tracks, o = {}) => Object.assign({ bpm, steps: 4, tracks }, o);
const DR = (notes, vol = .14, name) => ({ wave: 'drums', vol, notes, name });
FF.SONGS = {
  ANTHEM: S(132, [
    { wave: 'square', vol: .085, notes: 'G4 - B4 D5 - - B4 - | C5 - E5 G5 - E5 D5 - | B4 - G4 B4 - D5 - - | A4 - - - G4 . . . | G4 - B4 D5 - - G5 - | E5 - C5 E5 - G5 - - | D5 - B4 G4 - A4 B4 - | G4 - - - . . D5 . ' },
    { wave: 'saw', vol: .1, octave: -1, notes: 'G2 . G2 . G2 . D3 . | C3 . C3 . E3 . C3 . | G2 . G2 . B2 . D3 . | D3 . D3 . D2 . D3 . | G2 . G2 . G2 . D3 . | C3 . C3 . E3 . G3 . | D3 . D3 . B2 . G2 . | G2 . D2 . G2 . . . ' },
    DR('k . h . s . h . | k k h . s . h k | k . h . s . h . | k . h k s . s s ', .14),
    { wave: 'pulse', vol: .05, name: 'hot', on: false, notes: 'D5 G5 D5 G5 D5 G5 D5 G5 | E5 G5 E5 G5 E5 G5 E5 G5 ' }]),
  LOCKER: S(110, [
    { wave: 'pulse12', vol: .12, octave: -1, notes: 'E3 . E3 G3 . E3 A3 . | G3 . E3 . D3 . E3 . | A2 . A2 C3 . A2 D3 . | C3 . A2 . G2 . A2 . ' },
    { wave: 'square', vol: .05, notes: '. . B4 . . D5 . . | . E5 . D5 B4 . . . | . . C5 . . E5 . . | . G5 . E5 C5 . . . ' },
    DR('k . h . s . h h | k . h k s . h . ', .12)]),
  HUDDLE: S(120, [
    DR('k . s s k . s . | k k s . k . s s | k . s s k . s . | k k s s s s s s ', .16),
    { wave: 'triangle', vol: .22, octave: -1, notes: 'D3 . . D3 . . F3 . | D3 . . D3 . . G3 . | D3 . . D3 . . F3 . | A3 . G3 . F3 . E3 . ' }]),
  DUST_DEVIL: S(128, [
    { wave: 'pulse', vol: .07, notes: 'A4 . C5 . E5 - D5 C5 | A4 . G4 . E4 - . . | A4 . C5 . E5 - G5 E5 | D5 - - . C5 . A4 . ' },
    { wave: 'triangle', vol: .24, octave: -1, notes: 'A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . | E2 . B2 . E2 . E3 . ' },
    DR('k . h k s . h . | k . h k s h h . ', .12),
    { wave: 'saw', vol: .05, name: 'hot', on: false, notes: 'A3 A3 . A3 C4 . A3 . | G3 G3 . G3 B3 . G3 . ' },
    { wave: 'triangle', vol: .2, name: 'redzone', on: false, octave: -1, notes: 'A1 A1 A1 A1 A1 A1 A1 A1 ' }]),
  SWAMP_STOMP: S(96, [
    { wave: 'pulse', vol: .07, vib: [6, .02], notes: 'E4 - G4 . A4 - Bb4 A4 | G4 - E4 . D4 - E4 . | E4 - G4 . A4 - C5 A4 | Bb4 A4 G4 E4 - - . . ' },
    { wave: 'saw', vol: .1, octave: -1, notes: 'E2 . E2 G2 A2 . G2 . | E2 . E2 G2 A2 . G2 . | A2 . A2 C3 D3 . C3 . | E2 . E2 G2 A2 . B2 . ' },
    DR('k . . k s . . h | k . . k s . k h ', .13),
    { wave: 'saw', vol: .05, name: 'hot', on: false, notes: 'E3 . E3 . G3 . A3 . ' },
    { wave: 'triangle', vol: .2, name: 'redzone', on: false, octave: -1, notes: 'E1 . E1 . E1 . E1 . ' }]),
  NEON_NIGHTDRIVE: S(118, [
    { wave: 'saw', vol: .05, notes: 'A3 C4 E4 A4 E4 C4 A3 C4 | F3 A3 C4 F4 C4 A3 F3 A3 | G3 B3 D4 G4 D4 B3 G3 B3 | E3 G#3 B3 E4 B3 G#3 E3 G#3 ' },
    { wave: 'square', vol: .07, notes: 'E5 - - - D5 - C5 - | C5 - - - A4 - - - | D5 - - - B4 - G4 - | B4 - - - G#4 - - - ' },
    { wave: 'triangle', vol: .24, octave: -1, notes: 'A2 . A2 . A2 . A2 . | F2 . F2 . F2 . F2 . | G2 . G2 . G2 . G2 . | E2 . E2 . E2 . E2 . ' },
    DR('k . h . s . h . | k . h k s . h . ', .13),
    { wave: 'saw', vol: .04, name: 'hot', on: false, notes: 'A4 A4 E5 A4 A4 E5 A4 E5 ' },
    { wave: 'triangle', vol: .2, name: 'redzone', on: false, octave: -1, notes: 'A1 A1 A1 A1 ' }]),
  FROSTBITE_FANFARE: S(100, [
    { wave: 'triangle', vol: .12, notes: 'C5 E5 G5 C6 G5 E5 C5 G4 | D5 F5 A5 D6 A5 F5 D5 A4 | E5 G5 B5 E6 B5 G5 E5 B4 | G5 - - - G4 - - - ' },
    { wave: 'sine', vol: .14, notes: 'C4 - - - - - - - | D4 - - - - - - - | E4 - - - - - - - | G4 - - - F4 - - - ' },
    DR('k . . . s . . . | k . . k s . . h ', .1),
    { wave: 'saw', vol: .04, name: 'hot', on: false, notes: 'C4 C4 E4 G4 ' },
    { wave: 'triangle', vol: .2, name: 'redzone', on: false, octave: -1, notes: 'C2 C2 C2 C2 ' }]),
  MEGA_DOME: S(140, [
    { wave: 'square', vol: .06, notes: 'D4 - - A4 - - D5 - | C5 - Bb4 - A4 - - - | D4 - - A4 - - F5 - | E5 - - - D5 - - - ' },
    { wave: 'square', vol: .045, notes: 'A3 - - E4 - - A4 - | G4 - F4 - E4 - - - | A3 - - E4 - - C5 - | B4 - - - A4 - - - ' },
    { wave: 'saw', vol: .1, octave: -1, notes: 'D2 D2 . D2 D2 . D2 . | Bb1 Bb1 . Bb1 C2 . C2 . | D2 D2 . D2 D2 . D2 . | A1 A1 . A1 A1 . A1 . ' },
    DR('k . s . k k s . | k . s . k s s s ', .15),
    { wave: 'saw', vol: .04, name: 'hot', on: false, notes: 'D4 D4 F4 D4 ' },
    { wave: 'triangle', vol: .2, name: 'redzone', on: false, octave: -1, notes: 'D1 D1 D1 D1 ' }]),
  HALFTIME: S(120, [
    { wave: 'square', vol: .07, notes: 'C5 - C5 E5 G5 - E5 - | F5 - F5 A5 C6 - A5 - | G5 - E5 - C5 - E5 - | D5 - - - G4 - - - ' },
    { wave: 'triangle', vol: .2, octave: -1, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | C3 . G2 . C3 . E3 . | G2 . D3 . G2 . B2 . ' },
    DR('k s s . k s s . | k s s s k s s s ', .14)]),
  ATTRACT: S(150, [
    { wave: 'square', vol: .08, notes: 'G4 B4 D5 G5 D5 B4 G4 B4 | C5 E5 G5 C6 G5 E5 C5 E5 | B4 D5 G5 B5 G5 D5 B4 D5 | A4 D5 F#5 A5 F#5 D5 A4 D5 ' },
    { wave: 'saw', vol: .09, octave: -1, notes: 'G2 G2 G3 G2 G2 G2 G3 G2 | C3 C3 C4 C3 C3 C3 C4 C3 | G2 G2 G3 G2 G2 G2 G3 G2 | D3 D3 D4 D3 D3 D3 D4 D3 ' },
    DR('k h s h k k s h | k h s h k s s s ', .15)]),
  FOREVER: S(80, [
    { wave: 'triangle', vol: .14, notes: 'G4 - - - B4 - D5 - | C5 - - - B4 - A4 - | G4 - - - E4 - G4 - | A4 - - - - - - - | G4 - - - B4 - D5 - | E5 - - - D5 - C5 - | B4 - - - A4 - B4 - | G4 - - - - - - - ' },
    { wave: 'sine', vol: .12, octave: -1, notes: 'G3 - - - - - - - | C3 - - - - - - - | E3 - - - - - - - | D3 - - - - - - - | G3 - - - - - - - | C3 - - - - - - - | D3 - - - - - - - | G3 - - - - - - - ' },
    { wave: 'pulse12', vol: .03, notes: 'B4 D5 G5 D5 B4 D5 G5 D5 | C5 E5 G5 E5 C5 E5 G5 E5 ' }])
};
FF.STINGS = {
  td: S(160, [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - - G5 C6 - - - - ' }, { wave: 'saw', vol: .08, octave: -1, notes: 'C3 . C3 . E3 . G3 - - - - - ' }, DR('k . s . k k s . s s s s ', .16)]),
  fg: S(150, [{ wave: 'square', vol: .1, notes: 'G4 C5 E5 G5 - - - - ' }, DR('k . s . s s s . ', .12)]),
  first: S(140, [{ wave: 'square', vol: .08, vib: [5, .01], notes: 'C5 E5 G5 - E5 G5 C6 - - - ' }, { wave: 'triangle', vol: .12, notes: 'C4 G4 E4 - G4 E4 C5 - - - ' }]),
  defense: S(120, [{ wave: 'square', vol: .08, notes: 'G4 . G4 . A4 - . . G4 . G4 . A4 - . . ' }, DR('k . k . s . . . k . k . s . . . ', .14)]),
  fiasco: S(110, [{ wave: 'saw', vol: .1, vib: [7, .04], notes: 'Bb4 - A4 - Ab4 - G4 - - - - - ' }, { wave: 'triangle', vol: .12, notes: 'Bb3 - A3 - Ab3 - G3 - - - - - ' }]),
  victory: S(140, [{ wave: 'square', vol: .1, notes: 'G4 G4 G4 C5 - - E5 - D5 C5 E5 - G5 - - - ' }, { wave: 'saw', vol: .08, octave: -1, notes: 'C3 . C3 . E3 . G3 . G3 . E3 . C3 - - - ' }, DR('k . s . k . s . k k s . s s s . ', .14)]),
  defeat: S(80, [{ wave: 'saw', vol: .1, notes: 'E4 - D#4 - D4 - C#4 - - - - - - - ' }, { wave: 'triangle', vol: .12, octave: -1, notes: 'E3 - - - D3 - - - C#3 - - - - - ' }]),
  coin: S(180, [{ wave: 'square', vol: .08, notes: 'C5 E5 G5 C6 E6 - ' }])
};
// sound effects (no files): every name the game plays
const SFX = {
  hike: [{ wave: 'noise', freq: 900, to: 300, dur: .06, vol: .25, filter: 'lowpass' }, { wave: 'sine', freq: 160, to: 80, dur: .07, vol: .25 }],
  whistle: { wave: 'square', freq: 2400, vib: [32, .05], dur: .34, vol: .1 },
  helmetClang: [{ wave: 'square', freq: 1800, to: 1200, dur: .06, vol: .12 }, { wave: 'triangle', freq: 2400, to: 2200, dur: .25, vol: .1 }],
  padsCrunch: [{ wave: 'noise', freq: 900, to: 200, dur: .12, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 50, dur: .12, vol: .4 }],
  bigHit: [{ wave: 'noise', freq: 1200, to: 120, dur: .22, vol: .55, filter: 'lowpass' }, { wave: 'square', freq: 1500, to: 900, dur: .07, vol: .14 }, { wave: 'sine', freq: 80, to: 30, dur: .35, vol: .6 }],
  tackleThud: [{ wave: 'noise', freq: 600, to: 150, dur: .1, vol: .35, filter: 'lowpass' }, { wave: 'sine', freq: 100, to: 50, dur: .1, vol: .35 }],
  dive: { wave: 'noise', freq: 1400, to: 400, dur: .18, vol: .16, filter: 'bandpass' },
  spinWhoosh: { wave: 'noise', freq: 600, to: 2400, dur: .22, vol: .14, filter: 'bandpass' },
  stiffArm: [{ wave: 'noise', freq: 900, to: 300, dur: .08, vol: .35, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 60, dur: .09, vol: .4 }],
  hurdle: { wave: 'square', freq: 300, to: 700, dur: .14, vol: .1 },
  catchSlap: { wave: 'noise', freq: 1200, dur: .05, vol: .35, filter: 'bandpass', q: 3 },
  drop: [{ wave: 'noise', freq: 400, to: 150, dur: .1, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 220, to: 110, dur: .2, vol: .15 }],
  throwWhoosh: { wave: 'noise', freq: 800, to: 2000, dur: .16, vol: .14, filter: 'bandpass' },
  rocketPass: [{ wave: 'saw', freq: 300, to: 1600, dur: .22, vol: .1 }, { wave: 'noise', freq: 2000, to: 600, dur: .2, vol: .14, filter: 'bandpass' }],
  kickThump: [{ wave: 'sine', freq: 150, to: 60, dur: .12, vol: .5 }, { wave: 'noise', freq: 700, to: 200, dur: .08, vol: .3, filter: 'lowpass' }],
  doink: { wave: 'triangle', freq: 1400, to: 1320, dur: .45, vol: .22 },
  airHorn: [{ wave: 'saw', freq: 220, dur: .6, vol: .08, hold: true }, { wave: 'saw', freq: 277, dur: .6, vol: .07, hold: true }, { wave: 'saw', freq: 330, dur: .6, vol: .07, hold: true }],
  cannon: [{ wave: 'noise', freq: 600, to: 40, dur: .9, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 30, dur: .7, vol: .5 }],
  fireworks: [{ wave: 'noise', freq: 800, to: 60, dur: .6, vol: .35, filter: 'lowpass' }, { wave: 'noise', freq: 5000, dur: .4, vol: .08, filter: 'highpass', delay: .15 }],
  confettiPop: { wave: 'noise', freq: 3000, to: 1000, dur: .08, vol: .2, filter: 'bandpass' },
  coinFlip: { wave: 'square', freq: 'C6', arp: [0, 7, 12, 7, 0, 7, 12], step: .05, dur: .4, vol: .07 },
  cardFlip: [{ wave: 'noise', freq: 2500, to: 4000, dur: .06, vol: .14, filter: 'highpass' }, { wave: 'square', freq: 'E5', arp: [0, 5, 12], step: .04, dur: .16, vol: .06 }],
  fiascoBreak: [{ wave: 'square', freq: 'G5', arp: [0, -2, -4, -5, -7], step: .07, dur: .4, vol: .08 }, { wave: 'saw', freq: 220, to: 140, dur: .5, vol: .08, vib: [7, .05] }],
  hotOn: [{ wave: 'noise', freq: 400, to: 2400, dur: .4, vol: .2, filter: 'bandpass' }, { wave: 'square', freq: 'C5', arp: [0, 4, 7, 12, 16], step: .05, dur: .3, vol: .07 }],
  pileThumps: [{ wave: 'sine', freq: 110, to: 50, dur: .1, vol: .4 }, { wave: 'sine', freq: 100, to: 45, dur: .1, vol: .4, delay: .12 }, { wave: 'sine', freq: 120, to: 50, dur: .1, vol: .4, delay: .25 }],
  refCapPop: { wave: 'square', freq: 600, to: 1200, dur: .08, vol: .08 },
  mascotSqueak: { wave: 'square', freq: 1400, to: 2200, dur: .12, vol: .08, vib: [20, .05] },
  lightsOut: { wave: 'saw', freq: 800, to: 40, dur: .7, vol: .14 },
  lightsOn: [{ wave: 'noise', freq: 300, to: 100, dur: .1, vol: .3, filter: 'lowpass' }, { wave: 'saw', freq: 60, dur: .6, vol: .06, hold: true }],
  menuMove: { wave: 'square', freq: 880, dur: .03, vol: .05 },
  menuSelect: { wave: 'square', freq: 'C6', arp: [0, 7], step: .04, dur: .09, vol: .07 },
  menuBack: { wave: 'square', freq: 'G5', arp: [0, -5], step: .04, dur: .09, vol: .06 },
  meterTick: { wave: 'square', freq: 1200, dur: .02, vol: .04 },
  meterSet: { wave: 'square', freq: 'A5', arp: [0, 12], step: .03, dur: .07, vol: .08 },
  snap: { wave: 'noise', freq: 1600, dur: .03, vol: .2, filter: 'bandpass' },
  bounce: { wave: 'sine', freq: 180, to: 120, dur: .06, vol: .2 },
  footstep: { wave: 'noise', freq: 2400, dur: .02, vol: .04, filter: 'highpass' },
  thunder: [{ wave: 'noise', freq: 300, to: 40, dur: 1.4, vol: .35, filter: 'lowpass' }],
  crickets: [{ wave: 'square', freq: 4200, dur: .04, vol: .03 }, { wave: 'square', freq: 4200, dur: .04, vol: .03, delay: .08 }, { wave: 'square', freq: 4300, dur: .04, vol: .03, delay: .5 }, { wave: 'square', freq: 4300, dur: .04, vol: .03, delay: .58 }],
  engine: [{ wave: 'saw', freq: 55, to: 70, dur: 1.2, vol: .08 }, { wave: 'noise', freq: 200, dur: 1.2, vol: .1, filter: 'lowpass' }]
};
for (const k in SFX) A.define(k, SFX[k]);

const audio = FF.audioFx = { song: null };
/** play a song by name (with a fade); layers start silent */
audio.music = (name, o = {}) => { if (audio.song === name && !o.force) return; audio.song = name; A.music(name ? FF.SONGS[name] : null, { fade: o.fade === undefined ? .6 : o.fade }); audio.layers = {}; };
audio.layer = (name, on) => { if (!audio.layers) audio.layers = {}; if (audio.layers[name] === on) return; audio.layers[name] = on; const s = FF.SONGS[audio.song]; if (!s || !s.tracks.some(t => t.name === name)) return; try { A.layer(name, on ? 1 : 0, .6); } catch (e) { /* a song without it */ } };
audio.sting = name => { const s = FF.STINGS[name]; if (s) A.sting(s, { at: 'beat', duck: .35 }); };
audio.sfx = (name, o) => A.sfx(name, o);

/* ---- the crowd: a bed of bandpassed noise that follows the excitement, reactions, chants on the beat ---- */
const crowd = FF.crowdAudio = { nodes: null, E: .3, scale: 1 };
crowd.start = (scale = 1) => {
  crowd.scale = scale;
  const ctx = A.ctx; if (!ctx || crowd.nodes) return;
  const bus = A.bus('crowd'); if (!bus) return;
  const mk = (f, q, type) => { const n = ctx.createBufferSource(); n.buffer = A._noise; n.loop = true; const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; n.connect(b); b.connect(g); g.connect(bus); n.start(0, Math.random()); return { n, b, g }; };
  crowd.nodes = { bed: mk(900, .7, 'bandpass'), murmur: mk(320, .5, 'lowpass') };
};
crowd.stop = () => { if (!crowd.nodes) return; for (const k in crowd.nodes) { try { crowd.nodes[k].n.stop(); } catch (e) { /* done */ } } crowd.nodes = null; };
crowd.update = (E, dt) => {
  crowd.E = E; if (!crowd.nodes) { if (A.ctx && A.ready && FF.match) crowd.start(crowd.scale); return; }
  const t = A.ctx.currentTime, s = crowd.scale;
  crowd.nodes.bed.g.gain.setTargetAtTime((.05 + .3 * E) * s, t, .3);
  crowd.nodes.murmur.g.gain.setTargetAtTime((.08 + .05 * E) * s, t, .5);
  crowd.nodes.bed.b.frequency.setTargetAtTime(700 + E * 900, t, .3);
  void dt;
};
/** a reaction: 'roar' | 'boo' | 'oooh' | 'groan' | 'gasp' | 'cheer' */
crowd.react = (kind, k = 1) => {
  const ctx = A.ctx; if (!ctx || A.muted || ctx.state !== 'running') return;
  const bus = A.bus('crowd'); if (!bus) return;
  const t = ctx.currentTime, n = ctx.createBufferSource(); n.buffer = A._noise; n.loop = true; const b = ctx.createBiquadFilter(), g = ctx.createGain();
  const spec = { roar: [700, 1800, 2.2, .5], cheer: [900, 1600, 1.6, .4], oooh: [500, 380, 1.2, .35], groan: [420, 260, 1.4, .3], boo: [300, 240, 1.6, .3], gasp: [1400, 1000, .5, .25] }[kind] || [800, 800, 1, .3];
  b.type = 'bandpass'; b.Q.value = kind === 'oooh' || kind === 'boo' ? 3 : 1.2; b.frequency.setValueAtTime(spec[0], t); b.frequency.linearRampToValueAtTime(spec[1], t + spec[2]);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(spec[3] * k * crowd.scale, t + .15); g.gain.linearRampToValueAtTime(0, t + spec[2]);
  n.connect(b); b.connect(g); g.connect(bus); n.start(t, Math.random()); n.stop(t + spec[2] + .1);
  if (kind === 'oooh' || kind === 'boo') { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(kind === 'oooh' ? 220 : 150, t); o.frequency.linearRampToValueAtTime(kind === 'oooh' ? 170 : 130, t + spec[2]); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(.04 * k, t + .2); og.gain.linearRampToValueAtTime(0, t + spec[2]); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; o.connect(lp); lp.connect(og); og.connect(bus); o.start(t); o.stop(t + spec[2] + .1); }
};
/** a chant from a team's syllables, sung by the crowd voice (6 detuned) */
crowd.chant = team => { if (!team) return; FF.voice.say(team.chant.join(' ') + '!', 'crowd'); };
})();
