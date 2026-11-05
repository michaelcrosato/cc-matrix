// Audio, all in code: sound effects, the music (songs as data, layered by intensity), the gibberish voices and
// the howl. Event-driven from a world's events; never read by the sim.
(() => {
const E = My3D2dge, WP = globalThis.WP;
const A = WP.Audio = { last: {}, hb: 0, rot: 0, eng: 0, rain: 0, intensity: 0, song: null };
const au = () => WP.game && WP.game.audio;
let PAN = 0;   // the pan of the event being voiced: its screen side (-1 left .. 1 right)
const sfx = (v, o) => { const a = au(); if (a) a.sfx(v, PAN ? Object.assign({ pan: PAN }, o) : o); };
A.panOf = (ev, world) => { const v = world.view; let x = ev.x, y = ev.y, z = ev.z; if (ev.id && world.get) { const e = world.get(ev.id); if (e) { x = e.x; y = e.y; z = e.z; } } if (x === undefined || !v || ev.k === 'shot' || ev.k === 'pickup') return 0; const p = v.project(x, y, z || 0); return p ? Math.max(-1, Math.min(1, (p[0] - WP.W / 2) / (WP.W / 2))) * .8 : 0; };
const lim = (k, gap) => { const t = WP.game ? WP.game.real || WP.game.time : 0; if (A.last[k] !== undefined && t - A.last[k] < gap && t >= A.last[k]) return false; A.last[k] = t; return true; };
// ---------------------------------------------------------------------------------------------- sounds
A.S = {
  smg: () => { sfx({ wave: 'noise', freq: 1800, to: 300, dur: .05, vol: .18 }, { pitch: .95 + WP.fxr() * .1 }); sfx({ wave: 'square', freq: 90, to: 50, dur: .06, vol: .14 }); },
  smgFury: () => { sfx({ wave: 'noise', freq: 2400, to: 500, dur: .04, vol: .16 }); sfx({ wave: 'square', freq: 120, to: 60, dur: .05, vol: .12 }); },
  click: () => sfx({ wave: 'square', freq: 1400, to: 1100, dur: .02, vol: .12 }),
  reload: () => { sfx({ wave: 'square', freq: 700, to: 400, dur: .03, vol: .12 }); WP.game.after(.35, () => sfx({ wave: 'noise', freq: 900, to: 600, dur: .08, vol: .1 })); },
  reloaded: () => { sfx({ wave: 'square', freq: 500, to: 900, dur: .04, vol: .14 }); WP.game.after(.06, () => sfx({ wave: 'square', freq: 1200, to: 800, dur: .03, vol: .12 })); },
  throwG: () => sfx({ wave: 'noise', freq: 400, to: 1400, dur: .2, vol: .12 }),
  boom: (big) => { sfx('explode', { vol: big ? 1 : .8 }); sfx({ wave: 'sine', freq: 60, to: 30, dur: big ? .9 : .6, vol: .4 }); sfx({ wave: 'noise', freq: 300, to: 60, dur: big ? 1 : .6, vol: .22 }); },
  ricochet: () => sfx({ wave: 'sine', freq: 2400, to: 900, dur: .14, vol: .07 }),
  crack: (near) => sfx({ wave: 'noise', freq: 2600, to: 900, dur: .06, vol: near ? .16 : .08 }),
  whiz: () => sfx({ wave: 'sine', freq: 3000, to: 1400, dur: .1, vol: .06 }),
  tick: (u) => sfx({ wave: 'pulse12', freq: 600 + (1 - u) * 900, dur: .03, vol: .07 }),
  hiss: () => sfx({ wave: 'noise', freq: 3000, to: 1200, dur: .5, vol: .1 }),
  whistleFall: () => sfx({ wave: 'sine', freq: 2200, to: 500, dur: 2.2, vol: .08 }),
  knife: () => sfx({ wave: 'noise', freq: 1200, to: 3000, dur: .18, vol: .08 }),
  cannon: () => { sfx({ wave: 'noise', freq: 500, to: 80, dur: .4, vol: .3 }); sfx({ wave: 'sine', freq: 70, to: 35, dur: .5, vol: .35 }); },
  pop: () => { sfx({ wave: 'square', freq: 900, to: 1800, dur: .06, vol: .14 }); sfx({ wave: 'noise', freq: 1500, to: 400, dur: .12, vol: .12 }); },
  pickup: k => { const arp = { mag: [0, 4, 7], ammo: [0, 4, 7, 12], grenade: [0, 5, 9], gbox: [0, 5, 9, 12], ration: [0, 3, 7, 10], medkit: [0, 4, 7, 11, 14], fury: [0, 7, 12, 16, 19], dynamite: [0, -5, -12], flare: [0, 9, 14], intel: [0, 2, 4, 7], fang: [0, 12, 24] }[k] || [0, 7]; sfx({ wave: 'square', freq: 'C5', dur: .06 * arp.length + .05, vol: .14, arp, step: .05 }); },
  civ: () => { sfx({ wave: 'square', freq: 'C4', dur: .4, vol: .12 }); sfx({ wave: 'square', freq: 'F#4', dur: .4, vol: .12 }); sfx({ wave: 'saw', freq: 'B3', dur: .4, vol: .08 }); },
  hurt: () => { sfx('hurt', { vol: .7 }); sfx({ wave: 'sine', freq: 90, to: 50, dur: .2, vol: .3 }); },
  klaxon: () => { for (let i = 0; i < 4; i++) WP.game.after(i * .45, () => sfx({ wave: 'saw', freq: 'A4', to: 'E4', dur: .4, vol: .12 })); },
  alarm: () => { for (let i = 0; i < 3; i++) WP.game.after(i * .12, () => sfx({ wave: 'square', freq: 1800, dur: .06, vol: .09 })); },
  whistle: () => sfx({ wave: 'sine', freq: 2800, to: 3100, dur: 1.8, vol: .1, vib: [14, .04] }),
  fanfare: () => sfx({ wave: 'square', freq: 'G4', dur: .7, vol: .14, arp: [0, 4, 7, 12, 7, 12], step: .1 }),
  sad: () => sfx({ wave: 'triangle', freq: 'E4', dur: .8, vol: .16, arp: [0, -1, -5], step: .25 }),
  crash: () => { sfx({ wave: 'noise', freq: 600, to: 100, dur: 1.2, vol: .25 }); sfx({ wave: 'saw', freq: 200, to: 60, dur: 1.2, vol: .1 }); },
  splash: () => sfx({ wave: 'noise', freq: 4000, to: 600, dur: .5, vol: .16 }),
  beep: () => sfx({ wave: 'pulse12', freq: 1600, dur: .05, vol: .07 }),
  heart: () => { sfx({ wave: 'sine', freq: 60, to: 40, dur: .1, vol: .3 }); WP.game.after(.16, () => sfx({ wave: 'sine', freq: 55, to: 38, dur: .1, vol: .22 })); },
  chop: v => sfx({ wave: 'noise', freq: 220, to: 120, dur: .05, vol: v }),
  engine: v => sfx({ wave: 'saw', freq: 55, to: 50, dur: .16, vol: v }),
  rain: () => sfx({ wave: 'noise', freq: 5000, to: 4000, dur: .5, vol: .03 }),
  thunder: () => sfx({ wave: 'noise', freq: 200, to: 40, dur: 2.2, vol: .3 }),
  steam: () => sfx({ wave: 'noise', freq: 5000, to: 2000, dur: .8, vol: .12 }),
  flame: () => sfx({ wave: 'noise', freq: 800, to: 300, dur: 1, vol: .14 }),
  menuMove: () => sfx({ wave: 'square', freq: 880, dur: .03, vol: .08 }),
  menuPick: () => sfx({ wave: 'square', freq: 'E5', dur: .12, vol: .1, arp: [0, 7], step: .05 }),
  menuBack: () => sfx({ wave: 'square', freq: 'E5', dur: .1, vol: .08, arp: [0, -5], step: .05 }),
  tallyTick: () => sfx({ wave: 'square', freq: 1200, dur: .02, vol: .06 }),
  stamp: () => { sfx({ wave: 'noise', freq: 300, to: 80, dur: .2, vol: .2 }); sfx({ wave: 'square', freq: 110, to: 70, dur: .15, vol: .15 }); },
  armored: () => sfx({ wave: 'square', freq: 2000, to: 1600, dur: .05, vol: .08 }),
  thud: () => sfx({ wave: 'sine', freq: 120, to: 60, dur: .12, vol: .2 })
};
// the howl: a sine gliding 220 -> 440 -> 330 Hz over 1.4 s with growing vibrato
A.howl = (vol = .22) => { sfx({ wave: 'sine', freq: 220, to: 440, dur: .55, vol, vib: [5, .02] }); sfx({ wave: 'triangle', freq: 110, to: 220, dur: .55, vol: vol * .4 }); WP.game.after(.5, () => { sfx({ wave: 'sine', freq: 440, to: 330, dur: .9, vol, vib: [6, .05] }); sfx({ wave: 'triangle', freq: 220, to: 165, dur: .9, vol: vol * .4 }); }); };
// ---------------------------------------------------------------------------------------------- voices: Animalese gibberish
WP.VOICES = { den: [300, 'pulse12', 1, true], lobo: [150, 'square', 1], fang: [170, 'square', 1], tundra: [260, 'pulse', 1], moonshine: [190, 'square', 1], kragg: [120, 'saw', 1.1, false, true], tusk: [100, 'saw', 1], giggs: [230, 'pulse', 1.4], hostage: [260, 'pulse', 1], villager: [270, 'triangle', 1] };
const VOW = { A: 1, E: 1.12, I: 1.25, O: .9, U: .8, Y: 1.18 };
A.voiceFn = (profile, line) => {
  const V = WP.VOICES[profile] || WP.VOICES.den, seed = WP.hash(line || ''), sp = V[2] || 1;
  return (ch, i) => {
    if (!WP.game || !ch) return; const c = ch.toUpperCase();
    if (VOW[c]) { const j = 1 + ((((seed >> (i % 16)) & 7) - 3.5) / 3.5) * .06, last = line && line.slice(i + 1).replace(/[^A-Z]/gi, '').length === 0, q = line && /\?\s*$/.test(line), ex = line && /!\s*$/.test(line);
      sfx({ wave: V[1], freq: V[0] * VOW[c] * j, to: V[0] * VOW[c] * j * (last && q ? 1.3 : .97), dur: .07 / sp, vol: ex ? .13 : .1, vib: V[4] ? [7, .03] : undefined }); }
    else if (/[A-Z]/.test(c) && i % 2 === 0) sfx({ wave: 'noise', freq: 2500 + (seed % 7) * 200, dur: .015, vol: .05 });
    if (V[3] && i === 0) sfx({ wave: 'noise', freq: 3000, to: 1500, dur: .12, vol: .05 });
  };
};
A.bark = (text, profile) => { const f = A.voiceFn(profile, text); let i = 0; for (const ch of text) { const k = i++; WP.game.after(k * .045, () => f(ch, k)); } };
A.cackle = () => { for (let i = 0; i < 6; i++) WP.game.after(i * .11, () => sfx({ wave: 'saw', freq: 220 - i * 12, to: 180 - i * 12, dur: .08, vol: .12 })); };
// ---------------------------------------------------------------------------------------------- music: songs as data
const bar = s => s;
WP.SONGS = {
  title: { bpm: 128, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .12, notes: 'A4 - - - E5 - - - A5 - - - - - G5 - | F5 - E5 - D5 - E5 - - - - - . . . . | A4 - - - E5 - - - A5 - - - C6 - B5 - | A5 - - - - - - - - - - - . . . . | C5 - - - D5 - E5 - F5 - - - E5 - D5 - | E5 - - - A4 - - - C5 - B4 - A4 - - - | F5 - - - E5 - D5 - C5 - - - B4 - C5 - | A4 - - - - - - - E4 - - - A4 - - -' },
    { name: 'pad', wave: 'saw', vol: .04, notes: 'A3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | A3 - - - - - - - - - - - - - - - | E3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | C3 - - - - - - - - - - - - - - - | D3 - - - - - - - - - - - - - - - | E3 - - - - - - - - - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 . A2 . A2 . A2 . F2 . F2 . F2 . F2 . | D2 . D2 . E2 . E2 . A2 . A2 . A2 . A2 . | A2 . A2 . A2 . A2 . F2 . F2 . G2 . G2 . | A2 . A2 . E2 . E2 . A2 . . . A2 . . . | F2 . F2 . F2 . F2 . C3 . C3 . C3 . C3 . | A2 . A2 . A2 . A2 . E2 . E2 . E2 . E2 . | D2 . D2 . D2 . D2 . G2 . G2 . G2 . G2 . | E2 . E2 . E2 . E2 . A2 . E2 . A2 . . .' },
    { name: 'perc', wave: 'drums', vol: .2, notes: 'k . h . s . h . k k h . s . h h | k . h . s . h . k k h . s . s s | k . h . s . h . k k h . s . h h | k . h . s . k . k . s s s s s s | k . h . s . h . k k h . s . h h | k . h . s . h . k k h . s . s s | k . h . s . h . k k h . s . h h | k . h . s . k . k . s s s s s s' } ] },
  briefing: { bpm: 90, steps: 4, tracks: [
    { name: 'arp', wave: 'pulse', vol: .07, notes: 'A3 C4 E4 A4 E4 C4 A3 C4 F3 A3 C4 F4 C4 A3 F3 A3 | G3 B3 D4 G4 D4 B3 G3 B3 E3 G#3 B3 E4 B3 G#3 E3 G#3' },
    { name: 'bass', wave: 'triangle', vol: .18, notes: 'A2 - - - - - - - F2 - - - - - - - | G2 - - - - - - - E2 - - - - - - -' },
    { name: 'perc', wave: 'drums', vol: .1, notes: 'k . . . h . . . k . . . h . . h | k . . . h . . . k . k . h . h h' } ] },
  map: { bpm: 110, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .1, notes: 'A4 - - - E5 - - - A5 - - - - - - - | G5 - - - E5 - - - D5 - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .16, notes: 'A2 . . . A2 . . . F2 . . . F2 . . . | G2 . . . G2 . . . E2 . . . E2 . . .' },
    { name: 'perc', wave: 'drums', vol: .16, notes: 's s s s s . s . s s s s s . s s | s s s s s . s . s s s s s s s s' } ] },
  op1: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .09, notes: 'D5 - - - A4 - - - D5 - E5 - F5 - - - | E5 - - - C5 - - - A4 - - - - - - - | D5 - - - A4 - - - D5 - E5 - F5 - G5 - | A5 - - - G5 - F5 - E5 - - - D5 - - -' },
    { name: 'pad', wave: 'saw', vol: .035, notes: 'D3 - - - - - - - - - - - - - - - | C3 - - - - - - - - - - - - - - - | Bb2 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 F2 . | C2 . C2 C2 . C2 C2 . C2 . C2 C2 . C2 E2 . | Bb1 . Bb1 Bb1 . Bb1 Bb1 . Bb1 . Bb1 Bb1 . Bb1 D2 . | A1 . A1 A1 . A1 A1 . A1 . C2 . E2 . A1 .' },
    { name: 'perc', wave: 'drums', vol: .2, notes: 'k . h . s . h k k . h . s . h h | k . h . s . h k k . h . s . s h | k . h . s . h k k . h . s . h h | k . h . s . h k k . s . s s s s' } ] },
  op2: { bpm: 132, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .08, notes: 'E5 - - . G5 - - . A5 - B5 - - - - - | D5 - - . E5 - - . B4 - - - - - - - | E5 - - . G5 - - . A5 - B5 - D6 - B5 - | A5 - G5 - E5 - - - - - - - . . . .' },
    { name: 'pad', wave: 'triangle', vol: .06, notes: 'E3 - - - - - - - - - - - - - - - | D3 - - - - - - - - - - - - - - - | C3 - - - - - - - - - - - - - - - | B2 - - - - - - - - - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .18, notes: 'E2 . . E2 . . E2 . G2 . . G2 . . A2 . | D2 . . D2 . . D2 . F#2 . . F#2 . . B1 . | C2 . . C2 . . C2 . E2 . . E2 . . G2 . | B1 . . B1 . . B1 . D#2 . . F#2 . . B1 .' },
    { name: 'perc', wave: 'drums', vol: .2, notes: 'k . t . t . k t . t k . t t t . | k . t . t . k t . t k . t . t t | k . t . t . k t . t k . t t t . | k . t t t . k t t t k t t t t t' } ] },
  op3: { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .08, notes: 'G4 . Bb4 - . D5 . C5 - Bb4 . A4 - G4 . . | F4 . A4 - . C5 . Bb4 - A4 . G4 - F4 . . | G4 . Bb4 - . D5 . G5 - F5 . D5 - Bb4 . . | C5 - . A4 - . F#4 - G4 - - - - - . .' },
    { name: 'pad', wave: 'saw', vol: .03, notes: 'G3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | Eb3 - - - - - - - - - - - - - - - | D3 - - - - - - - - - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'G2 . . G2 . G2 . . G2 . . G2 . Bb2 . . | F2 . . F2 . F2 . . F2 . . F2 . A2 . . | Eb2 . . Eb2 . Eb2 . . Eb2 . . Eb2 . G2 . . | D2 . . D2 . D2 . . D2 . F#2 . A2 . D2 .' },
    { name: 'perc', wave: 'drums', vol: .2, notes: 'k . h s . h k . h k s . h . s h | k . h s . h k . h k s . h . s h | k . h s . h k . h k s . h . s h | k . h s . h k . s s s . s s s s' } ] },
  op4: { bpm: 146, steps: 4, tracks: [
    { name: 'lead', wave: 'saw', vol: .06, notes: 'C5 - - . C5 - Eb5 - G5 - - - F5 - Eb5 - | D5 - - . Bb4 - - - C5 - - - - - . . | C5 - - . C5 - Eb5 - G5 - Ab5 - G5 - F5 - | Eb5 - D5 - C5 - B4 - C5 - - - - - . .' },
    { name: 'pad', wave: 'pulse12', vol: .04, notes: 'C3 - - - - - - - Ab2 - - - - - - - | Bb2 - - - - - - - G2 - - - - - - - | C3 - - - - - - - Ab2 - - - - - - - | G2 - - - - - - - C3 - - - - - - -' },
    { name: 'bass', wave: 'square', vol: .1, notes: 'C2 C2 . C2 C2 . C2 . Ab1 Ab1 . Ab1 Ab1 . Ab1 . | Bb1 Bb1 . Bb1 Bb1 . Bb1 . G1 G1 . G1 G1 . G1 . | C2 C2 . C2 C2 . C2 . Ab1 Ab1 . Ab1 Ab1 . Ab1 . | G1 G1 . G1 G1 . B1 . C2 . C2 . C2 C2 C2 .' },
    { name: 'perc', wave: 'drums', vol: .22, notes: 'k . c . s . c k k . c . s . o . | k . c . s . c k k . c . s . o o | k . c . s . c k k . c . s . o . | k . c . s . c k k s s s o . o o' } ] },
  op5: { bpm: 120, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .09, notes: 'F#4 - - - . . A4 - - - . . C#5 - - - | B4 - - - . . A4 - G#4 - - - - - - - | F#4 - - - . . A4 - - - . . D5 - - - | C#5 - - - B4 - A4 - G#4 - - - F#4 - - -' },
    { name: 'pad', wave: 'saw', vol: .03, notes: 'F#2 - - - - - - - - - - - - - - - | E2 - - - - - - - - - - - - - - - | D2 - - - - - - - - - - - - - - - | C#2 - - - - - - - - - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .18, notes: 'F#1 . . . . . . . F#1 . . . . . . . | E1 . . . . . . . E1 . . . . . . . | D1 . . . . . . . D1 . . . . . . . | C#1 . . . . . . . C#1 . . . G#1 . . .' },
    { name: 'perc', wave: 'drums', vol: .2, notes: 'k . . k . . . . k . . k . . h . | k . . k . . . . k . . k . . h . | k . . k . . . . k . . k . . h . | k . . k . . . . k . . k . h h h' } ] },
  op6: { bpm: 156, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .09, notes: 'A4 - - - E5 - - - A5 - - - G5 - E5 - | F5 - - - E5 - D5 - E5 - - - - - . . | C5 - - - G5 - - - C6 - - - B5 - G5 - | A5 - - - G5 - E5 - A5 - - - - - . .' },
    { name: 'pad', wave: 'saw', vol: .035, notes: 'A3 - - - - - - - F3 - - - - - - - | D3 - - - - - - - E3 - - - - - - - | C3 - - - - - - - G3 - - - - - - - | F3 - - - - - - - E3 - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 . A2 A2 . A2 A2 . F2 . F2 F2 . F2 F2 . | D2 . D2 D2 . D2 D2 . E2 . E2 E2 . E2 E2 . | C2 . C2 C2 . C2 C2 . G2 . G2 G2 . G2 G2 . | F2 . F2 F2 . F2 F2 . E2 . E2 . G#2 . E2 .' },
    { name: 'perc', wave: 'drums', vol: .22, notes: 'k h s h k k s h k h s h k k s s | k h s h k k s h k h s h k s s s | k h s h k k s h k h s h k k s s | k h s h k k s h k s s s s s s s' } ] },
  boss: { bpm: 160, steps: 4, tracks: [
    { name: 'lead', wave: 'saw', vol: .07, notes: 'E5 - F5 - E5 - D#5 - E5 - - - B4 - C5 - | B4 - A#4 - B4 - - - G4 - - - F#4 - - - | E5 - F5 - E5 - D#5 - E5 - G5 - F#5 - F5 - | E5 - D#5 - D5 - C#5 - C5 - B4 - A#4 - B4 -' },
    { name: 'pad', wave: 'pulse12', vol: .04, notes: 'E3 - - - - - - - F3 - - - - - - - | E3 - - - - - - - B2 - - - - - - - | E3 - - - - - - - F3 - - - - - - - | E3 - - - - - - - B2 - - - - - - -' },
    { name: 'bass', wave: 'square', vol: .1, notes: 'E1 E1 E2 E1 E1 E2 E1 E1 F1 F1 F2 F1 F1 F2 F1 F1 | E1 E1 E2 E1 E1 E2 E1 E1 B0 B0 B1 B0 B0 B1 B0 B0 | E1 E1 E2 E1 E1 E2 E1 E1 F1 F1 F2 F1 F1 F2 F1 F1 | E1 E1 E2 E1 D#1 D#1 D1 D1 C#1 C#1 C1 C1 B0 B0 B0 B0' },
    { name: 'perc', wave: 'drums', vol: .24, notes: 'k k s . k k s . k k s . k k s s | k k s . k k s . k k s . k s s s | k k s . k k s . k k s . k k s s | k k s s k k s s k s k s s s s s' } ] },
  tally: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .12, notes: 'A4 . C5 . E5 . A5 - - - G5 . A5 - - - | B5 - - - - - - - . . . . . . . .' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 . . . A2 . . . F2 . . . G2 . . . | E2 - - - - - - - . . . . . . . .' },
    { name: 'perc', wave: 'drums', vol: .18, notes: 'k . s . k . s . k . s . s s s s | k . . . . . . . . . . . . . . .' } ] },
  gameover: { bpm: 90, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .14, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - | D4 - - - C4 - - - B3 - - - A3 - - -' },
    { name: 'bass', wave: 'triangle', vol: .16, notes: 'A2 - - - - - - - F2 - - - - - - - | D2 - - - - - - - E2 - - - - - - -' } ] },
  ending: { bpm: 84, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .13, notes: 'A4 - - - E5 - - - A5 - - - - - G#5 - | F#5 - E5 - D5 - E5 - - - - - - - - - | A4 - - - E5 - - - A5 - - - C#6 - B5 - | A5 - - - - - - - - - - - - - - -' },
    { name: 'pad', wave: 'saw', vol: .035, notes: 'A3 - - - - - - - - - - - - - - - | D3 - - - - - - - E3 - - - - - - - | A3 - - - - - - - F#3 - - - - - - - | E3 - - - - - - - A3 - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .18, notes: 'A2 - - - - - - - C#3 - - - - - - - | D2 - - - - - - - E2 - - - - - - - | A2 - - - - - - - F#2 - - - - - - - | E2 - - - - - - - A2 - - - - - - -' },
    { name: 'perc', wave: 'drums', vol: .1, notes: 'k . . . s . . . k . . . s . . . | k . . . s . . . k . k . s . . . | k . . . s . . . k . . . s . . . | k . . . s . . . k . k . s s s s' } ] }
};
A.music = (name, o = {}) => { const a = au(); if (!a) return; if (A.song === name && !o.force) return; A.song = name; if (!name) { a.music(null); return; } a.music(WP.SONGS[name], { fade: o.fade === undefined ? .6 : o.fade }); };
A.sting = name => { const a = au(); if (a && a.sting) a.sting(WP.SONGS[name] || name); };
// ---------------------------------------------------------------------------------------------- the event listener: sounds and rumble for a world's events
A.rumble = (pid, s, t) => { const g = WP.game; if (!g || !g.players) return; const p = WP.inputFor ? WP.inputFor(pid) : null; if (p && p.rumble) p.rumble(s, t); };
A.onEvent = (ev, world, local) => {
  const k = ev.k, S = A.S, mine = local === undefined || ev.pid === local;
  PAN = A.panOf(ev, world); try { A.onEvent2(ev, world, local, k, S, mine); } finally { PAN = 0; }
};
A.onEvent2 = (ev, world, local, k, S, mine) => {
  if (k === 'shot') { if (lim('shot' + ev.pid, 1 / 14)) (ev.fury ? S.smgFury : S.smg)(); if (mine) A.rumble(ev.pid, .06, .03); if (ev.mat === 'metal' && lim('ric', .15)) S.ricochet(); }
  else if (k === 'dry') { if (lim('dry', .2)) S.click(); }
  else if (k === 'reload') S.reload(); else if (k === 'reloaded') S.reloaded();
  else if (k === 'throw') { S.throwG(); A.bark('HUP', 'lobo'); if (mine) A.rumble(ev.pid, .45, .2); }
  else if (k === 'explode') { if (lim('boom', .08)) S.boom(ev.big); A.rumble(-1, ev.big ? 1 : .5, ev.big ? .6 : .25); }
  else if (k === 'kill') { const T = WP.TYPES[ev.type]; if (T && T.kind === 'infantry' && lim('bark', .25)) A.bark(['GWAH', 'UGH', 'HYAA', 'OOF'][ev.id % 4], ev.id % 2 ? 'tusk' : 'giggs'); S.thud(); }
  else if (k === 'hurt' || k === 'hitwp' || k === 'bosshit' || k === 'prophit') { if (lim('hit', .05)) sfx({ wave: 'square', freq: 300, to: 200, dur: .03, vol: .08 }); }
  else if (k === 'armored') { if (lim('arm', .1)) S.armored(); }
  else if (k === 'telegraph') { if (ev.kind === 'whistle') S.whistle(); else if (lim('tick', .1)) S.tick(1); }
  else if (k === 'efire') { if (lim('ef', .06)) S.crack(ev.hit); if (!ev.hit && lim('whiz', .2)) S.whiz(); }
  else if (k === 'damage') { if (mine) { S.hurt(); A.rumble(ev.pid, .8, .25); } }
  else if (k === 'pickup') S.pickup(ev.pk);
  else if (k === 'friendly') { S.civ(); A.bark('EEK', 'hostage'); }
  else if (k === 'intercept') S.pop();
  else if (k === 'launch') { const t = ev.type; if (t === 'rocket' || t === 'missile') S.hiss(); else if (t === 'shell') S.whistleFall(); else if (t === 'blade') S.knife(); else if (t === 'tshell') S.cannon(); else if (t === 'flame') S.flame(); else if (t === 'egrenade') S.throwG(); }
  else if (k === 'impact') { S.thud(); }
  else if (k === 'boss') { S.klaxon(); A.music('boss'); }
  else if (k === 'bossdown') { A.music(null); S.fanfare(); A.rumble(-1, 1, .6); }
  else if (k === 'mult') { if (ev.m >= 4) A.howl(.18); }
  else if (k === 'spotted') S.alarm();
  else if (k === 'hostagehit') A.bark('OW', 'hostage');
  else if (k === 'rescued') S.fanfare(); else if (k === 'lost') S.sad();
  else if (k === 'mast') S.crash(); else if (k === 'bridge') { S.crash(); WP.game.after(.6, S.splash); }
  else if (k === 'squawk') sfx({ wave: 'square', freq: 1200, to: 1800, dur: .12, vol: .1, vib: [20, .2] });
  else if (k === 'dynamite') S.boom(true);
  else if (k === 'steam') S.steam(); else if (k === 'nozzle' || k === 'vent') S.tick(.2);
  else if (k === 'emergency' || k === 'refill') S.pickup('ammo');
  else if (k === 'chain') A.bark('YEEHAW', 'moonshine');
  else if (k === 'cell') sfx({ wave: 'square', freq: 200, to: 120, dur: .2, vol: .12 });
  else if (k === 'down') sfx({ wave: 'triangle', freq: 'A3', dur: 1, vol: .2, arp: [0, -2, -5, -12], step: .2 });
};
// loops: rotors, engines, heartbeat, low ammo, rain (called every presentation step)
A.loops = (world, dt, local) => {
  A.rot -= dt; A.eng -= dt; A.hb -= dt; A.rain -= dt;
  let air = 0, eng = 0;
  for (const e of world.ents) { if (e.dead) continue; if (e.T && (e.T.air || e.T.shape === 'hyenaOne')) { const d = WP.worldToCam(world.cam, e.x, e.y)[1]; air = Math.max(air, 1 - Math.min(1, d / 900)); } else if (e.kind === 'vehicle') { const d = WP.worldToCam(world.cam, e.x, e.y)[1]; eng = Math.max(eng, 1 - Math.min(1, d / 600)); } }
  if (air > 0 && A.rot <= 0) { A.rot = .08; const h = world.ents.find(e => !e.dead && e.T && (e.T.air || e.T.shape === 'hyenaOne')); PAN = h ? A.panOf({ x: h.x, y: h.y, z: h.z }, world) : 0; A.S.chop(.03 + air * .09); PAN = 0; }
  if (eng > 0 && A.eng <= 0) { A.eng = .15; A.S.engine(.02 + eng * .05); }
  const p = world.players.find(q => q.pid === local) || world.players[0];
  if (p && !p.down && p.damage > 75 && A.hb <= 0) { A.hb = .9; A.S.heart(); }
  if (p && !p.down && p.mag < 6 && !p.spares.length && p.fury <= 0 && lim('low', .5)) A.S.beep();
  if (world.stage.rain && A.rain <= 0) { A.rain = .45; A.S.rain(); }
  if (world.stage.wind && (A.gust = (A.gust || 0) - dt) <= 0) { A.gust = 2.5; sfx({ wave: 'noise', freq: 400, to: 900, dur: 1.6, vol: .04 * world.stage.wind }); }
  // the music's layers follow intensity
  const a = au(); if (a && a.layer) { const n = world.ents.filter(e => !e.dead && (e.kind === 'infantry' || e.kind === 'vehicle')).length; const target = Math.min(1, n / 6); A.intensity += (target - A.intensity) * Math.min(1, dt * 2); if ((A.lt = (A.lt || 0) - dt) <= 0) { A.lt = .5; try { a.layer('lead', .4 + A.intensity * .6, .4); a.layer('perc', .5 + A.intensity * .5, .4); } catch (e) { /* the song has no such layer */ } } }
};
})();
