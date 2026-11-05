// All sound is synthesized: songs in the engine's notation, effects as voices, an engine hum from raw oscillators,
// and Animalese-style gibberish voices for the characters.
const E = globalThis.My3D2dge;
const SONGS = {
  title: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'E5 . G5 . A5 . G5 . | E5 . G5 . B5 . A5 . | D5 . F5 . A5 . G5 . | D5 . F5 . A5 . E5 .' },
    { wave: 'triangle', vol: .26, notes: 'E2 E2 . E2 E2 . E2 . | E2 E2 . E2 G2 . A2 . | D2 D2 . D2 D2 . D2 . | D2 D2 . D2 F2 . G2 .' },
    { wave: 'drums', vol: .08, notes: 'k . h . s . h k | k . h . s . h h' }] },
  dust: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .05, notes: 'A4 . C5 E5 . C5 A4 . | G4 . B4 D5 . B4 G4 . | F4 . A4 C5 . A4 F4 . | E4 . G#4 B4 . G#4 E4 .' },
    { wave: 'triangle', vol: .28, notes: 'A2 A2 E3 A2 A2 E3 A2 E3 | G2 G2 D3 G2 G2 D3 G2 D3 | F2 F2 C3 F2 F2 C3 F2 C3 | E2 E2 B2 E2 E2 B2 E2 B2' },
    { wave: 'drums', vol: .07, notes: 'k . h h s . h . k . h k s . h h' }] },
  hedge: { bpm: 156, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'E5 . G5 B5 . G5 E5 . | F5 . A5 C6 . A5 F5 . | G5 . B5 D6 . B5 G5 . | A5 . F5 D5 . E5 F5 .' },
    { wave: 'triangle', vol: .26, notes: 'E3 E3 B2 B2 E3 E3 B2 B2 | F3 F3 C3 C3 F3 F3 C3 C3 | G3 G3 D3 D3 G3 G3 D3 D3 | A2 A2 E3 E3 D3 D3 B2 B2' },
    { wave: 'drums', vol: .07, notes: 'k . h k s . h . k . h k s . h h' }] },
  frost: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: .06, notes: 'D5 . F5 . A5 . F5 . | C5 . E5 . G5 . E5 . | Bb4 . D5 . F5 . D5 . | C5 . E5 . A5 . G5 .' },
    { wave: 'sine', vol: .3, notes: 'D3 . . D3 . . D3 . | C3 . . C3 . . C3 . | Bb2 . . Bb2 . . Bb2 . | C3 . . C3 . . E3 .' },
    { wave: 'drums', vol: .06, notes: 'k . . h s . h . k . h . s . h h' }] },
  garage: { bpm: 100, steps: 4, tracks: [{ wave: 'triangle', vol: .22, notes: 'C3 . E3 . G3 . E3 . | F3 . A3 . C4 . A3 . | G3 . B3 . D4 . B3 . | C3 . E3 . G3 . E3 .' }, { wave: 'square', vol: .04, notes: '. . C5 . . . G4 . | . . F5 . . . A4 . | . . G5 . . . B4 . | . . E5 . . . C5 .' }] },
  results: { bpm: 120, steps: 4, loop: true, tracks: [{ wave: 'square', vol: .08, notes: 'C5 E5 G5 C6 . G5 E5 . | F5 A5 C6 F6 . C6 A5 . | G5 B5 D6 G6 . D6 B5 . | C6 . . . . . . .' }, { wave: 'triangle', vol: .22, notes: 'C3 . G3 . C3 . G3 . | F3 . C4 . F3 . C4 . | G3 . D4 . G3 . D4 . | C3 . . . . . . .' }] }
};
const SFX = {
  count: { wave: 'square', freq: 440, dur: .18, vol: .3 }, go: { wave: 'square', freq: 880, dur: .45, vol: .32, arp: [0, 7, 12] },
  cp: { wave: 'square', freq: 988, arp: [0, 7, 12, 19], step: .06, dur: .3, vol: .25 },
  finish: [{ wave: 'square', freq: 523, arp: [0, 4, 7, 12, 16, 19, 24], step: .09, dur: .9, vol: .26 }, { wave: 'triangle', freq: 131, arp: [0, 7, 12], step: .22, dur: .8, vol: .3 }],
  crash: [{ wave: 'noise', freq: 1400, to: 90, dur: .35, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 38, dur: .3, vol: .5 }],
  scrape: { wave: 'noise', freq: 3200, to: 1800, dur: .09, vol: .12, filter: 'bandpass' },
  land: [{ wave: 'noise', freq: 700, to: 120, dur: .18, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 100, to: 45, dur: .16, vol: .5 }],
  boost: [{ wave: 'saw', freq: 220, to: 900, dur: .5, vol: .16 }, { wave: 'noise', freq: 1200, to: 4000, dur: .4, vol: .15, filter: 'highpass' }],
  respawn: { wave: 'sine', freq: 300, arp: [0, 4, 7, 12, 16], step: .05, dur: .3, vol: .22 },
  medal: { wave: 'square', freq: 659, arp: [0, 4, 7, 11, 12], step: .1, dur: .6, vol: .24 },
  coin: { wave: 'square', freq: 1319, arp: [0, 5], step: .06, dur: .18, vol: .2 },
  denied: { wave: 'square', freq: 196, to: 150, dur: .2, vol: .22 },
  tick: { wave: 'square', freq: 1500, dur: .02, vol: .08 }
};
const NOTE = [262, 294, 330, 349, 392, 440, 494, 523];

export function setupAudio(game) {
  const A = game.audio;
  for (const [k, v] of Object.entries(SFX)) A.define(k, v);
  return { music: n => A.music(SONGS[n] || null), sfx: (n, o) => A.sfx(n, o), songs: SONGS };
}

/** Animalese-style gibberish: one short blip per letter, pitched by the letter, with a rising lilt at the end of lines */
export function babble(game, text, pitch = 1, vol = .12) {
  const A = game.audio; if (!A || !A._init || !A._init()) return 0;
  const voices = []; let t = 0;
  for (const ch of text.toLowerCase()) {
    if (ch === ' ') { t += .05; continue; }
    if (!/[a-z]/.test(ch)) { t += .09; continue; }
    const k = ch.charCodeAt(0) - 97, f = NOTE[k % 8] * (1 + (k % 5) * .06) * pitch * .6;
    voices.push({ wave: k % 3 ? 'triangle' : 'square', freq: f, to: f * (k % 2 ? 1.12 : .9), dur: .06, vol, delay: t });
    t += .062;
  }
  if (voices.length) A.sfx(voices.slice(0, 40), { vary: .02 });
  return t;
}

/** the engine hum + tyre hiss for a car, from raw oscillators on the audio context. update(speedFraction, slide, onGround) */
export function engineSound(game) {
  let ctx = null, osc, osc2, gain, hiss, hg, started = false;
  const start = () => {
    const A = game.audio; if (!A._init || !A._init() || !A.ctx || A.ctx.state !== 'running') return false;
    ctx = A.ctx; osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc2 = ctx.createOscillator(); osc2.type = 'square';
    gain = ctx.createGain(); gain.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    osc.connect(lp); osc2.connect(lp); lp.connect(gain); gain.connect(A._sfxBus);
    const src = ctx.createBufferSource(); src.buffer = A._noise; src.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400;
    hg = ctx.createGain(); hg.gain.value = 0; src.connect(bp); bp.connect(hg); hg.connect(A._sfxBus);
    osc.start(); osc2.start(); src.start(); started = true; return true;
  };
  return {
    update(speed, slide, ground, on = true) {
      if (!started && !start()) return;
      const t = ctx.currentTime, f = 55 + speed * 150;
      osc.frequency.setTargetAtTime(f, t, .05); osc2.frequency.setTargetAtTime(f * 1.5, t, .05);
      gain.gain.setTargetAtTime(on && !game.audio.muted ? .05 + speed * .05 : 0, t, .08);
      hg.gain.setTargetAtTime(on && ground ? Math.min(.09, Math.abs(slide) / 400 * .09) : 0, t, .05);
    },
    stop() { if (started) { try { gain.gain.value = 0; hg.gain.value = 0; osc.stop(); osc2.stop(); } catch (e) { /* stopped */ } started = false; } }
  };
}
