// Audio (plan §7.14–7.16): the songs are notes in code on the engine's chip synth; the sound effects are the engine's
// presets, named per event; the voices are syllable babble (a saw or pulse at the character's pitch, with a bright
// formant-like blip per syllable and a typed subtitle). Nothing is an audio file.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const G = () => OB.game;

/* ---- the songs: [bars of 16 steps] per track, 4 bars a loop. A '-' holds, '.' rests, '|' is a bar line ---- */
const bass = (...bars) => bars.join(' | ');
OB.SONGS = {
  // 88.6 PETAL FM: Latin fusion in D. Bass on the roots, a chord arpeggio, a steel-drum-ish lead, congas as drums.
  sunburst: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: bass('D2 . . D2 . D2 . . D2 . . D2 . D2 .', 'B1 . . B1 . B1 . . B1 . . B1 . B1 .', 'E2 . . E2 . E2 . . E2 . . E2 . E2 .', 'A1 . . A1 . A1 . . A2 . . A1 . A1 .') },
    { name: 'keys', wave: 'pulse12', vol: .045, notes: bass('D4+F#4+A4+C#5 - - - B3+D4+F#4+A4 - - - E4+G4+B4+D5 - - - A3+C#4+E4+G4 - - -', 'D4+F#4+A4+C#5 - - - B3+D4+F#4+A4 - - - E4+G4+B4+D5 - - - A3+C#4+E4+G4 - - -', 'D4+F#4+A4+C#5 - - - B3+D4+F#4+A4 - - - E4+G4+B4+D5 - - - A3+C#4+E4+G4 - - -', 'D4+F#4+A4+C#5 - - - B3+D4+F#4+A4 - - - E4+G4+B4+D5 - - - A3+C#4+E4+G4 - - -') },
    { name: 'lead', wave: 'square', vol: .07, notes: bass('F#5 . A5 . B5 . A5 . F#5 . E5 . D5 . . .', 'D5 . F#5 . B4 . D5 . C#5 . B4 . A4 . . .', 'G5 . B5 . E5 . G5 . F#5 . E5 . D5 . . .', 'C#5 . E5 . A4 . C#5 . B4 . A4 . G#4 . A4 .') },
    { name: 'drums', wave: 'drums', vol: .07, notes: bass('k . h . s . h . k . h . s . h h', 'k . h . s . h . k . h . s . h h', 'k . h . s . h . k . h . s . h h', 'k . h . s h h . k . h . s . h .') },
  ] },
  // 91.2 SUN FM: Balearic pop-funk in F. Four on the floor, a skank on the offbeats, a long pulse lead.
  coastline: { bpm: 116, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: bass('F2 . F2 . . F2 . F2 . . F2 . F2 . . .', 'E2 . E2 . . E2 . E2 . . E2 . E2 . . .', 'D2 . D2 . . D2 . D2 . . D2 . D2 . . .', 'G2 . G2 . . G2 . C3 . . C3 . C3 . . .') },
    { name: 'skank', wave: 'pulse12', vol: .05, notes: bass('- F4 - A4 - C5 - - F4 - A4 -', '- E4 - G4 - B4 - - E4 - G4 -', '- D4 - F4 - A4 - - D4 - F4 -', '- G4 - Bb4 - D5 - - G4 - Bb4 -') },
    { name: 'lead', wave: 'pulse', vol: .06, notes: bass('C5 . . . A4 . . . F4 . . . . . . .', 'G4 . . . B4 . . . E4 . . . . . . .', 'D5 . . . F5 . . . A4 . . . . . . .', 'C5 . . . Bb4 . . . G4 . . . . . . .') },
    { name: 'drums', wave: 'drums', vol: .07, notes: bass('k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h') },
  ] },
  // 94.8 SHORE FM: a jazz shuffle in Bb. Organ stabs, a walking-ish bass, a sax-ish lead in call and response.
  shuffle: { bpm: 110, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: bass('Bb2 . D3 . F3 . D3 . Bb2 . D3 . F3 . G3 .', 'G2 . B2 . D3 . B2 . G2 . B2 . D3 . F3 .', 'C3 . Eb3 . G3 . Eb3 . C3 . Eb3 . G3 . Bb3 .', 'F2 . A2 . C3 . A2 . F2 . A2 . C3 . Eb3 .') },
    { name: 'organ', wave: 'sine', vol: .07, notes: bass('D4 - F4 - Bb4 - D4 - - - - -', 'B3 - D4 - G4 - B3 - - - - -', 'Eb4 - G4 - C5 - Eb4 - - - - -', 'C4 - E4 - A4 - C4 - - - - -') },
    { name: 'lead', wave: 'saw', vol: .06, notes: bass('Bb4 . . D5 . C5 . Bb4 . A4 . F4 . . .', 'G4 . . B4 . A4 . G4 . F4 . D4 . . .', 'C5 . . Eb5 . D5 . C5 . Bb4 . G4 . . .', 'F4 . . A4 . G4 . F4 . E4 . C4 . . .') },
    { name: 'drums', wave: 'drums', vol: .06, notes: bass('k . . h s . . h k . k h s . . h', 'k . . h s . . h k . k h s . . h', 'k . . h s . . h k . k h s . . h', 'k . . h s . . h k . k h s . . h') },
  ] },
  // 99.1 VESPA FM: Eurobeat in A minor, fast. A saw bass in octaves, 16th arps, a bright lead.
  vendetta: { bpm: 152, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .16, notes: bass('A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 A1 A2 A1 A2', 'F1 F2 F1 F2 F1 F2 F1 F2 F1 F2 F1 F2 F1 F2 F1 F2', 'G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2 G1 G2', 'E1 E2 E1 E2 E1 E2 E1 E2 E1 E2 E1 E2 E1 E2 E1 E2') },
    { name: 'arp', wave: 'pulse12', vol: .04, notes: bass('A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5', 'F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5 F4 A4 C5 F5', 'G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5 G4 B4 D5 G5', 'E4 G#4 B4 E5 E4 G#4 B4 E5 E4 G#4 B4 E5 E4 G#4 B4 E5') },
    { name: 'lead', wave: 'square', vol: .06, notes: bass('E5 E5 . A5 . G5 . E5 . C5 . . . D5 . . .', 'A5 . C6 . B5 . A5 . F5 . . . G5 . . .', 'B5 . D6 . C6 . B5 . G5 . . . E5 . . .', 'G#5 . B5 . E6 . . . D6 . C6 . B5 . A5 .') },
    { name: 'drums', wave: 'drums', vol: .08, notes: bass('k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k k s h') },
  ] },
  // 103.5 PASTEL FM: city pop in Eb. An e-piano-ish keys line, a slap-ish bass, a sax-ish lead answered by chords.
  pastel: { bpm: 104, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: bass('Ab2 . . Ab2 . Ab2 . . C3 . Ab2 . . Eb3 .', 'G2 . . G2 . G2 . . Bb2 . G2 . . D3 .', 'F2 . . F2 . F2 . . Ab2 . F2 . . C3 .', 'Bb2 . . Bb2 . Bb2 . . F3 . Bb2 . . Ab2 .') },
    { name: 'keys', wave: 'pulse12', vol: .05, notes: bass('C4 - Eb4 - G4 - Ab4 - C4 - Eb4 - G4 -', 'Bb3 - D4 - G4 - Bb4 - Bb3 - D4 - G4 -', 'Ab3 - C4 - F4 - Ab4 - Ab3 - C4 - F4 -', 'Bb3 - D4 - F4 - Ab4 - Bb3 - D4 - F4 -') },
    { name: 'lead', wave: 'saw', vol: .06, notes: bass('Eb5 . . . G5 . F5 . Eb5 . . . C5 . . .', 'D5 . . . Bb4 . G4 . . . . . . . .', 'C5 . . . Ab4 . C5 . Eb5 . . . F5 . . .', 'G5 . . . F5 . Eb5 . D5 . . . Bb4 . . .') },
    { name: 'drums', wave: 'drums', vol: .06, notes: bass('k . . h . . s h k . . h s . h .', 'k . . h . . s h k . . h s . h .', 'k . . h . . s h k . . h s . h .', 'k . . h . . s h k . . h s . h .') },
  ] },
  // the title: a brass fanfare into a groove in C
  title: { bpm: 120, steps: 4, tracks: [
    { name: 'brass', wave: 'saw', vol: .09, notes: bass('C4 . E4 . G4 . C5 . - . . . . . . . .', 'G4 . . . F4 . . . E4 . . . D4 . . .', 'C4 . E4 . G4 . C5 . - . . . . . . .', 'A4 . . . G4 . . . C5 . . . - . . .') },
    { name: 'bass', wave: 'triangle', vol: .24, notes: bass('C2 . C2 . G2 . C2 . C2 . G2 . G2 . . .', 'C2 . C2 . G2 . C2 . C2 . G2 . G2 . . .', 'C2 . C2 . G2 . C2 . C2 . G2 . G2 . . .', 'C2 . C2 . G2 . C2 . C2 . G2 . G2 . . .') },
    { name: 'drums', wave: 'drums', vol: .07, notes: bass('k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h') },
  ] },
  // 106.3 ZEST FM (unlock): acid jazz into breakbeat in G, a rubbery bass, organ stabs in fourths
  lemon: { bpm: 140, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .16, notes: bass('G2 . G2 G3 . G2 . G2 . . G2 . G2 . . .', 'C2 . C2 C3 . C2 . C2 . . C2 . C2 . . .', 'G2 . G2 G3 . G2 . G2 . . G2 . G2 . . .', 'D2 . D2 D3 . D2 . C2 . . D2 . D2 . . .') },
    { name: 'organ', wave: 'sine', vol: .07, notes: bass('G4 C5 . G4 . C5 . G4 . . . . . . . .', 'C4 F4 . C4 . F4 . C4 . . . . . . . .', 'G4 C5 . G4 . C5 . G4 . . . . . . . .', 'D4 G4 . D4 . G4 . D4 . . . . . . . .') },
    { name: 'lead', wave: 'square', vol: .05, notes: bass('D5 . . G5 . . F5 . . . . . . . .', 'C5 . . E5 . . G5 . . . . . . . .', 'B4 . . D5 . . G5 . . . . . . . .', 'A4 . . C5 . . D5 . . . . . . . .') },
    { name: 'drums', wave: 'drums', vol: .08, notes: bass('k . s . k k s . k . s . k s s .', 'k . s . k k s . k . s . k s s .', 'k . s . k k s . k . s . k s s .', 'k . s . k k s . k . s . k s s .') },
  ] },
  // 108.8 MOON FM (unlock): a night ballad in C sharp minor, marimba arps, a soft lead with a slide
  moonflower: { bpm: 92, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .08, notes: bass('C#3 - - - - - - - E3 - - - - - - -', 'A2 - - - - - - - C#3 - - - - - - -', 'E3 - - - - - - - G#3 - - - - - - -', 'B2 - - - - - - - D#3 - - - - - - -') },
    { name: 'arps', wave: 'pulse12', vol: .04, notes: bass('C#4 E4 G#4 C#5 C#4 E4 G#4 C#5 C#4 E4 G#4 C#5 C#4 E4 G#4 C#5', 'A3 C#4 E4 A4 A3 C#4 E4 A4 A3 C#4 E4 A4 A3 C#4 E4 A4', 'E3 G#3 B3 E4 E3 G#3 B3 E4 E3 G#3 B3 E4 E3 G#3 B3 E4', 'B2 D#3 F#3 B3 B2 D#3 F#3 B3 B2 D#3 F#3 B3 B2 D#3 F#3 B3') },
    { name: 'lead', wave: 'triangle', vol: .08, notes: bass('G#5 . . . F#5 . . E5 . . . C#5 . . . .', 'E5 . . . D5 . . C#5 . . . A4 . . . .', 'B4 . . . G#4 . . B4 . . . E5 . . . .', 'D5 . . . F#5 . . B4 . . . B3 . . . .') },
    { name: 'kick', wave: 'drums', vol: .03, notes: bass('k . . . . . . . k . . . . . . .', 'k . . . . . . . k . . . . . . .', 'k . . . . . . . k . . . . . . .', 'k . . . . . . . k . . . . . . .') },
  ] },
  // the credits: a lullaby in 84 with soft bells
  lastlight: { bpm: 84, steps: 4, tracks: [
    { name: 'bells', wave: 'sine', vol: .1, notes: bass('C5 . . E5 . . G5 . . . . . . . .', 'A4 . . C5 . . E5 . . . . . . . .', 'F4 . . A4 . . C5 . . . . . . . .', 'G4 . . B4 . . D5 . . . . . . . .') },
    { name: 'pad', wave: 'triangle', vol: .1, notes: bass('C3 - - - - - - - - - - - - - - -', 'A2 - - - - - - - - - - - - - - -', 'F2 - - - - - - - - - - - - - - -', 'G2 - - - - - - - - - - - - - - -') },
  ] },
  // jingles: short songs sung once over the music (a checkpoint, a request won or lost, a goal, the game over)
  jCheckpoint: { bpm: 140, steps: 4, tracks: [{ name: 'j', wave: 'square', vol: .12, notes: 'C5 . E5 . G5 . C6 . - . . . . . . .' }] },
  jRequestOk: { bpm: 150, steps: 4, tracks: [{ name: 'j', wave: 'triangle', vol: .14, notes: 'C5 E5 G5 C6 E6 . . . . . . . . . . .' }] },
  jRequestFail: { bpm: 110, steps: 4, tracks: [{ name: 'j', wave: 'saw', vol: .08, notes: 'E4 . Eb4 . D4 . Db4 . C4 . . . . . . . .' }] },
  jGoal: { bpm: 120, steps: 4, tracks: [
    { name: 'brass', wave: 'saw', vol: .1, notes: 'C4 . E4 . G4 . C5 . - . . . . . . . | G4 . . . F4 . . . E4 . . . D4 . . . | C4 . E4 . G4 . C5 . - . . . . . . . | A4 . . . G4 . . . C5 . . . - . . .' },
    { name: 'drums', wave: 'drums', vol: .07, notes: 'k h s h k h s h k h s h k h s h | k h s h k h s h k h s h k h s h | k h s h k h s h k h s h k h s h | k h s h k h s h k h s h k h s h' }] },
  // the menus and the car: a bossa in C, nylon plucks and light bass
  garden: { bpm: 100, steps: 4, tracks: [
    { name: 'pluck', wave: 'triangle', vol: .09, notes: bass('C4 . . E4 . G4 . . . . E4 . G4 . . .', 'A3 . . C4 . E4 . . . . C4 . E4 . . .', 'F3 . . A3 . C4 . . . . A3 . C4 . . .', 'G3 . . B3 . D4 . . . . B3 . D4 . . .') },
    { name: 'bass', wave: 'triangle', vol: .2, notes: bass('C2 . . . G2 . . . C2 . . . G2 . . .', 'A1 . . . E2 . . . A1 . . . E2 . . .', 'F2 . . . C3 . . . F2 . . . C3 . . .', 'G2 . . . D3 . . . G2 . . . D3 . . .') },
    { name: 'drums', wave: 'drums', vol: .04, notes: bass('k . . h . . h . s . . h . . h .', 'k . . h . . h . s . . h . . h .', 'k . . h . . h . s . . h . . h .', 'k . . h . . h . s . . h . . h .') },
  ] },
  // the results: a light funk loop
  results: { bpm: 112, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: bass('E2 . . E2 . E2 . . G2 . E2 . . A2 . .', 'D2 . . D2 . D2 . . F2 . D2 . . G2 . .', 'C2 . . C2 . C2 . . E2 . C2 . . F2 . .', 'B1 . . B1 . B1 . . D2 . B1 . . E2 . .') },
    { name: 'stab', wave: 'pulse12', vol: .05, notes: bass('E4 . . . . . G4 . . . . . B4 . .', 'D4 . . . . . F4 . . . . . A4 . .', 'C4 . . . . . E4 . . . . . G4 . .', 'B3 . . . . . D4 . . . . . F#4 . .') },
    { name: 'drums', wave: 'drums', vol: .07, notes: bass('k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h', 'k h s h k h s h k h s h k h s h') },
  ] },
  // game over: a slow minor-blues turnaround
  sunset: { bpm: 84, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .12, notes: bass('A3 - - - C4 - - - E4 - - - A3 - - -', 'F3 - - - A3 - - - C4 - - - F3 - - -', 'E3 - - - G#3 - - - B3 - - - E3 - - -', 'D3 - - - F3 - - - A3 - - - D3 - - -') },
    { name: 'bass', wave: 'triangle', vol: .2, notes: bass('A2 . . . E2 . . . A2 . . . E2 . . .', 'F2 . . . C2 . . . F2 . . . C2 . . .', 'E2 . . . B1 . . . E2 . . . B1 . . .', 'D2 . . . A1 . . . D2 . . . A1 . . .') },
  ] },
};
// the instruments of each song's tracks (E6 presets from the engine): the voices the plan asks for, per song
const INST_OF = {
  sunburst: { bass: 'slapbass', keys: 'epiano', lead: 'steeldrum' },
  coastline: { bass: 'fingerbass', skank: 'chorusgtr', lead: 'lead' },
  shuffle: { bass: 'fingerbass', organ: 'organ', lead: 'sax' },
  vendetta: { bass: 'stab', arp: 'pluck', lead: 'lead' },
  pastel: { bass: 'slapbass', keys: 'epiano', lead: 'sax' },
  lemon: { bass: 'slapbass', organ: 'organ', lead: 'lead' },
  moonflower: { pad: 'pad', arps: 'marimba', lead: 'lead' },
  title: { brass: 'brass', bass: 'fingerbass' },
  garden: { pluck: 'pluck', bass: 'fingerbass' },
  results: { bass: 'fingerbass', stab: 'chorusgtr' },
  sunset: { pad: 'pad', bass: 'fingerbass' },
  lastlight: { bells: 'marimba', pad: 'pad' },
};
for (const [song, map] of Object.entries(INST_OF)) for (const tr of (OB.SONGS[song] || { tracks: [] }).tracks) if (map[tr.name]) tr.inst = map[tr.name];
// the sends (E6): the keys, the lead and the bells feed the delay and the reverb of the effects bus
const SEND_OF = { sunburst: { keys: { delay: .25, reverb: .3 } }, pastel: { lead: { reverb: .35 } }, moonflower: { lead: { delay: .3, reverb: .5 } }, lastlight: { bells: { delay: .2, reverb: .6 } }, coastline: { lead: { delay: .2 } } };
for (const [song, map] of Object.entries(SEND_OF)) for (const tr of OB.SONGS[song].tracks) if (map[tr.name]) tr.send = map[tr.name];
// the radio's song for each station (plan §8.10)
OB.SONG_NAMES = { sunburst: 'Sunburst Samba', coastline: 'Coastline Crush', shuffle: 'Shuffle on the Shore', vendetta: 'Vespa Vendetta', pastel: 'Pastel Highway', lemon: 'Lemon Drop Rush', moonflower: 'Moonflower', title: 'OutBloom!', garden: 'Garden Party', results: 'Petal Count', sunset: 'Sunset Blues', lastlight: 'Last Light Lullaby' };

/* ---- the music and the effects, through the engine's audio ---- */
OB.Music = {
  /** a short jingle over the music (ducking it), by its song name */
  sting(name) { if (G() && OB.SONGS[name]) G().audio.sting(OB.SONGS[name], { at: 'beat', duck: .5 }); },
  play(name, o = {}) { const s = OB.SONGS[name]; if (!s || !G()) return; G().audio.music(s, o); OB.Music.now = name; },
  stop(fade = .4) { if (G()) G().audio.stopMusic(fade); OB.Music.now = null; },
  now: null,
  /** the radio's song for station i, or the title song if none */
  station(i) { const s = OB.STATIONS[i]; return s ? s.song : 'sunburst'; },
};

/* ---- sound effects: the engine's presets, named per event (the plan's table, through what the engine has) ---- */
OB.Sfx = {
  play(name, o = {}) { if (G() && G().audio) G().audio.sfx(name, o); },
};
/** every event sound: the bus event to an effect preset */
const SFX_MAP = {
  'countdown:go': 'secret', 'checkpoint': 'oneup', 'time:low': 'blip', 'time:up': 'die', 'goal': 'coin',
  'nearmiss': 'select', 'overtake': 'blip', 'slingshot': 'warp', 'drift:start': 'whoosh', 'drift:end': 'select',
  'car:bump': 'bump', 'car:crash': 'explode', 'car:scrape': 'hit', 'air:land': 'land', 'air:start': 'jump',
  'obj:pop': 'pickup', 'obj:bonk': 'stomp', 'obj:arch': 'powerup', 'req:start': 'select', 'req:end': 'coin',
  'petals': 'pickup', 'bloom:level': 'powerup', 'fork:choose': 'select', 'fork:approach': 'pause', 'gust': 'whoosh',
  'contact': 'bump', 'stage:enter': 'door',
};
/** wire the bus to the effects (once, at boot) */
OB.wireSfx = () => {
  for (const name of Object.keys(SFX_MAP)) OB.bus.on(name, () => OB.Sfx.play(SFX_MAP[name], { vol: .6 }));
};

/* ---- voices: a line of text as syllables of babble, a pitch contour, a timed subtitle ---- */
const VOWELS = 'aeiouy';
/** the syllables of a text: a consonant onset and a vowel nucleus, punctuation as pauses */
OB.Babble = {
  plan(text, who) {
    const c = OB.CAST[who] || { f0: 240, rate: 12, wave: 'triangle' };
    const words = String(text).toLowerCase().replace(/[^a-z0-9!?.,… ']/g, ' ').split(/\s+/).filter(Boolean);
    const syl = [];
    for (const w of words) {
      let cur = '';
      for (let i = 0; i < w.length; i++) {
        cur += w[i];
        const isV = VOWELS.includes(w[i]), nextV = VOWELS.includes(w[i + 1] || 'x');
        if (isV && !nextV && i < w.length - 1) { syl.push({ t: cur, pause: 0 }); cur = ''; }
      }
      if (cur) syl.push({ t: cur, pause: 0 });
    }
    if (!syl.length) syl.push({ t: 'ah', pause: 0 });
    const rng = OB.rand.stream('babble', text.length + ':' + who), out = []; let t = 0;
    const shouted = /!/.test(text), question = /\?/.test(text);
    syl.forEach((s, i) => {
      const contour = question ? 1 + .25 * i / syl.length : 1 - .2 * i / syl.length;
      const f0 = c.f0 * contour * (1 + (rng() - .5) * .08) * (shouted ? 1.08 : 1);
      const dur = Math.max(.06, Math.min(.12, 1 / c.rate)) * (.9 + .2 * rng());
      const vowel = [...s.t].filter(ch => VOWELS.includes(ch)).pop() || 'a';
      // the vowel sets the height of the formant layer: a, e, i, o, u, y
      out.push({ t, dur, f0: Math.round(f0), vowel, hi: Math.round(f0 * (1.5 + .1 * VOWELS.indexOf(vowel))) });
      t += dur;
    });
    return { syllables: out, duration: +t.toFixed(3) };
  },
  /** say a line: the babble plays and the subtitle types; returns the duration */
  say(text, who, o = {}) {
    const p = OB.Babble.plan(text, who), c = OB.CAST[who] || { wave: 'triangle' };
    const wave = c.wave === 'pulse' ? 'pulse' : c.wave === 'saw' ? 'saw' : 'triangle';
    // two layers per syllable: the voice at its pitch, and a brighter formant layer above it (the vowel sets the height)
    if (G()) for (const s of p.syllables) G().after(s.t, () => { if (G().audio) { const v = (o.vol || .06); G().audio.sfx({ wave, freq: s.f0, to: Math.round(s.f0 * 1.08), dur: s.dur, vol: v }, { bus: 'voice' }); G().audio.sfx({ wave: 'triangle', freq: s.hi, to: Math.round(s.hi * 1.04), dur: s.dur * .8, vol: v * .4 }, { bus: 'voice' }); } });
    if (OB.Hud && OB.Hud.bubble) OB.Hud.bubble(text, who, p.duration + 1.4);
    return p.duration;
  },
};
/** a passenger's bark: a line for a key, chosen by its seed; spoken and subtitled */
OB.bark = (who, key, seed = 0) => {
  const text = OB.line(who, key, seed); if (!text) return '';
  OB.Babble.say(text, who); return text;
};
})();
