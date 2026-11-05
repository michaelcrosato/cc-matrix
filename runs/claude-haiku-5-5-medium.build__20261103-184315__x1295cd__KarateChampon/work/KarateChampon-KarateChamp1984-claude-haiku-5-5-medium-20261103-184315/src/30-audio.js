// ---------------------------------------------------------------- sound: sound effects, the music and the gibberish voices (all made in code)
KC.Audio = {};
const A = KC.Audio; KC.A = A;

// songs: the engine's sequencer format { bpm, steps, tracks: [{ wave, vol, notes }] }
A.songs = {
  title: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: 0.14, notes: 'D5 - F5 - A5 - D6 - C6 - A5 - F5 - D5 | Bb4 - D5 - F5 - A5 - G5 - F5 - D5 - C5' },
    { wave: 'triangle', vol: 0.2, notes: 'D3 . D3 . A2 . A2 . Bb2 . Bb2 . A2 . A2 .' },
    { wave: 'drums', vol: 0.3, notes: 'k . h s h . k . h s h . h s k .' }] },
  dojo: { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse12', vol: 0.12, notes: 'D4 . F4 . A4 . G4 . E4 . D4 . A3 . . | D4 . F4 . A4 . C5 . Bb4 . A4 . G4 . .' },
    { wave: 'drums', vol: 0.22, notes: 'k . . . s . . . k . . . s . . .' }] },
  harbor: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'G4 - B4 - D5 - G5 | E5 - D5 - B4 - G4 | A4 - C5 - E5 - A5 | G5 - E5 - D5 - B4' },
    { wave: 'triangle', vol: 0.18, notes: 'G2 . G2 . D2 . D2 . E2 . E2 . D2 . D2 .' },
    { wave: 'drums', vol: 0.2, notes: 'k h s h k h s h' }] },
  bamboo: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: 0.14, notes: 'A4 - - C5 - - E5 - - | D5 - - B4 - - - - | G4 - - A4 - - - - | E4 - - D4 - - - -' },
    { wave: 'drums', vol: 0.12, notes: 'h . . . h . . .' }] },
  gorge: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: 0.12, notes: 'E4 E4 E4 E4 E4 E4 E4 E4 | C4 C4 C4 C4 C4 C4 B3 B3' },
    { wave: 'drums', vol: 0.22, notes: 'k . k . s . k .' }] },
  ship: { bpm: 110, steps: 3, tracks: [
    { wave: 'square', vol: 0.12, notes: 'D5 - A4 | F5 - D5 | E5 - C5 | D5 - A4' },
    { wave: 'triangle', vol: 0.16, notes: 'D3 . . A2 . . D3 . . A2 . .' }] },
  market: { bpm: 124, steps: 4, tracks: [
    { wave: 'sine', vol: 0.14, notes: 'E5 - G5 - A5 - G5 | E5 - D5 - E5 - G5 | A5 - C6 - B5 - A5 | G5 - E5 - D5 - . ' },
    { wave: 'drums', vol: 0.22, notes: 'k h s h k h s h' }] },
  fuji: { bpm: 100, steps: 4, tracks: [
    { wave: 'square', vol: 0.1, notes: 'C4 E4 G4 C5 A4 E4 G4 C5 | F4 A4 C5 F5 D5 A4 C5 F5' },
    { wave: 'triangle', vol: 0.18, notes: 'C3 - - - F3 - - - G3 - - - C3 - - -' }] },
  stadium: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'C5 E5 G5 C6 B5 G5 E5 C5 | D5 F5 A5 D6 C6 A5 F5 D5' },
    { wave: 'saw', vol: 0.07, notes: 'C3 C3 G2 G2 A2 A2 F2 F2' },
    { wave: 'drums', vol: 0.28, notes: 'k s k s k s k s' }] },
  bonus: { bpm: 160, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'E5 . G5 . E5 . C5 . D5 . F5 . A4 .' },
    { wave: 'drums', vol: 0.2, notes: 'k h k h k h k h' }] },
  practice: { bpm: 90, steps: 4, tracks: [
    { wave: 'pulse12', vol: 0.1, notes: 'D4 . . . F4 . . . A4 . . . G4 . . .' }] },
  select: { bpm: 128, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'G4 . B4 . D5 . G5 . F5 . D5 . B4 .' },
    { wave: 'drums', vol: 0.18, notes: 'k . h . k . h .' }] },
  continue: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'A4 A4 A4 A4 C5 C5 C5 C5 E5 E5 E5 E5 D5 D5 D5 D5' }] },
  gameover: { bpm: 80, steps: 4, tracks: [
    { wave: 'triangle', vol: 0.16, notes: 'E4 - D4 - C4 - B3 - A3 - - - -' }], loop: false },
  ending: { bpm: 104, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'D5 - A4 - D5 - F5 - A5 - G5 - F5 - D5 -' },
    { wave: 'triangle', vol: 0.18, notes: 'D3 . A2 . D3 . F3 . G3 . F3 . D3 .' }] },
  stingPromote: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: 0.14, notes: 'C5 E5 G5 C6 G5 C6 E6 C6' }], loop: false }
};
// the stage's music id -> song
A.musicFor = (id) => A.songs[id] ? id : 'dojo';

// the sound effects, named for the sim's events
A.defineAll = (audio) => {
  if (!audio || A.defined) return;
  A.defined = true;
  audio.define('whoosh', { wave: 'noise', freq: 900, to: 300, dur: 0.12, vol: 0.10 });
  audio.define('whooshH', { wave: 'noise', freq: 1600, to: 500, dur: 0.16, vol: 0.12 });
  audio.define('thwackHalf', { wave: 'noise', freq: 600, to: 120, dur: 0.12, vol: 0.28 });
  audio.define('thwackFull', { wave: 'saw', freq: 240, to: 60, dur: 0.22, vol: 0.34 });
  audio.define('clack', { wave: 'pulse', freq: 1400, to: 900, dur: 0.05, vol: 0.2 });
  audio.define('thud', { wave: 'sine', freq: 120, to: 40, dur: 0.3, vol: 0.4 });
  audio.define('flagSnap', { wave: 'square', freq: 800, to: 400, dur: 0.06, vol: 0.18 });
  audio.define('whistle', { wave: 'sine', freq: 2500, to: 2600, dur: 0.6, vol: 0.18, vib: [6, 0.03] });
  audio.define('gong', { wave: 'sine', freq: 180, to: 90, dur: 1.2, vol: 0.32 });
  audio.define('taiko', { wave: 'sine', freq: 90, to: 50, dur: 0.25, vol: 0.45 });
  audio.define('crowdOoh', { wave: 'triangle', freq: 320, to: 420, dur: 0.5, vol: 0.12 });
  audio.define('crowdCheer', { wave: 'noise', freq: 1200, to: 900, dur: 0.9, vol: 0.14 });
  audio.define('boardCrack', { wave: 'noise', freq: 2000, to: 300, dur: 0.18, vol: 0.4 });
  audio.define('potShatter', { wave: 'noise', freq: 2400, to: 900, dur: 0.22, vol: 0.32 });
  audio.define('bowlDing', { wave: 'sine', freq: 1320, to: 1200, dur: 0.5, vol: 0.2 });
  audio.define('bowlSplash', { wave: 'noise', freq: 800, to: 200, dur: 0.4, vol: 0.25 });
  audio.define('bullSnort', { wave: 'saw', freq: 110, to: 70, dur: 0.5, vol: 0.3 });
  audio.define('bullStomp', { wave: 'sine', freq: 80, to: 40, dur: 0.25, vol: 0.45 });
  audio.define('bullBellow', { wave: 'saw', freq: 90, to: 60, dur: 0.8, vol: 0.3 });
  audio.define('dizzy', { wave: 'triangle', freq: 1500, to: 1500, dur: 0.4, vol: 0.14, arp: [0, 7, 12], step: 0.07 });
  audio.define('perfect', { wave: 'square', freq: 660, to: 990, dur: 0.3, vol: 0.2, arp: [0, 4, 7], step: 0.08 });
  audio.define('kiai', { wave: 'saw', freq: 300, to: 180, dur: 0.22, vol: 0.2 });
  audio.define('countBeep', { wave: 'square', freq: 880, dur: 0.08, vol: 0.14 });
  audio.define('scoreTick', { wave: 'square', freq: 1200, dur: 0.03, vol: 0.1 });
  audio.define('beltTie', { wave: 'triangle', freq: 500, to: 900, dur: 0.25, vol: 0.2 });
  audio.define('menuMove', { wave: 'square', freq: 700, dur: 0.03, vol: 0.08 });
  audio.define('menuOk', { wave: 'square', freq: 520, to: 780, dur: 0.1, vol: 0.12 });
  audio.define('menuBack', { wave: 'square', freq: 360, to: 200, dur: 0.1, vol: 0.12 });
  audio.define('gull', { wave: 'sine', freq: 2000, to: 2400, dur: 0.2, vol: 0.06 });
  audio.define('steamHiss', { wave: 'noise', freq: 3000, to: 2000, dur: 0.5, vol: 0.06 });
  audio.define('cameraFlash', { wave: 'square', freq: 3000, to: 3000, dur: 0.03, vol: 0.12 });
};
A.sfx = (game, name, o) => { try { if (game && game.audio && game.audio.ready !== undefined && !KC.TOGGLES.mute) game.audio.sfx(name, o); } catch (e) { } };
A.music = (game, id, o) => {
  if (!game || !game.audio) return;
  const song = A.songs[id] || A.songs.dojo;
  game.audio.music(KC.TOGGLES.mute ? null : song, Object.assign({ loop: song.loop !== false }, o || {}));
};

// ---------------------------------------------------------------- the gibberish voices (Animalese / Simlish style, 6, 6.2 voice column)
// speak(line, who): a line's syllables, deterministic per line; returns the seconds it takes, which drives dialog timing.
A.syllables = (line) => {
  const s = String(line).toUpperCase().replace(/[^A-Z]/g, '');
  const out = [];
  let h = KC.hash(line);
  const vowels = 'AEIOU';
  for (let i = 0; i < s.length; i += 1 + ((h >>> (i % 16)) & 1)) {
    const c = s[i], v = s[i + 1] && vowels.includes(s[i + 1]) ? s[i + 1] : vowels[(s.charCodeAt(i) + i) % 5];
    out.push({ c, v, cls: 'SHTFPKGBDMNLRWYJZ'.includes(c) ? (('PKTBG'.includes(c)) ? 'plosive' : 'fricative') : 'none' });
    if (out.length > 24) break;
  }
  return out.length ? out : [{ c: 'A', v: 'a', cls: 'none' }];
};
A.F = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [450, 800], u: [325, 700] };
A.speak = (game, line, who, o = {}) => {
  const prof = (KC.DATA.roster[who] && KC.DATA.roster[who].voice) || { f0: 180, formant: 1, rate: 14, wave: 'pulse', rough: 0 };
  const syl = A.syllables(line);
  const rate = o.rate || prof.rate;
  const dur = Math.max(0.35, syl.length / rate + 0.15);
  const ctx = game && game.audio && game.audio.ctx;
  if (!ctx || KC.TOGGLES.mute || !game.audio.ready) return dur;
  const t0 = ctx.currentTime + 0.02;
  const vol = (game.audio.voiceVolume !== undefined ? game.audio.voiceVolume : 0.5) * 0.25;
  syl.forEach((s, i) => {
    const t = t0 + i / rate;
    const f0 = prof.f0 * (1 + ((KC.hash(s.c + s.v + i) % 7) - 3) * 0.02);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = prof.wave === 'saw' ? 'sawtooth' : prof.wave === 'tri' ? 'triangle' : prof.wave === 'square' ? 'square' : 'sawtooth';
    osc.frequency.value = f0;
    const [f1, f2] = A.F[s.v.toLowerCase()] || [700, 1200];
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f1 * prof.formant; bp.Q.value = 4;
    const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = f2 * prof.formant; bp2.Q.value = 6;
    const mix = ctx.createGain(); mix.gain.value = 0.7;
    osc.connect(bp); osc.connect(bp2); bp.connect(mix); bp2.connect(mix); mix.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.linearRampToValueAtTime(0, t + 0.12);
    osc.start(t); osc.stop(t + 0.14);
  });
  return dur;
};
// the referee's calls: slower and louder, with the stress set per call
A.callSyllables = { begin: 3, stop: 2, white: 2, red: 2, half: 3, full: 3, nopoint: 3, aiuchi: 3, time: 2, judges: 3, whiteWins: 4, redWins: 4, bow: 2, decide: 4, matchPoint: 4, forfeit: 3 };
