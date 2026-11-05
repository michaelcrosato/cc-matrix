/* ---- AUDIO: every song, sting and sound written as code for the engine's chip synth (no audio files) ---- */
const SONGS = TT.SONGS = {
  title: { title: 'Thugby Turbo!', bpm: 152, steps: 2, tracks: [
    { name: 'lead', wave: 'square', vol: .07, notes: 'E5 - - G5 A5 - B5 - | D6 - B5 - A5 - G5 - | E5 - - G5 A5 - B5 - | A5 - G5 - E5 - - - | E5 - - G5 A5 - B5 - | D6 - E6 - D6 - B5 - | A5 - B5 - G5 - A5 - | E5 - - - - - . .' },
    { name: 'bass', wave: 'saw', vol: .1, notes: 'E2 . E2 . E2 . E3 . | G2 . G2 . G2 . G3 . | A2 . A2 . A2 . A3 . | B2 . B2 . D3 . B2 .' },
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k . h . s . h . | k . h k s . h . | k . h . s . h . | k k h . s . s s' },
    { name: 'chant', wave: 'square', vol: .05, notes: '. . E4 . . . E4 E4 | . . E4 . . . E4 E4 | . . A4 . . . A4 A4 | . . B4 . . . B4 B4' }
  ] },
  mud: { title: 'Mud and Glory', bpm: 126, steps: 2, tracks: [
    { name: 'base', wave: 'pulse', vol: .06, notes: 'C5 - E5 G5 C6 - G5 E5 | F5 - A5 - G5 - E5 - | D5 - F5 A5 G5 - E5 C5 | D5 - G4 B4 C5 - - - ' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . C3 . G2 . | D3 . A2 . E3 . C3 . | G2 . D3 . C3 . G2 .' },
    { name: 'drums', wave: 'drums', vol: .13, on: false, notes: 'k . s . k . s s | k . s . k s s .' },
    { name: 'hype', wave: 'square', vol: .04, on: false, notes: 'C6 E6 G6 E6 C6 E6 G6 C7 | F6 A6 C7 A6 G6 B6 D7 B6' }
  ] },
  shanty: { title: 'Grumble Shanty', bpm: 104, steps: 3, tracks: [
    { name: 'base', wave: 'pulse12', vol: .07, notes: 'D5 - D5 F5 - A5 | G5 - E5 C5 - - | D5 - D5 F5 - A5 | G5 - E5 D5 - - | A5 - A5 G5 - F5 | E5 - C5 D5 - - | F5 - E5 D5 - C5 | D5 - - - - . ' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: 'D3 . A2 D3 . A2 | C3 . G2 C3 . G2 | D3 . A2 D3 . A2 | A2 . E3 D3 . . ' },
    { name: 'drums', wave: 'drums', vol: .12, on: false, notes: 'k . h s . h | k . h s . h' },
    { name: 'hype', wave: 'square', vol: .04, on: false, notes: 'D6 F6 A6 D6 F6 A6 | C6 E6 G6 C6 E6 G6' }
  ] },
  forge: { title: 'Forge Floor', bpm: 132, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .09, notes: 'A1 A1 . A1 C2 . A1 . A1 A1 . A1 E2 . D2 . | A1 A1 . A1 C2 . A1 . G1 G1 . G1 B1 . G1 .' },
    { name: 'lead', wave: 'square', vol: .05, notes: 'A4 - - - C5 - B4 - A4 - - - E5 - D5 - | C5 - - - B4 - G4 - A4 - - - - - . .' },
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: 'k . . t s . k . k . t . s . t t' },
    { name: 'hype', wave: 'triangle', vol: .09, on: false, notes: 'E6 . . . . . . . E6 . . . E6 . . .' }
  ] },
  mega: { title: 'Megadome Mayhem', bpm: 160, steps: 4, tracks: [
    { name: 'base', wave: 'square', vol: .05, notes: 'A4 C5 E5 A5 E5 C5 A4 C5 | G4 B4 D5 G5 D5 B4 G4 B4 | F4 A4 C5 F5 C5 A4 F4 A4 | E4 G#4 B4 E5 B4 G#4 E4 G#4' },
    { name: 'bass', wave: 'saw', vol: .09, notes: 'A1 . A2 . A1 . A2 . | G1 . G2 . G1 . G2 . | F1 . F2 . F1 . F2 . | E1 . E2 . E1 . E2 .' },
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: 'k . h . s . h . k k h . s . h h' },
    { name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'A5 - - E6 - - A6 - | G5 - - D6 - - G6 - | F5 - - C6 - - F6 - | E5 - - B5 - - E6 -' }
  ] },
  pub: { title: 'Half-Time Pub Piano', bpm: 118, steps: 2, tracks: [
    { name: 'right', wave: 'triangle', vol: .2, notes: 'E5 G5 C6 G5 D5 F5 B5 F5 | C5 E5 G5 E5 C5 - - . | A4 C5 F5 C5 B4 D5 G5 D5 | C5 E5 G5 C6 - - . .' },
    { name: 'left', wave: 'pulse', vol: .05, notes: 'C3 G3 C3 G3 G2 D3 G2 D3 | C3 G3 C3 G3 C3 . . . | F2 C3 F2 C3 G2 D3 G2 D3 | C3 G3 C3 . C3 . . .' }
  ] },
  third: { title: 'Third Half', bpm: 96, steps: 2, tracks: [
    { name: 'tune', wave: 'square', vol: .06, notes: 'G4 - G4 A4 B4 - G4 - | C5 - B4 - A4 - - - | A4 - A4 B4 C5 - A4 - | D5 - C5 - B4 - - - | G4 - G4 A4 B4 - G4 - | C5 - E5 - D5 - B4 - | C5 - A4 - B4 - G4 - | G4 - - - - - . .' },
    { name: 'oom', wave: 'triangle', vol: .24, notes: 'G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | D3 . A3 . D3 . A3 . | G2 . D3 . G2 . D3 .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . s . k . s . | k . s . k k s .' }
  ] },
  victory: { title: 'Champions', bpm: 140, steps: 2, tracks: [
    { wave: 'square', vol: .07, notes: 'C5 E5 G5 C6 - - G5 C6 | E6 - - D6 - C6 - - | A5 C6 F6 - E6 C6 D6 - | C6 - - - - - . .' },
    { wave: 'triangle', vol: .22, notes: 'C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . G2 . G3 . | C3 . G2 . C3 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . s . k . s . | k . s . k s s s' }
  ] }
};
const STINGS = TT.STINGS = {
  try: { bpm: 200, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .09, notes: 'C5 E5 G5 C6 - E6 - G6 - - - .' }, { wave: 'saw', vol: .06, notes: 'C4 - G4 - C5 - - - E5 - - .' }, { wave: 'drums', vol: .16, notes: 'k s k s k k s c . . . .' }] },
  monster: { bpm: 180, steps: 2, loop: false, tracks: [{ wave: 'saw', vol: .1, notes: 'C3 - C#3 - . . .' }, { wave: 'square', vol: .06, notes: 'G4 - G#4 - . . .' }, { wave: 'drums', vol: .2, notes: 'c . k . . . .' }] },
  fire: { bpm: 220, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .08, notes: 'E5 G5 B5 E6 G6 B6 E7 - - .' }, { wave: 'drums', vol: .14, notes: 'k h k h s s s c . .' }] },
  trombone: { bpm: 90, steps: 1, loop: false, tracks: [{ wave: 'saw', vol: .09, notes: 'D4 C#4 C4 B3 - - .' }] },
  dingdong: { bpm: 120, steps: 1, loop: false, tracks: [{ wave: 'triangle', vol: .26, notes: 'E6 C6 - .' }] },
  win: { bpm: 160, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .08, notes: 'G5 G5 G5 C6 - - E6 - C6 - - .' }, { wave: 'drums', vol: .14, notes: 'k . k . s . k . c . . .' }] },
  lose: { bpm: 100, steps: 1, loop: false, tracks: [{ wave: 'triangle', vol: .24, notes: 'C5 B4 A#4 A4 - - .' }] },
  roll: { bpm: 240, steps: 4, loop: false, tracks: [{ wave: 'drums', vol: .16, notes: 's s s s s s s s s s s s s s s s c . . .' }] }
};
const SFX = {
  whistle: { wave: 'square', freq: 2300, vib: [34, .06], dur: .32, vol: .12 },
  whistleS: { wave: 'square', freq: 2300, vib: [34, .06], dur: .14, vol: .11 },
  hooter: { wave: 'saw', freq: 196, to: 190, dur: 1.4, vol: .2, arp: [0, 4, 7], step: .02 },
  hooter2: { wave: 'square', freq: 98, dur: 1.4, vol: .14 },
  thud: { wave: 'sine', freq: 120, to: 55, dur: .14, vol: .34 },
  thudN: { wave: 'noise', freq: 600, to: 200, dur: .1, vol: .2, filter: 'lowpass' },
  crunch: { wave: 'noise', freq: 1600, to: 200, dur: .24, vol: .32, filter: 'lowpass' },
  boom: { wave: 'sine', freq: 90, to: 30, dur: .4, vol: .42 },
  whoosh: { wave: 'noise', freq: 1200, to: 2600, dur: .16, vol: .1, filter: 'bandpass' },
  slap: { wave: 'noise', freq: 2400, to: 900, dur: .05, vol: .16 },
  punt: { wave: 'sine', freq: 160, to: 70, dur: .12, vol: .36 },
  puntN: { wave: 'noise', freq: 900, to: 200, dur: .08, vol: .22, filter: 'lowpass' },
  tap: { wave: 'triangle', freq: 260, to: 160, dur: .07, vol: .25 },
  bok: { wave: 'triangle', freq: 300, to: 180, dur: .09, vol: .24 },
  doink: { wave: 'triangle', freq: 1200, to: 1150, dur: .7, vol: .3, vib: [9, .01] },
  engage: { wave: 'noise', freq: 900, to: 120, dur: .3, vol: .34, filter: 'lowpass' },
  horn: { wave: 'square', freq: 440, dur: .9, vol: .14, arp: [0, 4, 7, 12], step: .03 },
  munch: { wave: 'noise', freq: 700, to: 300, dur: .06, vol: .2, filter: 'lowpass' },
  turbo: { wave: 'noise', freq: 400, to: 1400, dur: .25, vol: .08, filter: 'bandpass' },
  sputter: { wave: 'noise', freq: 300, to: 120, dur: .18, vol: .14, filter: 'lowpass' },
  charge: { wave: 'square', freq: 220, dur: .5, vol: .08, arp: [0, 4, 7, 12, 16, 19, 24], step: .06 },
  flame: { wave: 'noise', freq: 300, to: 1100, dur: .9, vol: .22, filter: 'lowpass' },
  crack: { wave: 'noise', freq: 4000, to: 600, dur: .18, vol: .36 },
  thunder: { wave: 'noise', freq: 220, to: 40, dur: 1.6, vol: .4, filter: 'lowpass' },
  squawk: { wave: 'square', freq: 700, to: 1200, dur: .22, vol: .12, vib: [18, .2] },
  squelch: { wave: 'noise', freq: 500, to: 180, dur: .16, vol: .2, filter: 'lowpass' },
  ding: { wave: 'triangle', freq: 1760, dur: .3, vol: .2 },
  boo: { wave: 'noise', freq: 260, to: 200, dur: 1.4, vol: .14, filter: 'lowpass' },
  clap: { wave: 'noise', freq: 2400, to: 1600, dur: .04, vol: .14, filter: 'bandpass' },
  crowd: { wave: 'noise', freq: 700, to: 600, dur: 1.3, vol: .1, filter: 'lowpass' },
  roar: { wave: 'noise', freq: 900, to: 1300, dur: 2.2, vol: .24, filter: 'lowpass' },
  groan: { wave: 'noise', freq: 600, to: 250, dur: 1.2, vol: .14, filter: 'lowpass' },
  ooh: { wave: 'noise', freq: 500, to: 900, dur: .9, vol: .18, filter: 'bandpass' },
  firework: { wave: 'noise', freq: 2000, to: 300, dur: .5, vol: .2 },
  zap: { wave: 'saw', freq: 1600, to: 200, dur: .3, vol: .12, vib: [40, .3] }
};
TT.SFX = SFX;
/** the game's sound board: songs by scene, layers by the match's mood, effects by events */
const Sound = TT.sound = {
  ready: false, song: null, crowdT: 0, clapT: 0,
  init(game) {
    this.game = game; this.A = game.audio;
    for (const k in SFX) this.A.define(k, SFX[k]);
    this.ready = true;
  },
  vol() { return this.game && this.game.settings ? this.game.settings.crowd : .8; },
  play(name, o) { if (this.ready && !TT.muted) this.A.sfx(name, o); },
  ui(kind) { if (!this.ready) return; this.A.sfx(kind === 'move' ? 'select' : kind === 'pick' ? 'confirm' : 'cancel', { vol: .6 }); },
  music(id, o = {}) {
    if (!this.ready || TT.muted) return;
    if (id === this.song && !o.force) return;
    this.song = id;
    if (!id) { this.A.music(null); return; }
    const s = id === 'victoryB' ? 'victory' : SONGS[id];
    this.A.music(s, { fade: o.fade === undefined ? .6 : o.fade });
  },
  layer(name, on) { if (!this.ready || !this.song) return; try { this.A.layer(name, on ? 1 : 0, .8); } catch (e) { /* the song has no such layer */ } },
  sting(id) { if (!this.ready || TT.muted) return; const s = STINGS[id]; if (s) try { this.A.sting(s, { at: 'beat' }); } catch (e) { this.A.sting(s); } },
  /** the crowd bed: overlapping filtered-noise swells whose loudness follows the excitement */
  crowd(dt, excite, on) {
    if (!this.ready || !on) return;
    this.crowdT -= dt;
    if (this.crowdT <= 0) { this.crowdT = .55; this.play('crowd', { vol: (.25 + excite * .9) * this.vol() }); }
  },
  /** the slow hand-clap at set kicks, speeding up with the shot clock */
  clap(dt, rate) { if (!this.ready) return; this.clapT -= dt; if (this.clapT <= 0) { this.clapT = rate; this.play('clap', { vol: .7 * this.vol() }); } },
  /** the match's events, heard */
  hook(bus, ctx) {
    const P = (n, o) => this.play(n, o), v = () => this.vol();
    const on = (n, f) => ctx.subs.push(bus.on(n, f));
    on('whistle', d => { if (d.kind !== 'conv' && d.kind !== 'pen') P('whistle'); });
    on('refCall', () => P('whistleS', { vol: .5 }));
    on('kickoff', () => { P('punt'); P('puntN'); });
    on('kickoffSetup', () => this.sting('roll'));
    on('pass', () => P('whoosh'));
    on('catch', d => { if (d.how !== 'restart' && d.how !== 'force') P('slap'); });
    on('kick', d => { if (d.kind === 'grubber') P('tap'); else { P('punt'); P('puntN'); } if (d.mega) P('firework'); });
    on('setKickGo', () => { P('punt'); P('puntN'); });
    on('bounce', d => { if (d.v > 30) P('bok', { vol: Math.min(1, d.v / 200) }); });
    on('tackle', () => { P('thud'); P('thudN'); });
    on('diveTackle', () => { P('thud'); P('thudN'); });
    on('bigHit', () => { P('crunch'); P('thud'); P('ooh', { vol: v() }); });
    on('monsterHit', () => { P('crunch'); P('boom'); P('ooh', { vol: v() }); this.sting('monster'); });
    on('cheapShot', () => P('thud'));
    on('doink', () => P('doink'));
    on('doinkMiss', () => P('groan', { vol: v() }));
    on('scrumEngage', () => P('engage'));
    on('mash', () => P('thudN', { vol: .3 }));
    on('push', () => P('thudN', { vol: .25 }));
    on('try', () => { this.sting('try'); P('roar', { vol: v() }); });
    on('convMade', () => P('roar', { vol: v() * .8 }));
    on('penGoal', () => P('roar', { vol: v() * .8 }));
    on('convMissed', () => P('groan', { vol: v() }));
    on('dropGoal', () => { this.sting('dingdong'); P('roar', { vol: v() }); });
    on('card', d => { P('ding'); P('boo', { vol: v() }); this.sting('trombone'); });
    on('hooter', () => { P('hooter'); P('hooter2'); });
    on('halftime', () => { P('whistle'); this.game.after(.4, () => P('whistle')); });
    on('fulltime', () => { P('whistle'); this.game.after(.35, () => P('whistle')); this.game.after(.7, () => P('whistle')); });
    on('superStart', () => P('charge'));
    on('onFire', () => this.sting('fire'));
    on('powerupThrow', () => P('whoosh'));
    on('powerupTake', d => { P(d.kind === 'horn' ? 'horn' : d.kind === 'pie' ? 'munch' : 'pickup'); if (d.kind === 'horn') P('roar', { vol: v() }); });
    on('hazardWarn', d => { if (d.kind === 'chicken') P('squawk'); });
    on('hazard', d => { if (d.kind === 'flames') P('flame'); if (d.kind === 'lightning') { P('crack'); P('thunder'); } if (d.kind === 'chicken') P('squawk'); });
    on('chickenHit', () => { P('squawk'); P('thud'); });
    on('zapped', () => P('zap'));
    on('mud', () => P('squelch'));
    on('sputter', () => P('sputter'));
    on('refDown', () => { P('thud'); P('ooh', { vol: v() }); });
    on('lineoutThrow', () => P('whoosh'));
    on('lineoutWon', d => { if (d.steal) P('ooh', { vol: v() }); });
    on('sidestep', () => P('whoosh', { vol: .6 }));
    on('fend', () => P('slap'));
  }
};
