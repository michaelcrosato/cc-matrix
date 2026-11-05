// ---------------------------------------------------------------- music: original songs in the engine's notation, layers, stings
MT.SONGS = (() => {
  const rep = (s, n) => Array(n).fill(s).join(' | ');
  const cat = (...a) => a.join(' | ');
  const S = {};
  // the theme: a brassy game-show fanfare in C major
  S.theme = { bpm: 132, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .13, notes: cat(
      'G4 . C5 . E5 . G5 - - . E5 . G5 . A5 -', 'G5 - - - E5 - C5 - D5 - - - . . . .',
      'F4 . A4 . C5 . F5 - - . C5 . F5 . G5 -', 'E5 - - - C5 - A4 - G4 - - - . . . .',
      'G4 . C5 . E5 . G5 - - . E5 . G5 . A5 -', 'C6 - - - A5 - G5 - E5 - - - D5 - E5 -',
      'F5 - - - D5 - B4 - G5 - - - F5 - D5 -', 'C5 - - - - - - - . . G4 . C5 . . .') },
    { name: 'brass', wave: 'saw', vol: .06, notes: cat(
      'C4 - - - . . C4 . E4 - - - . . E4 .', 'G4 - - - . . G4 . G4 - - - . . . .',
      'F4 - - - . . F4 . A4 - - - . . A4 .', 'G4 - - - . . G4 . B4 - - - . . . .',
      'C4 - - - . . C4 . E4 - - - . . E4 .', 'A4 - - - . . A4 . C5 - - - . . . .',
      'F4 - - - . . F4 . G4 - - - . . G4 .', 'E4 - - - - - - - . . . . . . . .') },
    { name: 'bass', wave: 'triangle', vol: .2, notes: cat('C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 .', 'C3 . C3 . E3 . G2 . G2 . G2 . B2 . G2 .',
      'F2 . F2 . C3 . F2 . A2 . A2 . F2 . G2 .', 'G2 . G2 . D3 . G2 . G2 . B2 . D3 . G2 .') },
    { name: 'drums', wave: 'drums', vol: .22, notes: 'k . h . s . h . k k h . s . h o' }
  ] };
  // Episode 1: driving studio funk
  S.studioBattle = { bpm: 150, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: cat('E2 . E3 E2 . E2 G2 . A2 . A3 A2 . G2 B2 .', 'E2 . E3 E2 . E2 G2 . D3 . D3 B2 . A2 G2 .',
      'C3 . C3 C2 . C3 E3 . D3 . D3 D2 . D3 F#3 .', 'E2 . E3 E2 . E2 G2 . B2 . B2 A2 . G2 F#2 .') },
    { name: 'lead', wave: 'square', vol: .1, notes: cat('E5 . . G5 . . A5 . B5 - A5 . G5 . E5 .', 'D5 . E5 . . . . . G5 . . A5 . . B5 .',
      'C6 . . B5 . . A5 . G5 - A5 . B5 . D6 .', 'B5 - - - A5 . G5 . E5 - - - . . . .',
      'E5 . E5 . G5 . E5 . A5 . G5 . E5 . D5 .', 'E5 - - . . . D5 . E5 . G5 . A5 - - .',
      'C6 . B5 . A5 . G5 . A5 . G5 . E5 . G5 .', 'E5 - - - - - - - . . . . B4 . D5 .') },
    { name: 'prime', wave: 'saw', vol: .08, on: false, notes: cat('. . E4 . . . G4 . . . A4 . . . B4 .', '. . E4 . . . G4 . . . D5 . . . B4 .',
      '. . C5 . . . E5 . . . D5 . . . F#5 .', '. . B4 . . . G4 . . . E4 - - - . .') },
    { name: 'drums', wave: 'drums', vol: .24, notes: 'k . h k s . h . k . h k s . h o' },
    { name: 'intense', wave: 'drums', vol: .16, on: false, notes: 'h h t h h h t h h h t h c h t h' }
  ] };
  // Episode 2: four-on-the-floor disco funk
  S.warehouseFunk = { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: cat('D2 . D3 . D2 . D3 . F2 . F3 . F2 . F3 .', 'G2 . G3 . G2 . G3 . A2 . A3 . A2 . C3 .',
      'D2 . D3 . D2 . D3 . F2 . F3 . F2 . F3 .', 'Bb2 . Bb2 . A2 . A2 . G2 . G2 . A2 . C#3 .') },
    { name: 'lead', wave: 'pulse', vol: .1, notes: cat('A4 . D5 . F5 . A5 - G5 . F5 . E5 . D5 .', 'C5 . D5 . . . F5 . E5 - - - C5 . . .',
      'A4 . D5 . F5 . A5 - C6 . A5 . G5 . F5 .', 'G5 - - . F5 . E5 . D5 - - - . . . .') },
    { name: 'strings', wave: 'saw', vol: .04, notes: cat('D4 - - - - - - - F4 - - - - - - -', 'G4 - - - - - - - A4 - - - - - - -',
      'D4 - - - - - - - F4 - - - - - - -', 'Bb4 - - - - - - - A4 - - - - - - -') },
    { name: 'prime', wave: 'saw', vol: .08, on: false, notes: cat('. . F5 . F5 . . . . . A5 . A5 . . .', '. . G5 . G5 . . . . . C6 . C6 . . .') },
    { name: 'drums', wave: 'drums', vol: .24, notes: 'k . o . s . o . k . o . s . o h' },
    { name: 'intense', wave: 'drums', vol: .15, on: false, notes: 't h t h t h c h t h t h t h c c' }
  ] };
  // Episode 3: a dramatic minor overture
  S.finaleOverture = { bpm: 160, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: cat('A2 . A2 A3 . A2 . A2 F2 . F2 F3 . F2 . F2', 'D2 . D2 D3 . D2 . D2 E2 . E2 E3 . E2 G#2 E2') },
    { name: 'strings', wave: 'saw', vol: .07, notes: cat('A4 - - - C5 - - - E5 - - - F5 - - -', 'D5 - - - C5 - - - B4 - - - G#4 - - -',
      'A4 - - - E5 - - - A5 - - - G5 - F5 -', 'E5 - - - D5 - B4 - E5 - - - - - - -') },
    { name: 'lead', wave: 'square', vol: .09, notes: cat('E5 . A5 . C6 . B5 . A5 . E5 . F5 - - .', 'D5 . F5 . A5 . G5 . E5 - - - . . . .',
      'E5 . A5 . C6 . E6 . D6 . C6 . B5 . A5 .', 'G#5 - - - B5 - - - E6 - - - . . . .') },
    { name: 'prime', wave: 'pulse', vol: .08, on: false, notes: cat('A5 . . A5 . . A5 . F5 . . F5 . . F5 .', 'D5 . . D5 . . D5 . E5 . . E5 . . G#5 .') },
    { name: 'drums', wave: 'drums', vol: .25, notes: 'k . h . s . h k k . h . s . t t' },
    { name: 'intense', wave: 'drums', vol: .16, on: false, notes: 'k h k h s h k h k h k h s t s t' }
  ] };
  // every boss: relentless, minor
  S.bossShowdown = { bpm: 170, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .1, notes: cat('D2 D2 D3 D2 D2 D3 D2 D2 F2 F2 F3 F2 E2 E2 E3 E2', 'D2 D2 D3 D2 D2 D3 D2 D2 Bb1 Bb1 Bb2 Bb1 C2 C2 C3 A1') },
    { name: 'sub', wave: 'triangle', vol: .2, notes: cat('D2 - - - D2 - - - F2 - - - E2 - - -', 'D2 - - - D2 - - - Bb1 - - - A1 - - -') },
    { name: 'lead', wave: 'square', vol: .09, notes: cat('D5 . . F5 . . A5 . G#5 . A5 . . . . .', 'D5 . . F5 . . A5 . C6 . A5 . G5 . F5 .',
      'E5 . . G5 . . Bb5 . A5 . G5 . F5 . E5 .', 'D5 - - - C#5 - - - D5 - - - . . . .') },
    { name: 'phase2', wave: 'pulse', vol: .08, on: false, notes: cat('D6 . A5 . D6 . A5 . F6 . C6 . E6 . A5 .', 'D6 . A5 . D6 . A5 . Bb5 . F5 . C#6 . A5 .') },
    { name: 'drums', wave: 'drums', vol: .26, notes: 'k k h k s . h k k k h k s . s s' }
  ] };
  // the sponsors: a cheesy jingle
  S.commercial = { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: cat('C5 . F5 . A5 . F5 . C6 - - - A5 . . .', 'Bb5 . G5 . E5 . G5 . F5 - - - . . . .') },
    { name: 'bass', wave: 'triangle', vol: .2, notes: cat('F2 . C3 . F2 . C3 .', 'C3 . G2 . C3 . G2 .') },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . h . s . h . k . h h s . h .' }
  ] };
  // the prize recap and the green room: a lounge groove
  S.recap = { bpm: 100, steps: 4, tracks: [
    { name: 'rhodes', wave: 'sine', vol: .14, notes: cat('F4 A4 C5 E5 - - - - D4 F4 A4 C5 - - - -', 'G4 Bb4 D5 F5 - - - - C4 E4 G4 Bb4 - - - -') },
    { name: 'lead', wave: 'triangle', vol: .14, notes: cat('A5 - - - G5 . F5 . E5 - - - . . . .', 'D5 - - - F5 . A5 . G5 - - - . . E5 .') },
    { name: 'bass', wave: 'triangle', vol: .18, notes: cat('F2 - . F2 A2 - C3 -', 'D2 - . D2 F2 - A2 -', 'G2 - . G2 Bb2 - D3 -', 'C2 - . C2 E2 - G2 -') },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h h k . h . s . h .' }
  ] };
  // endings and credits: a warm reprise of the theme
  S.ending = { bpm: 96, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .16, notes: cat('G4 - C5 - E5 - G5 - - - E5 - G5 - A5 -', 'G5 - - - E5 - C5 - D5 - - - - - - -',
      'F4 - A4 - C5 - F5 - - - C5 - F5 - G5 -', 'E5 - - - - - - - C5 - - - - - - -') },
    { name: 'pad', wave: 'sine', vol: .1, notes: cat('C4 - - - - - - - E4 - - - - - - -', 'G3 - - - - - - - B3 - - - - - - -', 'F3 - - - - - - - A3 - - - - - - -', 'C4 - - - - - - - G3 - - - - - - -') },
    { name: 'bass', wave: 'triangle', vol: .16, notes: cat('C3 - - - G2 - - -', 'G2 - - - D3 - - -', 'F2 - - - C3 - - -', 'C3 - - - G2 - - -') },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . . . h . . . s . . . h . . h' }
  ] };
  // stings: short songs played once over the music
  const sting = (bpm, tracks) => ({ bpm, steps: 4, tracks });
  S.stClear = sting(180, [{ wave: 'square', vol: .16, notes: 'C5 E5 G5 C6 - - G5 C6 - - - -' }, { wave: 'triangle', vol: .2, notes: 'C3 . G3 . C4 - - - - - - -' }, { wave: 'drums', vol: .2, notes: 'k . s . k k s . c . . .' }]);
  S.stPrize = sting(200, [{ wave: 'pulse', vol: .14, notes: 'G5 C6 E6 G6 - - E6 G6 - - - -' }, { wave: 'sine', vol: .12, notes: 'C5 E5 G5 C6 - - - - - - - -' }]);
  S.stKey = sting(160, [{ wave: 'sine', vol: .18, notes: 'E6 B6 E7 - G#6 B6 E7 - - - - -' }, { wave: 'triangle', vol: .1, notes: 'E4 - - - B4 - - - E5 - - -' }]);
  S.stPrime = sting(170, [{ wave: 'saw', vol: .1, notes: 'C5 . C5 . C5 G5 - - E5 . G5 . C6 - - - - - - -' }, { wave: 'square', vol: .1, notes: 'E5 . E5 . E5 B5 - - G5 . B5 . E6 - - - - - - -' }, { wave: 'drums', vol: .22, notes: 'k . k . k s . . k . s . c . . . . . . .' }]);
  S.stOneup = sting(220, [{ wave: 'square', vol: .14, notes: 'E5 G5 E6 C6 D6 G6 - - - -' }]);
  S.stBankrupt = sting(120, [{ wave: 'saw', vol: .12, notes: 'G4 - F#4 - F4 - E4 - - - - - - - . .' }, { wave: 'triangle', vol: .18, notes: 'G2 - F#2 - F2 - E2 - - - - - - - . .' }]);
  S.stGameOver = sting(90, [{ wave: 'saw', vol: .12, notes: 'G4 - - F#4 - - F4 - - E4 - - - - - - - -' }, { wave: 'triangle', vol: .18, notes: 'C3 - - B2 - - Bb2 - - A2 - - - - - - - -' }]);
  S.stMash = sting(180, [{ wave: 'saw', vol: .14, notes: 'C4 C5 - G4 C5 - - -' }, { wave: 'drums', vol: .26, notes: 'k . k s . c . .' }]);
  S.stBossDown = sting(150, [{ wave: 'square', vol: .14, notes: 'C5 . C5 . C5 . G5 - - - E5 . G5 . C6 - - - - - - - - -' }, { wave: 'saw', vol: .07, notes: 'C4 - - - - - E4 - - - - - G4 - - - - - C5 - - - - -' }, { wave: 'drums', vol: .24, notes: 'k . k . k . s . . . k . s . c . . . . . . . . .' }]);
  S.stCard = sting(140, [{ wave: 'square', vol: .14, notes: 'G4 C5 E5 G5 - - - -' }, { wave: 'drums', vol: .2, notes: 'k . s . c . . .' }]);
  S.stJingle = sting(132, [{ wave: 'pulse', vol: .14, notes: 'C5 F5 A5 C6 - A5 C6 - F6 - - - - - - -' }, { wave: 'triangle', vol: .18, notes: 'F3 - C3 - F3 - C3 - F2 - - - - - - -' }]);
  S.stDrumroll = sting(240, [{ wave: 'drums', vol: .2, notes: 's s s s s s s s s s s s s s s s s s s s s s s s c . . .' }]);
  return S;
})();

MT.music = {
  cur: null,
  play(id, o = {}) {
    const a = MT.game && MT.game.audio; if (!a) return;
    if (!id) { this.cur = null; a.stopMusic(o.fade === undefined ? .4 : o.fade); return; }
    if (this.cur === id && !o.restart) return;
    const song = MT.SONGS[id]; if (!song) throw new Error('no song ' + id);
    this.cur = id; a.music(song, { fade: o.fade === undefined ? .6 : o.fade, restart: !!o.restart });
  },
  layer(name, vol, fade = .4) { const a = MT.game && MT.game.audio; if (a && a.song) { try { a.layer(name, vol, fade); } catch (e) { /* a song without that layer */ } } },
  sting(id) { const a = MT.game && MT.game.audio; if (a && MT.SONGS[id]) a.sting(MT.SONGS[id], { at: 'now', duck: .45 }); }
};
