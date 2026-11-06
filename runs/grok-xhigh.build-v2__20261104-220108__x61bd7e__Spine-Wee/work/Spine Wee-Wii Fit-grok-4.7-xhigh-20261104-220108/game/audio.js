/* Songs, effects, and Animalese voices. No audio files. Track volumes stay normal. */
var G = G || {};
(function () {
  'use strict';
  const E = My3D2dge;
  const bar = (s) => s;
  function song(bpm, a, b, d) {
    return { bpm: bpm, steps: 4, loop: true, tracks: [
      { wave: 'triangle', vol: .16, notes: a },
      { wave: 'sine', vol: .12, notes: b || a },
      d ? { wave: 'drums', vol: .14, notes: d } : { wave: 'sine', vol: .08, notes: b || a }
    ] };
  }
  const A = 'C5 E5 G5 E5 A4 C5 E5 C5 | D5 F5 A5 F5 G4 B4 D5 B4';
  const B = 'C4 . G3 . A3 . E3 . | F3 . C4 . G3 . D4 .';
  const DR = 'k . h . s . h . | k . h s . h . .';
  G.SONGS = {
    studio: song(86, 'E5 G5 A5 G5 D5 E5 G5 E5 | C5 E5 G5 E5 B4 D5 E5 D5', 'A3 . E3 . G3 . D3 . | A3 . E3 . G3 . B3 .', 'k . . h . . s . | k . h . . . s .'),
    island: song(96, 'G5 A5 C6 A5 E5 G5 A5 G5 | F5 G5 A5 G5 D5 F5 G5 F5', 'C4 . G3 . A3 . E3 . | D4 . A3 . B3 . G3 .', DR),
    dusk: song(78, 'A4 C5 E5 C5 G4 A4 C5 A4 | F4 A4 C5 A4 E4 G4 A4 G4', 'A3 . E3 . F3 . C3 . | D3 . A2 . E3 . C3 .'),
    yoga: song(72, 'D5 F5 A5 F5 C5 D5 F5 D5 | E5 G5 B5 G5 D5 E5 G5 E5', 'D3 . A2 . B2 . F#3 . | C3 . G2 . A2 . E3 .'),
    iron: song(100, 'C5 . G4 . A4 . E4 . | F4 . C5 . D5 . G4 .', 'C3 C3 G2 . A2 A2 E3 . | F2 F2 C3 . G2 . G2 .', 'k . s . k . s . | k k s . h . s .'),
    stepA: { bpm: 100, steps: 4, loop: false, len: 256, tracks: [
      { wave: 'triangle', vol: .18, notes: 'C5 E5 G5 E5 C5 E5 A5 G5 | D5 F5 A5 F5 D5 F5 G5 F5' },
      { wave: 'sine', vol: .1, notes: 'C3 . G3 . A3 . E3 . | D3 . A3 . G3 . D3 .' },
      { wave: 'drums', vol: .2, notes: 'k . h . s . h . | k . h . s . h .' }
    ] },
    stepB: { bpm: 120, steps: 4, loop: false, len: 224, tracks: [
      { wave: 'triangle', vol: .18, notes: 'E5 G5 B5 G5 E5 G5 C6 B5 | A5 C6 E6 C6 A5 C6 D6 C6' },
      { wave: 'sine', vol: .1, notes: 'E3 . B3 . C4 . G3 . | A3 . E4 . D4 . A3 .' },
      { wave: 'drums', vol: .22, notes: 'k . h s k . h s | k h s . k . s h' }
    ] },
    jog: song(128, 'E5 . G5 . A5 . G5 E5 | D5 . F5 . G5 . E5 D5', 'E3 . . E3 A3 . . G3 | D3 . . D3 G3 . . E3', 'k . h k s . h . | k . s h k . h s'),
    ski: song(132, 'G5 B5 D6 B5 G5 A5 B5 G5 | E5 G5 B5 G5 D5 E5 G5 E5', 'G3 . D4 . E4 . B3 . | C4 . G3 . A3 . D3 .', 'k h s . k h s . | k . s h k h s .'),
    tray: song(84, 'A4 C5 E5 G5 E5 C5 A4 G4 | F4 A4 C5 E5 C5 A4 G4 F4', 'A2 . E3 . G3 . D3 . | F2 . C3 . E3 . C3 .'),
    laundry: song(110, 'C6 . E5 . G5 . E5 . | A5 . F5 . G5 . E5 .', 'C4 . G3 . E3 . G3 . | F3 . C4 . D4 . G3 .', 'k . . s . h . . | k . s . h . s .'),
    festival: song(118, 'C5 E5 G5 C6 G5 E5 C5 G5 | A4 C5 E5 A5 E5 C5 A4 E5', 'C3 G3 C4 G3 A2 E3 A3 E3 | F3 C4 F3 C4 G3 D4 G3 D4', DR),
    ending: song(70, 'G4 B4 D5 G5 D5 B4 G4 D5 | E4 G4 B4 E5 B4 G4 E4 B4', 'G2 . D3 . E3 . C3 . | A2 . E3 . G3 . D3 .')
  };
  G.STINGS = {
    star1: { bpm: 120, steps: 4, len: 8, tracks: [{ wave: 'triangle', vol: .2, notes: 'C5 E5 G5 C6' }] },
    star2: { bpm: 120, steps: 4, len: 8, tracks: [{ wave: 'triangle', vol: .22, notes: 'E5 G5 B5 E6' }] },
    star3: { bpm: 132, steps: 4, len: 12, tracks: [{ wave: 'triangle', vol: .24, notes: 'C5 E5 G5 C6 E6 G6' }] },
    unlock: { bpm: 110, steps: 4, len: 8, tracks: [{ wave: 'sine', vol: .2, notes: 'G5 B5 D6 G6' }] },
    day: { bpm: 90, steps: 4, len: 8, tracks: [{ wave: 'triangle', vol: .18, notes: 'A4 C5 E5 A5' }] }
  };
  const VOICES = {
    Tare: { f: 680, speed: 1.35, wave: 'triangle', vib: 8 },
    Birch: { f: 140, speed: .7, wave: 'sine', vib: 3 },
    Alder: { f: 320, speed: 1.1, wave: 'triangle', vib: 5 },
    Gertrude: { f: 240, speed: .8, wave: 'sine', vib: 9 },
    Dennis: { f: 180, speed: 1, wave: 'square', vib: 2 },
    Marisol: { f: 420, speed: 1.2, wave: 'triangle', vib: 4 },
    'Young Kevin': { f: 200, speed: 1, wave: 'sine', vib: 3 },
    'Mr. Okafor': { f: 160, speed: .95, wave: 'square', vib: 2 },
    Lou: { f: 110, speed: .6, wave: 'sine', vib: 2 },
    Twin: { f: 360, speed: 1.15, wave: 'triangle', vib: 4 },
    You: { f: 260, speed: 1, wave: 'sine', vib: 3 }
  };
  function pitchOf(ch) {
    const c = (ch || 'a').toLowerCase();
    const vowels = 'aeiou';
    const base = vowels.indexOf(c) >= 0 ? 1.15 : .72;
    const n = (c.charCodeAt(0) || 97) - 96;
    return { mul: base * (0.85 + (n % 7) * 0.06), open: vowels.indexOf(c) >= 0, skip: !/[a-z0-9]/i.test(c) };
  }
  /* G.babble(name, ch, ctx) sounds one letter. A passed context is used as-is (an offline render). */
  G.babble = function (name, ch, ctx) {
    const info = pitchOf(ch);
    if (info.skip) return null;
    const v = VOICES[name] || VOICES.Tare;
    const ac = ctx || (G.game && G.game.audio && G.game.audio.ctx);
    if (!ac) return null;
    let dest = ac.destination;
    if (!ctx && G.game && G.game.audio && G.game.audio.bus) {
      const bus = G.game.audio.bus('voice');
      if (bus) dest = bus;
    }
    const t = ac.currentTime || 0;
    const dur = (info.open ? .09 : .055) / v.speed;
    const osc = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = v.wave === 'square' ? 'square' : v.wave === 'sine' ? 'sine' : 'triangle';
    const f = v.f * info.mul;
    osc.frequency.setValueAtTime(f, t);
    if (osc.frequency.linearRampToValueAtTime) osc.frequency.linearRampToValueAtTime(f * (1 + v.vib / 400), t + dur);
    filter.type = 'bandpass';
    filter.frequency.value = info.open ? 1400 : 900;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(info.open ? 0.2 : 0.12, t + .012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter); filter.connect(gain); gain.connect(dest);
    osc.start(t); osc.stop(t + dur + .02);
    return osc;
  };
  G.installAudio = function (game) {
    const A = game.audio;
    const sfx = {
      boop: { wave: 'sine', freq: 520, to: 780, dur: .12, vol: .25 },
      creak: { wave: 'triangle', freq: 180, to: 90, dur: .18, vol: .18 },
      chime: { wave: 'sine', freq: 880, to: 1320, dur: .2, vol: .12 },
      stumble: { wave: 'square', freq: 140, to: 60, dur: .22, vol: .2 },
      clink: { wave: 'sine', freq: 1400, to: 600, dur: .08, vol: .22 },
      gull: { wave: 'saw', freq: 700, to: 1100, dur: .16, vol: .1 },
      flurry: { wave: 'noise', freq: 900, dur: .12, vol: .12 },
      flame: { wave: 'noise', freq: 400, dur: .06, vol: .08 },
      hoop: { wave: 'triangle', freq: 240, dur: .05, vol: .08 },
      carve: { wave: 'noise', freq: 300, dur: .1, vol: .1 },
      tray: { wave: 'sine', freq: 500, to: 300, dur: .07, vol: .14 },
      plop: { wave: 'sine', freq: 220, to: 120, dur: .1, vol: .2 },
      rope: { wave: 'triangle', freq: 160, to: 110, dur: .14, vol: .14 },
      stamp: { wave: 'square', freq: 440, to: 880, dur: .1, vol: .18 },
      tick: { wave: 'square', freq: 900, dur: .03, vol: .12 },
      confirm: { wave: 'triangle', freq: 660, to: 880, dur: .08, vol: .16 },
      select: { wave: 'sine', freq: 740, dur: .04, vol: .1 },
      pause: { wave: 'triangle', freq: 400, to: 240, dur: .1, vol: .14 }
    };
    for (const k in sfx) A.define(k, sfx[k]);
    G.playSong = function (name) {
      const s = G.SONGS[name] || G.SONGS.studio;
      try { A.music(s, { restart: true, loop: s.loop !== false }); } catch (e) { /* headless clock still advances */ }
    };
    G.sting = function (name) {
      const s = G.STINGS[name]; if (!s) return;
      try { A.sting(s); } catch (e) { /* no context yet */ }
    };
  };
  void bar; void E;
})();
