/* AUDIO: everything is synthesized. Sound effects in the engine's voice format, original step-sequencer songs with a
 * fight layer that comes in during combat, stings, and the babble voice synth (Animalese-style gibberish from the
 * letters of each line, through formant filters, on its own bus). */
const N = (wave, freq, dur, vol, o = {}) => Object.assign({ wave, freq, dur, vol }, o);
B.SFX = {
  stepWet: [N('noise', 380, .08, .1, { to: 160, filter: 'lowpass' }), N('noise', 1400, .05, .03, { delay: .04 })], stepGrate: [N('noise', 900, .06, .08, { to: 400 }), N('square', 180, .03, .02)],
  stepDust: N('noise', 260, .09, .08, { to: 120, filter: 'lowpass' }), stepStone: N('noise', 320, .07, .1, { to: 140, filter: 'lowpass' }),
  turn: N('noise', 900, .06, .04, { to: 500 }), bump: [N('square', 90, .1, .18, { to: 50 }), N('noise', 300, .06, .1)],
  doorOpen: [N('saw', 110, .35, .08, { to: 160, filter: 'lowpass' }), N('noise', 500, .3, .05)], doorClose: [N('square', 80, .12, .18, { to: 50 }), N('noise', 400, .1, .1)],
  gate: N('saw', 70, .9, .12, { to: 110, vib: [12, .1] }), lever: [N('square', 260, .08, .18, { to: 140 }), N('noise', 1200, .05, .12, { delay: .09 })],
  button: [N('square', 520, .04, .14), N('square', 340, .04, .1, { delay: .05 })], catch: [N('square', 900, .03, .12), N('noise', 3000, .04, .06, { delay: .03 })],
  plateDown: N('square', 140, .1, .2, { to: 90 }), plateUp: N('square', 110, .08, .12, { to: 160 }),
  secretWall: [N('noise', 180, 1.2, .14, { to: 90, filter: 'lowpass' }), N('saw', 50, 1.1, .08, { vib: [8, .2] })], teleport: N('sine', 300, .5, .14, { to: 1200, vib: [20, .1] }),
  spinner: N('noise', 200, .5, .08, { to: 140, filter: 'lowpass' }), darts: [N('noise', 4000, .05, .2, { to: 2000 }), N('noise', 4000, .05, .2, { to: 2000, delay: .07 }), N('noise', 4000, .05, .2, { to: 2000, delay: .13 })],
  keyTurn: [N('square', 660, .06, .14), N('square', 990, .08, .12, { delay: .07 }), N('noise', 2000, .05, .08, { delay: .15 })], lockFail: N('square', 180, .07, .15, { to: 140 }),
  pick: [N('noise', 5000, .04, .06), N('square', 1200, .05, .1, { delay: .1 })], pickSnap: [N('noise', 6000, .03, .2), N('square', 300, .05, .1, { to: 120 })],
  alcove: N('square', 220, .08, .14, { to: 180 }), pickup: N('square', 660, .07, .12, { arp: [0, 7], step: .035 }), drop: N('square', 160, .08, .14, { to: 110 }), stow: N('square', 440, .05, .08, { to: 520 }),
  throw: N('noise', 2400, .18, .1, { to: 900 }), land: [N('noise', 900, .08, .14), N('square', 300, .05, .06)], eat: [N('noise', 1800, .05, .1), N('noise', 1600, .05, .1, { delay: .12 }), N('noise', 1700, .05, .1, { delay: .24 })],
  drink: [N('sine', 400, .08, .14, { to: 300 }), N('sine', 420, .08, .14, { to: 300, delay: .12 }), N('sine', 440, .08, .14, { to: 300, delay: .24 })], scroll: N('noise', 3000, .25, .07, { to: 1200 }),
  read: N('noise', 2500, .18, .05, { to: 1500 }), wand: [N('square', 1400, .12, .1, { to: 300 }), N('sine', 900, .2, .08, { vib: [30, .2] })],
  swing: N('noise', 2600, .1, .12, { to: 800 }), swingAxe: N('noise', 1800, .12, .14, { to: 600 }), swingBlunt: N('noise', 1200, .12, .14, { to: 400 }),
  crossbow: [N('square', 220, .06, .18, { to: 90 }), N('noise', 3000, .12, .1, { to: 1200 })], bow: [N('triangle', 330, .1, .16, { to: 160 }), N('noise', 2600, .12, .08)], sling: N('noise', 900, .3, .1, { vib: [18, .4] }),
  hitFlesh: [N('noise', 700, .08, .2, { to: 200 }), N('square', 120, .06, .12)], hitMetal: [N('square', 1300, .08, .14, { to: 900 }), N('noise', 5000, .06, .1)], hitBone: [N('noise', 1600, .06, .16), N('square', 500, .05, .1, { to: 300 })],
  hitOoze: N('sine', 160, .16, .22, { to: 60 }), whiff: N('noise', 3200, .08, .06, { to: 1800 }), crit: [N('square', 1600, .1, .16, { to: 1100 }), N('noise', 6000, .08, .12)],
  partyHurt: [N('square', 140, .12, .2, { to: 70 }), N('noise', 500, .1, .12)], deathToll: [N('sine', 98, 1.4, .25), N('sine', 147, 1.2, .1, { delay: .05 })], raise: N('triangle', 330, .8, .16, { arp: [0, 4, 7, 12], step: .12 }),
  heal: N('sine', 660, .3, .1, { arp: [0, 4, 7], step: .08 }), cast: [N('sine', 500, .3, .12, { to: 1200, vib: [14, .08] }), N('noise', 4000, .2, .05)], brace: N('square', 200, .1, .12, { to: 260 }),
  thunder: [N('noise', 2200, .1, .3), N('noise', 300, .9, .25, { to: 60, filter: 'lowpass' })], explode: [N('noise', 400, .6, .3, { to: 60, filter: 'lowpass' }), N('square', 90, .3, .16, { to: 40 })],
  zap: N('square', 1400, .1, .1, { to: 300 }), chant: N('triangle', 220, .5, .08, { vib: [6, .05], arp: [0, 3, 7, 3], step: .12, loop: true }), lockBolt: N('saw', 300, .4, .1, { to: 900 }),
  held: N('square', 120, .4, .12, { arp: [0, -1, 0, -1], step: .05, loop: true }),
  voiceSqueak: N('square', 1800, .08, .08, { to: 2600 }), voiceSlurp: N('sine', 180, .25, .14, { to: 90, vib: [10, .2] }), voiceChitter: N('square', 900, .18, .06, { arp: [0, 5, 0, 7], step: .03, loop: true }),
  voiceRattle: N('noise', 2200, .2, .1, { arp: [0, 3, 0, 5], step: .04 }), voiceClank: [N('square', 300, .06, .12), N('square', 200, .06, .1, { delay: .1 })], voiceGrowl: N('saw', 90, .4, .12, { vib: [20, .2], filter: 'lowpass' }),
  voiceChant: N('triangle', 260, .4, .08, { vib: [5, .04] }), voiceHum: N('sine', 120, .5, .1, { vib: [30, .1] }),
  dieSqueak: N('square', 1600, .2, .1, { to: 400 }), dieSlurp: N('sine', 200, .4, .18, { to: 40 }), dieChitter: N('square', 700, .3, .1, { to: 200 }), dieRattle: [N('noise', 1800, .3, .14), N('square', 400, .3, .08, { to: 100 })],
  dieClank: [N('square', 300, .1, .16), N('square', 200, .1, .14, { delay: .12 }), N('noise', 2000, .4, .1, { delay: .2 })], dieGrowl: N('saw', 120, .5, .14, { to: 50 }), dieChant: N('triangle', 300, .6, .1, { to: 100 }), dieHum: N('sine', 200, .5, .12, { to: 40 }),
  lockTurn: [N('saw', 60, 2.0, .12, { to: 90, filter: 'lowpass' }), N('noise', 200, 2.0, .06, { vib: [6, .3] })], shriek: [N('saw', 700, .7, .14, { to: 1400, vib: [9, .1] }), N('square', 300, .7, .06, { to: 900 })],
  boltSlam: [N('square', 70, .3, .25, { to: 40 }), N('noise', 600, .3, .2, { to: 100 })], charge: N('saw', 200, .8, .1, { to: 1600 }), gazeHum: N('sine', 90, 1.0, .16, { vib: [12, .2] }), rainWarn: N('square', 880, 1.4, .05, { arp: [0, 12], step: .15, loop: true }),
  roar: [N('saw', 110, 1, .2, { to: 55, vib: [7, .12] }), N('noise', 500, .8, .15, { to: 120, filter: 'lowpass' })], bridge: [N('noise', 150, 1.4, .14, { to: 80, filter: 'lowpass' }), N('square', 60, 1.2, .06)],
  trapdoor: [N('square', 120, .2, .2, { to: 60 }), N('noise', 300, .3, .14)], fall: N('noise', 1200, .7, .14, { to: 100 }), chime: N('triangle', 880, 1.6, .16, { arp: [0, 4, 7, 12, 7, 4], step: .22 }),
  gutter: N('noise', 1200, .5, .08, { to: 200 }), candle: [N('noise', 3000, .1, .08), N('sine', 900, .3, .06, { to: 1300 })], tumblers: [N('noise', 2400, .4, .1, { arp: [0, 2, 0, 3], step: .05 }), N('square', 300, .2, .06, { delay: .2 })],
  checkpoint: N('square', 660, .2, .12, { arp: [0, 4, 7], step: .06 }), coin: N('square', 990, .12, .12, { arp: [0, 5], step: .05 }), victory: N('square', 523, .9, .14, { arp: [0, 4, 7, 12], step: .12 }), gameOver: N('triangle', 220, 1.6, .2, { to: 110 }),
  uiMove: N('square', 880, .03, .06), uiConfirm: N('square', 660, .07, .1, { arp: [0, 7], step: .03 }), uiBack: N('square', 440, .06, .08, { to: 330 }), uiError: N('square', 150, .1, .12), uiTab: N('square', 740, .04, .08),
  ward: N('triangle', 330, 1, .16, { arp: [0, 7, 12], step: .2 })
};
B.SONGS = {
  title: { bpm: 76, steps: 4, tracks: [
    { wave: 'triangle', vol: .28, notes: 'D2 - - - - - - - | D2 - - - - - - - | A1 - - - - - - - | Bb1 - - - A1 - - -' },
    { wave: 'pulse', vol: .07, notes: 'D4 - F4 A4 G4 - F4 E4 | D4 - - - C4 E4 G4 F4 | E4 - D4 C#4 D4 - - - | . . . . . . . .' },
    { wave: 'sine', vol: .08, notes: 'A5 . . . . . . . | . . F5 . . . . . | . . . . E5 . . . | D5 . . . . . . .' }] },
  drains: { bpm: 60, steps: 4, tracks: [
    { wave: 'triangle', vol: .26, notes: 'A1 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -' },
    { wave: 'pulse', vol: .05, notes: 'A3 . C4 . E4 . . . | D4 . C4 . B3 . . . | A3 . C4 . F4 . E4 . | E4 . . . G#3 . . .' },
    { name: 'fight', on: false, wave: 'drums', vol: .12, notes: 'k . h k s . h . | k k h . s . h h | k . h k s . h . | k . s k s s h h' },
    { name: 'fightBass', on: false, wave: 'saw', vol: .06, notes: 'A2 A2 . A2 C3 . A2 . | G2 G2 . G2 Bb2 . G2 . | F2 F2 . F2 A2 . F2 . | E2 . G#2 . B2 . E3 .' }] },
  tumbler: { bpm: 96, steps: 3, tracks: [
    { wave: 'triangle', vol: .26, notes: 'E2 . B2 E2 . B2 | E2 . B2 E2 . B2 | C2 . G2 C2 . G2 | D2 . A2 D2 . A2' },
    { wave: 'drums', vol: .06, notes: 'h . . c . h | h . . c . h | h . . c . h | h . c c . h' },
    { wave: 'pulse12', vol: .05, notes: 'B4 . . G4 . . | E4 . . . . . | E4 . . G4 . . | F#4 . . . . .' },
    { name: 'fight', on: false, wave: 'drums', vol: .12, notes: 'k . s k s . | k k s . s h | k . s k s . | k s s k s s' },
    { name: 'fightBass', on: false, wave: 'saw', vol: .06, notes: 'E2 E2 . G2 . E2 | E2 E2 . B2 . A2 | C3 C3 . G2 . C3 | D3 . C3 B2 . A2' }] },
  gloam: { bpm: 54, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'C3 - - - - - - - | F#3 - - - - - - - | C3 - - - - - - - | B2 - - - - - - -' },
    { wave: 'sine', vol: .08, notes: 'G4 - - - - - - - | . . . . F#4 - - - | Eb4 - - - - - - - | . . . . D4 - - -' },
    { wave: 'triangle', vol: .16, notes: 'C2 - - - - - - - | C2 - - - - - - - | Ab1 - - - - - - - | G1 - - - - - - -' },
    { name: 'fight', on: false, wave: 'drums', vol: .11, notes: 'k . . k s . . . | k . k . s . . h | k . . k s . . . | k . k k s . s .' },
    { name: 'fightBass', on: false, wave: 'saw', vol: .05, notes: 'C2 . C2 . F#2 . C2 . | C2 . Eb2 . F#2 . G2 . | Ab1 . Ab1 . C2 . Eb2 . | G1 . B1 . D2 . F#2 .' }] },
  vault: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: 'A1 - - - - - - - | A1 - - - - - - - | G1 - - - - - - - | E1 - - - - - - -' },
    { wave: 'sine', vol: .07, notes: 'E5 . . . A4 . . . | . . . . . . . . | D5 . . . G4 . . . | . . . . . . . .' },
    { name: 'fight', on: false, wave: 'drums', vol: .12, notes: 'k . h k s . h . | k k h . s . h h' },
    { name: 'fightBass', on: false, wave: 'saw', vol: .06, notes: 'A2 A2 . A2 C3 . A2 . | G2 G2 . G2 Bb2 . G2 .' }] },
  boss: { bpm: 138, steps: 4, tracks: [
    { wave: 'saw', vol: .07, notes: 'A2 A2 . A2 C3 . A2 . | G2 G2 . G2 Bb2 . G2 . | F2 F2 . F2 A2 . F2 . | E2 . G#2 . B2 . E3 .' },
    { wave: 'triangle', vol: .3, notes: 'A1 . A1 . A1 . A1 . | G1 . G1 . G1 . G1 . | F1 . F1 . F1 . F1 . | E1 . E1 . E1 . E1 .' },
    { wave: 'pulse', vol: .05, notes: 'A4 E5 A5 E5 A4 E5 A5 E5 | G4 D5 G5 D5 G4 D5 G5 D5 | F4 C5 F5 C5 F4 C5 F5 C5 | E4 B4 E5 B4 G#4 B4 E5 B4' },
    { wave: 'drums', vol: .12, notes: 'k . h k s . h . | k k h . s . h h | k . h k s . h . | k . s k s s h h' }] },
  camp: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'D2 - - - A2 - - - | G2 - - - D2 - - - | B1 - - - F#2 - - - | A1 - - - A2 - - -' },
    { wave: 'triangle', vol: .1, notes: 'D4 - F#4 A4 G4 - F#4 E4 | D4 - - - C#4 E4 G4 F#4 | E4 - D4 C#4 D4 - - - | . . . . . . . .' }] },
  ending: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: 'D2 - - - A2 - - - | G2 - - - D2 - - - | B1 - - - G2 - - - | A1 - - - D2 - - -' },
    { wave: 'pulse', vol: .07, notes: 'D4 - F#4 A4 G4 - F#4 E4 | D4 - - - C#4 E4 G4 F#4 | E4 - D4 C#4 D4 - A4 - | D5 - - - - - - -' },
    { wave: 'sine', vol: .07, notes: 'F#5 . . . . . . . | . . D5 . . . . . | . . . . E5 . . . | F#5 . . . . . . .' }] },
  race: { bpm: 132, steps: 4, tracks: [
    { wave: 'saw', vol: .05, notes: 'A2 . A2 C3 . A2 E3 . | G2 . G2 Bb2 . G2 D3 . | F2 . F2 A2 . F2 C3 . | E2 . E2 G#2 . B2 E3 .' },
    { wave: 'pulse', vol: .05, notes: 'E5 . C5 . A4 . C5 . | D5 . Bb4 . G4 . Bb4 . | C5 . A4 . F4 . A4 . | B4 . G#4 . E4 . B4 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . | k k h . s . h h' }] },
  gate: { bpm: 60, steps: 4, tracks: [{ wave: 'triangle', vol: .3, notes: 'D1 - - - - - - - | A1 - - - - - - -' }, { wave: 'sine', vol: .12, notes: 'D3 - - - F3 - - - | A3 - - - D4 - - -' }] }
};
B.STINGS = {
  levelUp: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'C5 E5 G5 C6 - - - -' }, { wave: 'triangle', vol: .2, notes: 'C3 - - - G3 - - -' }] },
  deed: { bpm: 120, steps: 4, tracks: [{ wave: 'pulse', vol: .1, notes: 'G4 B4 D5 G5 - F#5 G5 - - -' }, { wave: 'triangle', vol: .2, notes: 'G2 - - - D3 - G3 - - -' }] },
  secret: { bpm: 150, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'G5 F#5 D#5 A4 G#4 E5 G#5 C6' }] },
  wardFound: { bpm: 100, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'D4 A4 D5 - F#5 - - -' }] },
  gameOver: { bpm: 70, steps: 4, tracks: [{ wave: 'triangle', vol: .24, notes: 'D4 - C4 - Bb3 - A3 - - - - -' }, { wave: 'sine', vol: .1, notes: 'D3 - - - - - - - - - - -' }] },
  victory: { bpm: 120, steps: 4, tracks: [{ wave: 'pulse', vol: .1, notes: 'D5 D5 D5 - A5 - - - F#5 G5 A5 - - -' }, { wave: 'triangle', vol: .22, notes: 'D3 - - - D3 - - - A2 - D3 - - -' }] },
  npcJoin: { bpm: 140, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'E5 G5 B5 - E6 - - -' }] }
};
/* ---- the music director: the floor's song, the fight layer in combat (out 4 s after the last), stings ---- */
B.Music = {
  cur: null, fight: false, fightT: 0,
  init(game) { this.game = game; const A = game.audio; for (const [k, v] of Object.entries(B.SFX)) A.define(k, v); },
  play(name) { if (this.cur === name) return; this.cur = name; this.fight = false; const A = this.game.audio; if (!name) { A.music(null); return; } A.music(B.SONGS[name], { fade: 1 }); },
  sting(name) { const s = B.STINGS[name]; if (s) this.game.audio.sting(s); },
  update(dt) {
    if (!B.S || !this.cur) return;
    const P = B.S.party, engaged = B.FS() && B.FS().mons.some(m => m.hp > 0 && m.aware && B.manh(m.cx, m.cy, P.cx, P.cy) <= 4);
    if (engaged) this.fightT = 4; else this.fightT -= dt;
    const want = this.fightT > 0;
    if (want !== this.fight && B.SONGS[this.cur] && B.SONGS[this.cur].tracks.some(t => t.name === 'fight')) { this.fight = want; const A = this.game.audio; A.layer('fight', want ? 1 : 0, .5); A.layer('fightBass', want ? 1 : 0, .5); }
  }
};
/* ---- the babble voice: syllables from the letters, a formant pair per vowel, a click per plosive ---- */
B.VOICES = {
  narrator: { base: 95, range: 3, rate: 9, wave: 'triangle', echo: .2 }, strake: { base: 170, range: 4, rate: 12, wave: 'square' }, lintel: { base: 120, range: 5, rate: 10, wave: 'sawtooth' },
  tamsin: { base: 300, range: 7, rate: 15, wave: 'square', formant: 1.15 }, durgan: { base: 105, range: 4, rate: 11, wave: 'square', formant: .9 }, ysolde: { base: 220, range: 5, rate: 9, wave: 'sine', echo: .4 },
  veil: { base: 240, range: 3, rate: 10, wave: 'triangle', breath: .5 }, snick: { base: 260, range: 8, rate: 16, wave: 'square', formant: 1.2 }, eye: { base: 70, range: 6, rate: 8, wave: 'sawtooth', ring: 30, echo: .5 }
};
B.memberVoice = m => ({ base: (m.race === 'dwarf' ? 110 : m.race === 'halfling' ? 260 : m.race === 'elf' ? 210 : 150) + (m.look % 3) * 20, range: 5, rate: 12, wave: 'square' });
const FORM = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 2300] };
B.babble = {
  /** the syllables of a text: [{ t, f (pitch), f1, f2, noise: 'click' | 'hiss' | 'hum' | null, vol }]; deterministic */
  plan(text, prof) {
    const out = [], P = Object.assign({ base: 150, range: 5, rate: 12, formant: 1 }, prof); let t = 0, n = 0, pend = null;
    const s = String(text).toLowerCase();
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '.' || ch === '!' || ch === '?') { if (out.length) { const last = out[out.length - 1]; if (ch === '?') last.f *= 1.25; if (ch === '!') { last.vol = 1.3; last.f *= 1.12; } } t += .15; continue; }
      if (ch === ',') { t += .08; continue; }
      if (ch === ' ') { t += .02; continue; }
      if (!/[a-z]/.test(ch)) continue;
      n++; const vowel = FORM[ch], kind = 'bdgkpt'.includes(ch) ? 'click' : 'fsvzh'.includes(ch) ? 'hiss' : 'mn'.includes(ch) ? 'hum' : null;
      if (!vowel && n % 2) { pend = pend || kind; continue; }   // (every other consonant: its noise joins the next syllable)
      const code = ch.charCodeAt(0) - 97, semi = (code * 7) % (P.range * 2 + 1) - P.range;
      const v = vowel || FORM['aeiou'[code % 5]];
      out.push({ t, f: P.base * Math.pow(2, semi / 12), f1: v[0] * P.formant, f2: v[1] * P.formant, noise: pend || kind, vol: 1 }); pend = null;
      t += 1 / P.rate;
    }
    return out;
  },
  /** speak one syllable now (the dialogue calls this as the letters type) */
  syl(game, ev, prof) {
    const A = game.audio, bus = A.bus && A.bus('voice'), c = A.ctx; if (!c || !bus || c.state !== 'running' || A.muted) return;
    try {
      const t = c.currentTime + .005, dur = .07, P = Object.assign({ wave: 'square' }, prof);
      const o = c.createOscillator(); o.type = P.wave === 'sawtooth' ? 'sawtooth' : P.wave; o.frequency.setValueAtTime(ev.f, t);
      if (P.vib) { o.frequency.linearRampToValueAtTime(ev.f * 1.03, t + dur); }
      const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = f2.Q.value = 8; f1.frequency.value = ev.f1; f2.frequency.value = ev.f2;
      const g = c.createGain(), vol = .5 * (ev.vol || 1); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.setValueAtTime(vol, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur + .03);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g);
      let out = g;
      if (P.ring) { const rm = c.createGain(), lfo = c.createOscillator(); lfo.frequency.value = P.ring; lfo.connect(rm.gain); rm.gain.value = 0; g.connect(rm); out = rm; lfo.start(t); lfo.stop(t + dur + .1); }
      out.connect(bus);
      if (P.echo) { const d = c.createDelay(.5), eg = c.createGain(); d.delayTime.value = .18; eg.gain.value = P.echo * .5; out.connect(d); d.connect(eg); eg.connect(bus); }
      o.start(t); o.stop(t + dur + .05);
      if (ev.noise || P.breath) {
        const nb = c.createBufferSource(), len = Math.floor(c.sampleRate * .05), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let s = ev.f;
        for (let i = 0; i < len; i++) { s = (s * 9301 + 49297) % 233280; d[i] = s / 116640 - 1; }
        nb.buffer = buf; const nf = c.createBiquadFilter(); nf.type = ev.noise === 'hum' ? 'lowpass' : 'highpass'; nf.frequency.value = ev.noise === 'hiss' ? 3000 : ev.noise === 'hum' ? 300 : 1500;
        const ng = c.createGain(), nd = ev.noise === 'click' ? .01 : .04; ng.gain.setValueAtTime(ev.noise ? .25 : .08 * P.breath, t); ng.gain.linearRampToValueAtTime(0, t + nd);
        nb.connect(nf); nf.connect(ng); ng.connect(bus); nb.start(t); nb.stop(t + nd + .01);
      }
    } catch (e) { /* sound is best effort */ }
  }
};
