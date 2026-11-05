/* ---- AUDIO: everything is synthesized in code. Nine original songs in the engine's step notation, sound effects,
   and the Babble synth: gibberish voices for the narrator, the heroes, the monsters and the King ---- */
const HORDE = '| k . h . s . h k k . h . s . h . | k . h . s . h k k . h . s s s s |';
const HEART = '| k . . k . . . . . . . . . . . . |';
E.songs.throwdown = { bpm: 100, steps: 4, tracks: [   // title: a D minor march
  { wave: 'square', vol: .1, notes: '| D5 - - - A4 - - - F4 - G4 - A4 - - - | Bb4 - - - A4 - G4 - F4 - E4 - D4 - - - | D5 - - - A4 - - - F4 - G4 - A4 - D5 - | C5 - Bb4 - A4 - G4 - A4 - - - - - . . |' },
  { wave: 'pulse', vol: .05, notes: '| F4 - - - F4 - - - D4 - E4 - F4 - - - | F4 - - - F4 - E4 - D4 - C#4 - A3 - - - | F4 - - - F4 - - - D4 - E4 - F4 - A4 - | A4 - G4 - F4 - E4 - E4 - - - - - . . |' },
  { wave: 'triangle', vol: .2, notes: '| D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | Bb1 . Bb2 . Bb1 . Bb2 . A1 . A2 . A1 . A2 . | D2 . D3 . D2 . D3 . D2 . D3 . D2 . D3 . | C2 . C3 . G1 . G2 . A1 . A2 . A1 . A2 . |' },
  { wave: 'drums', vol: .22, notes: '| k . s . k . s . k . s . k s s s |' } ] };
E.songs.larder = { bpm: 120, steps: 4, sync: true, tracks: [   // floors 1-3: bouncy minor, a plucked pulse, kitchen clatter
  { wave: 'pulse', vol: .08, notes: '| A4 . C5 . E5 . C5 . D5 . B4 . G4 . B4 . | A4 . C5 . E5 . A5 . G5 . E5 . D5 . . . | F4 . A4 . C5 . A4 . E4 . G#4 . B4 . E5 . | A4 . E4 . C5 . B4 . A4 - - - . . . . |' },
  { wave: 'triangle', vol: .2, notes: '| A2 . . A2 E2 . . . G2 . . G2 D2 . . . | A2 . . A2 E2 . . . G2 . . G2 G1 . . . | F2 . . F2 C2 . . . E2 . . E2 B1 . . . | A2 . . E2 A1 . . . A2 . E2 . A1 . . . |' },
  { wave: 'drums', vol: .16, notes: '| k . h c s . h . k k h c s . h h |' },
  { name: 'horde', on: false, wave: 'drums', vol: .2, notes: HORDE }, { name: 'heart', on: false, wave: 'drums', vol: .3, notes: HEART } ] };
E.songs.ossuary = { bpm: 96, steps: 3, sync: true, tracks: [   // floors 4-6: organ-like arpeggios in triplets over a drone
  { wave: 'pulse12', vol: .07, notes: '| E4 G4 B4 E5 B4 G4 E4 G4 B4 E5 B4 G4 | C4 E4 G4 C5 G4 E4 C4 E4 G4 C5 G4 E4 | A3 C4 E4 A4 E4 C4 A3 C4 E4 A4 E4 C4 | B3 D#4 F#4 B4 F#4 D#4 B3 D#4 F#4 B4 A4 F#4 |' },
  { wave: 'square', vol: .05, notes: '| E5 - - - - - - - - D5 - - | C5 - - - - - B4 - - G4 - - | A4 - - - - - C5 - - E5 - - | D#5 - - - - - - - - F#4 - - |' },
  { wave: 'triangle', vol: .22, notes: '| E2 - - - - - - - - - - - | C2 - - - - - - - - - - - | A1 - - - - - - - - - - - | B1 - - - - - - - - - - - |' },
  { wave: 'drums', vol: .12, notes: '| k . . h . . s . . h . . |' },
  { name: 'horde', on: false, wave: 'drums', vol: .2, notes: '| k . h k . h s . h k k h |' }, { name: 'heart', on: false, wave: 'drums', vol: .3, notes: '| k . k . . . . . . . . . |' } ] };
E.songs.furnace = { bpm: 136, steps: 4, sync: true, tracks: [   // floors 7-8: a driving saw bass, anvil hits
  { wave: 'saw', vol: .08, notes: '| C2 C2 C3 C2 Eb2 C2 C3 C2 G1 G1 G2 G1 Bb1 G1 G2 G1 | Ab1 Ab1 Ab2 Ab1 C2 Ab1 Ab2 Ab1 G1 G1 G2 G1 B1 G1 G2 B1 |' },
  { wave: 'square', vol: .07, notes: '| C5 - - . Eb5 - - . G5 - F5 - Eb5 - D5 - | Eb5 - - . C5 - - . D5 - - - B4 - - - | C5 - - . Eb5 - - . G5 - Ab5 - G5 - F5 - | Eb5 - D5 - C5 - B4 - C5 - - - - - . . |' },
  { wave: 'drums', vol: .2, notes: '| k . t . s . t k k . t . s t s . |' },
  { wave: 'noise', vol: .05, freq: 'C7', notes: '| . . . . C7 . . . . . . . C7 . . . |' },
  { name: 'horde', on: false, wave: 'drums', vol: .22, notes: HORDE }, { name: 'heart', on: false, wave: 'drums', vol: .3, notes: HEART } ] };
E.songs.hoard = { bpm: 160, steps: 4, sync: true, tracks: [   // treasure rooms: a frantic jig over a ticking hi-hat
  { wave: 'pulse', vol: .08, notes: '| G4 B4 D5 B4 G4 B4 D5 G5 F5 D5 C5 A4 F4 A4 C5 F5 | G4 B4 D5 B4 G4 B4 D5 G5 A5 G5 F5 D5 C5 A4 G4 . |' },
  { wave: 'triangle', vol: .2, notes: '| G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . F2 . C3 . G2 . . . |' },
  { wave: 'drums', vol: .16, notes: '| k h h h s h h h k h k h s h h h |' } ] };
E.songs.king = { bpm: 140, steps: 4, sync: true, tracks: [   // the boss: a layer added each phase
  { wave: 'triangle', vol: .22, notes: '| B1 . B2 . B1 . B2 . G1 . G2 . A1 . A2 . | B1 . B2 . B1 . B2 . F#1 . F#2 . F#1 . A#1 . |' },
  { wave: 'drums', vol: .2, notes: '| k . s . k k s . k . s . k k s s |' },
  { name: 'p2', on: false, wave: 'square', vol: .08, notes: '| B4 - - D5 - - F#5 - E5 - D5 - C#5 - - - | B4 - - D5 - - F#5 - G5 - F#5 - E5 - D5 - | C#5 - - E5 - - G5 - F#5 - E5 - D5 - C#5 - | B4 - - - A#4 - - - B4 - - - . . . . |' },
  { name: 'p3', on: false, wave: 'pulse12', vol: .06, notes: '| B5 F#5 D5 B4 B5 F#5 D5 B4 G5 D5 B4 G4 A5 E5 C#5 A4 |' },
  { name: 'heart', on: false, wave: 'drums', vol: .3, notes: HEART } ] };
E.songs.gauntletdown = { bpm: 112, steps: 4, tracks: [   // the ending and credits: a fanfare, then a calm theme
  { wave: 'square', vol: .1, notes: '| C5 - - G4 C5 - E5 - G5 - - - - - E5 - | F5 - - E5 D5 - C5 - D5 - - - G4 - - - | C5 - - G4 C5 - E5 - G5 - - - A5 - G5 - | F5 - E5 - D5 - B4 - C5 - - - - - . . |' },
  { wave: 'pulse', vol: .05, notes: '| E4 - - - E4 - G4 - C5 - - - - - C5 - | A4 - - - F4 - E4 - G4 - - - D4 - - - | E4 - - - E4 - G4 - C5 - - - C5 - C5 - | A4 - G4 - F4 - G4 - E4 - - - - - . . |' },
  { wave: 'triangle', vol: .2, notes: '| C2 . G2 . C3 . G2 . | F2 . C3 . G2 . D3 . | C2 . G2 . C3 . G2 . | F2 . G2 . C2 . . . |' },
  { wave: 'drums', vol: .14, notes: '| k . h . s . h . k . h . s . h h |' } ] };
E.songs.fed = { bpm: 70, steps: 4, loop: false, tracks: [   // game over: a slow descending dirge, once
  { wave: 'square', vol: .1, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - D4 - - - C#4 - - - D4 - - - - - - - - - - -' },
  { wave: 'triangle', vol: .2, notes: 'D3 - - - - - - - Bb2 - - - - - - - A2 - - - - - - - D2 - - - - - - - - - - -' } ] };
E.songs.namethyself = { bpm: 128, steps: 4, tracks: [   // initials and high scores: a short jaunty loop
  { wave: 'pulse', vol: .08, notes: '| E5 . C5 . G4 . C5 . E5 . G5 . E5 . C5 . | F5 . D5 . A4 . D5 . G5 . F5 . E5 . D5 . |' },
  { wave: 'triangle', vol: .18, notes: '| C3 . G2 . C3 . G2 . | D3 . A2 . G2 . B2 . |' },
  { wave: 'drums', vol: .12, notes: '| k . h . s . h . |' } ] };
const REALM_SONG = { larder: 'larder', ossuary: 'ossuary', furnace: 'furnace', banquet: 'king' };

/* ---- sound effects ---- */
const SFX_DEFS = {
  axe: { wave: 'noise', freq: 900, to: 300, dur: .14, vol: .14, filter: 'bandpass', q: 2 },
  javelin: { wave: 'noise', freq: 2400, to: 1200, dur: .1, vol: .1, filter: 'bandpass', q: 3 },
  arrow: [{ wave: 'triangle', freq: 'A5', to: 'A4', dur: .06, vol: .12 }, { wave: 'noise', freq: 3000, dur: .05, vol: .06 }],
  hex: { wave: 'square', freq: 'E5', to: 'E6', dur: .1, vol: .08, arp: [0, 7, 12], step: .03 },
  swing: { wave: 'noise', freq: 600, to: 1800, dur: .12, vol: .12, filter: 'bandpass', q: 1.5 },
  thunk: [{ wave: 'square', freq: 'C3', to: 'C2', dur: .08, vol: .16 }, { wave: 'noise', freq: 500, dur: .06, vol: .1 }],
  ghostdie: { wave: 'sine', freq: 'C6', to: 'C4', dur: .3, vol: .1, vib: [12, .05] },
  grunt: { wave: 'square', freq: 'G2', to: 'C2', dur: .14, vol: .12 },
  pop: { wave: 'noise', freq: 1600, to: 200, dur: .2, vol: .14, filter: 'lowpass' },
  smoke: { wave: 'noise', freq: 800, to: 100, dur: .3, vol: .08, filter: 'lowpass' },
  bones: [{ wave: 'noise', freq: 2500, dur: .05, vol: .1 }, { wave: 'noise', freq: 1800, dur: .05, vol: .1, delay: .06 }, { wave: 'noise', freq: 1200, dur: .06, vol: .1, delay: .12 }],
  genhit: { wave: 'square', freq: 'D3', to: 'A2', dur: .07, vol: .1 },
  crumble: [{ wave: 'noise', freq: 400, to: 60, dur: .6, vol: .22, filter: 'lowpass' }, { wave: 'triangle', freq: 'D2', to: 'D1', dur: .5, vol: .15 }],
  spawn: { wave: 'triangle', freq: 'C3', to: 'G3', dur: .18, vol: .06 },
  chomp: [{ wave: 'noise', freq: 1200, dur: .05, vol: .14, filter: 'bandpass' }, { wave: 'noise', freq: 900, dur: .05, vol: .12, delay: .09 }, { wave: 'square', freq: 'C5', to: 'G5', dur: .12, vol: .06, delay: .14 }],
  splat: [{ wave: 'noise', freq: 700, to: 150, dur: .25, vol: .18, filter: 'lowpass' }, { wave: 'square', freq: 'E3', to: 'A2', dur: .2, vol: .08 }],
  gurgle: { wave: 'sine', freq: 'C3', to: 'G2', dur: .5, vol: .14, vib: [18, .15] },
  flask: { wave: 'triangle', freq: 'G5', to: 'C6', dur: .15, vol: .1, arp: [0, 4, 7], step: .04 },
  blast: [{ wave: 'noise', freq: 300, to: 40, dur: .9, vol: .3, filter: 'lowpass' }, { wave: 'saw', freq: 'C3', dur: .7, vol: .08, hold: true }, { wave: 'saw', freq: 'E3', dur: .7, vol: .07, hold: true }, { wave: 'saw', freq: 'G3', dur: .7, vol: .07, hold: true }, { wave: 'sine', freq: 'C5', dur: 1, vol: .06 }],
  jingle: { wave: 'triangle', freq: 'E6', dur: .18, vol: .1, arp: [0, 5, 12, 5, 12], step: .03 },
  door: [{ wave: 'noise', freq: 1500, dur: .35, vol: .12, filter: 'highpass' }, { wave: 'square', freq: 'A2', to: 'E3', dur: .35, vol: .08 }],
  chest: [{ wave: 'square', freq: 'C3', to: 'G3', dur: .15, vol: .1 }, { wave: 'triangle', freq: 'C6', dur: .3, vol: .08, arp: [0, 4, 7, 12], step: .05, delay: .1 }],
  coins: { wave: 'square', freq: 'B5', dur: .14, vol: .07, arp: [0, 5], step: .04 },
  gem: { wave: 'sine', freq: 'E6', dur: .2, vol: .1, arp: [0, 7, 12, 19], step: .04 },
  crown: { wave: 'square', freq: 'C5', dur: .45, vol: .1, arp: [0, 4, 7, 12, 16, 19, 24], step: .05 },
  amulet: { wave: 'sine', freq: 'A5', dur: .5, vol: .1, arp: [0, 3, 7, 10, 12], step: .07, vib: [6, .02] },
  special: { wave: 'square', freq: 'C5', dur: .6, vol: .08, arp: [0, 4, 7, 12, 7, 12, 16, 19, 24], step: .05 },
  stairs: { wave: 'triangle', freq: 'C6', dur: .7, vol: .12, arp: [0, -2, -5, -7, -9, -12, -14, -17], step: .07 },
  trap: [{ wave: 'noise', freq: 200, to: 40, dur: 1.1, vol: .25, filter: 'lowpass' }, { wave: 'triangle', freq: 'E1', dur: 1, vol: .2 }],
  warp: { wave: 'sine', freq: 'C4', to: 'C6', dur: .35, vol: .1, vib: [20, .1] },
  stun: { wave: 'square', freq: 'A5', to: 'A3', dur: .3, vol: .08, vib: [30, .2] },
  zap: [{ wave: 'saw', freq: 'A2', dur: .2, vol: .12, vib: [40, .3] }, { wave: 'noise', freq: 3000, dur: .1, vol: .1 }],
  hum: { wave: 'saw', freq: 'A1', dur: .3, vol: .03 },
  shing: { wave: 'noise', freq: 5000, to: 2500, dur: .15, vol: .1, filter: 'highpass' },
  drone: { wave: 'saw', freq: 'D2', dur: .5, vol: .06, vib: [3, .03] },
  drain: { wave: 'sine', freq: 'A4', to: 'A3', dur: .2, vol: .05 },
  bell: [{ wave: 'sine', freq: 'G4', dur: 1.6, vol: .2 }, { wave: 'sine', freq: 'D6', dur: 1, vol: .06 }, { wave: 'triangle', freq: 'G3', dur: 1.4, vol: .1 }],
  whistle: { wave: 'sine', freq: 'C6', to: 'C5', dur: .5, vol: .05 },
  shatter: [{ wave: 'noise', freq: 4000, to: 1500, dur: .2, vol: .15, filter: 'highpass' }, { wave: 'noise', freq: 2000, dur: .1, vol: .1, delay: .05 }],
  fireball: { wave: 'noise', freq: 600, to: 1800, dur: .3, vol: .12, filter: 'bandpass', q: .8 },
  blink: { wave: 'sine', freq: 'E5', to: 'E4', dur: .2, vol: .06 },
  giggle: { wave: 'square', freq: 'C6', dur: .3, vol: .05, arp: [0, 3, 0, 5, 0, 3], step: .04 },
  stomp: [{ wave: 'noise', freq: 150, to: 40, dur: .5, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 'C1', dur: .4, vol: .25 }],
  plate: { wave: 'triangle', freq: 'E6', to: 'E5', dur: .2, vol: .06 },
  chew: { wave: 'noise', freq: 400, dur: .12, vol: .1, filter: 'lowpass' },
  roar: [{ wave: 'saw', freq: 'A1', to: 'E1', dur: .9, vol: .16, vib: [9, .08] }, { wave: 'noise', freq: 300, to: 100, dur: .9, vol: .14, filter: 'lowpass' }],
  collapse: [{ wave: 'noise', freq: 300, to: 30, dur: 2, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 'G1', to: 'C1', dur: 2, vol: .2 }],
  move: { wave: 'square', freq: 'A5', dur: .03, vol: .05 }, select: { wave: 'square', freq: 'C6', dur: .08, vol: .07, arp: [0, 7], step: .03 },
  back: { wave: 'square', freq: 'A4', to: 'E4', dur: .08, vol: .06 }, join: { wave: 'square', freq: 'C5', dur: .3, vol: .08, arp: [0, 4, 7, 12], step: .05 },
  leave: { wave: 'square', freq: 'C5', dur: .3, vol: .07, arp: [12, 7, 4, 0], step: .05 }, rise: { wave: 'triangle', freq: 'C4', dur: .8, vol: .1, arp: [0, 4, 7, 12, 16, 19], step: .1 },
  heartbeat: [{ wave: 'sine', freq: 'C2', dur: .1, vol: .25 }, { wave: 'sine', freq: 'C2', dur: .1, vol: .2, delay: .18 }]
};
for (const k in SFX_DEFS) A.define(k, SFX_DEFS[k]);
const sfx = (name, o) => { if (RUN_DEMO()) o = Object.assign({ vol: .6 }, o); A.sfx(name, o); };
/** music for a scene; the demo plays it a little quieter */
function music(id, o = {}) { A.music(id ? E.songs[id] : null, Object.assign({ fade: .6 }, o)); }

/* ---- BABBLE: Animalese / Simlish-style speech. Each syllable a short note through two formant filters chosen by its
   vowel, a breath of noise for s, t, k, p; the same word always sounds the same; questions rise ---- */
const VOICE = {
  gaunt: { base: 78, rate: 5, form: .8, wave: 'sawtooth', echo: true, vol: .22, duck: true },
  berserker: { base: 110, rate: 7, form: .95, wave: 'square', noise: .25, vol: .1 },
  shieldmaiden: { base: 190, rate: 7, form: 1.05, wave: 'sawtooth', vol: .1 },
  ranger: { base: 230, rate: 9, form: 1.1, wave: 'triangle', vol: .14 },
  hexer: { base: 260, rate: 8, form: 1.15, wave: 'sawtooth', vib: 7, vol: .1 },
  king: { base: 58, rate: 4, form: .7, wave: 'sawtooth', wet: true, echo: true, vol: .24, duck: true },
  fryar: { base: 170, rate: 8, form: 1.2, wave: 'square', nasal: true, vol: .06 },
  snatcher: { base: 420, rate: 11, form: 1.3, wave: 'square', vol: .05 },
  gnasher: { base: 120, rate: 10, form: .9, wave: 'square', max: 2, vol: .06 }
};
const FORMANT = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2300] };
const speaking = [];
function speak(text, id, o = {}) {
  const V = VOICE[id]; if (!V || !A._init || !A._init()) return;
  const ctx = A.ctx, bus = A.bus && A.bus('voice'); if (!ctx || !bus || ctx.state !== 'running' || A.muted) return;
  while (speaking.length >= 3) { const old = speaking.shift(); try { old.g.gain.setTargetAtTime(0, ctx.currentTime, .02); } catch (e) { /* gone */ } }
  const words = String(text).toLowerCase().replace(/[^a-z!?.,' ]/g, ' ').split(/\s+/).filter(Boolean), syl = [];
  for (const w of words) { const parts = w.match(/[^aeiouy]*[aeiouy]+[^aeiouy]*?(?=[^aeiouy]*[aeiouy]|$)|[^aeiouy]+$/g) || [w]; for (const p of parts) syl.push({ p, end: false }); syl.push({ gap: true, punct: /[!?.,]$/.test(w) ? w.slice(-1) : '' }); }
  const max = V.max ? V.max : o.max || 22, list = []; let n = 0; for (const s of syl) { if (!s.gap) n++; if (n > max) break; list.push(s); }
  const out = ctx.createGain(); out.gain.value = (V.vol || .12) * (o.vol || 1); out.connect(bus);
  if (V.echo) { const d = ctx.createDelay(1), fb = ctx.createGain(); d.delayTime.value = .18; fb.gain.value = .35; out.connect(d); d.connect(fb); fb.connect(d); d.connect(bus); }
  let t = ctx.currentTime + .03; const step = 1 / V.rate, q = /\?/.test(text);
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.gap) { t += s.punct ? step * 1.2 : step * .35; continue; }
    const vow = (s.p.match(/[aeiouy]/) || ['a'])[0], F = FORMANT[vow], h = E.hash2(s.p.length * 7 + s.p.charCodeAt(0), s.p.charCodeAt(s.p.length - 1) || 1);
    const last = i >= list.length - 2, semis = Math.round((h - .5) * 8) + (q && last ? 5 : last ? -3 : 0), f0 = V.base * Math.pow(2, semis / 12) * (V.wet ? 1 + Math.sin(i) * .04 : 1);
    const dur = step * (.65 + h * .5), osc = ctx.createOscillator(); osc.type = V.wave; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (last ? (q ? 1.15 : .9) : 1.02), t + dur);
    if (V.vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = V.vib; lg.gain.value = f0 * .04; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + .05); }
    const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + .008); env.gain.setValueAtTime(1, t + Math.max(.01, dur - .03)); env.gain.linearRampToValueAtTime(0, t + dur);
    for (const [k, fq] of F.entries()) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq * V.form * (V.nasal && k ? 1.3 : 1); bp.Q.value = V.nasal ? 9 : 5 + k * 2; osc.connect(bp); bp.connect(env); }
    if (V.wet) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600 + h * 400; osc.connect(lp); lp.connect(env); }
    if ((/^(s|sh|t|k|p|ch|z)/.test(s.p) || V.noise) && A._noise) { const nz = ctx.createBufferSource(), ng = ctx.createGain(), hp = ctx.createBiquadFilter(); nz.buffer = A._noise; hp.type = 'highpass'; hp.frequency.value = 2500; ng.gain.setValueAtTime(V.noise ? .25 : .6, t); ng.gain.exponentialRampToValueAtTime(.001, t + .05); nz.connect(hp); hp.connect(ng); ng.connect(env); nz.start(t, Math.random() * .5); nz.stop(t + .08); }
    env.connect(out); osc.start(t); osc.stop(t + dur + .02);
    t += dur + .012;
  }
  const end = t, entry = { g: out, end };
  speaking.push(entry);
  if (V.duck) { A.duck(true); clearTimeout(speak._duck); speak._duck = setTimeout(() => A.duck(false), (end - ctx.currentTime) * 1000 + 200); }
  setTimeout(() => { const i = speaking.indexOf(entry); if (i >= 0) speaking.splice(i, 1); }, (end - ctx.currentTime) * 1000 + 400);
}
const BARKS = { hurt: ['OOF', 'ARGH', 'OW', 'HNG'], low: ['FOOD NOW', 'SO HUNGRY', 'MEAT PLEASE'], pick: ['MINE', 'HAH', 'OOH', 'NICE'], magic: ['BEGONE', 'KABOOM', 'HAH HA'], join: ['ONWARD', 'LETS EAT', 'FOR SUPPER'] };
let barkT = 0;
function bark(h, kind) { if (!h || game.real < barkT || RUN_DEMO() && Math.random() < .6) return; barkT = game.real + .7; speak(E.pick(BARKS[kind]), h.D.voice, { max: 3 }); }
