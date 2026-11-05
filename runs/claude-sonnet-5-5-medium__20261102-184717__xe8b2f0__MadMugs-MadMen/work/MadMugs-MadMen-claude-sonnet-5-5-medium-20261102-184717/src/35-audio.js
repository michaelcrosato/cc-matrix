// ---------------------------------------------------------------------------------------------------------------------
// SOUND: everything is synthesised. Effects for the office, gibberish voices, and four pieces of cool jazz.
// ---------------------------------------------------------------------------------------------------------------------
const audio = game.audio;
const def = (n, v) => audio.define(n, v);
def('typekey', { wave: 'square', freq: 1300, to: 600, dur: .025, vol: .09 });
def('typebell', { wave: 'sine', freq: 2093, dur: .6, vol: .22 });
def('carriage', { wave: 'noise', freq: 400, dur: .16, vol: .1 });
def('pour', { wave: 'noise', freq: 1800, to: 700, dur: .55, vol: .08 });
def('glass', { wave: 'sine', freq: 2637, to: 2400, dur: .35, vol: .14 });
def('lighter', [{ wave: 'noise', freq: 3000, dur: .05, vol: .12 }, { wave: 'square', freq: 180, dur: .04, vol: .08 }]);
def('phonering', { wave: 'pulse', freq: 1500, dur: .12, vol: .1, arp: [0, 5, 0, 5], step: .04 });
def('paper', { wave: 'noise', freq: 2400, to: 1200, dur: .18, vol: .08 });
def('stamp', { wave: 'triangle', freq: 120, to: 50, dur: .22, vol: .3 });
def('tick', { wave: 'square', freq: 1800, dur: .015, vol: .06 });
def('good', { wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12], step: .05, dur: .3, vol: .22 });
def('okay', { wave: 'triangle', freq: 'G4', arp: [0, 5], step: .06, dur: .2, vol: .2 });
def('poor', { wave: 'saw', freq: 220, to: 110, dur: .3, vol: .14 });
def('elevatorbell', { wave: 'sine', freq: 1568, dur: .8, vol: .2 });
const VOX = { vox_gil: ['triangle', 150], vox_dot: ['pulse', 300], vox_walt: ['triangle', 100], vox_teddy: ['pulse12', 190], vox_hollis: ['saw', 78], vox_lorraine: ['pulse', 260], vox_garland: ['triangle', 88], vox_evelyn: ['sine', 330], vox_narr: ['sine', 200] };
for (const k in VOX) def(k, { wave: VOX[k][0], freq: VOX[k][1], to: VOX[k][1] * 1.08, dur: .055, vol: .13 });
// Animalese: each letter blip is pitched by a hash of the running count, so the gibberish has a contour but no words
const rawSfx = audio.sfx.bind(audio); let voxN = 0;
audio.sfx = (what, o) => {
  if (typeof what === 'string' && what.startsWith('vox_')) { voxN++; const k = (hashStr(what + (voxN * 7919)) % 1000) / 1000; o = Object.assign({}, o, { pitch: .72 + k * .95, vary: 0 }); }
  return rawSfx(what, o);
};

// ---- music (bar = 16 steps; all tracks loop on their own length) -------------------------------------------------------
const bars = (...b) => b.join(' | ');
const SONGS = {
  title: { bpm: 74, steps: 4, tracks: [
    { wave: 'triangle', vol: .26, notes: bars('D2 - - - . . . . A2 - - - . . F2 -', 'G2 - - - . . . . D3 - - - . . B2 -', 'C2 - - - . . . . G2 - - - . . E2 -', 'A2 - - - . . . . E3 - - - . . C#3 -') },
    { wave: 'sine', vol: .17, notes: bars('. . . . F4 - - - A4 - - - C5 - - -', '. . . . D4 - - - F4 - - - B4 - - -', '. . . . E4 - - - G4 - - - B4 - - -', '. . . . C#4 - - - E4 - - - G4 - - -') },
    { wave: 'pulse12', vol: .07, notes: bars('. . . . . . D5 - . . . . . . . .', '. . . . . . . . . . G4 - . . . .', '. . . . . . B4 - . . . . . . . .', '. . . . . . . . . . A4 - . . . .') },
    { wave: 'drums', vol: .06, notes: 'h . . h . . h . h . . h . . h .' }] },
  office: { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: bars('D2 - - - F2 - - - A2 - - - C3 - - -', 'G2 - - - B2 - - - D3 - - - F3 - - -', 'C2 - - - E2 - - - G2 - - - B2 - - -', 'A2 - - - C#3 - - - E3 - - - G3 - - -', 'D2 - - - F2 - - - A2 - - - D3 - - -', 'G2 - - - Bb2 - - - D3 - - - F3 - - -', 'E2 - - - G2 - - - Bb2 - - - D3 - - -', 'A2 - - - G2 - - - E2 - - - C#2 - - -') },
    { name: 'comp', wave: 'pulse12', vol: .06, notes: bars('. . . . . . F4 - . . . . . . . .', '. . . . . . . . . . B4 - . . . .', '. . . . . . E4 - . . . . . . . .', '. . . . . . . . . . C#5 - . . . .', '. . . . . . A4 - . . . . . . . .', '. . . . . . . . . . Bb4 - . . . .', '. . . . . . G4 - . . . . . . . .', '. . . . . . . . . . E4 - . . . .') },
    { name: 'vibes', wave: 'sine', vol: .12, notes: bars('A4 - - . . . C5 - D5 - - . . . . .', '. . B4 - - . . . D5 - - . F5 - E5 -', 'E5 - - - . . G5 - - . E5 - . . . .', '. . C#5 - - . E5 - A5 - - . . . G5 -', 'F5 - - . D5 - - . A4 - - . . . . .', '. . G4 - Bb4 - - . D5 - - . . . . .', 'G5 - - . E5 - - . Bb4 - - . . . . .', '. . A4 - - - C#5 - E5 - - - . . . .') },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . h h . h h . h . h h . h h .' }] },
  pitch: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: bars('D2 - . D2 - . D2 - D2 - . . . . . . .', 'D2 - . D2 - . F2 - A2 - . . . G2 - . .') },
    { wave: 'sine', vol: .12, notes: bars('. . . . A4 - - - . . . . G4 - - -', '. . . . F4 - - - E4 - - - D4 - - -') },
    { wave: 'pulse12', vol: .05, notes: bars('. . . . . . . . D5 . . . . . . .', '. . . . . . F5 . . . . . A5 . . .') },
    { wave: 'drums', vol: .08, notes: 'h . . . h . . . h . h . h . . .' }] },
  epilogue: { bpm: 66, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: bars('G2 - - - . . . . D3 - - - . . . .', 'E2 - - - . . . . B2 - - - . . . .') },
    { wave: 'sine', vol: .15, notes: bars('B4 - - - D5 - - - G5 - - - F#5 - - -', 'E5 - - - B4 - - - G4 - - - . . . .') }] }
};
let curSong = null;
function music(name, o) { if (curSong === name) return; curSong = name; audio.music(name ? SONGS[name] : null, o || { fade: .6 }); }
