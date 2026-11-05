// Sound: every sound and song is made in code (the engine's chip synth). The effects are named voices defined at start;
// the announcers and the crowd's voices are babble (Animalese-style pitched syllables, one per letter group).
// Music: a song per scene; the title and the derby have their own, the matches a bright one, and a stinger for big moments.
BZ.define = game => {
  const A = game.audio;
  const voices = {
    crack:  { wave: 'noise', dur: .09, vol: .5 },
    crackB: { wave: 'square', freq: 520, to: 160, dur: .12, vol: .3 },
    pitch:  { wave: 'sine', freq: 320, to: 180, dur: .16, vol: .18 },
    release:{ wave: 'triangle', freq: 260, to: 540, dur: .12, vol: .2 },
    strike: { wave: 'square', freq: 880, to: 1100, dur: .08, vol: .22 },
    ball:   { wave: 'sine', freq: 420, dur: .07, vol: .16 },
    foul:   { wave: 'noise', dur: .06, vol: .26 },
    out:    { wave: 'square', freq: 360, to: 140, dur: .32, vol: .22 },
    catch:  { wave: 'triangle', freq: 660, to: 990, dur: .1, vol: .26 },
    thud:   { wave: 'sine', freq: 140, to: 60, dur: .14, vol: .34 },
    throw:  { wave: 'saw', freq: 900, to: 300, dur: .18, vol: .12 },
    rocket: { wave: 'saw', freq: 180, to: 1400, dur: .7, vol: .2 },
    fire:   { wave: 'noise', dur: .5, vol: .3 },
    tick:   { wave: 'square', freq: 1500, dur: .03, vol: .1 },
    fanfare:{ wave: 'square', freq: 660, to: 990, dur: .4, vol: .2 },
    cheer:  { wave: 'noise', dur: 1.4, vol: .22 },
    boo:    { wave: 'saw', freq: 210, to: 150, dur: .6, vol: .12 },
    select: { wave: 'square', freq: 740, dur: .05, vol: .14 },
    confirm:{ wave: 'square', freq: 990, to: 1320, dur: .08, vol: .16 },
    back:   { wave: 'square', freq: 440, to: 300, dur: .08, vol: .14 },
    dive:   { wave: 'triangle', freq: 220, to: 80, dur: .25, vol: .2 }
  };
  for (const k in voices) A.define(k, voices[k]);
};

// A short effect by name. Safe before the first key press (the engine holds sound until then).
BZ.sfx = (name, o = {}) => { const g = BZ.game; if (g && g.audio && !BZ.muted) g.audio.sfx(name, o); };

// Babble: each word becomes a few syllables, each one a short pitched blip, the pitch from the letters. It is nonsense
// on purpose, and it sounds like a voice. Plays through the game clock, so it pauses with the game.
BZ.babble = (text, o = {}) => {
  const g = BZ.game;
  if (!g || !g.audio || BZ.muted) return;
  const base = o.pitch || 240, rate = o.rate || .085;
  const words = String(text).replace(/\{[^}]*\}/g, '').split(/\s+/).filter(Boolean).slice(0, 40);
  let t = 0;
  for (const w of words) {
    const syl = Math.max(1, Math.min(4, Math.round(w.length / 3)));
    for (let i = 0; i < syl; i++) {
      const c = w.charCodeAt(Math.min(w.length - 1, i * 2)) || 65;
      const f = base * Math.pow(2, ((c % 12) - 6) / 14 + (i % 2 ? .12 : 0));
      g.after(t, () => g.audio.sfx({ wave: 'triangle', freq: f, to: f * (1.08 + (c % 3) * .03), dur: rate * 1.05, vol: o.vol || .16 }));
      t += rate;
    }
    t += rate * 1.6;
  }
  return t;
};

// The songs. Each track loops on its own tokens; steps are sixteenths per beat, so 16 tokens is one bar at 4 beats.
BZ.songs = {
  title: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .16, notes: 'C4 E4 G4 C5  G4 E4 C4 G3  A3 C4 E4 A4  G4 E4 C4 G3' },
    { wave: 'square', vol: .06, notes: 'C3 . G2 . C3 . G2 .  A2 . E2 . G2 . D2 .' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h .  k . h . s . h .' }
  ] },
  match: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .14, notes: 'G4 . B4 D5 . B4 G4 . A4 . C5 E5 . C5 A4 .' },
    { wave: 'triangle', vol: .18, notes: 'G2 G2 G3 G2 A2 A2 A3 A2 G2 G2 G3 G2 D3 D3 D2 D3' },
    { wave: 'drums', vol: .22, notes: 'k . h . s . h .  k . h k s . h .' }
  ] },
  derby: { bpm: 144, steps: 4, tracks: [
    { wave: 'saw', vol: .09, notes: 'E4 G4 B4 E5 D5 B4 G4 D4 C4 E4 G4 C5 B4 G4 E4 C4' },
    { wave: 'triangle', vol: .2, notes: 'E2 . E2 E2 B2 . B2 . C3 . C3 C3 G2 . G2 .' },
    { wave: 'drums', vol: .24, notes: 'k h s h k h s h k h s h k k s h' }
  ] },
  results: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .18, notes: 'C4 . E4 . G4 . C5 . B4 . G4 . E4 . C4 .' },
    { wave: 'square', vol: .06, notes: 'C2 . . . G2 . . . A2 . . . F2 . . .' }
  ] },
  attract: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'E4 G4 A4 G4 E4 G4 B4 G4 A4 C5 B4 A4 G4 E4 D4 E4' },
    { wave: 'triangle', vol: .16, notes: 'A2 . A2 . E2 . E2 . F2 . F2 . G2 . G2 .' },
    { wave: 'drums', vol: .16, notes: 'k . h . s . h .  k . h . s . h .' }
  ] }
};

// The music for a scene, switched only when it changes.
BZ.playSong = name => {
  const g = BZ.game;
  if (!g || !g.audio) return;
  if (BZ.songNow === name) return;
  BZ.songNow = name;
  if (!name) { g.audio.music(null); return; }
  g.audio.music(BZ.songs[name], { fade: .4 });
};
