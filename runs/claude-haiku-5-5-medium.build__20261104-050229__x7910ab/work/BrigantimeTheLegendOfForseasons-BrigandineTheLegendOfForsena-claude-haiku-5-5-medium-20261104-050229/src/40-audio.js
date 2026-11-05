// Audio: every song, sound effect and voice is written in code. Songs use the engine's step-sequencer format; sound
// effects are custom voices defined with audio.define; the voices are Animalese babble, a pool of short syllable blips
// that each dialog letter draws from, pitched by the speaker's profile.
(() => {
  const H = G;

  // the songs: { bpm, steps, tracks: [{ wave, vol, notes }] }. Each token is a note (C4, F#3), - holds, . rests, k s h drums.
  H.SONGS = {
    title: { bpm: 96, steps: 4, tracks: [
      { wave: 'triangle', vol: .16, notes: 'D4 - F4 - A4 - G4 - E4 - D4 - C4 - D4 - F4 - A4 - C5 - A4 - G4 - E4 - D4 -' },
      { wave: 'square', vol: .05, notes: 'D3 . . . A3 . . . F3 . . . G3 . . . D3 . . . C3 . . . A2 . . .' }] },
    campaign: { bpm: 118, steps: 4, tracks: [
      { wave: 'square', vol: .1, notes: 'G4 . A4 B4 C5 . B4 A4 G4 . E4 G4 A4 . G4 . E4 . G4 . A4 B4 D5 . C5 B4 A4 . G4 A4 . E4 . D4 . G4 A4 B4 C5 . B4 A4 G4 . E4 G4 D5 . C5 . B4 . A4 . G4 . . .' },
      { wave: 'triangle', vol: .14, notes: 'G2 - D3 - C3 - G2 - A2 - E3 - D3 - G2 - G2 - D3 - C3 - G2 - A2 - E3 - D3 - G2 -' },
      { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s h h . k . h . s . h . k . h s s h k . h . s . h .' }] },
    battle: { bpm: 146, steps: 4, tracks: [
      { wave: 'saw', vol: .07, notes: 'E4 . E4 G4 A4 . E4 . D4 . E4 G4 B4 . A4 . G4 . E4 . E4 . E4 G4 A4 . C5 . B4 . A4 . G4 . B4 .' },
      { wave: 'triangle', vol: .18, notes: 'E2 E2 E2 E2 C2 C2 C2 C2 D2 D2 D2 D2 B1 B1 B1 B1' },
      { wave: 'drums', vol: .16, notes: 'k . s . k k s . k . s . k k s s' }] },
    victory: { bpm: 108, steps: 4, tracks: [
      { wave: 'square', vol: .12, notes: 'C4 E4 G4 C5 . . G4 C5 E5 . . G5 . . C5 . . . . ' },
      { wave: 'triangle', vol: .14, notes: 'C3 . G2 . C3 . G2 . F3 . C3 . G2 . C3 .' }] },
    defeat: { bpm: 84, steps: 4, tracks: [
      { wave: 'triangle', vol: .16, notes: 'G3 . F3 . E3 . D3 . C3 . - . - . - . - . -' }] }
  };
  H.SONG_OF = { title: 'title', attract: 'title', setup: 'title', help: 'title', about: 'title', dev: 'title', campaign: 'campaign', battle: 'battle', hub: 'battle', victory: 'victory', defeat: 'defeat' };

  // the sound effects that are not presets: each a voice (or a list) the game plays with audio.sfx(name)
  H.SFX = {
    bell: [{ wave: 'sine', freq: 'E5', dur: .5, vol: .22 }, { wave: 'sine', freq: 'A5', dur: .5, vol: .12 }],
    move: { wave: 'triangle', freq: 320, to: 270, dur: .05, vol: .12 },
    cursor: { wave: 'square', freq: 'A5', dur: .03, vol: .08 },
    skill: { wave: 'saw', freq: 300, to: 900, dur: .26, vol: .14 },
    burn: { wave: 'noise', freq: 900, to: 300, dur: .3, vol: .2 },
    capture: [{ wave: 'square', freq: 'C5', dur: .12, vol: .16 }, { wave: 'square', freq: 'E5', dur: .12, vol: .16 }, { wave: 'square', freq: 'G5', dur: .24, vol: .16 }],
    quest: { wave: 'triangle', freq: 'G4', to: 'C5', dur: .3, vol: .16 },
    level: { wave: 'square', freq: 'C5', to: 'C6', dur: .35, vol: .16, arp: [0, 4, 7, 12] }
  };

  // Animalese: the babble of a speaker. A pool of short blips around the speaker's pitch; each letter draws one
  H.babble = (pitch = 200, lilt = 1) => {
    const pool = [];
    for (let i = 0; i < 6; i++) {
      const f = pitch * (.82 + i * .07) * lilt;
      pool.push({ wave: i % 2 ? 'triangle' : 'square', freq: Math.round(f), to: Math.round(f * (i % 3 ? 1.18 : .86)), dur: .055, vol: .09 });
    }
    return pool;
  };
  H.babbleVoice = (talk, pool) => { talk.voice = pool[Math.floor(Math.random() * pool.length)]; };

  // the engine's audio: the song for a scene, and the custom effects defined once at start
  H.playSong = (game, scene) => {
    const key = H.SONG_OF[scene] || 'title';
    game.audio.music(H.SONGS[key]);
  };
  H.defineSounds = game => {
    for (const [name, v] of Object.entries(H.SFX)) game.audio.define(name, v);
  };
})();
