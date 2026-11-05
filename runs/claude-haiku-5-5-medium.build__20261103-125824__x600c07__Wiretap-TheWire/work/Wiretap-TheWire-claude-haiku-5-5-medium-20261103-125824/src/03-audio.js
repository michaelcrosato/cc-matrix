// Audio, all written in code (PLAN §11): two music beds, custom effects and gibberish voice profiles.
const SONGS = {
  // a slow minor pulse for the title and the attract reel
  title: {
    bpm: 66, steps: 4, tracks: [
      { name: 'pad', wave: 'triangle', vol: .10, notes: 'D3 - - - - - - - F3 - - - - - - - A2 - - - - - - - C3 - - - - - - - ' },
      { name: 'bass', wave: 'sine', vol: .12, notes: 'D2 . . . . . . . A1 . . . . . . . Bb1 . . . . . . . C2 . . . . . . . ' },
      { name: 'tick', wave: 'drums', vol: .18, notes: 'h . . . h . . . h . . . h . . . ' },
    ],
  },
  // the field: a wire-tapped street, sparse and watchful
  field: {
    bpm: 84, steps: 4, tracks: [
      { name: 'low', wave: 'triangle', vol: .09, notes: 'E2 - - - - - - - E2 - - - - - - - G2 - - - - - - - F#2 - - - - - - - ' },
      { name: 'mel', wave: 'square', vol: .04, notes: 'B4 . . E5 . . . . . . D5 . . . . . . . . G4 . . . . . . . ' },
      { name: 'kit', wave: 'drums', vol: .16, notes: 'k . h . s . h . k . h . s . h h ' },
    ],
  },
};

function defineSounds(game) {
  const A = game.audio;
  A.define('shutter', { wave: 'noise', dur: .06, vol: .35 });
  A.define('shutterClick', { wave: 'square', freq: 1600, to: 500, dur: .05, vol: .25 });
  A.define('made', { wave: 'sine', freq: 880, to: 1320, dur: .6, vol: .25, vib: [6, .05] });
  A.define('stamp', { wave: 'noise', dur: .03, vol: .2 });
  A.define('heat', { wave: 'saw', freq: 220, to: 140, dur: .35, vol: .18 });
  A.define('vDana', { wave: 'square', freq: 330, to: 300, dur: .04, vol: .05 });
  A.define('vLou', { wave: 'saw', freq: 170, to: 150, dur: .05, vol: .05 });
  A.define('vTee', { wave: 'triangle', freq: 260, to: 240, dur: .045, vol: .07 });
  A.define('vPockets', { wave: 'pulse', freq: 210, to: 190, dur: .04, vol: .05 });
  A.define('vHal', { wave: 'sine', freq: 190, to: 170, dur: .05, vol: .08 });
}

// The voice profile for a speaker (the blip each letter makes; an Animalese-style gibberish voice).
const VOICE_OF = { dana: 'vDana', lou: 'vLou', tee: 'vTee', pockets: 'vPockets', hal: 'vHal' };
