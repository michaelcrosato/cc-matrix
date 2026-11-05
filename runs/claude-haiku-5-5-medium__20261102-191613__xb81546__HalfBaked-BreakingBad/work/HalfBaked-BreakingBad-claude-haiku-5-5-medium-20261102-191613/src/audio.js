/*
 * HALF BAKED audio: every sound and song is written in code (the engine's chip synth).
 * Speech is "animalese": each letter a speaker types blips a short tone whose pitch is
 * randomised around the speaker's own note, so the dialogue sounds like chatter, not words.
 */
(function (root) {
  'use strict';
  var HB = root.HB;

  var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  HB.noteHz = function (name) {
    var m = /^([A-G]#?)(-?\d)$/.exec(name);
    if (!m) return 440;
    var midi = (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12); // MIDI 69 is A4
  };

  // One voice per speaker. `animalese` marks it for per-letter pitch jitter.
  HB.VOICES = {
    hollis: { animalese: true, wave: 'triangle', freq: 'A3', dur: 0.05, vol: 0.16 },
    cody: { animalese: true, wave: 'square', freq: 'E4', dur: 0.04, vol: 0.09 },
    gil: { animalese: true, wave: 'pulse', freq: 'C4', dur: 0.05, vol: 0.11 },
    lupe: { animalese: true, wave: 'pulse', freq: 'G4', dur: 0.04, vol: 0.1 },
    vance: { animalese: true, wave: 'saw', freq: 'G2', dur: 0.06, vol: 0.09 },
    agent: { animalese: true, wave: 'square', freq: 'D4', dur: 0.045, vol: 0.11 },
    narrator: { animalese: true, wave: 'sine', freq: 'F4', dur: 0.04, vol: 0.07 }
  };

  // Multipliers for the per-letter pitch: a small set of "syllables" around the note.
  var JITTER = [0.84, 0.94, 1, 1.06, 1.19, 1.33];

  // Wrap the engine's sfx so animalese voices jitter each time they play.
  HB.installAnimalese = function (audio) {
    if (!audio || audio.__hbAnimalese) return;
    audio.__hbAnimalese = true;
    var orig = audio.sfx.bind(audio);
    audio.sfx = function (what, o) {
      if (what && typeof what === 'object' && what.animalese) {
        var pick = JITTER[Math.floor(Math.random() * JITTER.length)];
        var base = typeof what.freq === 'string' ? HB.noteHz(what.freq) : what.freq;
        var copy = Object.assign({}, what, { freq: base * pick });
        delete copy.animalese;
        delete copy.to; // a blip is one pitch, not a slide
        what = copy;
      }
      return orig(what, o);
    };
  };

  // Songs written as tracks of steps (one token per sixteenth at 4 steps a beat).
  HB.SONGS = {
    lab: {
      bpm: 96,
      steps: 4,
      tracks: [
        { wave: 'triangle', vol: 0.2, notes: 'A2 . A2 . E2 . E2 . F2 . F2 . G2 . G2 .' },
        { wave: 'square', vol: 0.07, notes: 'C5 - E5 - D5 - - - C5 - B4 - A4 - - -' },
        { wave: 'drums', vol: 0.5, notes: 'k . h . s . h . k . h . s . h .' }
      ]
    },
    street: {
      bpm: 104,
      steps: 4,
      tracks: [
        { wave: 'pulse', vol: 0.08, notes: 'E4 . G4 A4 . G4 E4 . D4 . E4 G4 A4 B4 A4 G4 .' },
        { wave: 'triangle', vol: 0.2, notes: 'E2 - - - A2 - - - D2 - - - G2 - - -' },
        { wave: 'drums', vol: 0.4, notes: 'k . . . s . . . k . . . s . h .' }
      ]
    }
  };

  HB.playSong = function (game, name) {
    if (!game || !game.audio) return;
    var song = HB.SONGS[name];
    if (song) game.audio.music(song, { fade: 0.6 });
    else game.audio.music(name, { fade: 0.6 });
  };

  root.HB = HB;
})(typeof globalThis !== 'undefined' ? globalThis : this);
