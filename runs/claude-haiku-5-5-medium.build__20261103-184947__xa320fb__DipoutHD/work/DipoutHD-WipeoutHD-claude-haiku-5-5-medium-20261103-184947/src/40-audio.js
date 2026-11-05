// Dipout HD: all sound is synthesized in code (no files). Music uses the engine's tracker format.
(() => {
  const SN = globalThis.SN;

  // Race music: four-on-the-floor house with a bass line and an arpeggio lead. Layers: drums, bass, lead.
  const bassLine = 'A1 . A1 A2 . A1 . A1 | A1 . C2 A1 . E2 . A1 . | F1 . F1 F2 . F1 . F1 . | G1 . G1 G2 . B1 . G1 .';
  SN.SONGS = {
    race: {
      bpm: 126, steps: 4,
      tracks: [
        { name: 'drums', wave: 'drums', vol: 0.5, notes: 'k . h . k . h . k . h . k . h . k . o . h .' },
        { name: 'bass', wave: 'saw', vol: 0.16, lp: { f: 900, q: 6, env: 1200, dec: 0.12 }, notes: bassLine },
        { name: 'lead', wave: 'square', vol: 0.07, uni: 2, det: 8, notes: 'A4 C5 E5 A5 . E5 C5 A4 . F4 A4 C5 F5 . C5 A4 F4 . G4 B4 D5 G5 . D5 B4 G4 .' },
      ],
    },
    menu: {
      bpm: 110, steps: 4,
      tracks: [
        { name: 'pad', wave: 'triangle', vol: 0.12, notes: 'A3 - C4 - E4 - G4 - | F3 - A3 - C4 - E4 - | D3 - F3 - A3 - C4 - | E3 - G3 - B3 - D4 -' },
        { name: 'drums', wave: 'drums', vol: 0.3, notes: 'k . . . . . h . k . . . . . h .' },
      ],
    },
  };

  // Short synthesized effects: name -> sfx options for game.audio.sfx.
  SN.SFX = {
    fire: { wave: 'saw', freq: 620, to: 180, dur: 0.18, vol: 0.25 },
    cannon: { wave: 'square', freq: 900, to: 300, dur: 0.12, vol: 0.2 },
    pickup: { wave: 'square', arp: [0, 4, 7, 12], step: 0.04, freq: 520, dur: 0.14, vol: 0.2 },
    absorb: { wave: 'triangle', freq: 300, to: 900, dur: 0.25, vol: 0.25 },
    hit: { wave: 'noise', freq: 200, dur: 0.22, vol: 0.35 },
    wall: { wave: 'noise', freq: 320, dur: 0.12, vol: 0.25 },
    land: { wave: 'sine', freq: 120, to: 50, dur: 0.22, vol: 0.4 },
    pad: { wave: 'square', freq: 300, to: 1100, dur: 0.22, vol: 0.18 },
    air: { wave: 'sine', freq: 180, to: 420, dur: 0.25, vol: 0.15 },
    lap: { wave: 'triangle', arp: [0, 7, 12], step: 0.07, freq: 660, dur: 0.1, vol: 0.25 },
    elim: { wave: 'noise', freq: 120, to: 40, dur: 0.6, vol: 0.5 },
    finish: { wave: 'square', arp: [0, 4, 7, 12, 16], step: 0.08, freq: 440, dur: 0.12, vol: 0.25 },
    countdown: { wave: 'square', freq: 660, dur: 0.12, vol: 0.2 },
    go: { wave: 'square', freq: 990, dur: 0.35, vol: 0.25 },
    select: { wave: 'square', freq: 740, dur: 0.05, vol: 0.12 },
    confirm: { wave: 'triangle', arp: [0, 7], step: 0.05, freq: 500, dur: 0.07, vol: 0.2 },
    cancel: { wave: 'square', freq: 260, to: 180, dur: 0.08, vol: 0.12 },
  };
  // Tie a race event to a sound.
  SN.eventSound = { fire: 'fire', pickup: 'pickup', absorb: 'absorb', hit: 'hit', wall: 'wall', land: 'land', pad: 'pad', air: 'air', lap: 'lap', elim: 'elim', finish: 'finish', respawn: 'go', bump: 'wall' };
})();
