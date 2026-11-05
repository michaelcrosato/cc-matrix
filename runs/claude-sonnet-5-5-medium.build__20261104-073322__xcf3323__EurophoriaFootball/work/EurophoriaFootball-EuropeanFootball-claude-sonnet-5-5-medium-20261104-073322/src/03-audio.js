/* ============ 03-audio: everything is synthesised: effects, songs, the crowd, the babble voices ============ */
const SFX = {
  kick: [{ wave: 'noise', freq: 1100, to: 220, dur: .07, vol: .32, filter: 'lowpass' }, { wave: 'sine', freq: 150, to: 80, dur: .08, vol: .3 }],
  pass: { wave: 'noise', freq: 800, to: 300, dur: .05, vol: .18, filter: 'lowpass' },
  shot: [{ wave: 'noise', freq: 1500, to: 200, dur: .11, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 190, to: 60, dur: .14, vol: .4 }],
  thud: { wave: 'sine', freq: 110, to: 60, dur: .1, vol: .3 }, bounce: { wave: 'sine', freq: 170, to: 100, dur: .07, vol: .2 },
  whistle: [{ wave: 'square', freq: 2300, vib: [28, .05], dur: .35, vol: .12, hold: true }, { wave: 'square', freq: 2380, vib: [31, .05], dur: .35, vol: .08, hold: true }],
  whistle2: [{ wave: 'square', freq: 2300, vib: [28, .05], dur: .12, vol: .12, hold: true }, { wave: 'square', freq: 2300, vib: [28, .05], dur: .12, vol: .12, hold: true, delay: .18 }, { wave: 'square', freq: 2300, vib: [28, .05], dur: .5, vol: .12, hold: true, delay: .36 }],
  post: [{ wave: 'triangle', freq: 1500, to: 1050, dur: .35, vol: .3 }, { wave: 'square', freq: 700, to: 500, dur: .2, vol: .1 }],
  net: { wave: 'noise', freq: 2400, to: 900, dur: .35, vol: .3, filter: 'bandpass' },
  slide: { wave: 'noise', freq: 600, to: 200, dur: .35, vol: .2, filter: 'lowpass' },
  tackle: [{ wave: 'noise', freq: 500, to: 160, dur: .1, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 70, dur: .1, vol: .3 }],
  cheer: [{ wave: 'noise', freq: 800, to: 1500, dur: 1.6, vol: .3, filter: 'bandpass', q: .5, attack: .25 }, { wave: 'noise', freq: 1400, to: 900, dur: 1.4, vol: .18, filter: 'bandpass', q: .7, attack: .35 }],
  groan: [{ wave: 'noise', freq: 500, to: 220, dur: 1.1, vol: .26, filter: 'bandpass', q: .6, attack: .15 }, { wave: 'saw', freq: 190, to: 110, dur: .9, vol: .05 }],
  ooh: [{ wave: 'noise', freq: 600, to: 1100, dur: .7, vol: .22, filter: 'bandpass', q: .6, attack: .2 }],
  card: [{ wave: 'square', freq: 440, dur: .08, vol: .16 }, { wave: 'square', freq: 660, dur: .14, vol: .16, delay: .09 }],
  varbeep: [{ wave: 'sine', freq: 880, dur: .1, vol: .16 }, { wave: 'sine', freq: 880, dur: .1, vol: .16, delay: .3 }, { wave: 'sine', freq: 1320, dur: .25, vol: .16, delay: .6 }],
  charge: { wave: 'saw', freq: 120, to: 480, dur: .6, vol: .06 },
  euphoriaFull: [{ wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .22 }, { wave: 'noise', freq: 2000, dur: .5, vol: .12, filter: 'highpass' }],
  europhoria: [{ wave: 'saw', freq: 110, to: 880, dur: 1.1, vol: .2, attack: .5 }, { wave: 'noise', freq: 400, to: 3000, dur: 1.2, vol: .25, filter: 'bandpass', attack: .6 }, { wave: 'square', freq: 'C4', arp: [0, 4, 7, 12, 16, 19], step: .09, dur: .8, vol: .12, delay: .9 }],
  superStrike: [{ wave: 'noise', freq: 4000, to: 150, dur: .5, vol: .45, filter: 'lowpass' }, { wave: 'saw', freq: 900, to: 60, dur: .6, vol: .25 }, { wave: 'sine', freq: 80, to: 40, dur: .5, vol: .5 }],
  duelTick: { wave: 'square', freq: 1000, dur: .04, vol: .1 }, duelWin: [{ wave: 'triangle', freq: 'E5', arp: [0, 4, 7], step: .07, dur: .25, vol: .25 }], duelLose: [{ wave: 'saw', freq: 300, to: 80, dur: .5, vol: .2 }],
  dive: { wave: 'noise', freq: 900, to: 400, dur: .25, vol: .2, filter: 'lowpass' }, save: [{ wave: 'noise', freq: 1600, to: 500, dur: .09, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 600, to: 800, dur: .15, vol: .18 }],
  skill: { wave: 'triangle', freq: 900, to: 1500, dur: .09, vol: .14 }, euTick: { wave: 'triangle', freq: 1200, to: 1700, dur: .05, vol: .08 },
  seagull: [{ wave: 'saw', freq: 900, to: 1500, dur: .18, vol: .14, vib: [30, .1] }, { wave: 'saw', freq: 1500, to: 800, dur: .22, vol: .14, delay: .2, vib: [30, .1] }],
  honk: { wave: 'saw', freq: 130, to: 170, dur: .35, vol: .2 }, drum: [{ wave: 'sine', freq: 140, to: 60, dur: .16, vol: .4 }, { wave: 'noise', freq: 300, dur: .06, vol: .1, filter: 'lowpass' }],
  clap: { wave: 'noise', freq: 1800, dur: .04, vol: .22, filter: 'bandpass', q: 2 }, boom: { wave: 'sine', freq: 70, to: 30, dur: .6, vol: .5 }, firework: [{ wave: 'noise', freq: 3000, to: 500, dur: .5, vol: .22, filter: 'lowpass' }, { wave: 'triangle', freq: 1800, to: 300, dur: .5, vol: .1 }],
  zap: { wave: 'square', freq: 200, to: 90, dur: .3, vol: .18 }, hammer: [{ wave: 'sine', freq: 100, to: 40, dur: .3, vol: .5 }, { wave: 'noise', freq: 500, dur: .1, vol: .3, filter: 'lowpass' }]
};
for (const k in SFX) A.define(k, SFX[k]);
EF.sfx = (name, o) => { try { A.sfx(name, o); } catch (e) { /* audio is optional */ } };

/* ---- songs: original, in the engine's format ---- */
const SONGS = {
  title: { bpm: 126, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'G4 . G4 . C5 - - . | G4 . G4 . C5 - - . | D5 . D5 . E5 . D5 C5 | D5 - - - . . . . | E5 . E5 . G5 - - . | E5 . E5 . G5 - - . | A5 . G5 . E5 . D5 . | C5 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . . C3 . . G2 . | C3 . . C3 . . G2 . | G2 . . G2 . . D3 . | G2 . . G2 . . D3 . | C3 . . C3 . . G2 . | C3 . . C3 . . G2 . | F2 . . F2 . . G2 . | C3 . . G2 . . C3 .' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h k | k . h . s . h . | k . h . s . h k | k . h . s h h h' }] },
  cup: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'E4 . G4 . A4 . G4 . | E4 . G4 . C5 - - . | D4 . F4 . A4 . F4 . | D4 . E4 - - - . .' }, { wave: 'triangle', vol: .26, notes: 'A2 . . . E3 . . . | C3 . . . G3 . . . | D3 . . . A3 . . . | E3 . . . E3 . . .' }, { wave: 'drums', vol: .06, notes: 'k . . . s . . . | k . . . s . . .' }] },
  smoke: { bpm: 138, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' }, { wave: 'drums', vol: .08, notes: 'k . h . s . h k | k . h . s h h .' }] },
  ole: { bpm: 112, steps: 4, tracks: [
    { wave: 'pulse', vol: .07, notes: 'E5 . C5 . E5 . G5 . | A5 . G5 . E5 . C5 . | D5 . B4 . D5 . F5 . | E5 - - - . . . .' }, { wave: 'triangle', vol: .3, notes: 'A2 . E3 . A2 . E3 . | A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . . .' }, { wave: 'drums', vol: .07, notes: 'k . h h s . h . | k . h h s . h h' }] },
  forge: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .05, notes: 'A3 . A3 . C4 . A3 . | A3 . A3 . D4 . C4 . | A3 . A3 . E4 . D4 . | C4 . A3 . G3 . A3 .' }, { wave: 'triangle', vol: .32, notes: 'A1 . A1 . A1 . A1 . | A1 . A1 . A1 . A1 . | F1 . F1 . F1 . F1 . | G1 . G1 . G1 . G1 .' }, { wave: 'drums', vol: .12, notes: 'k . k . s . k k | k . k . s . k s' }] },
  curva: { bpm: 90, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'A3 - - . C4 - - . | E4 - - . D4 - - . | C4 - - . A3 - - . | B3 - - - . . . .' }, { wave: 'triangle', vol: .28, notes: 'A2 . . . . . . . | C3 . . . . . . . | F2 . . . . . . . | E2 . . . . . . .' }, { wave: 'drums', vol: .09, notes: 'k . . . . . k . | . . . . k . . .' }] },
  gold: { bpm: 120, steps: 4, tracks: [
    { wave: 'pulse', vol: .06, notes: 'C5 . E5 . G5 . E5 . | C5 . F5 . A5 . F5 . | D5 . G5 . B5 . G5 . | C6 - - - . . . .' }, { wave: 'triangle', vol: .26, notes: 'C3 . G3 . C3 . G3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . . .' }, { wave: 'drums', vol: .08, notes: 'k . h . s . h . | k . h . s . h h' }] },
  rec: { bpm: 110, steps: 4, tracks: [{ wave: 'triangle', vol: .14, notes: 'C4 . E4 . G4 . E4 . | F4 . A4 . C5 . A4 . | G4 . B4 . D5 . B4 . | C5 - - - . . . .' }, { wave: 'triangle', vol: .24, notes: 'C3 . . . G2 . . . | F2 . . . C3 . . . | G2 . . . D3 . . . | C3 . . . . . . .' }] },
  victory: { bpm: 132, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'C5 . C5 . C5 . E5 . | G5 - - . E5 . G5 . | C6 - - - - - - - | . . . . . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . G3 . C3 . G3 . | C3 . G3 . E3 . G3 . | C3 - - - - - - - | . . . . . . . .' }, { wave: 'drums', vol: .08, notes: 'k . h . s . h k | k . h . s s s s' }] },
  defeat: { bpm: 70, steps: 4, tracks: [{ wave: 'triangle', vol: .18, notes: 'E4 - - - D4 - - - | C4 - - - A3 - - - | B3 - - - - - - - | . . . . . . . .' }, { wave: 'triangle', vol: .24, notes: 'A2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | . . . . . . . .' }] },
  tabloid: { bpm: 140, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: 'G4 . . G4 . . A4 . | B4 . . B4 . . C5 . | D5 . . D5 . . E5 . | D5 . C5 . B4 . A4 .' }, { wave: 'triangle', vol: .26, notes: 'G2 . D3 . G2 . D3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | D3 . A3 . D3 . D3 .' }, { wave: 'drums', vol: .08, notes: 'k . . . s . . . | k . . . s . h .' }] },
  attract: { bpm: 144, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: 'C5 . E5 . G5 . E5 . | A5 . G5 . E5 . C5 . | D5 . F5 . A5 . F5 . | G5 - - - . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . . C3 . . G2 . | A2 . . A2 . . E2 . | F2 . . F2 . . G2 . | G2 . . G2 . . D3 .' }, { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] }
};
EF.SONGS = SONGS;
EF.music = (name, o) => { try { if (name === null) A.music(null); else A.music(SONGS[name] || name, o); } catch (e) { /* silent */ } };

/* ---- crowd engine: a continuous noise bed that follows the mood, plus chants ---- */
EF.crowdAudio = (() => {
  let nodes = null, gain = 0, target = .15, lastChant = 0;
  const build = () => {
    const c = A.ctx; if (!c || c.state !== 'running' || !A._noise) return null;
    const src = c.createBufferSource(); src.buffer = A._noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = .5; const g = c.createGain(); g.gain.value = 0;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .3; lg.gain.value = 120; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    src.connect(bp); bp.connect(g); g.connect(A._sfxBus); src.start(); return { c, g, bp, src };
  };
  return {
    /** mood 0..1: how loud the stands are; call every update */
    update(dt, mood, volMul) {
      if (!nodes) nodes = build(); if (!nodes) return;
      const s = (game.settings && game.settings.crowdSound !== undefined ? game.settings.crowdSound : 1) * (volMul === undefined ? 1 : volMul) * EF.T.crowdVol;
      target = (.05 + mood * .2) * s; gain += (target - gain) * Math.min(1, dt * 2); nodes.g.gain.value = A.muted ? 0 : gain; nodes.bp.frequency.value = 500 + mood * 500;
    },
    stop() { if (nodes) { try { nodes.g.gain.value = 0; } catch (e) { /* closed */ } } },
    swell(amt = 1) { gain = Math.min(.6, gain + .14 * amt); },
    chant(team, t) {
      if (t - lastChant < 5) return; lastChant = t; const base = { kip: [['G4', 0], ['G4', .32], ['C5', .64]], hoo: [['G2', 0]], rpp: [['E5', 0], ['C5', .3]], svs: [['A4', 0], ['A4', .28], ['A4', .56]], acl: [['A3', 0], ['C4', .5], ['E4', 1], ['D4', 1.5]], opu: [['C4', 0]] }[team] || [['G4', 0]];
      const v = EF.game.settings.crowdSound === undefined ? 1 : EF.game.settings.crowdSound; const voices = base.map(([f, d]) => ({ wave: team === 'hoo' ? 'saw' : 'triangle', freq: f, dur: team === 'hoo' ? .8 : .24, vol: .12 * v, delay: d, to: team === 'hoo' ? 'C3' : undefined }));
      if (team === 'kip') for (let i = 0; i < 3; i++) voices.push({ wave: 'noise', freq: 1800, dur: .04, vol: .14 * v, filter: 'bandpass', q: 2, delay: 1.1 + i * .22 });
      if (team === 'svs') for (let i = 0; i < 3; i++) voices.push({ wave: 'sine', freq: 120, to: 60, dur: .14, vol: .3 * v, delay: i * .28 });
      EF.sfx(voices);
    }
  };
})();

/* ---- babble: Animalese-style gibberish voices ---- */
EF.babble = (() => {
  const hash = (a, b) => ((Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1 + 1) % 1;
  const pitchOf = id => (EF.SPEAKERS[id] && EF.SPEAKERS[id].pitch) || .9;
  const vol = () => (game.settings && game.settings.voices !== undefined ? game.settings.voices : 1);
  const VOW = 'aeiouAEIOU';
  /** a function for E.Dialog's voice: plays one blip per call */
  function voiceFor(id) { const p = pitchOf(id); return (i) => { const f = 190 * p * (.82 + hash(i, id.length) * .62); EF.sfx({ wave: p > 1 ? 'triangle' : 'square', freq: f, to: f * (1 + (hash(i, 3) - .5) * .5), dur: .055, vol: .1 * vol() }, { vary: .02 }); }; }
  /** speak a whole line at once (for commentary that is not typed through a Dialog) */
  function say(id, text, rate = 1) {
    const p = pitchOf(id), voices = []; let t = 0, n = 0; const words = text.split(/\s+/).slice(0, 14);
    for (const w of words) { const syl = Math.max(1, Math.min(4, (w.match(/[aeiouAEIOU]+/g) || ['a']).length)); for (let s = 0; s < syl; s++) { const f = 180 * p * (.8 + hash(n++, w.length) * .7); voices.push({ wave: p > 1 ? 'triangle' : 'square', freq: f, to: f * (.9 + hash(n, 5) * .35), dur: .07, vol: .09 * vol(), delay: t }); t += .085 / rate; } t += .06 / rate; }
    if (voices.length) EF.sfx(voices, { vary: .01 });
    return t;
  }
  return { voiceFor, say };
})();
