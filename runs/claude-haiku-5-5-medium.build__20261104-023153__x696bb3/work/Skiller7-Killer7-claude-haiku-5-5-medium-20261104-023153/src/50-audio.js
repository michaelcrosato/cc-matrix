/* Skiller7: sound. Everything is written in code: the engine's chip synth plays the sound effects, the songs and the
 * laughter (arpeggiated voices), and the dialogue blips are Animalese-style gibberish voices. No audio files. */
S7.SFX = {
  scan:   { wave: 'sine', freq: 'A5', to: 'A3', dur: .7, vol: .18, vib: [5, .04] },
  freeze: { wave: 'triangle', freq: 'E6', to: 'E3', dur: .5, vol: .22, arp: [0, -5, -12], step: .06 },
  thaw:   { wave: 'sine', freq: 'C6', to: 'G6', dur: .25, vol: .2, arp: [0, 4, 7, 12], step: .03 },
  hurt:   { wave: 'square', freq: 'G3', to: 'C3', dur: .2, vol: .2 },
  laser:  { wave: 'pulse', freq: 'A5', to: 'A3', dur: .09, vol: .2 },
  shoot:  { wave: 'noise', freq: 'C4', to: 'C2', dur: .12, vol: .34 },
  boom:   { wave: 'noise', freq: 'D2', to: 'D1', dur: .45, vol: .42 },
  hit:    { wave: 'square', freq: 'E5', to: 'E4', dur: .05, vol: .18 },
  swing:  { wave: 'sine', freq: 'G4', to: 'E3', dur: .08, vol: .1 },
  heal:   { wave: 'triangle', freq: 'C5', dur: .18, vol: .18, arp: [0, 4, 7, 12], step: .04 },
  coin:   { wave: 'square', freq: 'B5', dur: .12, vol: .16, arp: [0, 7], step: .05 },
  reload: { wave: 'square', freq: 'C4', to: 'C5', dur: .15, vol: .14 },
  empty:  { wave: 'square', freq: 'A3', dur: .04, vol: .14 },
  switch: { wave: 'triangle', freq: 'E5', to: 'C5', dur: .14, vol: .18 },
  bump:   { wave: 'square', freq: 'A2', dur: .08, vol: .2 },
  door:   { wave: 'saw', freq: 'D3', to: 'D5', dur: .35, vol: .14 },
  boss:   { wave: 'saw', freq: 'C2', to: 'C3', dur: .6, vol: .22, arp: [0, 3, 7], step: .15 },
  victory: { wave: 'square', freq: 'C5', dur: .15, vol: .18, arp: [0, 4, 7, 12, 16], step: .09 },
  powerup: { wave: 'triangle', freq: 'G4', to: 'G6', dur: .3, vol: .2 },
  confirm: { wave: 'square', freq: 'A5', dur: .06, vol: .14 },
  select:  { wave: 'square', freq: 'E5', dur: .03, vol: .1 },
  gameover: { wave: 'saw', freq: 'G3', to: 'G1', dur: 1.2, vol: .2 }
};
/* the engine's own presets, used by name */
S7.PRESETS = { boom: 'boom', shoot: 'shoot', laser: 'laser', hit: 'hit', hurt: 'hurt', coin: 'coin', heal: 'heal', door: 'door', bump: 'bump', confirm: 'confirm', select: 'select', powerup: 'powerup', swing: 'swing', victory: 'powerup', boss: 'charge', freeze: 'die', thaw: 'powerup', scan: 'blip' };
S7.sfx = (name, o) => {
  const a = S7.game && S7.game.audio;
  if (!a) return;
  const voice = S7.SFX[name];
  try {
    if (voice) a.sfx(voice, o);
    else a.sfx(S7.PRESETS[name] || name, o);
  } catch (err) { /* the sound is optional; a missing sound never stops the game */ }
};

/* the laughter of the Whiteouts: three voices (the giggler's hi-hi, the cackler's hoo, the brute's low ha) */
S7.LAUGH = {
  hi:  { wave: 'triangle', freq: 'E6', to: 'A6', arp: [0, 4, 7, 4], step: .045, dur: .2, vol: .12 },
  hoo: { wave: 'saw', freq: 'G4', to: 'E4', dur: .34, vol: .08, vib: [14, .04] },
  ha:  { wave: 'square', freq: 'C5', to: 'G4', arp: [0, -3], step: .08, dur: .16, vol: .12 }
};
S7.laugh = (e) => {
  const a = S7.game && S7.game.audio, v = S7.LAUGH[e.style] || S7.LAUGH.hi;
  if (!a) return;
  try { a.sfx(v, e.loud ? { vol: .9, pitch: 1.1 } : { vol: .5, pitch: .95 }); } catch (err) { /* optional */ }
};

/* dialogue voices: the Animalese-style gibberish of each speaker, a blip for each letter */
S7.VOICE = {
  rosalind: { wave: 'triangle', freq: 'A4', to: 'E5', dur: .06, vol: .13, vib: [7, .03] },
  murmel:   { wave: 'square', freq: 'D4', to: 'G4', dur: .05, vol: .12, vib: [11, .05] },
  pim:      { wave: 'sine', freq: 'C5', to: 'F5', dur: .07, vol: .12, vib: [4, .04] },
  bell:     { wave: 'saw', freq: 'G3', to: 'B3', dur: .05, vol: .1 },
  oma:      { wave: 'triangle', freq: 'F3', to: 'A3', dur: .08, vol: .14, vib: [5, .03] },
  hero:     { wave: 'pulse', freq: 'E4', to: 'A4', dur: .05, vol: .12, vib: [9, .04] }
};

/* the songs: note strings, one token a step (- holds, . rests, | is ignored; k s h drums) */
S7.SONGS = {
  title: { bpm: 74, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'E4 - G4 - C5 - B4 - A4 - G4 - E4 - . | A4 - C5 - E5 - D5 - C5 - A4 - G4 - . |' },
    { wave: 'triangle', vol: .18, notes: 'C3 - - - G2 - - - A2 - - - E2 - - - |' }
  ] },
  hotel: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'A4 . C5 . E5 . C5 . G4 . B4 . D5 . B4 . |' },
    { wave: 'triangle', vol: .18, notes: 'A2 - E2 - F2 - C2 - |' },
    { wave: 'drums', notes: 'k . h . s . h . |' }
  ] },
  room7: { bpm: 58, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'C4 - - - E4 - - - A3 - - - G3 - - - |' },
    { wave: 'triangle', vol: .08, notes: 'C3 - - - A2 - - - |' }
  ] },
  slope: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'E5 - G5 B5 - A5 - G5 - E5 - . - |' },
    { wave: 'saw', vol: .1, notes: 'E2 E2 E3 E2 A2 A2 A3 A2 |' },
    { wave: 'drums', notes: 'k h s h k h s h |' }
  ] },
  boss: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .12, notes: 'C3 C3 D#3 C3 F3 F3 G3 F3 |' },
    { wave: 'square', vol: .1, notes: 'G4 . C5 . G4 . D#5 . |' },
    { wave: 'drums', notes: 'k k s k k s k s |' }
  ] },
  victory: { bpm: 110, steps: 4, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - G5 C6 - |' },
    { wave: 'triangle', vol: .16, notes: 'C3 G3 C3 G3 |' }
  ] }
};
S7.music = (name) => {
  const a = S7.game && S7.game.audio;
  if (!a) return;
  if (!name) { try { a.music(null); } catch (err) { /* nothing playing */ } return; }
  const song = S7.SONGS[name];
  if (!song) return;
  try { a.music(song, { fade: .4 }); } catch (err) { /* the songs are optional too */ }
};
