/* 42-audio: every sound in code. Songs on the engine's tracker (def('song', id, ...)), named tracks so the drums and
 * the lead come in during ACTION and drop out during WAIT, stings; SFX as voice lists played through a stereo panner
 * into the engine's sfx bus (so the volume settings apply), panned by screen x and quieter with distance, at most 24
 * at once; per-stage ambience (crowd, rain, sluices) as small Web Audio graphs. Headless: nothing plays. */
const rep = (s, n) => Array(n).fill(s).join(' | ');
const SONG = (id, s) => def('song', id, s);
SONG('theme', { bpm: 140, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .13, notes: 'D5 - F5 - A5 - D6 - C6 - A5 - F5 - G5 - | A5 - - - - - G5 F5 E5 - F5 - G5 - - - | D5 - F5 - A5 - D6 - E6 - D6 - C6 - A5 - | Bb5 - A5 - G5 - E5 - F5 - - - D5 - - -' },
  { name: 'arp', wave: 'square', vol: .05, notes: rep('D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4 C4 E4 G4 E4', 1) + ' | ' + rep('Bb3 D4 F4 D4 Bb3 D4 F4 D4 A3 C#4 E4 C#4 A3 C#4 E4 C#4', 1) + ' | ' + rep('D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4 C4 E4 G4 E4', 1) + ' | ' + 'G3 Bb3 D4 Bb3 G3 Bb3 D4 Bb3 A3 C#4 E4 C#4 A3 C#4 E4 A4' },
  { name: 'bass', wave: 'saw', vol: .1, notes: 'D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 A1 A2 A1 A2 | D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 | G1 G2 G1 G2 G1 G2 G1 G2 A1 A2 A1 A2 A1 A2 C#2 C#3' },
  { name: 'drums', wave: 'drums', vol: .15, notes: 'k . h . s . h k k . h . s . h h' }] });
SONG('briefing', { bpm: 92, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .16, notes: 'D4 - - - - - - - F4 - - - - - - - | C4 - - - - - - - E4 - - - - - - - | Bb3 - - - - - - - D4 - - - - - - - | A3 - - - - - - - C#4 - - - - - - -' },
  { name: 'pulse', wave: 'pulse12', vol: .05, notes: 'A4 . . . A4 . . . A4 . . . A4 . A4 .' },
  { name: 'bass', wave: 'triangle', vol: .28, notes: 'D2 - . . D2 - . . C2 - . . C2 - . . | Bb1 - . . Bb1 - . . A1 - . . A1 - . .' },
  { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . . . h . k . h . . . h h' }] });
SONG('harbor', { bpm: 150, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .1, on: false, notes: 'A5 - . A5 G5 - E5 - D5 - E5 - G5 - - - | A5 - . C6 B5 - A5 - G5 - E5 - D5 - - - | E5 - . E5 G5 - A5 - C6 - B5 - A5 - G5 - | A5 - G5 - E5 - D5 - E5 - - - - - . .' },
  { name: 'comp', wave: 'pulse', vol: .06, notes: '. . A4 . . A4 . . . . G4 . . G4 . . | . . F4 . . F4 . . . . E4 . . E4 . .' },
  { name: 'bass', wave: 'triangle', vol: .32, notes: 'A2 . . A2 . . A3 . F2 . . F2 . . F3 . | G2 . . G2 . . G3 . E2 . . E2 . . E3 .' },
  { name: 'drums', wave: 'drums', vol: .15, on: false, notes: 'k . c h s . c . k c . h s . c h' },
  { name: 'shaker', wave: 'drums', vol: .07, notes: 'h h t h h h t h h h t h h h t h' }] });
SONG('storm', { bpm: 160, steps: 4, tracks: [
  { name: 'lead', wave: 'saw', vol: .08, on: false, notes: 'E5 - - - G5 - F#5 - E5 - B4 - - - - - | C5 - - - D5 - E5 - F#5 - D5 - - - - - | E5 - - - G5 - A5 - B5 - A5 - G5 - F#5 - | E5 - D#5 - E5 - F#5 - E5 - - - - - . .' },
  { name: 'bass', wave: 'square', vol: .1, notes: 'E2 E2 E3 E2 E2 E3 E2 E3 E2 E2 E3 E2 E2 E3 E2 E3 | C2 C2 C3 C2 C2 C3 C2 C3 D2 D2 D3 D2 D2 D3 D2 D3' },
  { name: 'pad', wave: 'triangle', vol: .14, notes: 'B3 - - - - - - - - - - - - - - - | G3 - - - - - - - A3 - - - - - - -' },
  { name: 'drums', wave: 'drums', vol: .16, on: false, notes: 'k . k s . k s . k . k s . k s o' }] });
SONG('tidewall', { bpm: 155, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .12, on: false, notes: 'C5 - - G4 C5 - D5 - Eb5 - - - D5 - C5 - | Bb4 - - F4 Bb4 - C5 - D5 - - - Eb5 - F5 - | G5 - - - F5 - Eb5 - D5 - Eb5 - F5 - - - | G5 - Ab5 - G5 - F5 - G5 - - - - - . .' },
  { name: 'arp', wave: 'square', vol: .05, notes: 'C4 Eb4 G4 C5 C4 Eb4 G4 C5 Bb3 D4 F4 Bb4 Bb3 D4 F4 Bb4 | Ab3 C4 Eb4 Ab4 Ab3 C4 Eb4 Ab4 G3 B3 D4 G4 G3 B3 D4 G4' },
  { name: 'bass', wave: 'saw', vol: .09, notes: 'C2 C2 C3 C2 C2 C3 C2 C3 Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 Bb2 | Ab1 Ab1 Ab2 Ab1 Ab1 Ab2 Ab1 Ab2 G1 G1 G2 G1 G1 G2 G1 G2' },
  { name: 'drums', wave: 'drums', vol: .16, on: false, notes: 'k . h k s . h . k k h . s . h s' }] });
SONG('bossfight', { bpm: 170, steps: 4, tracks: [
  { name: 'lead', wave: 'saw', vol: .09, notes: 'E5 E5 . E5 G5 - E5 . F#5 F#5 . F#5 A5 - F#5 . | G5 G5 . G5 B5 - G5 . A5 - G5 - F#5 - D#5 - | E5 E5 . E5 G5 - E5 . F#5 F#5 . F#5 A5 - B5 . | C6 - B5 - A5 - G5 - F#5 - E5 - D#5 - B4 -' },
  { name: 'bass', wave: 'square', vol: .1, notes: 'E2 E3 E2 E3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 B1 B2 B1 B2 B1 B2 D#2 D#3' },
  { name: 'stab', wave: 'pulse', vol: .06, notes: 'B4 . . B4 . . B4 . A4 . . A4 . . A4 . | G4 . . G4 . . G4 . F#4 . . F#4 . . F#4 .' },
  { name: 'drums', wave: 'drums', vol: .17, notes: 'k h s h k k s h k h s h k s s s' }] });
SONG('kingtide', { bpm: 165, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .12, notes: 'D5 - - - A5 - - - G5 - F5 - E5 - F5 - | D5 - - - Bb5 - - - A5 - G5 - F5 - E5 - | D5 - - - A5 - - - D6 - C6 - Bb5 - A5 - | G5 - A5 - Bb5 - C6 - C#6 - - - - - . .' },
  { name: 'counter', wave: 'saw', vol: .05, notes: 'A4 - - - D5 - - - C5 - - - A4 - - - | Bb4 - - - D5 - - - C5 - - - Bb4 - - -' },
  { name: 'bass', wave: 'saw', vol: .1, notes: 'D2 D3 D2 D3 D2 D3 D2 D3 F2 F3 F2 F3 C2 C3 C2 C3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 A1 A2 A1 A2' },
  { name: 'drums', wave: 'drums', vol: .17, notes: 'k . s k k . s . k k s . k s s o' }] });
SONG('range', { bpm: 118, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .08, notes: 'E5 . G5 . A5 . . G5 E5 . D5 . E5 - - - | . . G5 . A5 . C6 . A5 . G5 . E5 - - -' },
  { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 . E3 . . E2 G2 . A2 . A3 . . A2 G2 . | C2 . C3 . . C2 D2 . E2 . E3 . D3 . B2 .' },
  { name: 'drums', wave: 'drums', vol: .14, notes: 'k . h . s . h k . k h . s . h h' }] });
SONG('results', { bpm: 120, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .1, notes: 'C5 - E5 - G5 - E5 - F5 - A5 - G5 - - - | E5 - G5 - C6 - B5 - A5 - G5 - E5 - - -' },
  { name: 'bass', wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . | A2 . E2 . A2 . E2 . F2 . G2 . C3 . G2 .' },
  { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . k . h . s . h .' }] });
SONG('ending', { bpm: 84, steps: 4, tracks: [
  { name: 'lead', wave: 'triangle', vol: .2, notes: 'D5 - - - F5 - - - A5 - - - D6 - - - | C6 - - - A5 - - - G5 - F5 - G5 - - - | A5 - - - - - - - G5 - F5 - E5 - - - | F5 - - - E5 - - - D5 - - - - - - -' },
  { name: 'pad', wave: 'pulse12', vol: .05, notes: 'F4 - - - - - - - E4 - - - - - - - | D4 - - - - - - - C#4 - - - - - - -' },
  { name: 'bass', wave: 'triangle', vol: .26, notes: 'D3 - - - - - - - C3 - - - - - - - | Bb2 - - - - - - - A2 - - - - - - -' }] });
SONG('continue', { bpm: 120, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .1, notes: 'A4 . A4 . A4 . A4 . G#4 . G#4 . G#4 . G#4 . | G4 . G4 . G4 . G4 . F#4 . F#4 . F4 - - -' },
  { name: 'bass', wave: 'triangle', vol: .3, notes: 'A2 - - - - - - - E2 - - - - - - -' }] });
SONG('clear', { bpm: 150, steps: 4, loop: false, tracks: [
  { wave: 'square', vol: .16, notes: 'G4 . C5 . E5 . G5 - - - E5 - G5 - - - C6 - - - - - - - . . . .' },
  { wave: 'triangle', vol: .3, notes: 'C3 . C3 . C3 . C3 - - - G2 - C3 - - - C3 - - - - - - - . . . .' },
  { wave: 'drums', vol: .14, notes: 'k . . . k . . . k . s . k . s s k . . . . . . .' }] });
SONG('gameover', { bpm: 90, steps: 4, loop: false, tracks: [
  { wave: 'triangle', vol: .2, notes: 'A4 - - - G#4 - - - G4 - - - F#4 - - - F4 - - - - - - - . .' },
  { wave: 'pulse12', vol: .06, notes: 'A3 - - - - - - - - - - - - - - - D3 - - - - - - - . .' }] });
SONG('extend', { bpm: 200, steps: 4, loop: false, tracks: [{ wave: 'pulse', vol: .12, notes: 'C5 E5 G5 C6 - - . .' }] });
SONG('bossintro', { bpm: 120, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .1, notes: 'E3 - E3 - E3 - F3 - F3 - - - E3 - - - - - . .' }, { wave: 'drums', vol: .2, notes: 'k . k . k . k . s s s s k . . . . . . .' }] });

/* ---- SFX: voice lists ---- */
const N = (freq, to, dur, vol, o = {}) => Object.assign({ wave: 'noise', freq, to, dur, vol, filter: o.filter || 'bandpass', q: o.q || 1 }, o);
const W = (wave, freq, to, dur, vol, o = {}) => Object.assign({ wave, freq, to, dur, vol }, o);
const SFX = {
  hg: [N(2200, 400, .1, .45, { filter: 'lowpass', q: .7 }), W('square', 200, 60, .07, .2), W('sine', 110, 40, .12, .45)],
  mg: [N(2600, 600, .06, .34, { filter: 'lowpass', q: .7 }), W('square', 150, 60, .045, .14), W('sine', 90, 40, .07, .3)],
  sg: [N(1400, 120, .32, .6, { filter: 'lowpass', q: .6 }), W('sine', 75, 28, .28, .6), N(4200, 900, .07, .3, { delay: .015 }), N(900, 600, .05, .2, { delay: .32 }), W('square', 300, 200, .04, .1, { delay: .34 })],
  gl: [W('sine', 170, 50, .22, .55), N(900, 200, .16, .3, { filter: 'lowpass' }), W('square', 600, 300, .05, .08)],
  empty: [W('square', 1500, 1400, .02, .16), W('square', 900, 880, .02, .12, { delay: .035 })],
  reload: [N(3000, 2000, .03, .22), W('square', 600, 300, .05, .1, { delay: .05 }), N(2000, 1500, .04, .26, { delay: .16 }), W('square', 300, 700, .04, .14, { delay: .19 })],
  switch: [W('square', 500, 900, .05, .1), N(2500, 2000, .03, .16, { delay: .04 })],
  coverin: [N(700, 220, .14, .26, { filter: 'lowpass' }), W('sine', 120, 55, .1, .28, { delay: .07 })],
  coverout: [N(700, 1700, .1, .18)],
  whizz: [N(3200, 700, .2, .22, { q: 4 })],
  ricochet: [W('square', 2600, 1200, .1, .08), W('sine', 3200, 2500, .22, .09)],
  imp_metal: [N(4200, 3000, .05, .22), W('square', 1900, 900, .05, .08)],
  imp_wood: [N(900, 500, .06, .3, { filter: 'lowpass' }), W('square', 160, 100, .04, .08)],
  imp_stone: [N(1600, 800, .05, .24)],
  imp_water: [N(600, 2200, .22, .22)],
  imp_glass: [N(6000, 3000, .14, .24), W('sine', 3300, 2000, .1, .1)],
  imp_cloth: [N(700, 400, .05, .18, { filter: 'lowpass' })],
  ehit: [W('square', 320, 140, .06, .16), N(1300, 600, .05, .2)],
  head: [W('sine', 1760, 1760, .26, .22), W('sine', 2637, 2637, .2, .12, { delay: .02 })],
  tick: [W('square', 1700, 1700, .03, .1)],
  chirp: [W('square', 2300, 3200, .07, .16), W('square', 1150, 1600, .07, .08)],
  timetick: [W('square', 1050, 1050, .03, .08)],
  timewarn: [W('pulse', 880, 880, .06, .12), W('pulse', 880, 880, .06, .12, { delay: .1 })],
  tidesin: [W('saw', 420, 90, .7, .26), N(500, 120, .9, .4, { filter: 'lowpass' })],
  pickup: [W('pulse', 880, 880, .22, .18, { arp: [0, 7, 12], step: .06 })],
  oneup: [W('pulse', 660, 660, .42, .2, { arp: [0, 4, 7, 12, 16, 19, 24], step: .05 })],
  newweapon: [W('square', 440, 440, .34, .16, { arp: [0, 5, 9, 12, 17], step: .06 })],
  boom: [N(900, 50, 1.3, .7, { filter: 'lowpass', q: .6 }), W('sine', 58, 26, 1.1, .7), N(3200, 400, .3, .3, { delay: .02 })],
  boom_s: [N(1300, 90, .55, .5, { filter: 'lowpass', q: .6 }), W('sine', 75, 34, .45, .5)],
  bounce: [W('square', 320, 280, .03, .1)],
  rocket: [N(2200, 500, .9, .26, { q: 2 })],
  twang: [W('saw', 240, 100, .3, .2), W('square', 480, 200, .1, .06)],
  hiss: [N(1500, 1100, 1.1, .18, { q: 3 })],
  pop: [W('square', 900, 300, .15, .14), N(3000, 1500, .1, .16)],
  spinup: [W('saw', 110, 950, .9, .14), N(2000, 4000, .9, .1, { q: 3 })],
  stomp: [W('sine', 62, 28, .32, .6), N(320, 100, .22, .3, { filter: 'lowpass' })],
  servo: [W('saw', 240, 420, .25, .06)],
  glass: [N(6400, 3000, .3, .3), W('sine', 3700, 3500, .15, .1), W('sine', 4900, 4700, .1, .08, { delay: .05 })],
  wood: [N(650, 300, .2, .38, { filter: 'lowpass' }), W('square', 210, 90, .1, .14)],
  ui_move: [W('square', 900, 900, .028, .08)],
  ui_ok: [W('pulse', 660, 660, .12, .14, { arp: [0, 7], step: .05 })],
  ui_back: [W('pulse', 520, 330, .1, .12)],
  stamp: [N(320, 120, .22, .5, { filter: 'lowpass' }), W('sine', 95, 45, .22, .5)],
  count: [W('square', 1400, 1400, .018, .05)],
  hurt: [W('saw', 320, 80, .28, .3), N(900, 300, .2, .3), W('sine', 70, 40, .3, .4)],
  blocked: [W('square', 2900, 2000, .06, .12), N(5200, 4000, .04, .14)],
  slash: [N(3400, 700, .16, .3, { q: 2 })],
  thunder: [N(220, 50, 2.2, .55, { filter: 'lowpass', q: .5 }), W('sine', 45, 30, 1.6, .3)],
  splash: [N(1300, 300, .45, .3)],
  action: [W('pulse', 523, 523, .32, .18, { arp: [0, 7, 12, 19], step: .07 })],
  engine: [W('saw', 60, 90, 1.2, .14), N(300, 500, 1.2, .2, { filter: 'lowpass' })],
  firework: [W('square', 300, 1400, .4, .05), N(2400, 300, .5, .3, { delay: .4 }), W('sine', 80, 40, .4, .3, { delay: .4 })],
  laser: [W('sine', 2200, 2400, .5, .05, { vib: [30, .02] })],
  zap: [W('saw', 1600, 300, .12, .14)],
  minigun: [N(2400, 800, .05, .32), W('square', 130, 70, .04, .14)],
  rotor: [N(200, 160, .3, .3, { filter: 'lowpass' })],
  lever: [W('square', 200, 120, .4, .2), N(400, 200, .4, .3, { filter: 'lowpass' })],
  gong: [W('sine', 220, 218, 1.6, .3), W('sine', 330, 328, 1.2, .14)]
};
TC.SFX = SFX;
const Audio3 = {
  live: 0,
  /** play a sound by name: o = { vol, pan (-1..1), pitch, at (world point: pan and distance from the listener) } */
  play(name, o = {}) {
    const A = TC.game && TC.game.audio; if (!A || HEADLESS) return;
    const c = A.ctx; if (!c || c.state !== 'running' || A.muted) return;
    const p = SFX[name]; if (!p) return;
    let vol = o.vol === undefined ? 1 : o.vol, pan = o.pan || 0;
    if (o.at && TC.listener) { const L = TC.listener, d = Math.hypot(o.at[0] - L.x, o.at[1] - L.y, o.at[2] - L.z); vol *= 1 / (1 + d / 240); const a = Math.atan2(o.at[1] - L.y, o.at[0] - L.x) - L.yaw; pan = clamp(Math.sin(a), -1, 1) * .8; }
    if (vol < .03) return;
    if (Audio3.live >= 24 && vol < .6) return;
    const last = Audio3._last || (Audio3._last = {}), now = c.currentTime; if (last[name] && now - last[name] < .03) return; last[name] = now;
    const bus = A.bus('sfx'); let out = bus;
    if (c.createStereoPanner && pan) { out = c.createStereoPanner(); out.pan.value = pan; out.connect(bus); }
    const mul = (o.pitch || 1) * (1 + ((now * 997) % 1 - .5) * .04);
    try { for (const v of p) A._voice(Object.assign({}, v, { vol: (v.vol === undefined ? .3 : v.vol) * vol }), out, now + .005, mul); } catch (e) { /* audio busy */ }
    Audio3.live++; setTimeout(() => Audio3.live--, 400);
  },
  /** music by id, crossfaded */
  music(id, o = {}) { const A = TC.game && TC.game.audio; if (!A) return; const s = id && reg('song', id); if (A.song && A.song.src === s) return; A.music(s || null, Object.assign({ fade: .8 }, o)); Audio3.songId = id; },
  layer(name, v, f = .6) { const A = TC.game && TC.game.audio; if (A && A.song && A.song.tracks.some(t => t.name === name)) A.layer(name, v, f); },
  sting(id) { const A = TC.game && TC.game.audio; const s = reg('song', id); if (A && s) A.sting(s, { at: 'now' }); },
  /* ---- ambience: a looping graph per stage ---- */
  amb: null,
  ambience(kind) {
    const A = TC.game && TC.game.audio, c = A && A.ctx; if (Audio3.amb) { try { Audio3.amb.stop(); } catch (e) { /* gone */ } Audio3.amb = null; }
    if (!c || HEADLESS || !kind || !A._noise) return;
    const bus = A.bus('sfx'), g = c.createGain(); g.gain.value = 0; g.connect(bus); g.gain.linearRampToValueAtTime(kind === 'storm' ? .32 : .18, c.currentTime + 1.5);
    const src = c.createBufferSource(); src.buffer = A._noise; src.loop = true; const f = c.createBiquadFilter();
    f.type = kind === 'storm' ? 'highpass' : 'lowpass'; f.frequency.value = kind === 'storm' ? 1800 : kind === 'sluice' ? 500 : 900; src.connect(f); f.connect(g); src.start();
    let hum = null; if (kind === 'sluice' || kind === 'turbine') { hum = c.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 55; const hg = c.createGain(); hg.gain.value = .05; hum.connect(hg); hg.connect(g); hum.start(); }
    Audio3.amb = { stop() { g.gain.linearRampToValueAtTime(0, c.currentTime + .5); src.stop(c.currentTime + .6); if (hum) hum.stop(c.currentTime + .6); } };
  }
};
TC.Audio3 = Audio3;
