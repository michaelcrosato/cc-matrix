// ---- sound: bluegrass chiptune songs, the gunshots, the bird calls, and the gibberish cast voices (all in code) -------
// Songs are the engine's music definitions: tracks of notes with one token per step (-, . and | as in the engine).
const SONGS = {
  title: {
    bpm: 112, steps: 4,
    tracks: [
      { wave: 'pulse', vol: .09, notes: 'D4 - F#4 A4 D5 A4 F#4 A4 - | G4 - B4 D5 G5 D5 B4 D5 - | C5 - E5 G5 C6 G5 E5 G5 - | A4 - C#5 E5 A5 E5 C#5 A4 - ' },
      { wave: 'triangle', vol: .18, notes: 'D2 . D2 . A2 . A2 . | G2 . G2 . D3 . D3 . | C3 . C3 . G2 . G2 . | A2 . A2 . E2 . E2 .' },
      { wave: 'drums', vol: .16, notes: 'k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s . h .' },
    ],
  },
  hunt: {
    bpm: 128, steps: 4,
    tracks: [
      { wave: 'square', vol: .08, notes: 'A4 C5 E5 C5 A4 C5 E5 A5 | G4 B4 D5 B4 G4 B4 D5 G5 | F4 A4 C5 A4 F4 A4 C5 F5 | E4 G#4 B4 E5 B4 G#4 E4 - ' },
      { wave: 'pulse', vol: .06, notes: 'E5 - G5 - B5 - E6 - | D5 - F#5 - A5 - D6 - | C5 - E5 - G5 - C6 - | B4 - D5 - F#5 - B5 -' },
      { wave: 'triangle', vol: .2, notes: 'A2 . A2 A2 . A2 . | G2 . G2 G2 . G2 . | F2 . F2 F2 . F2 . | E2 . E2 E2 . E2 .' },
      { wave: 'drums', vol: .14, notes: 'k . s . k k s . | k . s . k . s . | k . s . k k s . | k . s s k . s s' },
    ],
  },
  bonus: {
    bpm: 152, steps: 4,
    tracks: [
      { wave: 'square', vol: .09, notes: 'G4 B4 D5 G5 D5 B4 G4 B4 | A4 C5 E5 A5 E5 C5 A4 C5 | G4 B4 D5 G5 D5 B4 G4 D5 | E4 G4 B4 E5 B4 G4 E4 B4' },
      { wave: 'triangle', vol: .2, notes: 'G2 G2 G2 G2 D2 D2 D2 D2 | A2 A2 A2 A2 E2 E2 E2 E2 | G2 G2 G2 G2 D2 D2 D2 D2 | E2 E2 E2 E2 B2 B2 B2 B2' },
      { wave: 'drums', vol: .16, notes: 'k h s h k h s h | k h s h k h s h | k h s k s h k h | k h s h k s h s' },
    ],
  },
  results: {
    bpm: 96, steps: 4,
    tracks: [
      { wave: 'triangle', vol: .2, notes: 'D3 - F#3 - A3 - D4 - | G3 - B3 - D4 - G4 - | A3 - C#4 - E4 - A4 - | D3 - F#3 - A3 - D4 -' },
      { wave: 'pulse', vol: .07, notes: 'D4 - - - F#4 - - - A4 - - - D5 - - - | B4 - - - D5 - - - G5 - - - B5 - - -' },
    ],
  },
};

// the voices: a base pitch, a wave, and a rhythm of syllables for the babble (Animalese / Simlish style)
const VOICES = {
  Dub: { f: 170, wave: 'triangle' }, 'Granny Mae': { f: 240, wave: 'pulse' }, Dwayne: { f: 130, wave: 'square' },
  Loretta: { f: 300, wave: 'pulse' }, Earl: { f: 110, wave: 'triangle' }, Hank: { f: 160, wave: 'square' },
  EMCEE: { f: 210, wave: 'square' },
};

// the babble: one blip per syllable (a vowel group), pitch wandering around the voice, with the caption's rhythm
function babble(who, text) {
  const v = VOICES[who] || VOICES.EMCEE;
  const groups = text.toLowerCase().match(/[aeiouy]+/g) || [];
  const n = Math.min(groups.length, 24);
  for (let i = 0; i < n; i++) {
    const f = v.f * (.8 + RNG.fx() * .5);
    GAME.audio.sfx({ wave: v.wave, freq: f, to: f * (RNG.fx() < .5 ? 1.3 : .75), dur: .07 + RNG.fx() * .03, vol: .09 });
  }
}

// shared sounds, each a few lines of synth
const SFX = {
  shot() { GAME.audio.sfx({ wave: 'noise', dur: .22, vol: .5 }); GAME.audio.sfx({ wave: 'triangle', freq: 110, to: 40, dur: .3, vol: .45 }); },
  pump() { GAME.audio.sfx({ wave: 'square', freq: 320, to: 160, dur: .09, vol: .22 }); },
  click() { GAME.audio.sfx({ wave: 'noise', dur: .05, vol: .2 }); },
  kill() { GAME.audio.sfx({ wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12], step: .05, dur: .3, vol: .3 }); },
  wound() { GAME.audio.sfx({ wave: 'saw', freq: 500, to: 220, dur: .2, vol: .2 }); },
  doe() { GAME.audio.sfx({ wave: 'saw', freq: 300, to: 110, dur: .5, vol: .3 }); },
  penalty() { GAME.audio.sfx({ wave: 'square', freq: 220, to: 90, dur: .35, vol: .3 }); },
  call() { GAME.audio.sfx({ wave: 'saw', freq: 'G3', to: 'G2', dur: .9, vib: [6, .05], vol: .25 }); },
  chirp() { GAME.audio.sfx({ wave: 'sine', freq: 1800 + RNG.fx() * 600, to: 2400, dur: .05, vol: .08 }); },
  ui() { GAME.audio.sfx({ wave: 'square', freq: 660, dur: .04, vol: .1 }); },
  ok() { GAME.audio.sfx({ wave: 'triangle', freq: 'E5', arp: [0, 4, 7], step: .05, dur: .15, vol: .2 }); },
};

function sfxShot() { SFX.shot(); }

// the bus handlers that turn game events into sound and captions (set up once, in 99-start.js)
function wireAudioEvents() {
  bus.on('shot', () => {});
  bus.on('pump', () => SFX.pump());
  bus.on('reload', () => SFX.click());
  bus.on('kill', e => {
    SFX.kill();
    const z = e.zone;
    const line = e.finished ? BARK.kill.finished : e.trophy ? BARK.trophy : (BARK.kill[z] || 'BUCK DOWN! NICE SHOOTING!');
    caption('EMCEE', line, 2.6);
  });
  bus.on('wound', e => { SFX.wound(); caption('EMCEE', BARK.wound, 2.2); });
  bus.on('doe', e => { SFX.doe(); caption('EMCEE', e.benched ? BARK.doe : BARK.doePenalty, 3); });
  bus.on('critter', e => {
    const sp = e.species;
    if (sp === 'bluebird') { SFX.penalty(); caption('EMCEE', BARK.bluebird, 2.8); }
    else if (sp === 'skunk') { SFX.penalty(); caption('EMCEE', BARK.skunk, 2.8); }
    else if (sp === 'bessie') { SFX.penalty(); caption('Hank', BARK.bessie, 3); }
    else if (sp === 'crow') { SFX.kill(); caption('EMCEE', BARK.crow, 2.2); }
    else if (sp === 'paper') { SFX.kill(); caption('EMCEE', 'PAPER! DEAD CENTER, SHOOTER.', 2.2); }
    else { SFX.kill(); caption('EMCEE', BARK.coon, 2.2); }
  });
  bus.on('escape', () => { caption('EMCEE', BARK.escape, 2.0); });
  bus.on('lost', () => { caption('EMCEE', BARK.lost, 2.6); });
  bus.on('call', () => { SFX.call(); });
  bus.on('segment', ({ seg, stats }) => { SFX.ok(); });
}

// a caption for the cast: the babble voice speaks it, the box shows the words
function caption(who, text, seconds = 3) {
  if (!HUNT_RUN.caption || HUNT_RUN.caption.t < .5 || who === 'EMCEE') {
    HUNT_RUN.caption = { who, text, t: seconds };
    if (who !== 'EMCEE') babble(who, text);
  }
}
