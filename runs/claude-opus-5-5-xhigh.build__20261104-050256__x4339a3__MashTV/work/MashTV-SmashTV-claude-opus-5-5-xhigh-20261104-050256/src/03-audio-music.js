// ---- music: original songs in the engine's step notation (16 steps a bar), layers, stings, the music director ----
const bars = (...b) => b.join(' | ');
const SONGS = MT.SONGS = {
  theme: { bpm: 132, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .13, notes: bars(
      'G4 . C5 . E5 . G5 - - . E5 . G5 . A5 -', 'G5 - - - E5 - C5 - D5 - - - . . . .', 'A4 . D5 . F5 . A5 - - . F5 . A5 . B5 -', 'A5 - - - F5 - D5 - E5 - - - . . . .',
      'G4 . C5 . E5 . G5 - - . E5 . G5 . C6 -', 'B5 - A5 - G5 - E5 - F5 - - - A5 - - -', 'G5 - E5 - C5 - E5 - D5 - B4 - G4 - B4 -', 'C5 - - - - - G4 . C5 . . . . . . .') },
    { name: 'brass', wave: 'pulse12', vol: .07, notes: bars(
      '. . E4 . . . E4 . . . E4 . . . G4 .', '. . E4 . . . E4 . . . F4 . . . G4 .', '. . F4 . . . F4 . . . F4 . . . A4 .', '. . D4 . . . D4 . . . F4 . . . G4 .',
      '. . E4 . . . E4 . . . E4 . . . G4 .', '. . A4 . . . A4 . . . B4 . . . B4 .', '. . G4 . . . G4 . . . F4 . . . F4 .', '. . E4 . . . . . E4 . . . . . . .') },
    { name: 'bass', wave: 'triangle', vol: .3, notes: bars(
      'C3 . C3 . G2 . G2 . C3 . C3 . E3 . G2 .', 'C3 . C3 . G2 . G2 . A2 . A2 . G2 . . .', 'D3 . D3 . A2 . A2 . D3 . D3 . F3 . A2 .', 'G2 . G2 . D3 . D3 . G2 . G2 . B2 . . .',
      'C3 . C3 . G2 . G2 . C3 . C3 . E3 . G2 .', 'F2 . F2 . C3 . C3 . F2 . F2 . G2 . G2 .', 'C3 . C3 . E3 . E3 . G2 . G2 . G2 . B2 .', 'C3 . . . G2 . . . C3 . . . . . . .') },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k . h . s . h h k . h . s . h o' } ] },
  studioBattle: { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .12, notes: bars(
      'E5 . . E5 . . G5 . A5 . . G5 . . E5 .', 'D5 . E5 - - - . . B4 . D5 . E5 . . .', 'G5 . . G5 . . A5 . B5 . . A5 . . G5 .', 'F#5 . G5 - - - . . A5 . G5 . F#5 . D5 .',
      'E5 . . E5 . . G5 . A5 . . G5 . . E5 .', 'D5 . E5 - - - . . G5 . A5 . B5 . . .', 'C6 - B5 - A5 - G5 - A5 - G5 - E5 - D5 -', 'E5 - - - . . . . B4 . D5 . E5 . . .') },
    { name: 'chops', wave: 'pulse12', vol: .06, notes: bars('. . B4 . . . B4 . . . B4 . . B4 . .', '. . B4 . . . B4 . . . A4 . . G4 . .', '. . G4 . . . G4 . . . E4 . . G4 . .', '. . A4 . . . A4 . . . F#4 . . A4 . .') },
    { name: 'bass', wave: 'triangle', vol: .34, notes: bars('E2 . E3 . . E2 . E2 G2 . A2 . A3 . G2 .', 'E2 . E3 . . E2 . E2 D3 . B2 . A2 . G2 .', 'C2 . C3 . . C2 . C2 E2 . G2 . C3 . B2 .', 'D2 . D3 . . D2 . D2 F#2 . A2 . D3 . B2 .') },
    { name: 'drums', wave: 'drums', vol: .15, notes: 'k . h k s . h . k . h k s . h o' },
    { name: 'prime', wave: 'saw', vol: .08, on: false, notes: bars('E4 - . . . . . . . . . . E4 . G4 .', '. . . . . . . . . . . . . . . .', 'C5 - . . . . . . . . . . C5 . E5 .', 'D5 - . . . . . . D5 . . . F#5 - - -') },
    { name: 'intense', wave: 'drums', vol: .1, on: false, notes: 't . t . . t . t t . t . s s s s' } ] },
  warehouseFunk: { bpm: 128, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .11, notes: bars(
      'A5 - . A5 . . C6 . . A5 . G5 - . E5 .', 'F5 - . F5 . . A5 . . G5 . E5 - . . .', 'D5 - . D5 . . F5 . . E5 . D5 - . C5 .', 'E5 - - - . . . . G5 . A5 . B5 . . .',
      'A5 - . A5 . . C6 . . D6 . C6 - . A5 .', 'F5 - . F5 . . A5 . . C6 . A5 - . . .', 'G5 - . F5 . . E5 . . D5 . E5 - . C5 .', 'A4 - - - . . . . E5 . A5 . . . . .') },
    { name: 'strings', wave: 'saw', vol: .045, notes: bars('A4 - - - - - - - - - - - - - - -', 'F4 - - - - - - - - - - - - - - -', 'D4 - - - - - - - - - - - - - - -', 'E4 - - - - - - - G#4 - - - - - - -') },
    { name: 'bass', wave: 'triangle', vol: .34, notes: bars('A2 . A3 . A2 . A3 . A2 . A3 . G2 . G3 .', 'F2 . F3 . F2 . F3 . F2 . F3 . E2 . E3 .', 'D2 . D3 . D2 . D3 . D2 . D3 . E2 . E3 .', 'A2 . A3 . A2 . A3 . G2 . G3 . E2 . E3 .') },
    { name: 'kick', wave: 'drums', vol: .15, notes: 'k . . . k . . . k . . . k . . .' },
    { name: 'drums', wave: 'drums', vol: .12, notes: '. . o . s . o . . . o . s . o o' },
    { name: 'prime', wave: 'saw', vol: .08, on: false, notes: bars('. . . . A4 . C5 . . . . . E5 - - .', '. . . . F4 . A4 . . . . . C5 - - .', '. . . . D4 . F4 . . . . . A4 - - .', '. . . . E4 . G#4 . . . . . B4 - - .') },
    { name: 'intense', wave: 'drums', vol: .1, on: false, notes: 'h h h h h h h h h h h h t t s s' } ] },
  finaleOverture: { bpm: 160, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .11, notes: bars(
      'D5 - - - A5 - - - F5 - E5 - D5 - C5 -', 'D5 - - - - - - - A4 - - - - - - -', 'D5 - - - A5 - - - C6 - Bb5 - A5 - G5 -', 'A5 - - - - - - - E5 - - - C#5 - - -',
      'F5 - - - D6 - - - C6 - Bb5 - A5 - G5 -', 'F5 - - - E5 - - - D5 - - - C#5 - - -', 'D5 - E5 - F5 - G5 - A5 - - - Bb5 - A5 -', 'A5 - - - - - - - . . . . . . . .') },
    { name: 'strings', wave: 'saw', vol: .055, notes: bars(
      'D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4', 'Bb3 D4 F4 D4 Bb3 D4 F4 D4 A3 C#4 E4 C#4 A3 C#4 E4 C#4',
      'D4 F4 A4 F4 D4 F4 A4 F4 F4 A4 C5 A4 F4 A4 C5 A4', 'G4 Bb4 D5 Bb4 G4 Bb4 D5 Bb4 A4 C#5 E5 C#5 A4 C#5 E5 G5') },
    { name: 'bass', wave: 'triangle', vol: .34, notes: bars('D2 . D2 . D2 . D2 . D2 . D2 . C2 . C2 .', 'Bb1 . Bb1 . Bb1 . Bb1 . A1 . A1 . A1 . A1 .', 'D2 . D2 . D2 . D2 . F2 . F2 . F2 . F2 .', 'G2 . G2 . G2 . G2 . A1 . A1 . C#2 . E2 .') },
    { name: 'drums', wave: 'drums', vol: .15, notes: 'k . h . s . h . k k h . s . h h' },
    { name: 'prime', wave: 'pulse12', vol: .08, on: false, notes: bars('D6 . A5 . F5 . D5 . D6 . A5 . F5 . C6 .', 'Bb5 . F5 . D5 . Bb4 . A5 . E5 . C#5 . A4 .', 'D6 . A5 . F5 . D5 . F6 . C6 . A5 . F5 .', 'G5 . D6 . Bb5 . G5 . A5 . E6 . C#6 . A5 .') },
    { name: 'intense', wave: 'drums', vol: .1, on: false, notes: 'c . t . t . t t c . t . s s s s' } ] },
  bossShowdown: { bpm: 170, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .11, notes: bars('C5 - Eb5 - G5 - C6 - B5 - G5 - Ab5 - G5 -', 'F5 - Eb5 - D5 - Eb5 - F5 - G5 - - - . .', 'C5 - Eb5 - G5 - C6 - D6 - C6 - Bb5 - Ab5 -', 'G5 - - - F5 - - - Eb5 - D5 - B4 - D5 -') },
    { name: 'bass', wave: 'triangle', vol: .34, notes: bars('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 Eb2 Eb2 Eb3 Eb2', 'Ab1 Ab1 Ab2 Ab1 Ab1 Ab1 Ab2 Ab1 Bb1 Bb1 Bb2 Bb1 B1 B1 B2 B1') },
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k . h k s . h k k . h k s . s s' },
    { name: 'phase2', wave: 'pulse', vol: .07, on: false, notes: bars('C6 G5 Eb5 C5 C6 G5 Eb5 C5 C6 G5 Eb5 C5 Eb6 Bb5 G5 Eb5', 'Ab5 Eb5 C5 Ab4 Ab5 Eb5 C5 Ab4 Bb5 F5 D5 Bb4 B5 G5 D5 B4') } ] },
  commercial: { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: bars('C5 . F5 . A5 . F5 . C6 - - . A5 . . .', 'Bb5 . A5 . G5 . F5 . G5 - - - . . . .', 'C5 . E5 . G5 . E5 . Bb5 - - . G5 . . .', 'A5 . G5 . F5 . E5 . F5 - - - . . . .') },
    { name: 'glock', wave: 'sine', vol: .08, notes: bars('. . . . A6 . . . . . . . C7 . . .', '. . . . D7 . . . . . . . G6 . . .', '. . . . G6 . . . . . . . Bb6 . . .', '. . . . A6 . . . . . . . F6 . . .') },
    { name: 'bass', wave: 'triangle', vol: .3, notes: bars('F2 . . . C3 . . . F2 . . . C3 . . .', 'Bb2 . . . F2 . . . C3 . . . G2 . . .', 'C3 . . . G2 . . . C3 . . . E2 . . .', 'F2 . . . C3 . . . F2 . C3 . F2 . . .') },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h .' } ] },
  recap: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'sine', vol: .14, notes: bars('F5 - - - D5 - Bb4 - C5 - D5 - - - . .', 'Eb5 - - - C5 - A4 - Bb4 - C5 - - - . .', 'D5 - F5 - Bb5 - - - A5 - G5 - F5 - . .', 'G5 - - - F5 - - - . . . . . . . .') },
    { name: 'rhodes', wave: 'triangle', vol: .08, notes: bars('D4 - - - - - F4 - - - - - A4 - - -', 'C4 - - - - - Eb4 - - - - - G4 - - -', 'D4 - - - - - F4 - - - - - Bb4 - - -', 'C4 - - - - - F4 - - - - - A4 - - -') },
    { name: 'bass', wave: 'triangle', vol: .28, notes: bars('Bb2 . . . . . F2 . Bb2 . . . D3 . . .', 'Eb2 . . . . . Bb2 . Eb2 . . . G2 . . .', 'Bb2 . . . . . F2 . G2 . . . D3 . . .', 'F2 . . . . . C3 . F2 . . . A2 . . .') },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . . h . . h . k . . h . . h .' } ] },
  ending: { bpm: 96, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .17, notes: bars(
      'G4 - C5 - E5 - G5 - - - E5 - G5 - A5 -', 'G5 - - - - - - - E5 - - - C5 - - -', 'F5 - - - E5 - - - D5 - - - C5 - - -', 'D5 - - - - - - - G4 - - - - - - -',
      'G4 - C5 - E5 - G5 - - - E5 - G5 - C6 -', 'B5 - - - A5 - - - G5 - - - F5 - - -', 'E5 - - - D5 - - - G5 - - - B4 - - -', 'C5 - - - - - - - - - - - - - - -') },
    { name: 'pad', wave: 'sine', vol: .08, notes: bars('E4 - - - - - - - - - - - - - - -', 'G4 - - - - - - - - - - - - - - -', 'F4 - - - - - - - - - - - - - - -', 'D4 - - - - - - - - - - - - - - -',
      'E4 - - - - - - - - - - - - - - -', 'F4 - - - - - - - - - - - - - - -', 'D4 - - - - - - - - - - - - - - -', 'E4 - - - - - - - - - - - - - - -') },
    { name: 'bass', wave: 'triangle', vol: .26, notes: bars('C3 - - - - - - - G2 - - - - - - -', 'C3 - - - - - - - A2 - - - - - - -', 'F2 - - - - - - - C3 - - - - - - -', 'G2 - - - - - - - D3 - - - - - - -',
      'C3 - - - - - - - G2 - - - - - - -', 'F2 - - - - - - - A2 - - - - - - -', 'G2 - - - - - - - G2 - - - - - - -', 'C3 - - - - - - - - - - - - - - -') },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . . . h . . . s . . . h . . .' } ] },
};
const STINGS = MT.STINGS = {
  clear: { bpm: 180, steps: 4, tracks: [{ wave: 'square', vol: .16, notes: 'C5 E5 G5 C6 - - - . . . . . . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . . . G2 . C3 - - - . . . . . .' }, { wave: 'drums', vol: .15, notes: 'k . . . . . c . . . . . . . . .' }] },
  prize: { bpm: 200, steps: 4, tracks: [{ wave: 'pulse', vol: .15, notes: 'G5 B5 D6 G6 - - F#6 - G6 - - - . . . .' }, { wave: 'triangle', vol: .28, notes: 'G3 . . . D3 . . . G3 - - - . . . .' }] },
  key: { bpm: 240, steps: 4, tracks: [{ wave: 'sine', vol: .2, notes: 'E6 G6 B6 E7 - - - - . . . . . . . .' }, { wave: 'triangle', vol: .12, notes: 'E5 . . . B5 . . . E6 - - - . . . .' }] },
  prime: { bpm: 170, steps: 4, tracks: [{ wave: 'saw', vol: .12, notes: 'C5 . C5 . C5 . G5 - - - E5 . G5 . C6 - - - - - . . . .' }, { wave: 'square', vol: .1, notes: 'E4 . E4 . E4 . B4 - - - G4 . B4 . E5 - - - - - . . . .' }, { wave: 'drums', vol: .16, notes: 'k . k . k . c . . . k . k . c . . . . . . . . .' }] },
  oneup: { bpm: 220, steps: 4, tracks: [{ wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 E6 G6 C7 - - - . . . . . .' }] },
  bankrupt: { bpm: 110, steps: 4, tracks: [{ wave: 'saw', vol: .14, notes: 'G4 - F#4 - F4 - E4 - - - - - - - . .' }, { wave: 'drums', vol: .12, notes: '. . . . . . . . c . . . . . . .' }] },
  gameover: { bpm: 80, steps: 4, tracks: [{ wave: 'saw', vol: .14, notes: 'G4 - - - F#4 - - - F4 - - - E4 - - - - - - - - - - - . . . .' }, { wave: 'triangle', vol: .24, notes: 'C3 - - - B2 - - - Bb2 - - - A2 - - - - - - - - - - - . . . .' }] },
  mash: { bpm: 180, steps: 4, tracks: [{ wave: 'saw', vol: .12, notes: 'C4 . C5 - - - . .' }, { wave: 'drums', vol: .2, notes: 'k . c . . . . .' }] },
  bossdown: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .15, notes: 'G4 . G4 . G4 . C5 - - - E5 - G5 - - - C6 - - - - - - - . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . C3 . C3 . E3 - - - G3 - C3 - - - C3 - - - - - - - . . . .' }, { wave: 'drums', vol: .15, notes: 'k . k . k . c . . . k . s . . . c . . . . . . . . . . .' }] },
  tick: { bpm: 240, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'A5 . . .' }] },
  wheel: { bpm: 240, steps: 4, tracks: [{ wave: 'drums', vol: .14, notes: 's s s s s s s s s s s s s s s s c . . .' }] },
  jingle: { bpm: 150, steps: 4, tracks: [{ wave: 'pulse', vol: .14, notes: 'C5 . E5 . G5 . A5 - G5 . E5 . C5 - - - . .' }, { wave: 'sine', vol: .08, notes: 'C6 . . . G6 . . . A6 . . . C7 - - - . .' }] },
};
/** the music director: one song at a time, crossfaded; layers by name */
const MUSIC = MT.music = { current: null, volMul: 1 };
MUSIC.play = (id, o = {}) => {
  if (!game) return;
  if (MUSIC.current === id && !o.restart) return;
  MUSIC.current = id;
  if (!id) { game.audio.stopMusic(o.fade === undefined ? .4 : o.fade); return; }
  const song = SONGS[id]; if (!song) return;
  game.audio.music(song, { fade: o.fade === undefined ? .6 : o.fade, restart: !!o.restart });
};
MUSIC.layer = (name, on, fade = .5) => { if (!game || !MUSIC.current) return; const s = SONGS[MUSIC.current]; if (!s || !s.tracks.some(t => t.name === name)) return; game.audio.layer(name, on ? 1 : 0, fade); };
MUSIC.sting = (id, o = {}) => { if (!game || !STINGS[id]) return; MT.lastSting = id; game.audio.sting(STINGS[id], { at: o.at || 'now', duck: o.duck === undefined ? .4 : o.duck }); };
