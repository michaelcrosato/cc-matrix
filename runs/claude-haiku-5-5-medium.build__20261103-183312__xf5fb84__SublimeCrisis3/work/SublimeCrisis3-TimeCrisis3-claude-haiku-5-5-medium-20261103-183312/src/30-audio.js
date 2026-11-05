// 30-audio.js: everything that makes sound is written in code (TASK.md): the music loops, the sound effects and the
// voices. The voices are Animalese: a blip per syllable, pitched per speaker, with no speech files. Defined once at
// boot (TC.defineSounds) on the engine's chip synth, and played through game.audio.

// The songs. Notes are tokens per step ('.' rests); drums are 'k' kick, 'h' hat, 's' snare.
TC.def('song', 'title', { bpm: 96, steps: 16, tracks: [
  { wave: 'triangle', vol: 0.30, notes: 'D4 . F4 . A4 . C5 . B4 . G4 . A4 . . | F4 . A4 . C5 . E5 . D5 . A4 . C5 . . .' },
  { wave: 'square', vol: 0.10, notes: 'D3 . . . A2 . . . F2 . . . G2 . . . ' },
  { wave: 'drums', vol: 0.20, notes: 'k . h . s . h . k . h . s . h .' },
] });
TC.def('song', 'harbor', { bpm: 112, steps: 16, tracks: [
  { wave: 'square', vol: 0.16, notes: 'E5 G5 A5 G5 E5 G5 B5 A5 G5 E5 D5 E5 G5 A5 G5 . ' },
  { wave: 'triangle', vol: 0.22, notes: 'A2 . A2 . E2 . E2 . F2 . F2 . C2 . G2 .' },
  { wave: 'drums', vol: 0.16, notes: 'k h s h k h s h k h s h k h s h' },
] });
TC.def('song', 'storm', { bpm: 124, steps: 16, tracks: [
  { wave: 'saw', vol: 0.09, notes: 'A3 . C4 . E4 . A3 . G3 . B3 . D4 . E4 .' },
  { wave: 'triangle', vol: 0.22, notes: 'A2 A2 A2 A2 G2 G2 G2 G2 F2 F2 F2 F2 E2 E2 E2 E2' },
  { wave: 'drums', vol: 0.18, notes: 'k . . k s . . k k . . k s . . .' },
] });
TC.def('song', 'dawn', { bpm: 104, steps: 16, tracks: [
  { wave: 'sine', vol: 0.25, notes: 'C5 . E5 . G5 . B4 . A4 . C5 . E5 . D5 .' },
  { wave: 'triangle', vol: 0.20, notes: 'C3 . . . G2 . . . A2 . . . F2 . . .' },
  { wave: 'drums', vol: 0.12, notes: 'k . . . h . . . k . . . h . . .' },
] });
TC.def('song', 'boss', { bpm: 150, steps: 16, tracks: [
  { wave: 'square', vol: 0.13, notes: 'E4 E4 G4 E4 A4 G4 E4 D4 E4 E4 G4 E4 B4 A4 G4 E4' },
  { wave: 'saw', vol: 0.10, notes: 'E2 . E2 . E2 . E2 . D2 . D2 . C2 . B1 .' },
  { wave: 'drums', vol: 0.24, notes: 'k k s k k k s k k k s k k s s k' },
] });
TC.def('song', 'range', { bpm: 92, steps: 16, tracks: [
  { wave: 'triangle', vol: 0.22, notes: 'C4 . E4 . G4 . E4 . A4 . G4 . E4 . C4 .' },
  { wave: 'drums', vol: 0.10, notes: 'k . . . h . . . k . . . h . . .' },
] });
TC.def('song', 'results', { bpm: 120, steps: 8, tracks: [
  { wave: 'square', vol: 0.18, notes: 'C5 E5 G5 C6 . G5 E5 C5' },
  { wave: 'triangle', vol: 0.20, notes: 'C3 . G2 . A2 . F2 .' },
] });

// The voices of the cast: Animalese pitch per speaker, and the wave their blips use.
TC.def('speaker', 'kai', { name: 'KAI', color: '#e8443a', pitch: 310, wave: 'square', pitchVar: 0.28 });
TC.def('speaker', 'mari', { name: 'MARI', color: '#3aa0e8', pitch: 380, wave: 'triangle', pitchVar: 0.22 });
TC.def('speaker', 'juno', { name: 'JUNO', color: '#ffd36a', pitch: 430, wave: 'sine', pitchVar: 0.18 });
TC.def('speaker', 'krake', { name: 'ADMIRAL KRAKE', color: '#b8242b', pitch: 170, wave: 'saw', pitchVar: 0.12 });
TC.def('speaker', 'radio', { name: 'CREST RADIO', color: '#9fe3ff', pitch: 260, wave: 'square', pitchVar: 0.25 });
TC.def('speaker', 'festival', { name: 'FESTIVAL', color: '#ff9ac2', pitch: 340, wave: 'triangle', pitchVar: 0.3 });
TC.def('speaker', 'deckhand', { name: 'BLACK CURRENT', color: '#9aa6c2', pitch: 220, wave: 'saw', pitchVar: 0.2 });

// The sound effects, as engine voices (plan 5.12). Registered once; the names are used everywhere.
TC.SFX = {
  shot: { wave: 'square', freq: 520, to: 140, dur: 0.07, vol: 0.5 },
  shotAuto: { wave: 'square', freq: 460, to: 120, dur: 0.05, vol: 0.35 },
  mg: { wave: 'saw', freq: 380, to: 160, dur: 0.05, vol: 0.32 },
  shotgun: { wave: 'noise', freq: 900, to: 90, dur: 0.22, vol: 0.55 },
  gl: { wave: 'saw', freq: 180, to: 60, dur: 0.35, vol: 0.4 },
  explode: { wave: 'noise', freq: 320, to: 40, dur: 0.6, vol: 0.7 },
  hit: { wave: 'triangle', freq: 880, to: 440, dur: 0.09, vol: 0.4 },
  head: { wave: 'triangle', freq: 1320, to: 660, dur: 0.12, vol: 0.5, arp: [0, 7] },
  kill: { wave: 'square', freq: 660, to: 330, dur: 0.18, vol: 0.4, arp: [0, 5, 12] },
  impact: { wave: 'noise', freq: 2400, to: 900, dur: 0.05, vol: 0.2 },
  ping: { wave: 'sine', freq: 1900, to: 1200, dur: 0.12, vol: 0.25 },
  threat: { wave: 'square', freq: 1400, to: 1400, dur: 0.05, vol: 0.18 },
  tick: { wave: 'square', freq: 1700, to: 1700, dur: 0.03, vol: 0.2 },
  chirp: { wave: 'square', freq: 2200, to: 2600, dur: 0.07, vol: 0.4 },
  hurt: { wave: 'saw', freq: 240, to: 90, dur: 0.3, vol: 0.5 },
  reload: { wave: 'square', freq: 700, to: 900, dur: 0.12, vol: 0.3, arp: [0, 4] },
  reloaded: { wave: 'square', freq: 900, to: 1200, dur: 0.1, vol: 0.3, arp: [0, 7] },
  switch: { wave: 'triangle', freq: 600, to: 800, dur: 0.06, vol: 0.3 },
  empty: { wave: 'square', freq: 220, to: 200, dur: 0.06, vol: 0.3 },
  pickup: { wave: 'square', freq: 660, to: 990, dur: 0.14, vol: 0.35, arp: [0, 4, 7] },
  ring: { wave: 'triangle', freq: 880, to: 1760, dur: 0.3, vol: 0.45, arp: [0, 4, 7, 12] },
  intel: { wave: 'sine', freq: 740, to: 1100, dur: 0.25, vol: 0.4, arp: [0, 5, 9] },
  civilian: { wave: 'saw', freq: 300, to: 150, dur: 0.4, vol: 0.5 },
  timeup: { wave: 'saw', freq: 200, to: 60, dur: 0.9, vol: 0.5 },
  extend: { wave: 'square', freq: 880, to: 1320, dur: 0.2, vol: 0.4, arp: [0, 7] },
  clear: { wave: 'square', freq: 520, to: 1040, dur: 0.4, vol: 0.4, arp: [0, 4, 7, 12] },
  gameover: { wave: 'saw', freq: 330, to: 110, dur: 1.2, vol: 0.5 },
  cont: { wave: 'square', freq: 500, to: 800, dur: 0.1, vol: 0.4, arp: [0, 7] },
  cursor: { wave: 'square', freq: 1000, to: 1000, dur: 0.03, vol: 0.2 },
  pick: { wave: 'square', freq: 700, to: 1100, dur: 0.07, vol: 0.3, arp: [0, 5] },
  back: { wave: 'triangle', freq: 500, to: 300, dur: 0.07, vol: 0.3 },
  boom: { wave: 'noise', freq: 200, to: 30, dur: 1.0, vol: 0.8 },
  bark: { wave: 'square', freq: 260, to: 180, dur: 0.08, vol: 0.3 },
  flare: { wave: 'noise', freq: 4000, to: 3000, dur: 0.03, vol: 0.25 },
  lob: { wave: 'sine', freq: 300, to: 500, dur: 0.4, vol: 0.2 },
  stomp: { wave: 'noise', freq: 120, to: 60, dur: 0.12, vol: 0.5 },
  wave: { wave: 'sine', freq: 90, to: 60, dur: 0.6, vol: 0.2 },
};

// Register every sound with the engine, once.
TC.defineSounds = function (game) {
  for (const [name, v] of Object.entries(TC.SFX)) game.audio.define('tc-' + name, v);
  game.audio.define('tc-voice-blip', { wave: 'square', freq: 300, to: 300, dur: 0.05, vol: 0.2 });
};

// Play a named sound (the names are the keys of TC.SFX; a pitch spread keeps repeats from sounding copied).
TC.sfx = function (game, name, o = {}) {
  if (!game || !game.audio || !TC.SFX[name]) return;
  game.audio.sfx('tc-' + name, Object.assign({ vary: 0.04 }, o));
};

// Animalese: say a line in a speaker's voice. Each word becomes blips, one per syllable (a vowel group), with a pitch
// that moves a little for each. The sound is code-only, and the text is shown as subtitles beside it.
TC.animalese = function (game, speakerId, text, rng) {
  if (!game || !game.audio) return 0;
  const sp = TC.get('speaker', speakerId);
  const r0 = rng || Math.random;
  const words = text.replace(/[^A-Za-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  let delay = 0;
  for (const w of words) {
    const vowels = (w.match(/[aeiouy]+/gi) || []).length;
    const syl = Math.max(1, Math.min(4, vowels || Math.ceil(w.length / 3)));
    for (let s = 0; s < syl; s++) {
      const r = r0();
      const f = sp.pitch * (1 + (r - 0.5) * sp.pitchVar * 2) * (s % 2 ? 1.08 : 1);
      const voice = { wave: sp.wave, freq: Math.round(f), to: Math.round(f * (0.9 + r * 0.25)), dur: 0.06 + r * 0.03, vol: 0.22 };
      const at = delay;
      game.after(at, () => game.audio.sfx(voice, { vary: 0.02 }));
      delay += 0.075;
    }
    delay += 0.04;
  }
  return delay;
};
