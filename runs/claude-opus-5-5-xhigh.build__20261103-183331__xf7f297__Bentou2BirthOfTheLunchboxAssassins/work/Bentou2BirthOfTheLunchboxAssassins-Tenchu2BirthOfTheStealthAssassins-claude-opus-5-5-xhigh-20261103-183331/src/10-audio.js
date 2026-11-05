/* ---- AUDIO: every sound is synthesized (the engine's chip synth with the patched pluck envelopes). Music in Japanese
 * scales (Hirajoshi D E F A Bb; In E F A B C), one mission song in layers: drone + koto always, shamisen for tension,
 * taiko + fue for an alert. Stings are short voice lists ---- */
const SFX = {
  stepDirt: { wave: 'noise', freq: 900, to: 400, dur: .05, vol: .05, filter: 'lowpass' },
  stepGravel: [{ wave: 'noise', freq: 2600, to: 1800, dur: .07, vol: .07, filter: 'bandpass', q: 2 }, { wave: 'noise', freq: 1500, dur: .05, vol: .04, delay: .02 }],
  stepWood: [{ wave: 'triangle', freq: 180, to: 120, dur: .05, vol: .09 }, { wave: 'noise', freq: 1200, dur: .03, vol: .03 }],
  stepTatami: { wave: 'noise', freq: 600, to: 300, dur: .06, vol: .03, filter: 'lowpass' },
  splash: [{ wave: 'noise', freq: 1800, to: 500, dur: .25, vol: .12, filter: 'lowpass' }, { wave: 'noise', freq: 3200, dur: .12, vol: .05, delay: .04 }],
  swim: { wave: 'noise', freq: 700, to: 1200, dur: .22, vol: .05, filter: 'bandpass', q: 1.5 },
  dive: [{ wave: 'noise', freq: 2000, to: 300, dur: .35, vol: .12, filter: 'lowpass' }, { wave: 'sine', freq: 300, to: 120, dur: .3, vol: .06 }],
  bubble: { wave: 'sine', freq: 600, to: 1300, dur: .06, vol: .05 },
  grappleThrow: { wave: 'noise', freq: 1400, to: 3200, dur: .18, vol: .08, filter: 'bandpass', q: 3 },
  grappleClink: [{ wave: 'square', freq: 2400, dur: .04, vol: .06 }, { wave: 'triangle', freq: 1800, dur: .12, vol: .07, delay: .02 }],
  grappleZip: { wave: 'noise', freq: 800, to: 2600, dur: .3, vol: .07, filter: 'bandpass', q: 4 },
  shuriken: { wave: 'noise', freq: 4200, to: 2800, dur: .16, vol: .06, filter: 'bandpass', q: 6 },
  thunk: [{ wave: 'triangle', freq: 220, to: 90, dur: .06, vol: .12 }, { wave: 'noise', freq: 900, dur: .04, vol: .05 }],
  clash: [{ wave: 'square', freq: 1800, to: 1200, dur: .08, vol: .08 }, { wave: 'noise', freq: 5000, dur: .1, vol: .07, filter: 'highpass' }, { wave: 'triangle', freq: 2600, dur: .3, vol: .04, delay: .01 }],
  parry: [{ wave: 'triangle', freq: 2200, dur: .6, vol: .1 }, { wave: 'sine', freq: 3300, dur: .5, vol: .06 }, { wave: 'noise', freq: 6000, dur: .08, vol: .08, filter: 'highpass' }],
  cutTwang: [{ wave: 'saw', freq: 'D5', to: 'D4', dur: .45, vol: .1 }, { wave: 'pulse12', freq: 'A5', dur: .5, vol: .06, delay: .03 }, { wave: 'noise', freq: 400, to: 4000, dur: .35, vol: .06, filter: 'bandpass', delay: .1 }],
  thud: [{ wave: 'sine', freq: 110, to: 50, dur: .18, vol: .2 }, { wave: 'noise', freq: 400, dur: .08, vol: .06, filter: 'lowpass' }],
  bodyDrop: [{ wave: 'sine', freq: 90, to: 45, dur: .2, vol: .18 }, { wave: 'noise', freq: 600, to: 200, dur: .15, vol: .06, filter: 'lowpass' }],
  slash: { wave: 'noise', freq: 2200, to: 900, dur: .1, vol: .08, filter: 'bandpass', q: 2 },
  smoke: [{ wave: 'noise', freq: 1200, to: 300, dur: .5, vol: .12, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 70, dur: .2, vol: .08 }],
  caltrops: [{ wave: 'square', freq: 3000, dur: .02, vol: .04 }, { wave: 'square', freq: 3600, dur: .02, vol: .04, delay: .05 }, { wave: 'square', freq: 2700, dur: .02, vol: .04, delay: .09 }],
  firecracker: [{ wave: 'noise', freq: 3000, dur: .05, vol: .2 }, { wave: 'noise', freq: 2500, dur: .05, vol: .18, delay: .08 }, { wave: 'noise', freq: 3400, dur: .05, vol: .2, delay: .15 }, { wave: 'noise', freq: 2000, dur: .07, vol: .2, delay: .21 }],
  bell: [{ wave: 'sine', freq: 196, dur: 3.2, vol: .22 }, { wave: 'sine', freq: 470, dur: 2.4, vol: .09 }, { wave: 'sine', freq: 612, dur: 1.7, vol: .06 }, { wave: 'triangle', freq: 98, dur: 2.6, vol: .1 }, { wave: 'noise', freq: 2400, dur: .05, vol: .08 }],
  bark: [{ wave: 'square', freq: 520, to: 300, dur: .09, vol: .1 }, { wave: 'noise', freq: 900, dur: .07, vol: .08, filter: 'bandpass', q: 2 }, { wave: 'square', freq: 480, to: 280, dur: .08, vol: .09, delay: .16 }],
  growl: { wave: 'saw', freq: 90, to: 70, dur: .45, vol: .07, vib: [24, .06] },
  whine: { wave: 'sine', freq: 900, to: 600, dur: .4, vol: .06 },
  crunch: [{ wave: 'noise', freq: 1600, dur: .04, vol: .06 }, { wave: 'noise', freq: 1300, dur: .04, vol: .06, delay: .12 }, { wave: 'noise', freq: 1500, dur: .04, vol: .05, delay: .26 }],
  snore: { wave: 'saw', freq: 70, to: 90, dur: .8, vol: .04, vib: [18, .05] },
  heart: [{ wave: 'sine', freq: 62, to: 40, dur: .12, vol: .22 }, { wave: 'sine', freq: 58, to: 38, dur: .1, vol: .16, delay: .16 }],
  thunder: [{ wave: 'noise', freq: 300, to: 80, dur: 1.6, vol: .25, filter: 'lowpass' }, { wave: 'noise', freq: 900, to: 200, dur: .5, vol: .12, delay: .1 }],
  eat: [{ wave: 'noise', freq: 1400, dur: .04, vol: .05 }, { wave: 'triangle', freq: 'A5', to: 'E6', dur: .12, vol: .06, delay: .1 }],
  pickup: [{ wave: 'pulse12', freq: 'D5', dur: .5, vol: .08 }, { wave: 'pulse12', freq: 'A5', dur: .5, vol: .07, delay: .07 }],
  whistle: { wave: 'sine', freq: 1800, to: 2300, dur: .35, vol: .08, vib: [7, .02] },
  creak: { wave: 'saw', freq: 140, to: 190, dur: .14, vol: .03 },
  lever: [{ wave: 'square', freq: 160, to: 110, dur: .25, vol: .08 }, { wave: 'noise', freq: 500, dur: .2, vol: .05 }],
  gate: [{ wave: 'saw', freq: 70, to: 50, dur: 1.2, vol: .08 }, { wave: 'noise', freq: 300, dur: 1, vol: .05, filter: 'lowpass' }],
  arrow: { wave: 'noise', freq: 3000, to: 1500, dur: .2, vol: .06, filter: 'bandpass', q: 5 },
  bowDraw: { wave: 'saw', freq: 220, to: 330, dur: .5, vol: .025 },
  fire: { wave: 'noise', freq: 700, dur: .6, vol: .06, filter: 'lowpass' },
  roar: [{ wave: 'saw', freq: 80, to: 55, dur: 1, vol: .14, vib: [14, .08] }, { wave: 'noise', freq: 500, to: 200, dur: .9, vol: .1, filter: 'lowpass' }],
  vanish: [{ wave: 'noise', freq: 4000, to: 600, dur: .3, vol: .1, filter: 'bandpass' }, { wave: 'triangle', freq: 'A6', to: 'A5', dur: .25, vol: .05 }],
  shing: [{ wave: 'triangle', freq: 'E6', dur: .4, vol: .07 }, { wave: 'sine', freq: 'B6', dur: .3, vol: .04, delay: .02 }],
  stomp: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .25 }, { wave: 'noise', freq: 300, to: 100, dur: .4, vol: .12, filter: 'lowpass' }],
  // ---- interface ----
  uiMove: { wave: 'triangle', freq: 'A4', to: 'G4', dur: .04, vol: .06 },
  uiConfirm: [{ wave: 'pulse12', freq: 'D5', dur: .4, vol: .07 }, { wave: 'pulse12', freq: 'A5', dur: .45, vol: .05, delay: .05 }],
  uiBack: { wave: 'triangle', freq: 'A4', to: 'D4', dur: .1, vol: .06 },
  fusuma: { wave: 'noise', freq: 600, to: 1400, dur: .3, vol: .05, filter: 'bandpass', q: 1.2 },
  stamp: [{ wave: 'sine', freq: 90, to: 40, dur: .25, vol: .3 }, { wave: 'noise', freq: 500, dur: .1, vol: .15, filter: 'lowpass' }, { wave: 'square', freq: 120, to: 60, dur: .08, vol: .08 }],
  // ---- stings ----
  stingCut: [{ wave: 'noise', freq: 300, to: 3000, dur: .4, vol: .05, filter: 'bandpass' }, { wave: 'saw', freq: 'D4', dur: .6, vol: .07, delay: .35 }, { wave: 'pulse12', freq: 'D6', to: 'A5', dur: .7, vol: .05, delay: .36 }],
  stingAlert: [{ wave: 'square', freq: 'Bb5', dur: .12, vol: .08 }, { wave: 'square', freq: 'Bb5', dur: .3, vol: .08, delay: .14 }, { wave: 'noise', freq: 200, dur: .25, vol: .12, filter: 'lowpass', delay: .1 }],
  stingObjective: [{ wave: 'pulse12', freq: 'D5', dur: .4, vol: .06 }, { wave: 'pulse12', freq: 'F5', dur: .4, vol: .06, delay: .12 }, { wave: 'pulse12', freq: 'A5', dur: .7, vol: .06, delay: .24 }],
  stingTool: [{ wave: 'pulse12', freq: 'A4', dur: .5, vol: .06 }, { wave: 'pulse12', freq: 'D5', dur: .5, vol: .06, delay: .1 }, { wave: 'pulse12', freq: 'E5', dur: .5, vol: .06, delay: .2 }, { wave: 'pulse12', freq: 'A5', dur: 1, vol: .07, delay: .3 }],
  stingOver: [{ wave: 'pulse12', freq: 'A4', dur: .7, vol: .07 }, { wave: 'pulse12', freq: 'F4', dur: .7, vol: .07, delay: .3 }, { wave: 'pulse12', freq: 'E4', dur: .7, vol: .07, delay: .6 }, { wave: 'pulse12', freq: 'D4', dur: 1.4, vol: .07, delay: .9 }, { wave: 'triangle', freq: 'D2', dur: 2, vol: .12, delay: .9 }]
};
for (const k in SFX) Au.define(k, SFX[k]);
/** a sound in the world: quieter with distance from the camera's focus, silent past 320 */
const sfxAt = (name, x, y, o = {}) => {
  const h = B.M && B.M.hero, d = h ? Math.hypot(x - h.x, y - h.y) : 0, k = clamp(1 - d / 320, 0, 1);
  if (k > .02) Au.sfx(name, Object.assign({}, o, { vol: (o.vol === undefined ? 1 : o.vol) * k }));
};
B.sfxAt = sfxAt;

/* ---- SONGS (steps: 2 = eighth notes; 8 tokens a bar) ---- */
const KOTO = { name: 'koto', wave: 'pulse12', pluck: true, ring: 1.2 }, SHAM = { name: 'shamisen', wave: 'saw', pluck: true, ring: .35 };
const SHAKU = { name: 'shaku', wave: 'sine', attack: .09, vib: [5, .012] }, FUE = { name: 'fue', wave: 'pulse', vib: [6, .015], attack: .03 };
const DRONE = { name: 'drone', wave: 'triangle' }, TAIKO = { name: 'taiko', wave: 'drums' };
const tr = (base, o) => Object.assign({}, base, o);
const SONGS = {
  title: { bpm: 72, steps: 2, tracks: [
    tr(DRONE, { vol: .2, notes: 'D3 - - - - - - - | D3 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - -' }),
    tr(KOTO, { vol: .1, notes: 'D5 . A4 . Bb4 A4 F4 . | E4 . F4 A4 D5 . . . | F5 . E5 D5 A4 . Bb4 . | A4 . F4 E4 D4 . . . | D5 . A4 . Bb4 A4 F4 . | E4 . F4 A4 D5 . E5 . | F5 . E5 D5 Bb4 . A4 . | E4 . F4 E4 D4 . . .' }),
    tr(SHAKU, { vol: .08, notes: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | A5 - - - F5 - E5 - | D5 - - - - - . . | Bb4 - - - A4 - F4 - | E4 - - - - - - . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .' }),
    tr(TAIKO, { vol: .1, notes: 'k . . . . . . . | . . . . . . . . | k . . . . . . . | . . . . k . t t' })] },
  shop: { bpm: 96, steps: 2, tracks: [
    tr(DRONE, { vol: .14, notes: 'D3 - - - - - - - | A2 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - -' }),
    tr(SHAM, { vol: .08, notes: 'D4 . D4 F4 A4 . F4 . | E4 . E4 F4 E4 . D4 . | Bb3 . D4 F4 A4 . Bb4 . | A4 . F4 . E4 . . .' }),
    tr(KOTO, { vol: .07, notes: '. . A5 . . . F5 . | . . E5 . D5 . . . | . . F5 . . . A5 . | . . E5 . D5 . . .' }),
    tr(TAIKO, { vol: .07, notes: 'k . . t . . t . | k . t . . . c .' })] },
  training: { bpm: 84, steps: 2, tracks: [
    tr(DRONE, { vol: .16, notes: 'D2 - - - - - - - | D2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - -' }),
    tr(KOTO, { vol: .08, notes: 'D4 . . . A4 . . . | Bb4 . . A4 . . . . | F4 . . . E4 . . . | D4 . . . . . . . | A4 . . . D5 . . . | E5 . . D5 . . . . | Bb4 . . . A4 . . . | F4 . E4 . D4 . . .' }),
    tr(SHAKU, { vol: .05, notes: '. . . . . . . . | A4 - - - - - - - | . . . . . . . . | . . . . . . . . | . . . . . . . . | F4 - - - E4 - - - | . . . . . . . . | . . . . . . . .' }),
    tr(SHAM, { vol: .07, on: false, notes: 'D4 D4 . F4 . E4 D4 . | A3 . A3 Bb3 A3 . F3 . | D4 D4 . F4 . A4 F4 . | E4 . D4 . A3 . . .' }),
    tr(TAIKO, { vol: .12, on: false, notes: 'k . . k . . t . | k . k . t . t t' }),
    tr(FUE, { vol: .05, on: false, notes: 'A5 - - - Bb5 A5 F5 - | E5 - - - D5 - - - | F5 - E5 - D5 - A4 - | Bb4 - A4 - - - - -' })] },
  m1: { bpm: 90, steps: 2, tracks: [
    tr(DRONE, { vol: .17, notes: 'D2 - - - - - - - | D2 - - - - - - - | Bb1 - - - - - - - | A1 - - - - - - -' }),
    tr(KOTO, { vol: .08, notes: 'D4 . A3 . D4 . E4 . | F4 . E4 . D4 . A3 . | Bb3 . D4 . F4 . E4 . | D4 . . . A3 . . . | D4 . A3 . D4 . F4 . | A4 . F4 . E4 . D4 . | Bb3 . D4 . E4 . F4 . | E4 . D4 . A3 . . .' }),
    tr(SHAM, { vol: .07, on: false, notes: 'D4 D4 . F4 . E4 D4 . | A3 . A3 Bb3 A3 . F3 . | D4 D4 . F4 . A4 F4 . | E4 . D4 . A3 . . .' }),
    tr(TAIKO, { vol: .13, on: false, notes: 'k . . k . . t . | k . k . t . t t' }),
    tr(FUE, { vol: .05, on: false, notes: 'A5 - - - Bb5 A5 F5 - | E5 - - - D5 - - - | F5 - E5 - D5 - A4 - | Bb4 - A4 - - - - -' })] },
  m2: { bpm: 78, steps: 2, tracks: [
    tr(DRONE, { vol: .17, notes: 'E2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - -' }),
    tr(KOTO, { vol: .07, ring: 1.6, notes: 'E5 . . . . . B4 . | . . C5 . . . . . | A4 . . . . F4 . . | E4 . . . . . . . | B5 . . . . . A5 . | . . F5 . . . . . | E5 . . . C5 . . . | B4 . . . . . . .' }),
    tr(SHAM, { vol: .07, on: false, notes: 'E3 . E3 F3 . E3 . . | A3 . B3 . C4 . B3 . | E3 . E3 F3 . A3 . . | B3 . A3 . F3 . E3 .' }),
    tr(TAIKO, { vol: .13, on: false, notes: 'k . . . k . t . | k . t k . . t t' }),
    tr(FUE, { vol: .05, on: false, notes: 'B5 - - - C6 - B5 - | A5 - - - F5 - - - | E5 - F5 - A5 - B5 - | C6 - B5 - A5 - - -' })] },
  m3: { bpm: 88, steps: 2, tracks: [
    tr(DRONE, { vol: .16, notes: 'A1 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -' }),
    tr(KOTO, { vol: .08, notes: 'A3 . E4 . A4 . B4 . | C5 . B4 . A4 . E4 . | F4 . E4 . C4 . B3 . | A3 . . . E4 . . .' }),
    { name: 'festival', wave: 'drums', vol: .05, notes: 'k . . . t . t . | k . t . . . t .' },
    tr(FUE, { name: 'fest', vol: .03, notes: 'E5 - F5 E5 C5 - - - | B4 - C5 - A4 - - - | . . . . . . . . | . . . . . . . . | A5 - - - B5 A5 E5 - | F5 - E5 - C5 - - - | . . . . . . . . | . . . . . . . .' }),
    tr(SHAM, { vol: .07, on: false, notes: 'A3 A3 . C4 . B3 A3 . | E3 . E3 F3 E3 . C3 . | A3 A3 . C4 . E4 C4 . | B3 . A3 . E3 . . .' }),
    tr(TAIKO, { vol: .13, on: false, notes: 'k . . k . . t . | k . k . t . t t' }),
    tr(FUE, { vol: .05, on: false, notes: 'E6 - - - F6 E6 C6 - | B5 - - - A5 - - - | C6 - B5 - A5 - E5 - | F5 - E5 - - - - -' })] },
  boss: { bpm: 140, steps: 4, tracks: [
    tr(TAIKO, { vol: .16, notes: 'k . . k . . k . k . t t k . t . | k . . k . . k . k t t t k k t t' }),
    tr(SHAM, { vol: .08, ring: .25, notes: 'D4 . D4 F4 . D4 E4 . D4 . A3 . Bb3 . A3 . | D4 . D4 F4 . A4 Bb4 . A4 . F4 . E4 . D4 . | D4 . D4 F4 . D4 E4 . D4 . A3 . Bb3 . A3 . | F4 . E4 F4 . E4 D4 . A3 . Bb3 . A3 . . .' }),
    { name: 'bass', wave: 'saw', vol: .06, notes: 'D2 . D2 . D2 . D3 . D2 . D2 . C3 . D3 . | Bb1 . Bb1 . Bb1 . Bb2 . A1 . A1 . A2 . A1 .' },
    tr(FUE, { vol: .05, notes: 'D6 - - - - - A5 - Bb5 - A5 - F5 - E5 - | D5 - - - - - - - . . . . . . . . | F6 - - - E6 - D6 - A5 - - - Bb5 - A5 - | E5 - - - - - - - . . . . . . . .' })] },
  results: { bpm: 80, steps: 2, tracks: [
    tr(DRONE, { vol: .13, notes: 'D3 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - | D3 - - - - - - -' }),
    tr(KOTO, { vol: .08, notes: 'D5 . . A4 . . F4 . | G4 . . A4 . . D5 . | E5 . . D5 . . A4 . | D5 . . . . . . .' })] },
  ending: { bpm: 66, steps: 2, tracks: [
    tr(DRONE, { vol: .14, notes: 'D3 - - - - - - - | B2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - -' }),
    tr(KOTO, { vol: .06, notes: 'D4 F#4 A4 D5 A4 F#4 . . | B3 D4 F#4 B4 F#4 D4 . . | G3 B3 D4 G4 D4 B3 . . | A3 C#4 E4 A4 E4 C#4 . .' }),
    tr(SHAKU, { vol: .09, notes: 'A5 - - - - - F#5 - | E5 - - - D5 - - - | B4 - - - D5 - E5 - | F#5 - - - - - - - | A5 - - - B5 - A5 - | F#5 - - - E5 - D5 - | E5 - - - - - B4 - | D5 - - - - - - -' })] }
};
const Music = { cur: null, level: 0, layerT: 0 };
/** play a song by id (null stops) */
Music.play = (id, o = {}) => {
  if (Music.cur === id && Au.song && !o.restart) return;
  Music.cur = id; Music.level = 0;
  if (!id) { Au.stopMusic(.6); return; }
  Au.music(SONGS[id], { fade: o.fade === undefined ? .8 : o.fade, restart: true });
};
/** the mood of a mission song: 0 calm, 1 tension (the shamisen), 2 alert (taiko and fue). Alert fades out 4 s after it ends */
Music.mood = (lv, dt = 0) => {
  if (!Music.cur || !SONGS[Music.cur] || Music.cur === 'boss') return;
  if (lv >= 2) Music.layerT = 4; else if (Music.layerT > 0) { Music.layerT -= dt; if (Music.layerT > 0) lv = 2; }
  if (lv === Music.level) return;
  const was = Music.level; Music.level = lv;
  const has = n => SONGS[Music.cur].tracks.some(t => t.name === n && t.on === false);
  if (has('shamisen')) Au.layer('shamisen', lv >= 1 ? 1 : 0, lv >= 1 ? .6 : 2.5);
  if (has('taiko')) Au.layer('taiko', lv >= 2 ? 1 : 0, lv >= 2 ? .3 : 2.5);
  if (has('fue')) Au.layer('fue', lv >= 2 ? 1 : 0, lv >= 2 ? .8 : 2.5);
  if (lv === 2 && was < 2) Au.sfx('stingAlert');
};
B.Music = Music; B.SONGS = SONGS;
