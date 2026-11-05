/* ---- AUDIO: every note, effect and voice is written in code. Voices are Animalese-style babble. ---- */
// Songs are built from a few lines of notes in the hirajoshi scale (A B C E F). 'chase' and 'alarm' are layers that come
// in when a guard turns hostile and go out when they lose you: one song, no cut to another.
const mkSong = (bpm, bass, lead, o = {}) => ({ bpm, steps: 4, tracks: [
  { name: 'bass', wave: 'triangle', vol: o.bassVol || .26, notes: bass },
  { name: 'tick', wave: 'drums', vol: .05, notes: o.tick || 'h . . h . . h . h . . h . . h .' },
  { name: 'lead', wave: o.leadWave || 'pulse12', vol: o.leadVol || .07, notes: lead },
  { name: 'chase', wave: 'drums', vol: .13, on: false, notes: 'k . h k s . h . k k h . s . h s' },
  { name: 'alarm', wave: 'saw', vol: .055, on: false, notes: o.alarm || 'A3 A3 A4 A3 E4 A3 G4 A3 | A3 A3 C5 A3 E4 A3 B4 A3 | F3 F3 F4 F3 C4 F3 E4 F3 | E3 E3 E4 E3 B3 E3 G#4 E3' }
] });
B.SONGS = {
  shop:  mkSong(78, 'A2 . . . E3 . . . | F2 . . . C3 . . . | A2 . . . E3 . . . | E2 . . . B2 . . .',
    'E5 . . C5 . . B4 . | A4 - - - . . . . | C5 . . B4 . . A4 . | E4 - - - . . . . | F5 . . E5 . . C5 . | B4 - - - . . . . | A4 . . C5 . . E5 . | E5 - - - . . . .', { tick: 'h . . . . . . . h . . . . . . .', alarm: '. . . . . . . .' }),
  m0:    mkSong(92, 'A2 . . A2 . . A2 . | C3 . . C3 . . A2 . | F2 . . F2 . . F2 . | E2 . . E2 . B2 . .',
    'E5 - . . . . D5 . | C5 - . . B4 . A4 . | . . . . F5 - E5 . | C5 - . . B4 - . . | E5 - . . . . G5 . | F5 - . . E5 . C5 . | B4 - . . C5 - . . | A4 - - - . . . .'),
  m1:    mkSong(104, 'A2 . . A2 . . A2 . | A2 . . A2 . C3 . . | F2 . . F2 . . F2 . | E2 . . E2 . B2 . .',
    'E5 - . . . . C5 . | B4 - . . A4 . . . | . . . . F5 - E5 . | C5 - . . B4 - . . | E5 - . . . . G5 . | F5 - . . E5 . C5 . | B4 - . . C5 - . . | A4 - - - . . . .'),
  m2:    mkSong(98, 'E2 . . E2 . . E2 . | C3 . . C3 . . B2 . | A2 . . A2 . . A2 . | B2 . . B2 . . E2 . ',
    'B4 - . . C5 . . . | E5 - - . D5 . C5 . | B4 - . . A4 . . . | F4 - - - . . . . | A4 - . . B4 . . . | C5 - . . E5 - . . | D5 . C5 . B4 . A4 . | E4 - - - . . . .', { leadWave: 'triangle', leadVol: .1, tick: 'h . h . h . h . h . h . h . h .' }),
  m3:    mkSong(112, 'F2 . . F2 . . F2 . | E2 . . E2 . . E2 . | A2 . . A2 . C3 . . | B2 . . B2 . E2 . .',
    'C6 - . . B5 . A5 . | F5 - - - . . . . | E5 . F5 . A5 - . . | B5 - - - . . . . | C6 - . . E6 . C6 . | B5 . A5 . F5 . E5 . | A5 - . . C6 - . . | E5 - - - . . . .', { leadWave: 'square', leadVol: .055 }),
  boss:  { bpm: 138, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .15, notes: 'A2 A2 . A2 A2 . A2 A2 | C3 C3 . C3 C3 . C3 C3 | F2 F2 . F2 F2 . F2 F2 | E2 E2 . E2 E2 . B2 B2' },
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k . h k s . h k | k . h k s . k s | k . h k s . h k | k k h k s s k s' },
    { name: 'lead', wave: 'pulse', vol: .08, notes: 'A5 - C6 - E6 - C6 . | B5 - A5 - F5 - . . | A5 - C6 - E6 - F6 - | E6 - C6 - B5 - A5 -' }
  ] },
  cut:   { bpm: 90, steps: 4, tracks: [{ wave: 'pulse12', vol: .12, notes: 'E4 - - - . . . . | A4 - - - - - - -' }] }
};
B.initAudio = (A) => {
  A.define('twang', { wave: 'pulse', freq: 330, to: 262, dur: .45, vol: .26, vib: [7, .02] });
  A.define('twang2', { wave: 'saw', freq: 196, to: 392, dur: .5, vol: .16 });
  A.define('bell', { wave: 'sine', freq: 740, to: 700, dur: .9, vol: .3, vib: [9, .01] });
  A.define('taiko', { wave: 'noise', freq: 120, to: 50, dur: .25, vol: .3 });
  A.define('splash', { wave: 'noise', freq: 800, to: 200, dur: .3, vol: .18 });
  A.define('pop', { wave: 'noise', freq: 1500, to: 300, dur: .12, vol: .25 });
  A.define('stamp', { wave: 'noise', freq: 260, to: 70, dur: .3, vol: .35 });
  A.define('tick', { wave: 'square', freq: 1200, dur: .02, vol: .1 });
  A.define('eat', { wave: 'triangle', freq: 330, to: 440, dur: .08, vol: .16, arp: [0, 7, 3], step: .05 });
  A.define('ping', { wave: 'sine', freq: 1568, dur: .18, vol: .16 });
};
/* ---- voices: a syllable per two letters, pitched by the letter, one timbre per speaker ---- */
B.VOICES = {
  granny: { wave: 'triangle', f: 210, vol: .22 }, sojiro: { wave: 'pulse', f: 140, vol: .13 }, kaede: { wave: 'pulse12', f: 300, vol: .13 },
  takanori: { wave: 'triangle', f: 170, vol: .2 }, kurogane: { wave: 'saw', f: 95, vol: .09 }, ittetsu: { wave: 'saw', f: 120, vol: .09 },
  gonroku: { wave: 'saw', f: 70, vol: .1 }, kanemori: { wave: 'square', f: 180, vol: .08 }, hotaru: { wave: 'pulse12', f: 360, vol: .1 },
  tobei: { wave: 'square', f: 260, vol: .08 }, guard: { wave: 'square', f: 130, vol: .08 }, civil: { wave: 'triangle', f: 340, vol: .16 }, narr: { wave: 'sine', f: 190, vol: .12 }
};
B.babble = (who, text, vol = 1) => {
  const g = B.game, A = g.audio, v = B.VOICES[who] || B.VOICES.guard;
  const s = String(text).replace(/\{[^}]*\}/g, '').replace(/[^a-z]/gi, '').toLowerCase();
  const n = Math.min(26, Math.ceil(s.length / 2));
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i * 2) - 96, f = v.f * Math.pow(2, (((c * 5) % 13) - 6) / 12);
    g.after(i * .075, () => A.sfx({ wave: v.wave, freq: f, to: f * (i % 3 ? 1.06 : .93), dur: .06, vol: v.vol * vol }, { vary: 0 }));
  }
};
