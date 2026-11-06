// Willy Fit — all audio from code: songs, sfx, Animalese babble. Music defaults to 10%.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  function song(bpm, tracks, name) { return { bpm: bpm, steps: 4, tracks: tracks, name: name }; }
  G.SONGS = {
    studio: song(84, [{ wave: 'sine', vol: 0.20, notes: 'C4 - E4 - G4 - E4 - | A3 - C4 - E4 - C4 -' }, { wave: 'triangle', vol: 0.14, notes: 'C3 - - - G2 - - - | F2 - - - G2 - - -' }]),
    islandAM: song(92, [{ wave: 'triangle', vol: 0.18, notes: 'E4 - G4 - A4 - G4 - | E4 - D4 - E4 - - -' }, { wave: 'sine', vol: 0.12, notes: 'C3 - G3 - A3 - G3 - | F3 - G3 - C3 - - -' }]),
    islandPM: song(76, [{ wave: 'sine', vol: 0.16, notes: 'A3 - C4 - E4 - C4 - | G3 - B3 - D4 - B3 -' }, { wave: 'triangle', vol: 0.10, notes: 'F2 - C3 - G2 - C3 - | C3 - G2 - F2 - - -' }]),
    yoga: song(66, [{ wave: 'sine', vol: 0.18, notes: 'C4 - - - E4 - - - | D4 - - - E4 - - -' }, { wave: 'triangle', vol: 0.10, notes: 'C3 - - - - - - - | G2 - - - - - - -' }]),
    iron: song(100, [{ wave: 'triangle', vol: 0.16, notes: 'C4 . C4 . E4 . G4 . | A4 . G4 . E4 . D4 .' }, { wave: 'sine', vol: 0.12, notes: 'C3 . . . G2 . . . | F2 . . . G2 . . .' }]),
    stepA: song(100, [{ wave: 'pulse', vol: 0.14, notes: 'C4 . E4 . G4 . E4 . | A4 . G4 . E4 . C4 .' }, { wave: 'triangle', vol: 0.12, notes: 'C3 . G3 . C3 . G3 . | F3 . G3 . C3 . G3 .' }, { wave: 'drums', vol: 0.10, notes: 'k . h . s . h . | k . h . s . h .' }]),
    stepB: song(120, [{ wave: 'pulse', vol: 0.14, notes: 'D4 . F4 . A4 . F4 . | G4 . A4 . F4 . D4 .' }, { wave: 'triangle', vol: 0.12, notes: 'D3 . A3 . D3 . A3 . | G3 . A3 . D3 . A3 .' }, { wave: 'drums', vol: 0.10, notes: 'k . h . s . h . | k h . h s . h .' }]),
    jog: song(112, [{ wave: 'triangle', vol: 0.16, notes: 'E4 . G4 . B4 . G4 . | A4 . G4 . E4 . D4 .' }, { wave: 'sine', vol: 0.12, notes: 'C3 . G3 . A3 . G3 . | F3 . G3 . E3 . G3 .' }, { wave: 'drums', vol: 0.08, notes: 'k . . h . . s . | k . . h . . s .' }]),
    ski: song(96, [{ wave: 'sine', vol: 0.16, notes: 'G4 - E4 - C4 - E4 - | D4 - E4 - G4 - - -' }, { wave: 'triangle', vol: 0.10, notes: 'C3 - G2 - A2 - G2 - | F2 - G2 - C3 - - -' }]),
    tray: song(88, [{ wave: 'triangle', vol: 0.15, notes: 'C5 . A4 . E4 . A4 . | D5 . B4 . G4 . B4 .' }, { wave: 'sine', vol: 0.10, notes: 'F3 . C4 . D3 . A3 . | G3 . D4 . C3 . E3 .' }]),
    laundry: song(104, [{ wave: 'triangle', vol: 0.15, notes: 'C4 E4 G4 E4 A4 G4 E4 C4 | D4 E4 G4 E4 D4 - - -' }]),
    festival: song(108, [{ wave: 'pulse', vol: 0.14, notes: 'C4 . E4 . G4 . C5 . | B4 . G4 . E4 . G4 .' }, { wave: 'triangle', vol: 0.12, notes: 'C3 . G3 . F3 . G3 . | G3 . E3 . C3 . G3 .' }, { wave: 'drums', vol: 0.10, notes: 'k . h . s . h . | k . h . s h h .' }]),
    ending: song(72, [{ wave: 'sine', vol: 0.18, notes: 'C4 - E4 - G4 - C5 - | B4 - G4 - E4 - - -' }, { wave: 'triangle', vol: 0.12, notes: 'C3 - - - G2 - - - | F2 - G2 - C3 - - -' }])
  };
  G.JINGLES = {
    star1: song(120, [{ wave: 'sine', vol: 0.2, notes: 'E4 - G4 -' }]),
    star2: song(120, [{ wave: 'sine', vol: 0.2, notes: 'E4 - G4 - C5 -' }]),
    star3: song(120, [{ wave: 'sine', vol: 0.2, notes: 'C5 - E5 - G5 - C6 -' }]),
    unlock: song(120, [{ wave: 'triangle', vol: 0.2, notes: 'G4 - C5 - E5 -' }]),
    daydone: song(100, [{ wave: 'sine', vol: 0.2, notes: 'C4 - E4 - G4 - E4 - C4 - - -' }])
  };
  G.SPEAKERS = {
    Tare: { base: 620, speed: 22, wave: 'sine', vib: 6 },
    Birch: { base: 140, speed: 9, wave: 'triangle', vib: 2 },
    Alder: { base: 300, speed: 13, wave: 'triangle', vib: 4 },
    Gertrude: { base: 380, speed: 10, wave: 'sine', vib: 14 },
    Dennis: { base: 220, speed: 15, wave: 'sine', vib: 3 },
    Marisol: { base: 330, speed: 16, wave: 'triangle', vib: 3 },
    Kevin: { base: 200, speed: 13, wave: 'sine', vib: 2 },
    Okafor: { base: 180, speed: 12, wave: 'triangle', vib: 3 },
    Lou: { base: 120, speed: 7, wave: 'sine', vib: 1 },
    Twin: { base: 280, speed: 14, wave: 'sine', vib: 3 },
    You: { base: 260, speed: 13, wave: 'sine', vib: 2 }
  };
  G.babble = function (speaker, ch, game) {
    const g = game || G.game; if (!g || !g.audio || !g.audio.ctx) return;
    const ctx = g.audio.ctx; if (!ctx) return;
    const sp = G.SPEAKERS[speaker] || G.SPEAKERS.You;
    if (!ch || ch === ' ' || '.,!?;:\'"-…'.includes(ch)) return;
    const vowels = 'aeiouAEIOU';
    const isV = vowels.includes(ch);
    const code = ch.toLowerCase().charCodeAt(0);
    const semi = 1 + ((code * 7) % 9 - 4) * 0.06;
    const f = sp.base * semi * (isV ? 1.08 : 0.96);
    try {
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), gn = ctx.createGain();
      o.type = sp.wave; o.frequency.value = f;
      if (sp.vib) { o.frequency.value = f * (1 + Math.sin(performance.now() * 0.03) * sp.vib * 0.002); }
      fl.type = 'bandpass'; fl.frequency.value = isV ? 900 : 1400; fl.Q.value = 1.2;
      gn.gain.value = 0.0001;
      const t = ctx.currentTime, dur = isV ? 0.085 : 0.06;
      gn.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let dest = null; try { dest = g.audio.bus('voice'); } catch (e) { dest = ctx.destination; }
      o.connect(fl); fl.connect(gn); gn.connect(dest || ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  };
  G.initAudio = function (game) {
    const A = game.audio; if (!A || G._audioInit) return; G._audioInit = true;
    const defs = {
      boop: { wave: 'sine', freq: 520, to: 780, dur: 0.12, vol: 0.25 },
      boop2: { wave: 'sine', freq: 780, to: 660, dur: 0.1, vol: 0.2 },
      creak: { wave: 'saw', freq: 90, to: 70, dur: 0.25, vol: 0.10 },
      chime: { wave: 'sine', freq: 880, to: 1320, dur: 0.2, vol: 0.15 },
      stumbleS: { wave: 'triangle', freq: 300, to: 120, dur: 0.35, vol: 0.2 },
      clink: { wave: 'sine', freq: 1560, to: 1200, dur: 0.15, vol: 0.2 },
      gull: { wave: 'saw', freq: 900, to: 1400, dur: 0.2, vol: 0.08 },
      flame: { wave: 'noise', dur: 0.15, vol: 0.06 },
      whirr: { wave: 'triangle', freq: 200, to: 400, dur: 0.2, vol: 0.10 },
      carve: { wave: 'noise', dur: 0.3, vol: 0.08 },
      plop: { wave: 'sine', freq: 400, to: 180, dur: 0.15, vol: 0.25 },
      rope: { wave: 'saw', freq: 120, to: 100, dur: 0.2, vol: 0.08 },
      stamp: { wave: 'sine', freq: 180, to: 90, dur: 0.2, vol: 0.3 },
      tickS: { wave: 'sine', freq: 1000, dur: 0.05, vol: 0.12 },
      clickBeat: { wave: 'sine', freq: 1200, dur: 0.04, vol: 0.18 }
    };
    for (const k in defs) { try { A.define(k, defs[k]); } catch (e) {} }
  };
  G.playSong = function (name) {
    const g = G.game; if (!g) return;
    try { if (G.SONGS[name]) g.audio.music(G.SONGS[name], { sync: true }); } catch (e) {}
  };
  G.sting = function (name) {
    const g = G.game; if (!g) return;
    try { if (G.JINGLES[name]) g.audio.sting(G.JINGLES[name]); } catch (e) {}
  };
  G.sfx = function (name, o) { const g = G.game; if (!g) return; try { g.audio.sfx(name, o); } catch (e) {} };
})();
