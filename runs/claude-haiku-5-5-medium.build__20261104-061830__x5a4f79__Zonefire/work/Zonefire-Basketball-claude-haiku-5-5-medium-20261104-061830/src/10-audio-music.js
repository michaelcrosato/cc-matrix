/* ---- MUSIC (plan §12.1): every song is data in the engine's format (bpm, steps, tracks with a wave, a volume and notes),
 * layered with audio.layer and played with audio.music; the stings are short songs. All written in code, no files. ---- */
const SONG_TITLE = { bpm: 108, steps: 4, tracks: [
  { name: 'bass', wave: 'square', vol: .22, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
  { name: 'stabs', wave: 'saw', vol: .06, notes: '. . . . E4 . . . . . . . G4 - . . | . . . . E4 . . . . . . . A4 - B4 . |' },
  { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h k . k h . s . h h | k . h . s . h k . k h . s h o . |' },
  { name: 'hype', wave: 'pulse', vol: .07, on: false, notes: 'B4 - - . A4 G4 . E4 - . . . . . . . | D5 - - . B4 A4 . G4 - . A4 . B4 - - . |' }
] };
const SONGS = {
  title: SONG_TITLE,
  menu: { bpm: 108, steps: 4, tracks: [SONG_TITLE.tracks[0], SONG_TITLE.tracks[2]] },
  skybox: { bpm: 116, steps: 4, tracks: [
    { name: 'arp', wave: 'pulse', vol: .06, notes: 'A4 C5 E5 A5 G5 E5 C5 A4 F4 A4 C5 F5 E5 C5 A4 F4 |' },
    { name: 'bass', wave: 'saw', vol: .2, notes: 'A2 . A2 . C3 . A2 . F2 . F2 . G2 . G2 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h h s . h h k . h h s . h o |' },
    { name: 'nova', wave: 'saw', vol: .06, on: false, notes: 'E5 - G5 - B5 - E6 - D5 - F5 - A5 - |' }] },
  pier: { bpm: 124, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .08, notes: 'D5 . F#5 A5 . A5 G5 F#5 . E5 . D5 . . . |' },
    { name: 'bass', wave: 'square', vol: .18, notes: 'D2 . D3 . A2 . D3 . G2 . G3 . A2 . A3 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . . h s . h . k . . h s . h h |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'D6 - F#6 - A6 - D7 - |' }] },
  scrapyard: { bpm: 92, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .2, notes: 'C2 . C2 . Eb2 . C2 . G1 . G1 . Bb1 . C2 . |' },
    { name: 'metal', wave: 'noise', vol: .04, notes: 'c . . c . c . . c . . c . c c . |' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . . k s . k . k . k s . . s . |' },
    { name: 'nova', wave: 'pulse', vol: .05, on: false, notes: 'C5 - Eb5 - G5 - C6 - |' }] },
  caldera: { bpm: 128, steps: 4, tracks: [
    { name: 'marimba', wave: 'triangle', vol: .1, notes: 'G4 . Bb4 . D5 . G5 . F5 . D5 . Bb4 . G4 . |' },
    { name: 'bass', wave: 'square', vol: .16, notes: 'G2 G2 . G2 . G2 D2 . G2 . G2 . F2 G2 . |' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . k . s . k . k k s . k . s s |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'G5 - D6 - Bb5 - G6 - |' }] },
  dome: { bpm: 132, steps: 4, tracks: [
    { name: 'guitar', wave: 'saw', vol: .07, notes: 'E4 E4 G4 E4 A4 G4 E4 B3 |' },
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E2 . E2 . G2 . A2 . A2 . B2 . E2 . |' },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k . h . s . h . k . h . s h h . |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'E5 - G5 - B5 - E6 - |' },
    { name: 'overclock', wave: 'pulse', vol: .05, on: false, notes: 'E6 B5 G6 B5 E6 B5 G6 B5 |' },
    { name: 'clutch', wave: 'drums', vol: .08, on: false, notes: 'k k s k k k s s |' }] },
  halftime: { bpm: 120, steps: 4, tracks: [
    { name: 'brass', wave: 'saw', vol: .06, notes: 'Bb4 . D5 . F5 . D5 . Eb5 . C5 . Bb4 . |' },
    { name: 'bass', wave: 'square', vol: .18, notes: 'Bb2 . Bb2 . F2 . F2 . Eb2 . Eb2 . F2 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . s . k . s . |' }] },
  tourmap: { bpm: 100, steps: 4, tracks: [
    { name: 'groove', wave: 'triangle', vol: .12, notes: 'F3 . A3 . C4 . A3 . Bb3 . G3 . F3 . |' },
    { name: 'bass', wave: 'square', vol: .16, notes: 'F2 . . F2 C2 . F2 . Bb2 . . G2 F2 . |' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h . |' }] },
  story: { bpm: 84, steps: 4, tracks: [
    { name: 'drone', wave: 'sine', vol: .14, notes: 'D2 - - - - - - - D2 - - - - - - - |' },
    { name: 'pluck', wave: 'triangle', vol: .06, notes: 'D4 . . . A4 . . . F4 . . . C4 . . . |' },
    { name: 'villain', wave: 'square', vol: .04, on: false, notes: 'D3 F3 A3 F3 Eb3 G3 Bb3 G3 |' }] },
  camp: { bpm: 104, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .06, notes: 'C5 . E5 . G5 . E5 . D5 . F5 . A4 . |' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'C3 . G2 . C3 . G2 . A2 . E2 . F2 . G2 . |' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h . |' }] },
  credits: { bpm: 112, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E3 . E2 . G2 . A2 . A3 . B2 . E3 . |' },
    { name: 'stabs', wave: 'saw', vol: .06, notes: 'E4 . G#4 . B4 . E5 . A4 . B4 . E4 - |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h k . k h . s h h . |' }] }
};
const STINGS = {
  tip: { bpm: 140, steps: 4, tracks: [{ name: 'tip', wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - - - - |' }] },
  buzzer: { bpm: 90, steps: 4, tracks: [{ name: 'buzz', wave: 'square', vol: .14, notes: 'A3 - - - A#3 - - - |' }] },
  nova: { bpm: 140, steps: 4, tracks: [{ name: 'nova', wave: 'saw', vol: .12, notes: 'C4 E4 G4 C5 E5 G5 C6 - |' }] },
  shatter: { bpm: 140, steps: 4, tracks: [{ name: 'shatter', wave: 'noise', vol: .14, notes: 'c c c c - - - - |' }] },
  victory: { bpm: 120, steps: 4, tracks: [{ name: 'vic', wave: 'triangle', vol: .16, notes: 'C4 . E4 . G4 . C5 - - - |' }] },
  defeat: { bpm: 80, steps: 4, tracks: [{ name: 'def', wave: 'triangle', vol: .14, notes: 'G4 . F4 . Eb4 . D4 - - - |' }] },
  unlock: { bpm: 140, steps: 4, tracks: [{ name: 'unl', wave: 'pulse', vol: .12, notes: 'E5 G5 B5 E6 - - - - |' }] },
  sponsor: { bpm: 150, steps: 4, tracks: [{ name: 'ad', wave: 'square', vol: .12, notes: 'C5 . C5 . E5 . G5 . C6 - - - |' }] }
};
/** the songs by where they play; a stinger over the music, a layer over a song */
const playSong = name => { const s = SONGS[name]; if (!s) { if (name) game.fail('song ' + name, new Error('no such song')); return A.music(null); } A.music(s, { fade: .4 }); };
const playSting = name => { const s = STINGS[name]; if (s) A.sting(s, { at: 'bar' }); };
/** the dynamic layers: a song's extra track switched on for the moment (Supernova, the overclock, the clutch) */
const layerOn = (name, on) => { try { A.layer(name, on ? 1 : 0, .6); } catch (e) { /* no audio: nothing to switch */ } };
