/* THUGBY TURBO — audio: every sound, tune and voice is written in code (no files). Voices are Animalese-style babble. */
const A = () => TT.game && TT.game.audio;
const sfx = (o, vol) => { const a = A(); if (a && TT.cfg.present) try { a.sfx(o, vol ? { vol } : undefined); } catch (e) { /* audio not ready */ } };
const whistle = (long) => { sfx({ wave: 'sine', freq: 1900, to: 2100, dur: long ? .7 : .28, vol: .16, vib: [22, .04] }); sfx({ wave: 'sine', freq: 1500, to: 1650, dur: long ? .7 : .28, vol: .1, vib: [26, .05] }); };
const roar = (k = 1) => sfx({ wave: 'noise', freq: 900, to: 400, dur: .9 * k, vol: .12 * Math.min(1.5, k), filter: 'bandpass', q: .6 });
const thud = (k = 1) => { sfx({ wave: 'noise', freq: 300, to: 80, dur: .18, vol: .3 * k }); sfx({ wave: 'sine', freq: 120, to: 40, dur: .22, vol: .3 * k }); };
const VOICES = { BARRY: { wave: 'square', f: 330, v: 140, rate: .055, vol: .06 }, ROS: { wave: 'triangle', f: 190, v: 60, rate: .075, vol: .11 }, COACH: { wave: 'saw', f: 130, v: 50, rate: .08, vol: .06 }, REF: { wave: 'pulse', f: 520, v: 120, rate: .06, vol: .07 }, CAPTAIN: { wave: 'saw', f: 160, v: 90, rate: .06, vol: .06 } };
function babble(who, text) {
  if (!TT.cfg.present || !A()) return; const V0 = VOICES[who] || VOICES.CAPTAIN; let i = 0, n = 0;
  for (const ch of text) { if (!/[a-z0-9]/i.test(ch)) { i += 1; continue; } if (n++ > 22) break; const h = (ch.charCodeAt(0) * 37 + i * 11) % 100 / 100, f = V0.f + (h - .5) * V0.v * 2 + (/[aeiou]/i.test(ch) ? 40 : 0); const d = i * V0.rate * 1.2 * 1000; setTimeout(() => { sfx({ wave: V0.wave, freq: f, to: f * (1 + (h - .5) * .5), dur: V0.rate * .9, vol: V0.vol }); }, d); i++; }
}
TT.voice = babble;
const _say = say; // commentary hook: voice on every radio line
say = function (who, text, t) { _say(who, text, t); if (S && S.cfg.mode !== 'attract') babble(who, text); };
// ---- songs
const SONGS = {
  title: { bpm: 132, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .12, notes: 'E4 - G4 - A4 - G4 E4 | G4 - A4 - B4 - A4 G4 | E5 - D5 - B4 - A4 G4 | A4 - G4 - E4 . . . |' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'E2 . E2 . E2 . G2 . | A2 . A2 . A2 . B2 . | C3 . C3 . B2 . B2 . | A2 . A2 . E2 . E2 . |' },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . h . s . h . | k . h . s . h h | k . h . s . h . | k k h . s . s s |' }] },
  match: { bpm: 140, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'D2 . D2 D2 . D2 F2 . | G2 . G2 G2 . G2 A2 . | A#2 . A#2 A#2 . A#2 A2 . | G2 . F2 . D2 . D2 . |' },
    { name: 'lead', wave: 'pulse', vol: .08, on: false, notes: 'D4 - F4 - A4 - F4 - | G4 - A#4 - D5 - A#4 - | A#4 - D5 - F5 - D5 - | A4 - G4 - F4 - D4 - |' },
    { name: 'drums', wave: 'drums', vol: .16, on: false, notes: 'k . . . s . . . | k . . k s . . . | k . . . s . h h | k . k . s . s s |' },
    { name: 'fire', wave: 'saw', vol: .07, on: false, notes: 'D5 . D5 . F5 . D5 . | G5 . G5 . A5 . G5 . | A#5 . A#5 . D6 . A#5 . | A5 . G5 . F5 . D5 . |' }] },
  menu: { bpm: 100, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .13, notes: 'C4 - - - E4 - - - | F4 - - - A4 - - - | G4 - - - B4 - - - | C4 - - - G3 - - - |' },
    { name: 'bass', wave: 'sine', vol: .2, notes: 'C2 . . . C2 . . . | F2 . . . F2 . . . | G2 . . . G2 . . . | C2 . . . G2 . . . |' }] },
  win: { bpm: 150, steps: 4, tracks: [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - . G5 C6 | E6 - - - . . . . |' }, { wave: 'triangle', vol: .2, notes: 'C3 . G2 . C3 . G2 . | C3 - - - . . . . |' }] },
  lose: { bpm: 80, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'E4 - D4 - C4 - A3 - | G#3 - - - - - - - |' }] }
};
function music(name, o) { const a = A(); if (!a || !TT.cfg.present) return; try { a.music(SONGS[name], o); TT.curSong = name; } catch (e) { /* ok */ } }
function musicLayers() { const a = A(); if (!a || !TT.cfg.present || TT.curSong !== 'match') return; try { const h = Math.max(S.hype[0], S.hype[1]); a.layer('lead', h > 30 ? .08 : 0, .5); a.layer('drums', h > 55 || S.phase === 'try' ? .16 : 0, .5); a.layer('fire', S.players.some(p => p.onFire > 0 || p.superKind) ? .07 : 0, .3); } catch (e) { /* layers unavailable */ } }
// ---- event sounds
const ON = (n, f) => bus.on(n, d => { if (TT.cfg.present && TT.game && S && S.cfg.mode !== 'attract-mute') f(d); });
ON('kickoff', () => { whistle(); });
ON('tackle', d => { thud(.8); sfx('hit'); });
ON('bigHit', d => { thud(1.3); sfx('punch'); roar(.8); });
ON('monsterHit', d => { thud(1.8); sfx('explode'); roar(1.5); });
ON('missedTackle', () => sfx('whoosh', .5)); ON('brokenTackle', () => sfx('swing', .6)); ON('sidestep', () => sfx('whoosh', .5)); ON('spin', () => sfx('whoosh', .7)); ON('fend', () => sfx('bump'));
ON('pass', () => sfx({ wave: 'noise', freq: 1800, to: 900, dur: .12, vol: .08 })); ON('catch', () => sfx({ wave: 'noise', freq: 500, to: 300, dur: .06, vol: .12 }));
ON('kick', d => { sfx('kick'); sfx({ wave: 'sine', freq: 220, to: 90, dur: .15, vol: .25 }); });
ON('bounce', () => sfx({ wave: 'sine', freq: 140, to: 100, dur: .07, vol: .12 }));
ON('try', () => { if (A()) try { A().sting && A().sting(SONGS.win); } catch (e) { /* ok */ } roar(2); whistle(true); });
ON('conversion', () => { roar(1.2); sfx('coin'); }); ON('penaltyGoal', () => { roar(1.2); sfx('coin'); }); ON('dropGoal', () => { roar(1.6); sfx('powerup'); });
ON('goalMiss', () => { sfx({ wave: 'noise', freq: 400, to: 200, dur: .5, vol: .1 }); sfx('hurt', .6); });
ON('knockOn', () => whistle()); ON('forwardPass', () => whistle()); ON('touch', () => whistle()); ON('deadBall', () => whistle()); ON('foul', () => whistle(true)); ON('penalty', () => whistle());
ON('scrumCall', d => sfx({ wave: 'square', freq: d.c === 'set' ? 520 : 340, dur: .1, vol: .12 })); ON('scrumWon', () => sfx('confirm'));
ON('ruck', () => sfx('step')); ON('ruckWon', () => sfx('select')); ON('turnover', () => { roar(.8); sfx('powerup', .6); }); ON('jackal', () => sfx('stomp'));
ON('lineoutThrow', () => sfx('swing')); ON('lineoutWon', () => sfx('pickup')); ON('lineoutStolen', () => sfx('hurt', .6)); ON('notStraight', () => whistle());
ON('card', d => { whistle(true); [0, 1, 2, 3].forEach(i => setTimeout(() => sfx({ wave: 'saw', freq: 220 - i * 30, dur: .22, vol: .12 }), 200 + i * 220)); });
ON('powerupThrow', () => sfx('whoosh', .7)); ON('powerupTake', () => sfx('powerup')); ON('superReady', () => sfx('oneup')); ON('superStart', () => { sfx('charge'); roar(1); }); ON('onFire', () => { sfx('powerup'); roar(1.4); });
ON('hooter', () => sfx({ wave: 'saw', freq: 180, dur: 1.1, vol: .2, hold: true })); ON('halftime', () => whistle(true)); ON('fulltime', () => whistle(true)); ON('suddenDeath', () => sfx('boom'));
ON('hazard', d => { if (d.kind === 'lightning') { sfx({ wave: 'noise', freq: 3000, to: 200, dur: .9, vol: .3 }); setTimeout(() => sfx('boom'), 120); } else if (d.kind === 'flame') sfx({ wave: 'noise', freq: 1200, to: 500, dur: .6, vol: .16 }); });
ON('hazardWarn', d => sfx({ wave: 'square', freq: 880, dur: .08, vol: .1, arp: [0, 7, 0, 7], step: .08 }));
ON('chickenBowl', () => { sfx({ wave: 'square', freq: 700, to: 400, dur: .12, vol: .1 }); sfx({ wave: 'square', freq: 650, to: 350, dur: .12, vol: .1, delay: .14 }); });
ON('refDown', () => { sfx('hurt'); roar(1.2); }); ON('interception', () => sfx('powerup', .6)); ON('skittle', () => sfx('bump', .6));
ON('toasted', d => sfx(d.kind === 'flame' ? 'explode' : 'laser', .6)); ON('useIt', () => whistle()); ON('advantage', () => sfx({ wave: 'sine', freq: 1700, dur: .2, vol: .1 }));
let crowdT = 0;
function crowdBed(dt) { crowdT -= dt; if (crowdT > 0 || !TT.cfg.present || !A()) return; crowdT = .45; const ex = (Math.max(S.hype[0], S.hype[1]) / 100) * .6 + (S.phase === 'play' ? .3 : .1); sfx({ wave: 'noise', freq: 700 + ex * 500, to: 600, dur: .5, vol: .02 + .035 * ex, filter: 'bandpass', q: .5 }); }
TT.audio = { music, musicLayers, crowdBed, SONGS };
