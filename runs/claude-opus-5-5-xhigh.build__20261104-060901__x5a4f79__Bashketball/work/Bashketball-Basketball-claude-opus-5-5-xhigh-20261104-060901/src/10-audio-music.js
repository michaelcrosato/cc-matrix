/* 10-audio-music: twelve songs and eight stings, written in code for the engine's synth (PLAN 12.1). Layers are tracks
 * that start silent (on: false) and come in with audio.layer: 'hype' on the title, 'nova' during a Supernova, the Dome's
 * 'overclock' and 'clutch'. Tracks of different lengths phase against each other. */
const DR = { basic: 'k . h . s . h k . k h . s . h h | k . h . s . h k . k h . s h o . |', four: 'k . h . s . h . k . h k s . h . |' };
const SONGS = {
  title: { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .22, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
    { name: 'stabs', wave: 'saw', vol: .06, notes: '. . . . E4 . . . . . . . G4 - . . | . . . . E4 . . . . . . . A4 - B4 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: DR.basic },
    { name: 'hype', wave: 'pulse', vol: .07, on: false, notes: 'B4 - - . A4 G4 . E4 - . . . . . . . | D5 - - . B4 A4 . G4 - . A4 . B4 - - . |' }] },
  menu: { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
    { name: 'drums', wave: 'drums', vol: .09, notes: DR.basic },
    { name: 'keys', wave: 'triangle', vol: .06, notes: 'G4 . . . B4 . . . E5 . . . . . . . | A4 . . . C5 . . . E5 . . . D5 . . . |' }] },
  skybox: { bpm: 116, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .22, notes: 'A1 . A2 . . A1 . A2 C2 . C3 . . G1 . G2 | F1 . F2 . . F1 . F2 E1 . E2 . G1 . G2 . |' },
    { name: 'arp', wave: 'pulse', vol: .05, notes: 'A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 | F4 A4 C5 F5 C5 A4 F4 A4 E4 G#4 B4 E5 B4 G#4 E4 G#4 |' },
    { name: 'lead', wave: 'saw', vol: .045, notes: 'A5 - - . G5 - E5 - . . C5 D5 E5 - . . | F5 - - . E5 - D5 - E5 - - - . . . . | A5 - - . G5 - E5 - . . C5 D5 E5 - G5 - | A5 - G5 - E5 - D5 - C5 - - - . . . . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: DR.basic },
    { name: 'nova', wave: 'pulse12', vol: .05, on: false, notes: 'A6 E6 C6 E6 A6 E6 C6 E6 B6 E6 C6 E6 C7 E6 B6 E6 |' }] },
  pier: { bpm: 124, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'D2 . D2 A2 . D2 . A2 G2 . G2 D3 . G2 . D3 | A2 . A2 E3 . A2 . E3 G2 . F#2 . E2 . A2 . |' },
    { name: 'lead', wave: 'pulse', vol: .065, notes: 'F#5 - A5 - F#5 . E5 D5 . . B4 - D5 - . . | E5 - G5 - E5 . D5 C#5 . . A4 - B4 - C#5 - | F#5 - A5 - B5 . A5 F#5 . . D5 - E5 - F#5 - | G5 - F#5 - E5 - D5 - C#5 - D5 - - - . . |' },
    { name: 'stabs', wave: 'square', vol: .035, notes: '. . D4 . . . F#4 . . . G4 . . . B4 . | . . A4 . . . C#5 . . . G4 . . . A4 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h h s . h . k k h . s . h o |' },
    { name: 'nova', wave: 'pulse12', vol: .05, on: false, notes: 'D6 A5 F#5 A5 D6 A5 F#5 A5 E6 A5 G5 A5 F#6 A5 E6 A5 |' }] },
  scrapyard: { bpm: 92, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .16, notes: 'C2 . . C2 . . Eb2 . F2 . . F2 G2 . Eb2 . | C2 . . C2 . . Bb1 . Ab1 . . Ab1 G1 . . . |' },
    { name: 'lead', wave: 'square', vol: .05, notes: 'G4 - . Eb4 - . C4 . . . Bb3 C4 Eb4 - . . | F4 - . Eb4 - . C4 . Bb3 - . . G3 - . . |' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . . h s . . k k . k h s . h . |' },
    { name: 'metal', wave: 'drums', vol: .07, notes: '. . . . . . t . . . . . . t . t | . . . c . . t . . . . . . t t t |' },
    { name: 'nova', wave: 'pulse12', vol: .05, on: false, notes: 'C6 G5 Eb5 G5 C6 G5 Eb5 G5 D6 G5 F5 G5 Eb6 G5 D6 G5 |' }] },
  caldera: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'G2 . . G2 . D3 . . F2 . . F2 . C3 . . | Bb1 . . Bb1 . F2 . . D2 . . D2 . A2 . . |' },
    { name: 'marimba', wave: 'triangle', vol: .09, notes: 'G4 . Bb4 . D5 . G4 . F4 . A4 . C5 . F4 . | D5 . C5 . Bb4 . G4 . A4 . F4 . D4 . F4 . |' },
    { name: 'lead', wave: 'square', vol: .04, notes: 'D5 - - - C5 - Bb4 - G4 - - - . . . . | F5 - - - D5 - C5 - Bb4 - C5 - D5 - - - |' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . t . s t . t k . t . s t t t |' },
    { name: 'nova', wave: 'pulse12', vol: .05, on: false, notes: 'G6 D6 Bb5 D6 G6 D6 Bb5 D6 A6 D6 C6 D6 Bb6 D6 A6 D6 |' }] },
  dome: { bpm: 132, steps: 4, tracks: [
    { name: 'power', wave: 'saw', vol: .06, notes: 'E3 - - - E3 - - - G3 - - - A3 - - - | C4 - - - B3 - - - A3 - G3 - E3 - - - |' },
    { name: 'fifth', wave: 'saw', vol: .045, notes: 'B3 - - - B3 - - - D4 - - - E4 - - - | G4 - - - F#4 - - - E4 - D4 - B3 - - - |' },
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 E2 E2 E2 E2 E2 E2 E2 G2 G2 G2 G2 A2 A2 A2 A2 | C3 C3 C3 C3 B2 B2 B2 B2 A2 A2 G2 G2 E2 E2 E2 E2 |' },
    { name: 'lead', wave: 'pulse', vol: .05, notes: 'B4 - E5 - G5 - F#5 - E5 - - - D5 - B4 - | C5 - E5 - G5 - A5 - B5 - - - - - . . |' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h . k k h . s . h . |' },
    { name: 'overclock', wave: 'pulse12', vol: .055, on: false, notes: 'E5 G5 B5 E6 B5 G5 E5 G5 F#5 A5 C6 F#6 C6 A5 F#5 A5 |' },
    { name: 'clutch', wave: 'drums', vol: .1, on: false, notes: 'k k h k s k h k k k h k s s s s |' },
    { name: 'nova', wave: 'pulse12', vol: .045, on: false, notes: 'E6 B5 G5 B5 E6 B5 G5 B5 F#6 B5 A5 B5 G6 B5 F#6 B5 |' }] },
  halftime: { bpm: 120, steps: 4, tracks: [
    { name: 'melody', wave: 'square', vol: .07, notes: 'Bb4 . D5 . F5 . D5 . Bb4 - C5 . D5 . Eb5 . | F5 . D5 . Bb4 . C5 . D5 - C5 . Bb4 - - . |' },
    { name: 'brass', wave: 'saw', vol: .03, notes: 'D4 - - - F4 - - - Eb4 - - - G4 - - - | F4 - - - D4 - - - F4 - - - D4 - - - |' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'Bb2 . F2 . Bb2 . F2 . Eb2 . Bb2 . F2 . C3 . | Bb2 . F2 . Eb2 . F2 . Bb2 . F2 . Bb2 . . . |' },
    { name: 'drums', wave: 'drums', vol: .09, notes: 's . s s s . s . s s s . s . s s |' }] },
  tourmap: { bpm: 100, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'F2 . . F2 . C3 . . Bb2 . . Bb2 . F2 . . | C3 . . C3 . G2 . . F2 . . A2 . C3 . . |' },
    { name: 'lead', wave: 'pulse', vol: .06, notes: 'A4 - C5 - D5 . C5 A4 . . G4 - F4 - . . | G4 - A4 - Bb4 . A4 G4 . . E4 - F4 - . . |' },
    { name: 'drums', wave: 'drums', vol: .09, notes: DR.four }] },
  story: { bpm: 84, steps: 4, tracks: [
    { name: 'drone', wave: 'triangle', vol: .12, notes: 'D3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - - | Bb2 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - - |' },
    { name: 'pluck', wave: 'pulse', vol: .045, notes: 'D5 . . . F5 . . . . . A4 . . . . . | E5 . . . G5 . . . . . C#5 . . . . . |' },
    { name: 'villain', wave: 'square', vol: .045, on: false, notes: 'D4 - F4 - A4 - G#4 - A4 - - - . . . . | D4 - F4 - Bb4 - A4 - G4 - F4 - E4 - - - |' },
    { name: 'drums', wave: 'drums', vol: .06, notes: 'k . . . . . . . k . . . . . h . |' }] },
  camp: { bpm: 104, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .055, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . C5 . D5 . G4 . C5 - - . . . . . |' },
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . | C3 . G2 . G2 . B2 . C3 . G2 . C3 . . . |' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h . k . h . s . h h |' }] },
  credits: { bpm: 112, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E3 . . E2 G#2 . A2 . . B2 . A2 G#2 . | E2 . E3 . . E2 G#2 . C#3 . B2 . A2 . G#2 A2 |' },
    { name: 'lead', wave: 'pulse', vol: .07, notes: 'G#4 - - . A4 B4 . E5 - . . . . . . . | C#5 - - . B4 A4 . G#4 - . A4 . B4 - - . | E5 - - . D#5 C#5 . B4 - . G#4 . A4 - B4 . | C#5 - B4 - A4 - G#4 - E4 - - - . . . . |' },
    { name: 'stabs', wave: 'saw', vol: .04, notes: '. . . . G#4 . . . . . . . B4 - . . | . . . . A4 . . . . . . . C#5 - E5 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: DR.basic }] }
};
const STINGS = {
  tip: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'E5 G5 B5 E6 - - . .' }, { wave: 'drums', vol: .1, notes: 'k . . . c . . .' }] },
  nova: { bpm: 150, steps: 4, tracks: [{ wave: 'saw', vol: .07, notes: 'C5 E5 G5 C6 E6 G6 C7 - - - . .' }, { wave: 'pulse', vol: .06, notes: 'G4 - C5 - E5 - G5 - - - . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k s c . . . . .' }] },
  shatter: { bpm: 140, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'C6 B5 Bb5 A5 Ab5 G5 - - . .' }, { wave: 'drums', vol: .12, notes: 'c . c . k k k . . .' }] },
  victory: { bpm: 132, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'E5 . E5 . E5 . C5 . E5 - G5 - - - G4 - - - . .' }, { wave: 'triangle', vol: .25, notes: 'C3 . C3 . C3 . A2 . C3 - E3 - - - G2 - - - . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k . s . k k s . c . . . . . . .' }] },
  defeat: { bpm: 90, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'G4 - - . F#4 - - . F4 - - . E4 - - - - - . .' }, { wave: 'triangle', vol: .22, notes: 'C3 - - . B2 - - . Bb2 - - . A2 - - - - - . .' }] },
  unlock: { bpm: 150, steps: 4, tracks: [{ wave: 'pulse', vol: .09, notes: 'C5 E5 G5 C6 . G5 C6 E6 - - . .' }, { wave: 'triangle', vol: .2, notes: 'C3 . . . G3 . . . C4 - . .' }] },
  sponsor: { bpm: 140, steps: 4, tracks: [{ wave: 'triangle', vol: .12, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . G5 . C6 . A5 . G5 . E5 . C5 - - - |' }, { wave: 'square', vol: .05, notes: 'C4 . . . F4 . . . G4 . . . C4 . . . | C4 . . . F4 . . . G4 . . . C4 - - - |' }, { wave: 'drums', vol: .07, notes: 'k . h . s . h . k . h . s . h . |' }] },
  buzzer: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'A3 - - - - - - .' }, { wave: 'square', vol: .1, notes: 'Bb3 - - - - - - .' }] }
};
let musicNow = null;
/** play a song by name (from SONGS), crossfading; layers reset; null stops */
function playMusic(name, o = {}) {
  if (S.net && S.net.role === 'server') return;
  if (name === musicNow && !o.restart) return;
  musicNow = name;
  if (!name) { A.music(null); return; }
  const song = SONGS[name]; if (!song) return;
  A.music(song, { fade: o.fade === undefined ? .6 : o.fade });
  A.tempo(song.bpm);
  if (name === 'title') game.after(8 * 4 * 60 / song.bpm, () => { if (musicNow === 'title') A.layer('hype', 1, 1); });
}
function sting(name) { if (S.net && S.net.role === 'server') return; const s = STINGS[name]; if (s) try { A.sting(s, { at: 'now', duck: .35 }); } catch (e) { game.fail('sting ' + name, e); } }
function musicLayer(name, on) { if (!musicNow || !SONGS[musicNow] || !SONGS[musicNow].tracks.some(t => t.name === name)) return; try { A.layer(name, on ? 1 : 0, 1); } catch (e) { game.fail('layer ' + name, e); } }
