/* =====================================================================================
 * 50-audio: all sound is code. Sound effects as the engine's voices, original songs in its step sequencer (each dungeon
 * song has fight layers that come in when monsters engage), stings, and the babble synth for voices (Animalese style:
 * formant-filtered syllables, a word always sounding the same). Driven by events, by state and by dialogue.
 * ===================================================================================== */
const N_ = (wave, freq, to, dur, vol, o = {}) => Object.assign({ wave, freq, to, dur, vol }, o);
const SFX = {
  stepWet: [N_('noise', 420, 160, .08, .1, { filter: 'lowpass' }), N_('noise', 1600, 900, .05, .04, { delay: .03 })],
  stepMetal: [N_('noise', 900, 300, .06, .09), N_('square', 160, 120, .03, .03)],
  stepDust: N_('noise', 600, 200, .07, .08, { filter: 'lowpass' }),
  stepStone: N_('noise', 320, 120, .07, .1, { filter: 'lowpass' }),
  turn: N_('noise', 900, 500, .06, .04),
  bump: [N_('square', 90, 50, .1, .18), N_('noise', 300, 100, .06, .12)],
  doorOpen: [N_('saw', 110, 70, .5, .08, { vib: [9, .08], filter: 'lowpass' }), N_('noise', 500, 200, .3, .06)],
  doorShut: [N_('square', 80, 50, .15, .2), N_('noise', 260, 90, .12, .16)],
  gate: N_('saw', 70, 110, .9, .1, { vib: [14, .12] }),
  lever: [N_('square', 260, 140, .08, .18), N_('noise', 1200, 600, .05, .1, { delay: .09 })],
  button: [N_('square', 520, 380, .04, .14), N_('noise', 2400, 1200, .03, .06)],
  catch: [N_('triangle', 880, 660, .05, .14), N_('noise', 3000, 2000, .03, .05, { delay: .05 })],
  plate: [N_('square', 140, 90, .1, .2), N_('noise', 220, 120, .08, .12)],
  grind: [N_('noise', 180, 120, 1.2, .14, { filter: 'lowpass' }), N_('saw', 55, 48, 1.2, .05, { vib: [7, .1] })],
  shimmer: N_('sine', 1200, 2400, .25, .08, { vib: [30, .03] }),
  trapdoor: [N_('square', 120, 60, .18, .2), N_('noise', 400, 90, .3, .16)],
  fall: N_('sine', 600, 80, .6, .16),
  landThud: [N_('square', 70, 40, .2, .26), N_('noise', 260, 60, .2, .2)],
  whoosh: N_('noise', 300, 2400, .4, .1),
  spin: N_('noise', 240, 180, .5, .06, { filter: 'lowpass' }),
  darts: [N_('noise', 4000, 2000, .05, .2), N_('noise', 4000, 2000, .05, .2, { delay: .07 }), N_('noise', 4200, 2400, .05, .16, { delay: .13 })],
  keyTurn: [N_('square', 660, 0, .06, .14, { arp: [0, 7], step: .06 }), N_('noise', 2000, 900, .08, .08, { delay: .12 })],
  lockFail: N_('square', 180, 160, .06, .16),
  pickScratch: N_('noise', 3200, 2600, .2, .06),
  pickSnap: [N_('noise', 5000, 3000, .03, .14), N_('square', 900, 400, .04, .1)],
  alcove: N_('triangle', 330, 260, .1, .14),
  pickup: N_('triangle', 520, 780, .08, .14),
  drop: N_('noise', 600, 250, .08, .12),
  throw: N_('noise', 800, 2000, .14, .08),
  clatter: [N_('noise', 1800, 900, .06, .12), N_('square', 400, 300, .03, .06, { delay: .05 })],
  eat: [N_('noise', 1200, 800, .05, .1), N_('noise', 1200, 800, .05, .1, { delay: .12 }), N_('noise', 1200, 800, .05, .08, { delay: .24 })],
  drink: [N_('sine', 300, 500, .1, .12), N_('sine', 340, 560, .1, .1, { delay: .13 }), N_('sine', 380, 620, .1, .08, { delay: .26 })],
  scroll: N_('noise', 2400, 1200, .25, .06),
  wand: [N_('square', 1400, 300, .12, .1), N_('sine', 800, 1600, .15, .08)],
  swingBlade: N_('noise', 2600, 800, .1, .12),
  swingAxe: N_('noise', 1600, 500, .14, .14),
  swingBlunt: N_('noise', 900, 300, .14, .14),
  whiff: N_('noise', 2200, 1200, .08, .06),
  xbow: [N_('square', 220, 90, .06, .18), N_('noise', 3000, 1200, .08, .1)],
  bow: [N_('triangle', 330, 180, .12, .14), N_('noise', 2600, 1600, .06, .06)],
  sling: N_('noise', 600, 1400, .25, .08, { vib: [20, .2] }),
  hitFlesh: [N_('noise', 700, 200, .08, .2), N_('square', 120, 70, .05, .12)],
  hitMetal: [N_('square', 880, 660, .08, .14), N_('noise', 3200, 1600, .06, .1)],
  hitBone: [N_('square', 520, 300, .05, .14), N_('noise', 1600, 900, .05, .1)],
  hitOoze: N_('sine', 180, 70, .16, .24),
  crit: [N_('square', 1200, 880, .1, .16), N_('noise', 4000, 2000, .1, .12)],
  partyHurt: [N_('square', 220, 110, .12, .2), N_('noise', 600, 200, .1, .12)],
  levelUp: N_('square', 523, 0, .5, .14, { arp: [0, 4, 7, 12], step: .08 }),
  deathToll: [N_('triangle', 110, 104, 1.6, .26), N_('sine', 220, 210, 1.6, .1)],
  raise: N_('sine', 330, 990, .9, .14, { vib: [6, .02] }),
  castArc: N_('saw', 220, 880, .2, .1),
  castHoly: N_('sine', 523, 1046, .4, .12, { vib: [5, .02] }),
  spark: N_('square', 1400, 700, .08, .08),
  zapLightning: [N_('noise', 6000, 600, .35, .22), N_('saw', 1200, 80, .3, .1)],
  orb: N_('saw', 120, 340, .4, .1),
  boom: [N_('noise', 500, 60, .7, .3, { filter: 'lowpass' }), N_('square', 70, 30, .5, .2)],
  frost: [N_('noise', 6000, 3000, .3, .12), N_('sine', 1800, 2400, .2, .06)],
  heal: N_('sine', 523, 784, .3, .12),
  ward: N_('triangle', 660, 990, .3, .1),
  sleep: N_('sine', 600, 300, .5, .1),
  squeak: N_('square', 1800, 2400, .06, .07),
  slurp: N_('sine', 140, 60, .25, .2),
  chitter: N_('square', 1200, 0, .14, .06, { arp: [0, 3, 0, 5], step: .03 }),
  rattle: N_('noise', 2200, 0, .2, .1, { arp: [0, 3, 0, 5], step: .04 }),
  clank: [N_('square', 300, 200, .08, .14), N_('noise', 2000, 1200, .05, .08, { delay: .06 })],
  growl: N_('saw', 90, 70, .5, .14, { vib: [18, .1] }),
  chant: N_('sine', 260, 250, .6, .08, { vib: [5, .04] }),
  hum: N_('sine', 220, 230, .5, .08, { vib: [3, .02] }),
  roar: [N_('saw', 110, 55, 1, .2, { vib: [7, .12] }), N_('noise', 500, 120, .8, .15, { filter: 'lowpass' })],
  bossCrack: [N_('noise', 8000, 800, .4, .26), N_('saw', 900, 60, .4, .14)],
  boltSlam: [N_('square', 90, 40, .3, .26), N_('noise', 900, 120, .3, .2)],
  lockTurn: N_('noise', 220, 160, 2, .1, { filter: 'lowpass' }),
  shriek: N_('saw', 900, 1800, .7, .1, { vib: [24, .06] }),
  uiMove: N_('square', 660, 0, .025, .06), uiConfirm: N_('square', 880, 1320, .06, .1), uiBack: N_('square', 520, 330, .06, .1), uiError: N_('square', 140, 120, .1, .12), uiTab: N_('triangle', 990, 0, .04, .08),
  tumblers: N_('noise', 2600, 0, .4, .12, { arp: [0, 5, 2, 7, 0], step: .06 }),
  chime: [N_('sine', 784, 0, 1.4, .14), N_('sine', 988, 0, 1.4, .1, { delay: .35 }), N_('sine', 1175, 0, 1.6, .1, { delay: .7 })],
  gutter: N_('noise', 900, 200, .5, .08),
  drip: N_('sine', 1600, 900, .05, .05),
  disarm: N_('triangle', 700, 1100, .1, .1),
  rust: N_('noise', 3000, 800, .3, .08),
  coinUp: N_('square', 988, 0, .2, .1, { arp: [0, 7, 12], step: .05 })
};
const T2 = (notes, wave, vol, o = {}) => Object.assign({ wave, vol, notes }, o);
B.SONGS = {
  title: { bpm: 76, steps: 2, tracks: [
    T2('D4 - F4 A4 G4 - F4 E4 | D4 - - - C4 E4 G4 F4 | E4 - D4 C#4 D4 - - - | A3 - D4 F4 E4 - D4 C#4', 'pulse', .07),
    T2('D2 - - - - - - - | F2 - - - - - - - | A1 - - - - - - - | D2 - - - A1 - - -', 'triangle', .22),
    T2('. . A5 . . . D6 . | . . C6 . . . A5 . | . . G5 . . . E5 . | . . F5 . . . A5 .', 'sine', .04)] },
  drains: { bpm: 60, steps: 2, tracks: [
    T2('A1 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -', 'triangle', .24),
    T2('A3 . C4 . E4 . . . | D4 . C4 . B3 . . . | . . . . . . . . | . . . . . . . .', 'pulse', .05),
    T2('. . . . . . E5 . | . . . . . . . . | . . . . . . . A5 | . . . . . . . .', 'sine', .05),
    T2('k . . . h . . . | k . . h s . h . | k . . . h . k . | k . h . s . h h', 'drums', .1, { name: 'fight', on: false }),
    T2('A2 . A2 . C3 . A2 . | G2 . G2 . B2 . G2 . | F2 . F2 . A2 . F2 . | E2 . G#2 . B2 . E3 .', 'saw', .05, { name: 'fight2', on: false })] },
  tumbler: { bpm: 96, steps: 2, tracks: [
    T2('E2 . B2 E2 . B2 | E2 . B2 E2 . B2 | C2 . G2 C2 . G2 | D2 . A2 D2 . A2', 'triangle', .2),
    T2('h . h c . h | h . h c . h | h . h c . h | h c h c . h', 'drums', .06),
    T2('E4 . G4 B4 . A4 | G4 . F#4 E4 . . | C5 . B4 G4 . E4 | F#4 . . D4 . .', 'pulse', .045),
    T2('k . . s . . | k . k s . . | k . . s . . | k k . s . s', 'drums', .1, { name: 'fight', on: false }),
    T2('E3 E3 . E3 G3 . | E3 E3 . E3 B2 . | C3 C3 . C3 E3 . | D3 D3 . D3 F#3 .', 'saw', .05, { name: 'fight2', on: false })] },
  gloam: { bpm: 54, steps: 2, tracks: [
    T2('C3 - - - - - - - | C3 - - - - - - - | Ab2 - - - - - - - | G2 - - - - - - -', 'sine', .16),
    T2('F#3 - - - - - - - | F#3 - - - - - - - | D3 - - - - - - - | D3 - - - - - - -', 'sine', .1),
    T2('G4 - - - Eb4 - - - | F#4 - - - - - - - | Ab4 - - - G4 - - - | C4 - - - - - - -', 'triangle', .05),
    T2('k . . . . . s . | k . . . . . s . | k . . k . . s . | k . . . . s s .', 'drums', .1, { name: 'fight', on: false }),
    T2('C2 . C2 . F#2 . C2 . | C2 . C2 . G2 . C2 . | Ab1 . Ab1 . D2 . Ab1 . | G1 . G1 . D2 . G1 .', 'saw', .06, { name: 'fight2', on: false })] },
  vault: { bpm: 70, steps: 2, tracks: [
    T2('A1 - - - - - - - | G1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -', 'triangle', .22),
    T2('. . A4 . . . E5 . | . . G4 . . . D5 . | . . F4 . . . C5 . | . . E4 . . . B4 .', 'sine', .05),
    T2('k . . . s . . . | k . . k s . . .', 'drums', .1, { name: 'fight', on: false }),
    T2('A2 . A2 . A2 . A2 . | G2 . G2 . G2 . G2 .', 'saw', .05, { name: 'fight2', on: false })] },
  boss: { bpm: 138, steps: 4, tracks: [
    T2('A2 A2 . A2 C3 . A2 . | G2 G2 . G2 Bb2 . G2 . | F2 F2 . F2 A2 . F2 . | E2 . G#2 . B2 . E3 .', 'saw', .07),
    T2('A4 E5 A5 E5 A4 E5 A5 E5 | G4 D5 G5 D5 G4 D5 G5 D5 | F4 C5 F5 C5 F4 C5 F5 C5 | E4 B4 E5 B4 G#4 B4 E5 B4', 'pulse', .035),
    T2('A1 . A1 . A1 . A1 . | G1 . G1 . G1 . G1 . | F1 . F1 . F1 . F1 . | E1 . E1 . E1 . E1 .', 'triangle', .26),
    T2('k . h k s . h . | k k h . s . h h', 'drums', .12, { name: 'fight' }),
    T2('. . . . . . . . | . . . . . . E5 . | . . . . . . . . | . . . . B5 . . .', 'square', .03, { name: 'fight2' })] },
  camp: { bpm: 70, steps: 2, tracks: [
    T2('D4 - F#4 A4 G4 - F#4 E4 | D4 - - - C#4 E4 G4 F#4 | E4 - D4 C#4 D4 - - - | . . . . . . . .', 'triangle', .1),
    T2('D3 - - - A2 - - - | G2 - - - A2 - - - | B2 - - - A2 - - - | D3 - - - - - - -', 'sine', .12)] },
  ending: { bpm: 84, steps: 2, tracks: [
    T2('D4 - F#4 A4 G4 - F#4 E4 | D4 - - - C#4 E4 G4 F#4 | E4 - D4 C#4 D4 - A4 - | D5 - - - - - - -', 'pulse', .07),
    T2('D2 - - - A2 - - - | G2 - - - A2 - - - | B2 - - - A2 - - - | D2 - - - - - - -', 'triangle', .22),
    T2('. . F#5 . . . D6 . | . . E5 . . . A5 . | . . G5 . . . F#5 . | . . . . A5 . . .', 'sine', .04)] },
  race: { bpm: 132, steps: 4, tracks: [
    T2('A2 . A2 . C3 . A2 . | G2 . G2 . B2 . D3 . | F2 . F2 . A2 . C3 . | E2 . E2 . G#2 . B2 .', 'saw', .06),
    T2('A4 . C5 . E5 . C5 . | B4 . D5 . G5 . D5 . | A4 . C5 . F5 . C5 . | G#4 . B4 . E5 . B4 .', 'pulse', .04),
    T2('k . h . s . h . | k . h k s . h h', 'drums', .1)] },
  // stings
  levelUp: { bpm: 160, steps: 4, tracks: [T2('C5 E5 G5 C6 - - - -', 'square', .1), T2('C4 - - - G4 - - -', 'triangle', .14)] },
  deed: { bpm: 140, steps: 4, tracks: [T2('G4 B4 D5 G5 - F#5 G5 - - - -', 'pulse', .1), T2('G3 - - - D4 - G3 - -', 'triangle', .14)] },
  secret: { bpm: 150, steps: 4, tracks: [T2('E5 G5 B5 E6 - - - -', 'sine', .1)] },
  wardFound: { bpm: 110, steps: 4, tracks: [T2('D5 - A5 - F5 - D6 - - -', 'pulse', .1), T2('D3 - - - A3 - - -', 'triangle', .14)] },
  gameOver: { bpm: 60, steps: 2, tracks: [T2('D4 - C4 - Bb3 - A3 - - - -', 'triangle', .16), T2('D2 - - - - - - -', 'sine', .14)] },
  victory: { bpm: 120, steps: 4, tracks: [T2('D5 - D5 F#5 A5 - - - D6 - - - - - - -', 'pulse', .1), T2('D3 - A3 - D4 - - - D3 - - -', 'triangle', .16)] },
  npcJoin: { bpm: 140, steps: 4, tracks: [T2('A4 C#5 E5 A5 - -', 'triangle', .12)] },
  coin: { bpm: 200, steps: 4, tracks: [T2('B5 E6 - -', 'square', .08)] }
};
const STEP_SFX = { wet: 'stepWet', metal: 'stepMetal', dust: 'stepDust', stone: 'stepStone' };
const MON_VOICE = id => (B.MON(id) || {}).voice;
const HIT_SFX = { flesh: 'hitFlesh', metal: 'hitMetal', bone: 'hitBone', ooze: 'hitOoze' };
/** the director: the song per floor and scene, fight layers in and out, stings; sound effects from events */
const Sound = {
  song: null, fight: false,
  init() { const A = game.audio; for (const [k, v] of Object.entries(SFX)) A.define(k, v); },
  music(id, o = {}) { if (this.song === id) return; this.song = id; this.fight = false; game.audio.music(id ? B.SONGS[id] : null, Object.assign({ fade: 1 }, o)); },
  sting(id) { if (B.SONGS[id]) game.audio.sting(B.SONGS[id], { at: 'now', duck: .35 }); },
  fightLayer(on) { if (this.fight === on) return; this.fight = on; const A = game.audio; if (!A.song || this.song === 'boss') return; A.layer('fight', on ? 1 : 0, on ? .5 : 2); A.layer('fight2', on ? 1 : 0, on ? .5 : 2); },
  /** the song for the floor the party is on */
  floorSong() { if (!S) return; const f = S.floor, boss = f === 'f4' && S.boss && S.boss.alive && S.boss.awake; this.music(boss ? 'boss' : B.FLOORS[f].song); },
  /** the floors' ambience: drips, distant gears, whispers, a hum, now and then */
  ambT: 3,
  ambience(dt) {
    if (!S || S.transit || S.camp) return; this.ambT -= dt; if (this.ambT > 0) return;
    const f = S.floor, r = (Math.sin(game.real * 12.9898) * 43758.5453) % 1, pan = Math.abs(r) * 1.4 - .7;
    this.ambT = 3 + Math.abs(r) * 6;
    if (f === 'f1' || f === 'race') this.sfx('drip', { pan, vol: .5, pitch: .8 + Math.abs(r) * .5 });
    else if (f === 'f2') this.sfx(Math.abs(r) > .5 ? 'clank' : 'tumblers', { pan, vol: .25, pitch: .6 });
    else if (f === 'f3') this.sfx('chant', { pan, vol: .3, pitch: .5 + Math.abs(r) * .3 });
    else if (f === 'f4') this.sfx('hum', { pan, vol: .4, pitch: .5 });
  },
  sfx(id, o = {}) { if (SFX[id] || game.audio.presets[id]) game.audio.sfx(id, o); },
  /** a sound placed by where its source is from the party (left, right) */
  at(id, x, y, o = {}) { const P = S.party, side = B.relSide(P.dir, P.cx, P.cy, x, y), d = Math.abs(x - P.cx) + Math.abs(y - P.cy); const pan = side === 1 ? .6 : side === 3 ? -.6 : 0; this.sfx(id, Object.assign({ pan, vol: Math.max(.25, 1 - d * .12) }, o)); },
  event(e) {
    const F = B.FLOORS[S.floor], fl = S.floors[S.floor];
    const monAt = uid => fl.mons.find(m => m.uid === uid);
    switch (e.t) {
      case 'step': this.sfx(STEP_SFX[F.step] || 'stepStone'); break;
      case 'turn': this.sfx('turn'); break;
      case 'bump': this.sfx('bump'); break;
      case 'door': this.sfx(e.kind === 'gate' || e.kind === 'undergate' ? 'gate' : e.kind === 'secret' ? 'grind' : e.kind === 'seal' ? 'shimmer' : e.open ? 'doorOpen' : 'doorShut'); break;
      case 'lever': this.sfx('lever'); break;
      case 'button': this.sfx('button'); break;
      case 'catch': this.sfx('catch'); break;
      case 'plate': this.sfx('plate'); break;
      case 'illusion': this.sfx('shimmer'); break;
      case 'trapdoor': this.sfx('trapdoor'); break;
      case 'fall': this.sfx('fall'); break;
      case 'land': this.sfx('landThud'); break;
      case 'teleport': if (!e.silent) this.sfx('whoosh'); break;
      case 'spin': this.sfx('spin'); break;
      case 'unlock': this.sfx('keyTurn'); break;
      case 'alcovePlace': case 'alcoveTake': this.sfx('alcove'); break;
      case 'pickup': this.sfx('pickup'); break;
      case 'drop': this.sfx('drop'); break;
      case 'land_': break;
      case 'swing': if (e.fam === 'blade' || e.fam === 'spear') this.sfx('swingBlade'); else if (e.fam === 'axe') this.sfx('swingAxe'); else if (e.fam === 'blunt' || e.fam === 'fist') this.sfx('swingBlunt'); else if (e.fam === 'cast') this.sfx(e.color === '#ffd36a' || e.color === '#7ae08a' ? 'castHoly' : 'castArc'); break;
      case 'monHurt': { const m = monAt(e.uid); this.at(e.crit ? 'crit' : HIT_SFX[(B.MON(m ? m.type : 'rat') || {}).hit] || 'hitFlesh', e.x, e.y); break; }
      case 'monDie': this.at(MON_VOICE(e.type) || 'squeak', e.x, e.y, { pitch: .7 }); break;
      case 'wind': { const m = monAt(e.uid); if (m) this.at(MON_VOICE(m.type) || 'squeak', m.cx, m.cy); break; }
      case 'alert': { const m = monAt(e.uid); if (m) this.at(MON_VOICE(m.type) || 'squeak', m.cx, m.cy, { pitch: 1.2 }); break; }
      case 'hurt': if (e.n > 0) { const pan = e.side === 1 ? .7 : e.side === 3 ? -.7 : 0; this.sfx('partyHurt', { pan }); if (e.n >= 4) Voices.bark(e.m, 'Oof!'); } break;
      case 'dead': this.sfx('deathToll'); break;
      case 'down': this.sfx('partyHurt', { pitch: .7 }); break;
      case 'levelUp': this.sting('levelUp'); Voices.bark(e.m, 'Yes!'); break;
      case 'raise': this.sfx('raise'); break;
      case 'spell': this.sfx(['mend', 'greaterMend', 'purge'].includes(e.id) ? 'heal' : e.id === 'wardOfBrass' ? 'ward' : e.id === 'slumber' ? 'sleep' : e.id === 'forkedLightning' ? 'zapLightning' : e.id === 'blazingOrb' ? 'orb' : e.id === 'frostbite' ? 'frost' : e.id === 'sparkDart' ? 'spark' : 'castHoly'); break;
      case 'burst': this.sfx('boom'); break;
      case 'sparkHit': this.sfx('spark', { pitch: 1.3 }); break;
      case 'sting': this.sting(e.id); break;
      case 'sfx': this.sfx({ darts: 'darts', eat: 'eat', drink: 'drink', scroll: 'scroll', wand: 'wand', whiff: 'whiff', throw: 'throw', xbow: 'xbow', bow: 'bow', sling: 'sling', lockFail: 'lockFail', pickSnap: 'pickSnap', tumblers: 'tumblers', chime: 'chime', gutter: 'gutter', disarm: 'disarm', rust: 'rust' }[e.id] || e.id); break;
      case 'combat': this.fightLayer(e.on); break;
      case 'music': if (e.id === 'boss') this.music('boss'); break;
      case 'floor': this.floorSong(); break;
      case 'lockTurn': this.sfx('lockTurn'); break;
      case 'lockDone': this.sfx('shriek'); this.sfx('boltSlam'); break;
      case 'bossTele': if (e.k === 'lightning') this.sfx('hum', { pitch: 3 }); else if (e.k === 'gaze') this.sfx('hum', { pitch: .8 }); else if (e.k === 'rain') this.sfx('chant', { pitch: 1.6 }); break;
      case 'bossBolt': this.sfx('zapLightning'); break;
      case 'bossRain': this.sfx('boltSlam'); break;
      case 'bossSlam': this.sfx('boltSlam', { pitch: .8 }); break;
      case 'bossHurt': this.sfx('hitMetal', { pitch: .8 }); break;
      case 'bossDie': this.sfx('roar'); this.music(null); break;
      case 'eyeCrack': this.sfx('bossCrack'); break;
      case 'bossRelock': this.sfx('boltSlam'); this.sfx('roar', { pitch: 1.4 }); break;
      case 'bossPhase': this.sfx('roar'); break;
      case 'ugBolt': this.sfx('boltSlam', { pitch: 1 + e.k * .05 }); break;
      case 'ward': this.sting('wardFound'); break;
      case 'checkpoint': this.sfx('coinUp'); break;
      case 'candle': this.sfx('catch', { pitch: 1.4 }); break;
      case 'brace': this.sfx('clank'); break;
      case 'steal': this.sfx('chitter', { pitch: 1.4 }); break;
      case 'bark': Voices.say(e.who, e.text); break;
    }
  }
};
B.Sound = Sound;

/* ---- the babble synth: { base Hz, range (semitones), rate (syllables a second), wave, formant x, breath, vib, echo } ---- */
const VOICE_PROFILES = {
  narrator: { base: 95, range: 3, rate: 9, wave: 'triangle', echo: .2 }, keywarden: { base: 170, range: 4, rate: 12, wave: 'square' }, lintel: { base: 120, range: 5, rate: 10, wave: 'sawtooth' },
  tamsin: { base: 300, range: 7, rate: 15, wave: 'pulse' }, durgan: { base: 105, range: 4, rate: 11, wave: 'square' }, ysolde: { base: 220, range: 5, rate: 9, wave: 'sine', echo: .4 },
  veil: { base: 240, range: 3, rate: 10, wave: 'triangle', breath: .5 }, snick: { base: 260, range: 8, rate: 16, wave: 'square' }, eye: { base: 70, range: 6, rate: 8, wave: 'sawtooth', ring: 30, echo: .5 }
};
B.VOICE_PROFILES = VOICE_PROFILES;
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 2300] };
const Voices = {
  /** the syllables of a text, as events: { t (s), f (Hz), f1, f2, noise: 'click' | 'hiss' | 'hum' | null, dur, vol }. The
   *  same text and profile always give the same plan */
  plan(text, prof) {
    const out = [], rate = prof.rate || 10, step = 1 / rate; let t = 0, n = 0;
    const s = String(text).toLowerCase(), last = /[?]\s*$/.test(s), loud = /!/.test(s);
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '.') { t += .15; continue; } if (ch === ',') { t += .08; continue; } if (ch === ' ') { t += step * .25; continue; }
      if (!/[a-z]/.test(ch)) continue;
      const vowel = 'aeiouy'.includes(ch); n++;
      if (!vowel && n % 2) continue;
      const code = ch.charCodeAt(0), r = prof.range || 4, semi = ((code * 7 + (s.charCodeAt(i - 1) || 0) * 3) % (r * 2 + 1)) - r;
      const end = last && i > s.length - 4 ? 3 : 0, f = (prof.base || 150) * Math.pow(2, (semi + end + (loud ? 2 : 0)) / 12);
      const fm = FORMANTS[vowel ? ch : (s.slice(i).match(/[aeiou]/) || ['a'])[0]] || FORMANTS.a, k = prof.formant || 1;
      out.push({ t, f, f1: fm[0] * k, f2: fm[1] * k, noise: 'bdgkpt'.includes(ch) ? 'click' : 'fsvzh'.includes(ch) ? 'hiss' : 'mn'.includes(ch) ? 'hum' : null, dur: step * .9, vol: loud ? .3 : .22 });
      t += step;
    }
    return out;
  },
  profile(who) { if (VOICE_PROFILES[who]) return VOICE_PROFILES[who]; const P = B.PEOPLE[who]; if (P && P.voice && VOICE_PROFILES[P.voice]) return VOICE_PROFILES[P.voice]; return { base: 150, range: 4, rate: 12, wave: 'square' }; },
  memberProfile(m) { const v = m.voice || [150, 4, 12, 'square']; return { base: v[0], range: v[1], rate: v[2], wave: v[3] === 'saw' ? 'sawtooth' : v[3] }; },
  /** play a plan now on the voice bus (nothing in Node, or before the browser allows sound) */
  play(plan, prof, delay = 0) {
    const A = game.audio, c = A.ctx, bus = A.bus && A.bus('voice'); if (!c || !bus || c.state !== 'running' || A.muted) return 0;
    const t0 = c.currentTime + .02 + delay;
    for (const s of plan) this.syllable(c, bus, t0 + s.t, s, prof);
    return plan.length ? plan[plan.length - 1].t + .2 : 0;
  },
  syllable(c, bus, t, s, prof) {
    try {
      const o = c.createOscillator(); if (prof.wave === 'pulse') o.setPeriodicWave(game.audio._pulse(.25)); else o.type = prof.wave || 'square';
      o.frequency.setValueAtTime(s.f, t); if (prof.vib) { o.frequency.linearRampToValueAtTime(s.f * (1 + prof.vib), t + s.dur); }
      const g = c.createGain(), vol = s.vol * (prof.wave === 'sine' ? 1.4 : prof.wave === 'triangle' ? 1.2 : .7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.setValueAtTime(vol, t + s.dur * .6); g.gain.linearRampToValueAtTime(0, t + s.dur * .6 + .03);
      const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.Q.value = b2.Q.value = 8; b1.frequency.value = s.f1; b2.frequency.value = s.f2;
      o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g);
      let out = g;
      if (prof.ring) { const rg = c.createGain(), lfo = c.createOscillator(); lfo.frequency.value = prof.ring; lfo.connect(rg.gain); rg.gain.value = 0; g.connect(rg); lfo.start(t); lfo.stop(t + s.dur + .1); out = rg; }
      out.connect(bus);
      if (prof.echo) { const d = c.createDelay(.5), dg = c.createGain(); d.delayTime.value = .18; dg.gain.value = prof.echo * .5; out.connect(d); d.connect(dg); dg.connect(bus); }
      o.start(t); o.stop(t + s.dur + .08);
      if (s.noise || prof.breath) {
        const src = c.createBufferSource(); src.buffer = game.audio._noise; const f = c.createBiquadFilter(), ng = c.createGain();
        const nd = s.noise === 'click' ? .01 : s.noise === 'hiss' ? .04 : s.dur * .6;
        f.type = s.noise === 'hum' ? 'lowpass' : 'highpass'; f.frequency.value = s.noise === 'hum' ? 300 : 3000;
        const nv = (s.noise ? .12 : 0) + (prof.breath || 0) * .05; ng.gain.setValueAtTime(nv, t); ng.gain.linearRampToValueAtTime(0, t + nd);
        src.connect(f); f.connect(ng); ng.connect(bus); src.start(t, Math.random() * .5); src.stop(t + nd + .02);
      }
    } catch (e) { /* a browser without some node: the voice is quiet */ }
  },
  /** a whole line at once (barks) */
  say(who, text) { const prof = this.profile(who); this.play(this.plan(text, prof), prof); },
  /** a party member's short cry */
  bark(mi, text) { const m = S && S.party.members[mi]; if (!m || this._barkT > game.real - .8) return; this._barkT = game.real; const prof = this.memberProfile(m); this.play(this.plan(text, prof), prof); },
  /** a dialogue box typing: speak the letters that appeared since the last call */
  typing(who, shownText) {
    const prev = this._typed || ''; if (who !== this._who || !shownText.startsWith(prev)) { this._typed = ''; this._who = who; }
    const add = shownText.slice((this._typed || '').length); this._typed = shownText; if (!add) return;
    const prof = typeof who === 'object' ? who : this.profile(who);
    this.play(this.plan(add, Object.assign({}, prof, { rate: prof.rate * 1.4 })), prof);
  }
};
B.Voices = Voices;
