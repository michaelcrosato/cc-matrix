// MUSIC: every song in the engine's step format ({ bpm, steps, tracks }), composed here. The Wheel motif
// (D4 - A4 - G4 - A4 - | F4 - E4 - D4 - - -) runs through every main theme, changed by season: Dorian for the title,
// Lydian Spring, Mixolydian Summer, an Autumn waltz in E minor, a still Winter in B minor, a ticking Hour, a Phrygian
// boss in 13-step bars, and the motif made major for the endings. Stings play once over the music.

const SONG = (id, o) => G.def('song', id, o);
const rep = (s, n) => Array(n).fill(s).join(' | ');
const tr = (wave, vol, notes, o = {}) => Object.assign({ wave, vol, notes }, o);

SONG('title', { bpm: 92, steps: 2, tracks: [
  tr('pulse', .13, 'D4 - A4 - G4 - A4 - | F4 - E4 - D4 - - - | C4 - D4 - E4 - F4 - | E4 - D4 - C4 - A3 - | D4 - A4 - G4 - A4 - | C5 - B4 - A4 - - - | G4 - F4 - E4 - G4 - | D4 - - - - - . .'),
  tr('triangle', .26, 'D2 - . D3 A2 - . D2 | D2 - . D3 A2 - . D2 | C2 - . C3 G2 - . C2 | A1 - . A2 E2 - . A1 | D2 - . D3 A2 - . D2 | G1 - . G2 D2 - . G1 | C2 - . C3 G2 - . C2 | D2 - - - D2 - . .'),
  tr('saw', .035, 'D3 - - - - - - - | F3 - - - - - - - | E3 - - - - - - - | C3 - - - - - - - | D3 - - - - - - - | B2 - - - - - - - | C3 - - - - - - - | A2 - - - - - - -'),
  tr('drums', .07, 'k . h . s . h . | k . h k s . h . ')] });
SONG('spring', { bpm: 104, steps: 2, tracks: [
  tr('pulse12', .12, 'F4 - C5 - B4 - C5 - | A4 - G4 - F4 - - - | A4 - B4 - C5 - D5 - | C5 - A4 - G4 - - - | F4 - C5 - B4 - C5 - | D5 - E5 - F5 - - - | E5 - D5 - C5 - B4 - | C5 - - - . . . .'),
  tr('triangle', .24, 'F2 . C3 . F2 . C3 . | F2 . C3 . F2 . A2 . | G2 . D3 . G2 . D3 . | C2 . G2 . C2 . G2 . | F2 . C3 . F2 . C3 . | D2 . A2 . D2 . A2 . | C2 . G2 . C2 . G2 . | F2 . C3 . F2 - - -'),
  tr('drums', .05, 'k . h h . h h . | k . h h s h h .')] });
SONG('summer', { bpm: 116, steps: 2, tracks: [
  tr('square', .1, 'A4 - E5 - D5 - E5 - | C#5 - B4 - A4 - - - | G4 - A4 - B4 - D5 - | E5 - - - D5 - - - | A4 - E5 - D5 - E5 - | F#5 - G5 - A5 - - - | G5 - E5 - D5 - B4 - | A4 - - - . . . .'),
  tr('triangle', .26, 'A2 . A2 . E2 . A2 . | A2 . A2 . E2 . A2 . | G2 . G2 . D2 . G2 . | D2 . D2 . A1 . D2 . | A2 . A2 . E2 . A2 . | D2 . D2 . A1 . D2 . | G2 . G2 . D2 . G2 . | A2 . E2 . A2 - - -'),
  tr('drums', .08, 'k . s s k . s . | k k s s k . s s')] });
SONG('autumn', { bpm: 96, steps: 4, tracks: [
  tr('triangle', .16, 'E4 - - - B4 - - - A4 - - - | B4 - - - G4 - - - F#4 - - - | E4 - - - G4 - - - B4 - - - | A4 - - - - - - - . . . . | C5 - - - B4 - - - A4 - - - | G4 - - - F#4 - - - E4 - - - | F#4 - - - G4 - - - A4 - - - | E4 - - - - - - - . . . .'),
  tr('saw', .03, 'E3 - - - G3 - - - B3 - - - | D3 - - - F#3 - - - A3 - - - | C3 - - - E3 - - - G3 - - - | B2 - - - D#3 - - - F#3 - - - | A2 - - - C3 - - - E3 - - - | G2 - - - B2 - - - D3 - - - | F#2 - - - A2 - - - C3 - - - | B2 - - - - - - - . . . .'),
  tr('triangle', .2, 'E2 - - - . . . . . . . . | D2 - - - . . . . . . . . | C2 - - - . . . . . . . . | B1 - - - . . . . . . . . | A1 - - - . . . . . . . . | G1 - - - . . . . . . . . | F#1 - - - . . . . . . . . | B1 - - - . . . . . . . .'),
  tr('drums', .04, 'k . . . h . . . h . . .')] });
SONG('winter', { bpm: 72, steps: 2, tracks: [
  tr('sine', .14, 'B4 - F#5 - E5 - F#5 - | D5 - C#5 - B4 - - - | . . . . . . . . | D5 - E5 - F#5 - - - | B4 - F#5 - E5 - F#5 - | G5 - F#5 - E5 - - - | D5 - - - C#5 - - - | B4 - - - - - - -'),
  tr('pulse12', .05, '. . . B5 . . . . | . . F#6 . . . . . | . . . . . D6 . . | . . . . . . . . | . . . B5 . . . . | . . E6 . . . . . | . . . . . C#6 . . | . . . . . . . .'),
  tr('sine', .12, 'B2 - - - - - - - | G2 - - - - - - - | D3 - - - - - - - | A2 - - - - - - - | B2 - - - - - - - | E2 - - - - - - - | F#2 - - - - - - - | B2 - - - - - - -')] });
SONG('battle_attack', { bpm: 140, steps: 4, tracks: [
  tr('square', .09, 'D5 - - - A4 - - - D5 - E5 - F5 - - - | E5 - D5 - C5 - A4 - - - - - . . . . | D5 - - - A4 - - - D5 - E5 - F5 - G5 - | A5 - - - G5 - F5 - E5 - D5 - - - . .'),
  tr('saw', .07, 'D2 . D2 . D3 . D2 . D2 . D2 . D3 . D2 . | C2 . C2 . C3 . C2 . A1 . A1 . A2 . A1 . | Bb1 . Bb1 . Bb2 . Bb1 . C2 . C2 . C3 . C2 . | D2 . D2 . D3 . D2 . A1 . A1 . A2 . C2 .'),
  tr('drums', .09, 'k . h . s . h . k k h . s . h h'),
  tr('square', .06, 'A5 . A5 . A5 . A5 . G5 . G5 . G5 . G5 . | F5 . F5 . F5 . F5 . E5 . E5 . E5 . E5 .', { name: 'tension', on: false })] });
SONG('battle_defend', { bpm: 128, steps: 4, tracks: [
  tr('pulse', .1, 'G4 - - - D5 - - - C5 - - - D5 - - - | Bb4 - - - A4 - - - G4 - - - - - - - | Eb5 - - - D5 - - - C5 - - - Bb4 - - - | A4 - - - Bb4 - - - C5 - - - D5 - - -'),
  tr('triangle', .25, 'G2 . . G2 . . G2 . G2 . . G2 . . D2 . | Eb2 . . Eb2 . . Eb2 . D2 . . D2 . . D2 . | C2 . . C2 . . C2 . Bb1 . . Bb1 . . Bb1 . | D2 . . D2 . . D2 . D2 . . D2 . A1 . D2 .'),
  tr('drums', .08, 'k . . o . . s . k . o . s . o o'),
  tr('pulse', .05, 'D6 . . D6 . . D6 . D6 . . D6 . . D6 .', { name: 'tension', on: false })] });
SONG('hourless', { bpm: 100, steps: 4, tracks: [
  tr('saw', .06, 'C5 - - - B4 - - - Bb4 - - - A4 - - - | Ab4 - - - G4 - - - F#4 - - - G4 - - - | C5 - - - Eb5 - - - D5 - - - C5 - - - | B4 - - - - - - - G4 - - - - - - -'),
  tr('triangle', .24, 'C2 - . . C2 - . . Ab1 - . . Ab1 - . . | F1 - . . F1 - . . G1 - . . G1 - . .'),
  tr('drums', .07, 'c . t . c . t . c . t . c . t t')] });
SONG('boss', { bpm: 150, steps: 4, tracks: [
  tr('square', .09, 'E5 - F5 - E5 - - - B4 - C5 - D5 | E5 - F5 - G5 - F5 - E5 - - - . | E5 - F5 - E5 - - - B4 - C5 - B4 | A4 - G4 - F4 - E4 - - - - - .'),
  tr('saw', .07, 'E2 . E2 . E3 . E2 . F2 . F2 . E2 | E2 . E2 . E3 . E2 . G2 . F2 . E2 | E2 . E2 . E3 . E2 . F2 . F2 . E2 | D2 . D2 . C2 . C2 . F2 . F2 . E2'),
  tr('drums', .1, 'k . s . k k s . k . s . o')] });
SONG('event', { bpm: 84, steps: 2, tracks: [
  tr('triangle', .13, 'D4 - A4 - G4 - A4 - | F4 - E4 - D4 - - - | . . . . . . . . | C4 - D4 - E4 - - -'),
  tr('pulse12', .05, 'D3 - - - F3 - - - | A2 - - - D3 - - - | C3 - - - E3 - - - | A2 - - - - - - -')] });
SONG('ending', { bpm: 80, steps: 2, tracks: [
  tr('pulse', .12, 'D4 - A4 - G4 - A4 - | F#4 - E4 - D4 - - - | G4 - A4 - B4 - D5 - | C#5 - - - A4 - - - | D5 - C#5 - B4 - A4 - | G4 - F#4 - E4 - - - | F#4 - G4 - A4 - B4 - | D5 - - - - - - -'),
  tr('triangle', .24, 'D2 - - - A2 - - - | D2 - - - F#2 - - - | G2 - - - D2 - - - | A2 - - - E2 - - - | B1 - - - F#2 - - - | G1 - - - D2 - - - | A1 - - - E2 - - - | D2 - - - - - - -'),
  tr('saw', .03, 'F#3 - - - - - - - | A3 - - - - - - - | B3 - - - - - - - | C#4 - - - - - - - | D4 - - - - - - - | B3 - - - - - - - | C#4 - - - - - - - | D4 - - - - - - -'),
  tr('drums', .05, 'k . . . h . . . | k . . . s . h .')] });
// stings: 2 bars or less, once over the music
SONG('season_spring', { bpm: 120, steps: 4, tracks: [tr('pulse12', .14, 'F5 - A5 - C6 - B5 - A5 - - - - - - - . . . .'), tr('triangle', .2, 'F3 - - - C4 - - - F3 - - - - - - - . . . .')] });
SONG('season_summer', { bpm: 120, steps: 4, tracks: [tr('square', .11, 'A4 - C#5 - E5 - A5 - G5 - - - A5 - - - . . . .'), tr('drums', .1, 's s s s k . . . s . k . . . . .')] });
SONG('season_autumn', { bpm: 96, steps: 4, tracks: [tr('triangle', .15, 'E5 - - - B4 - - - G4 - - - E4 - - - - - - -'), tr('saw', .04, 'E3 - - - - - - - - - - - B2 - - - - - - -')] });
SONG('season_winter', { bpm: 80, steps: 4, tracks: [tr('sine', .15, 'B5 - - - F#5 - - - D5 - - - B4 - - - - - - -'), tr('pulse12', .05, '. . B6 . . . F#6 . . . D6 . . . . . . . . .')] });
SONG('victory', { bpm: 132, steps: 4, tracks: [tr('square', .11, 'D5 - D5 - D5 - A5 - - - F#5 - - - A5 - - - - - - - . . . .'), tr('triangle', .24, 'D3 - D3 - D3 - D3 - - - D3 - - - D3 - - - - - - - . . . .'), tr('drums', .08, 's s s s k . . . s . k . . . . . . . . .')] });
SONG('defeat', { bpm: 72, steps: 4, tracks: [tr('triangle', .15, 'D4 - - - C4 - - - Bb3 - - - A3 - - - - - - - - - - -'), tr('saw', .04, 'D3 - - - - - - - G2 - - - - - - - A2 - - - - - - -')] });
SONG('levelup', { bpm: 160, steps: 4, tracks: [tr('pulse', .1, 'C5 E5 G5 C6 - - E6 - G6 - - -')] });
SONG('promote', { bpm: 140, steps: 4, tracks: [tr('square', .1, 'G4 B4 D5 G5 - - B5 - D6 - - - G6 - - -'), tr('triangle', .2, 'G2 - - - D3 - - - G3 - - - - - - -')] });
SONG('summon', { bpm: 120, steps: 4, tracks: [tr('sine', .14, 'C4 G4 C5 E5 G5 C6 - - - -'), tr('saw', .04, 'C3 - - - - - - - - -')] });
SONG('capture', { bpm: 140, steps: 4, tracks: [tr('pulse12', .12, 'E5 . E5 . G5 . B5 - - - -')] });
SONG('candle', { bpm: 60, steps: 4, tracks: [tr('saw', .05, 'C2 - - - - - - - - - - - - - - -'), tr('drums', .06, 'c . . . c . . . c . . . c . . .')] });

/** the campaign song for a season */
G.seasonSong = s => G.get('song', s);
G.music = (id, o = {}) => { const a = G.game && G.game.audio; if (!a) return; if (!id) { a.stopMusic(o.fade || .5); G.curSong = null; return; } if (G.curSong === id && !o.restart) return; G.curSong = id; try { a.music(G.get('song', id), Object.assign({ fade: .8 }, o)); } catch (e) { G.game.fail('music', e); } };
G.sting = (id, o = {}) => { const a = G.game && G.game.audio; if (!a || !G.has('song', id)) return; try { a.sting(G.get('song', id), Object.assign({ at: 'now', duck: .4 }, o)); } catch (e) { G.game.fail('sting', e); } };
G.layer = (name, vol, fade = .8) => { const a = G.game && G.game.audio; if (a && a.layer) try { a.layer(name, vol, fade); } catch (e) { /* the song has no such layer */ } };
