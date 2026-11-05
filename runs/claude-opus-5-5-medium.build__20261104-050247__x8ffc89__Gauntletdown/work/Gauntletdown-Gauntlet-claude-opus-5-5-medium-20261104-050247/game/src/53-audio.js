/* 53-audio: original chip songs (with dynamic layers), the sound effects, and Babble: a gibberish voice synth (vowel
 * formants through band-pass filters, consonant noise bursts) for the narrator, the heroes, the monsters and the King. */

const SONGS = {
  title: { bpm: 100, steps: 4, tracks: [   // "Throw Down": a D minor march
    { wave: 'square', vol: .13, notes: 'D4 - - F4 A4 - D5 - C5 - A4 - F4 - G4 - | A4 - - - E4 - G4 - F4 - E4 - D4 - - - | D5 - - C5 Bb4 - A4 - G4 - Bb4 - A4 - F4 - | E4 - G4 - A4 - C#5 - D5 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 . D2 . A1 . A1 . F2 . F2 . C2 . C2 . | A1 . A1 . E2 . E2 . D2 . D2 . D2 . . . | Bb1 . Bb1 . F2 . F2 . G1 . G1 . D2 . D2 . | A1 . A1 . A1 . C#2 . D2 . D2 . D2 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . s . k k s . k . s . k s s s' }] },
  card: { bpm: 90, steps: 4, tracks: [
    { wave: 'pulse12', vol: .1, notes: 'A4 - - - E4 - - - F4 - - - E4 - D4 - | C4 - - - D4 - E4 - A3 - - - - - . .' },
    { wave: 'triangle', vol: .28, notes: 'A2 - - - A2 - - - F2 - - - E2 - - - | A1 - - - D2 - E2 - A1 - - - - - . .' }] },
  realm: { bpm: 72, steps: 4, tracks: [
    { wave: 'saw', vol: .06, notes: 'D4 - - - - - F4 - E4 - - - D4 - - - | C4 - - - D4 - - - A3 - - - - - - -' },
    { wave: 'triangle', vol: .3, notes: 'D2 - - - - - - - Bb1 - - - - - - - | C2 - - - - - - - A1 - - - - - - -' },
    { wave: 'drums', vol: .08, notes: 'k . . . . . . . o . . . . . . .' }] },
  larder: { bpm: 120, steps: 4, tracks: [   // "The Larder": a bouncy minor with kitchen clatter
    { wave: 'pulse', vol: .11, notes: 'E5 . B4 . E5 . G5 . F#5 . E5 . D5 . B4 . | C5 . E5 . A5 . G5 . F#5 - - - . . . . | E5 . B4 . E5 . G5 . A5 . G5 . F#5 . D5 . | E5 - - - B4 . G4 . E4 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'E2 . E3 . E2 . E3 . D2 . D3 . D2 . D3 . | C2 . C3 . C2 . C3 . B1 . B2 . B1 . B2 . | E2 . E3 . E2 . E3 . D2 . D3 . D2 . D3 . | C2 . C3 . B1 . B2 . E2 . E2 . . . . .' },
    { name: 'drums', wave: 'drums', vol: .13, on: false, notes: 'k . h t s . h . k k h t s . h h' },
    { wave: 'drums', vol: .07, notes: 'h . . h . . h . h . . h . h . .' }] },
  ossuary: { bpm: 96, steps: 3, tracks: [   // "The Ossuary": organ arpeggios in triplets over a drone
    { wave: 'pulse12', vol: .1, notes: 'A3 C4 E4 A4 E4 C4 F3 A3 C4 F4 C4 A3 | G3 B3 D4 G4 D4 B3 E3 G#3 B3 E4 B3 G#3' },
    { wave: 'square', vol: .06, notes: 'E5 - - - - - - - - - - - | D5 - - - - - B4 - - - - - | C5 - - - - - - - - - - - | B4 - - - - - G#4 - - - - -' },
    { wave: 'triangle', vol: .3, notes: 'A1 - - - - - - - - - - - | G1 - - - - - E1 - - - - -' },
    { name: 'drums', wave: 'drums', vol: .12, on: false, notes: 'k . . s . . k . k s . .' }] },
  furnace: { bpm: 136, steps: 4, tracks: [   // "The Furnace Gut": a driving saw bass and anvil hits
    { wave: 'saw', vol: .08, notes: 'D3 D3 . D3 F3 . D3 . G3 . F3 . D3 . C3 . | D3 D3 . D3 F3 . A3 . G#3 . G3 . F3 . E3 .' },
    { wave: 'square', vol: .08, notes: 'D5 - - - - - . . F5 - E5 - D5 - . . | A4 - - - C5 - D5 - - - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 C2 . | Bb1 . Bb1 Bb1 . Bb1 Bb1 . A1 . A1 A1 . A1 C2 .' },
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: 'k . s k k . s . k . s k k s s s' },
    { wave: 'drums', vol: .08, notes: 'k . . . c . . . k . . . c . c .' }] },
  hoard: { bpm: 160, steps: 4, tracks: [   // "Hoard Rush": a frantic jig over a ticking hi-hat
    { wave: 'square', vol: .12, notes: 'G5 F#5 G5 A5 B5 . G5 . A5 G5 F#5 G5 E5 . D5 . | G5 F#5 G5 A5 B5 . D6 . C6 B5 A5 G5 F#5 . G5 .' },
    { wave: 'triangle', vol: .3, notes: 'G2 . D3 . G2 . D3 . C3 . G3 . D3 . A2 . | G2 . D3 . G2 . D3 . D3 . A2 . G2 . . .' },
    { wave: 'drums', vol: .1, notes: 'h h h h s h h h h h h h s h h h' }] },
  king: { bpm: 140, steps: 4, tracks: [   // "King Famish": a layer more each phase
    { wave: 'saw', vol: .08, notes: 'C4 . C4 . Eb4 . C4 . G4 . F4 . Eb4 . D4 . | C4 . C4 . Eb4 . G4 . Ab4 . G4 . F4 . D4 .' },
    { wave: 'triangle', vol: .32, notes: 'C2 C3 C2 C3 C2 C3 C2 C3 Ab1 Ab2 Ab1 Ab2 G1 G2 G1 G2' },
    { name: 'p2', wave: 'square', vol: .08, on: false, notes: 'C5 - - - Eb5 - - - G5 - F5 - Eb5 - D5 - | C5 - - - G4 - - - Ab4 - G4 - F4 - D4 -' },
    { name: 'p3', wave: 'drums', vol: .15, on: false, notes: 'k k s k k k s s k k s k s s s s' },
    { wave: 'drums', vol: .1, notes: 'k . s . k . s . k . s . k s s .' }] },
  ending: { bpm: 112, steps: 4, tracks: [   // "Gauntlet Down": a heroic major fanfare, then a calm theme
    { wave: 'square', vol: .13, notes: 'D5 - - A4 D5 - F#5 - A5 - - - F#5 - D5 - | E5 - - B4 E5 - G5 - B5 - - - A5 - G5 - | F#5 - D5 - A4 - D5 - G5 - F#5 - E5 - C#5 - | D5 - - - - - - - D4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'D2 . A2 . D3 . A2 . D2 . A2 . D3 . A2 . | E2 . B2 . E3 . B2 . G2 . D3 . G3 . D3 . | D2 . A2 . G2 . D3 . A1 . E2 . A2 . E2 . | D2 . A2 . D3 . . . D2 . . . . . . .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . k . h k s . h .' }] },
  over: { bpm: 70, steps: 4, loop: false, tracks: [   // "The Gaunt Is Fed": a slow descending dirge
    { wave: 'square', vol: .12, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - | D4 - - - C#4 - - - D4 - - - - - - - - - - -' },
    { wave: 'triangle', vol: .3, notes: 'D2 - - - - - - - Bb1 - - - - - - - | A1 - - - - - - - D1 - - - - - - - - - - -' }] },
  name: { bpm: 126, steps: 4, tracks: [   // "Name Thyself": a short jaunty loop
    { wave: 'pulse', vol: .11, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . C5 . D5 . B4 . C5 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . | C3 . A2 . G2 . G2 . C3 . G2 . C3 . . .' }] }
};
SONGS.boss = SONGS.king;
function music(name, o = {}) { const s = name && SONGS[name]; A.music(s || null, o); }
function layer(name, on, fade = 1) { try { A.layer(name, on ? 1 : 0, fade); } catch (e) { /* the song has no such layer */ } }

/* ---- sound effects (custom voices) ---- */
const SFX = {
  axe: { wave: 'noise', freq: 900, to: 300, dur: .12, vol: .14 },
  javelin: { wave: 'noise', freq: 2200, to: 800, dur: .09, vol: .12 },
  arrow: [{ wave: 'triangle', freq: 880, to: 1500, dur: .05, vol: .16 }, { wave: 'noise', freq: 3000, dur: .04, vol: .05 }],
  hex: { wave: 'square', freq: 660, to: 1320, dur: .1, vol: .1, vib: [30, .06] },
  swing: { wave: 'noise', freq: 1200, to: 400, dur: .1, vol: .16 },
  thud: { wave: 'square', freq: 140, to: 60, dur: .08, vol: .2 },
  chomp: [{ wave: 'noise', freq: 400, dur: .05, vol: .2 }, { wave: 'square', freq: 220, to: 330, dur: .1, vol: .12, arp: [0, 5, 0, 7], step: .03 }],
  splat: { wave: 'noise', freq: 600, to: 120, dur: .22, vol: .25 },
  gurgle: { wave: 'sine', freq: 180, to: 90, dur: .35, vol: .2, vib: [14, .2] },
  boom: [{ wave: 'noise', freq: 300, to: 40, dur: .6, vol: .35 }, { wave: 'triangle', freq: 220, dur: .7, vol: .14, arp: [0, 4, 7, 12], step: .12 }],
  jingle: { wave: 'square', freq: 1320, dur: .18, vol: .1, arp: [0, 7, 12], step: .05 },
  iron: [{ wave: 'noise', freq: 2000, to: 800, dur: .25, vol: .12 }, { wave: 'square', freq: 110, to: 90, dur: .3, vol: .12 }],
  chest: { wave: 'square', freq: 523, dur: .3, vol: .1, arp: [0, 4, 7, 12, 16], step: .05 },
  gem: { wave: 'triangle', freq: 1568, dur: .2, vol: .14, arp: [0, 5, 12], step: .04 },
  crown: { wave: 'square', freq: 784, dur: .5, vol: .12, arp: [0, 4, 7, 12, 7, 12, 16], step: .06 },
  power: { wave: 'square', freq: 392, dur: .6, vol: .11, arp: [0, 4, 7, 12, 16, 19, 24], step: .07 },
  stairs: { wave: 'pulse', freq: 880, dur: .7, vol: .12, arp: [0, -3, -7, -12, -15, -19, -24], step: .09 },
  rumble: { wave: 'noise', freq: 120, to: 40, dur: .7, vol: .3 },
  warp: { wave: 'sine', freq: 300, to: 1200, dur: .3, vol: .14, vib: [20, .1] },
  stun: { wave: 'square', freq: 1000, to: 500, dur: .25, vol: .1, vib: [40, .2] },
  zap: { wave: 'saw', freq: 220, to: 110, dur: .15, vol: .12 },
  shing: { wave: 'noise', freq: 4000, to: 2000, dur: .12, vol: .1 },
  drone: { wave: 'saw', freq: 55, dur: .6, vol: .1, vib: [3, .05] },
  drain: { wave: 'sine', freq: 600, to: 300, dur: .1, vol: .06 },
  dong: [{ wave: 'triangle', freq: 392, dur: 1.2, vol: .25 }, { wave: 'sine', freq: 784, dur: .9, vol: .1 }],
  whistle: { wave: 'sine', freq: 1400, to: 700, dur: .5, vol: .06 },
  shatter: { wave: 'noise', freq: 3000, to: 1500, dur: .2, vol: .2 },
  fireball: { wave: 'noise', freq: 500, to: 200, dur: .3, vol: .12 },
  blink: { wave: 'sine', freq: 900, to: 300, dur: .15, vol: .07 },
  giggle: { wave: 'square', freq: 900, dur: .3, vol: .06, arp: [0, 3, 0, 5, 0, 3], step: .04 },
  stomp: [{ wave: 'noise', freq: 150, to: 30, dur: .45, vol: .35 }, { wave: 'square', freq: 60, to: 30, dur: .4, vol: .2 }],
  roar: { wave: 'saw', freq: 90, to: 50, dur: .8, vol: .18, vib: [9, .2] },
  crumble: { wave: 'noise', freq: 400, to: 60, dur: .5, vol: .25 },
  spawn: { wave: 'noise', freq: 200, to: 600, dur: .2, vol: .05 },
  wail: { wave: 'sine', freq: 700, to: 200, dur: .35, vol: .08, vib: [7, .1] },
  clink: { wave: 'square', freq: 2400, dur: .06, vol: .07 },
  heart: { wave: 'sine', freq: 70, to: 50, dur: .12, vol: .25 },
  uiMove: { wave: 'square', freq: 660, dur: .04, vol: .07 },
  uiPick: { wave: 'square', freq: 880, dur: .1, vol: .09, arp: [0, 7], step: .05 },
  uiBack: { wave: 'square', freq: 440, to: 330, dur: .08, vol: .08 },
  join: { wave: 'square', freq: 523, dur: .3, vol: .1, arp: [0, 4, 7, 12], step: .06 },
  hurt: { wave: 'noise', freq: 900, to: 200, dur: .14, vol: .16 },
  choir: [{ wave: 'saw', freq: 220, dur: .9, vol: .05 }, { wave: 'saw', freq: 277, dur: .9, vol: .05 }, { wave: 'saw', freq: 330, dur: .9, vol: .05 }]
};
for (const k in SFX) A.define(k, SFX[k]);
const sfx = (name, o) => { if (!SC.mute) A.sfx(name, o); };

/* ---- Babble: the gibberish voices, on a voice bus of their own under the master ---- */
const VOICES = {
  narrator: { base: 78, rate: 5, wave: 'sawtooth', formant: .8, echo: true, gain: .5 },
  berserker: { base: 110, rate: 7, wave: 'square', formant: 1, noise: .3, gain: .3 },
  shieldmaiden: { base: 190, rate: 7, wave: 'sawtooth', formant: 1.05, gain: .28 },
  ranger: { base: 230, rate: 9, wave: 'sawtooth', formant: 1.15, gain: .26 },
  hexer: { base: 260, rate: 8, wave: 'square', formant: 1.2, vib: true, gain: .24 },
  king: { base: 58, rate: 4, wave: 'sawtooth', formant: .7, noise: .5, echo: true, gain: .55 },
  fryar: { base: 170, rate: 8, wave: 'square', formant: 1.3, narrow: true, gain: .18 },
  snatcher: { base: 420, rate: 11, wave: 'square', formant: 1.4, gain: .14 },
  gnasher: { base: 120, rate: 10, wave: 'sawtooth', formant: .9, noise: .4, gain: .16, max: 2 },
  ghost: { base: 300, rate: 4, wave: 'sine', formant: 1, gain: .12, max: 2 },
  lobber: { base: 200, rate: 9, wave: 'square', formant: 1.1, gain: .14, max: 3 },
  imp: { base: 340, rate: 10, wave: 'square', formant: 1.3, gain: .12, max: 2 },
  tithe: { base: 50, rate: 3, wave: 'sawtooth', formant: .6, echo: true, gain: .3, max: 3 }
};
const FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2300] };
var VB = { bus: null, echo: null, active: [] };   // (var: Settings may apply the Voices volume before this line runs)
function voiceBus() {
  const c = A.ctx; if (!c || !A._master) return null;
  if (VB.bus && VB.ctx === c) return VB.bus;
  VB.ctx = c; VB.bus = c.createGain(); VB.bus.connect(A._master);
  VB.echo = c.createDelay(1); VB.echo.delayTime.value = .18; const fb = c.createGain(); fb.gain.value = .35; VB.echo.connect(fb); fb.connect(VB.echo); VB.echo.connect(VB.bus);
  voiceVolume();
  return VB.bus;
}
function voiceVolume() { if (VB && VB.bus) VB.bus.gain.value = (S.voices === undefined ? .8 : S.voices); }
const syllables = text => (text.toLowerCase().match(/[^aeiouy\s.,!?'-]*[aeiouy]+[^aeiouy\s.,!?'-]*|[.,!?]/g) || []).slice(0, 26);
const sylHash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; };
function voiceSay(text, who = 'narrator') {
  if (!text || SC.mute) return;
  const c = A.ctx, bus = voiceBus(); if (!c || !bus || c.state !== 'running' || A.muted) return;
  const V = VOICES[who] || VOICES.narrator;
  VB.active = VB.active.filter(v => v.end > c.currentTime);
  if (VB.active.filter(v => v.who === who).length >= (V.max || 1)) return;
  if (VB.active.length >= 3) { const old = VB.active.shift(); try { old.g.gain.cancelScheduledValues(c.currentTime); old.g.gain.setTargetAtTime(0, c.currentTime, .02); } catch (e) { /* gone */ } }
  if (who === 'narrator' || who === 'king') A.duck && A.duck(true);
  const out = c.createGain(); out.gain.value = V.gain; out.connect(bus); if (V.echo) out.connect(VB.echo);
  let t = c.currentTime + .03; const sy = syllables(text), dur = 1 / V.rate;
  sy.forEach((s, i) => {
    if (/[.,!?]/.test(s)) { t += s === ',' ? dur * .6 : dur * 1.2; return; }
    const v = (s.match(/[aeiouy]/) || ['a'])[0], f = FORMANTS[v], hsh = sylHash(s);
    const last = i === sy.length - 1 || /[.!]/.test(sy[i + 1] || ''), q = /\?/.test(sy[i + 1] || '');
    const pitch = V.base * (1 + (hsh - .5) * .35) * (q ? 1.25 : last ? .85 : 1), d = dur * (.75 + hsh * .5);
    const o = c.createOscillator(); o.type = V.wave; o.frequency.setValueAtTime(pitch, t); o.frequency.linearRampToValueAtTime(pitch * (last ? .9 : 1.04), t + d);
    if (V.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 7; lg.gain.value = pitch * .05; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d + .05); }
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .008); g.gain.setValueAtTime(1, t + d - .03); g.gain.linearRampToValueAtTime(0, t + d);
    for (const [k, fq] of f.entries()) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq * V.formant; bp.Q.value = V.narrow ? 9 : k ? 6 : 5; o.connect(bp); bp.connect(g); }
    if (/^[sztkpcfh]/.test(s) || V.noise) {   // a consonant: a short burst of filtered noise
      const n = c.createBufferSource(), len = Math.floor(c.sampleRate * .04), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
      for (let j = 0; j < len; j++) ch[j] = (Math.random() * 2 - 1) * (1 - j / len);
      n.buffer = buf; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = /^s|z/.test(s) ? 3000 : 1200; const ng = c.createGain(); ng.gain.value = V.noise ? .4 : .25;
      n.connect(hp); hp.connect(ng); ng.connect(g); n.start(t); n.stop(t + .05);
    }
    g.connect(out); o.start(t); o.stop(t + d + .02);
    t += d + .012;
  });
  VB.active.push({ who, g: out, end: t });
  if (who === 'narrator' || who === 'king') setTimeout(() => { if (!VB.active.some(v => (v.who === 'narrator' || v.who === 'king') && v.end > c.currentTime)) A.duck && A.duck(false); }, (t - c.currentTime) * 1000 + 100);
}
const BARKS = { hurt: ['ugh!', 'oof!', 'agh!'], low: ['need... food...', 'so hungry'], eat: ['mmm!', 'yum!', 'om nom'], magic: ['kaboom!', 'begone!', 'hah!'], join: ['here i come!', 'save some for me!'], pick: ['ooh!', 'mine!'] };
function bark(h, kind) { if (!h || h.remote && !SESSION) return; if ((h.barkT || 0) > game.real) return; h.barkT = game.real + 1.2; voiceSay(Rv(BARKS[kind]), h.cls); }
const Rv = list => list[Math.floor(Math.random() * list.length)];

/* ---- sound from happenings ---- */
const SHOT_SFX = { axe: 'axe', javelin: 'javelin', arrow: 'arrow', hex: 'hex' };
const hpi = d => PARTY[d.pi];
bus.on('throw', d => sfx(SHOT_SFX[d.kind] || 'swing', { vol: .7 }));
bus.on('swing', () => sfx('swing'));
bus.on('melee', () => sfx('thud'));
bus.on('shothit', () => sfx('hit', { vol: .5 }));
bus.on('shotwall', d => d.team === 'hero' && sfx('clink', { vol: .5 }));
bus.on('clink', () => sfx('clink'));
bus.on('hurt', d => { sfx('hurt'); if (Math.random() < .35) bark(hpi(d), 'hurt'); });
bus.on('kill', d => { sfx(d.type === 'ghost' ? 'wail' : d.type === 'imp' ? 'boom' : d.type === 'tithe' ? 'choir' : 'thud', { vol: d.type === 'imp' ? .4 : .7 }); if (Math.random() < .15) voiceSay(Rv(['bleh', 'urk', 'nyah']), get('monsters', d.type) ? get('monsters', d.type).voice : 'gnasher'); });
bus.on('ghostbite', () => sfx('wail'));
bus.on('genhit', () => sfx('hit', { vol: .6, pitch: .6 }));
bus.on('gen', () => sfx('crumble'));
bus.on('spawn', d => { if (Math.random() < .3) sfx('spawn'); if (Math.random() < .05) voiceSay(Rv(['grah', 'hungry', 'meat']), (get('monsters', d.type) || {}).voice || 'gnasher'); });
bus.on('gone', d => {
  if (d.shot) return;
  const k = d.kind, h = PARTY[d.by];
  if (k === 'key') sfx('jingle'); else if (k === 'flask') sfx('pickup'); else if (k === 'gold') sfx('coin'); else if (k === 'gem') sfx('gem'); else if (k === 'crown' || k === 'gauntlet') sfx('crown');
  else if (k === 'chest' || k === 'lchest') sfx('chest'); else if (k === 'special' || k === 'amulet') sfx('power'); else if (k === 'stew') sfx('gurgle');
  else if (get('items', k) && get('items', k).food) { sfx('chomp'); if (h && Math.random() < .5) bark(h, 'eat'); }
});
bus.on('shotfood', () => sfx('splat'));
bus.on('magic', d => { sfx('boom'); sfx('choir'); if (hpi(d)) bark(hpi(d), 'magic'); });
bus.on('door', () => sfx('iron'));
bus.on('wall', () => sfx('crumble'));
bus.on('crack', () => sfx('hit', { vol: .4, pitch: .5 }));
bus.on('trap', () => sfx('rumble'));
bus.on('secret', () => sfx('secret'));
bus.on('tele', () => sfx('warp'));
bus.on('stun', () => sfx('stun'));
bus.on('stairs', () => sfx('stairs'));
bus.on('bell', () => sfx('dong'));
bus.on('lob', () => sfx('whistle'));
bus.on('crockbreak', d => sfx(d.kind === 'plate' ? 'shatter' : 'shatter', { vol: .7 }));
bus.on('spit', () => sfx('fireball'));
bus.on('blink', () => sfx('blink'));
bus.on('stolen', d => { sfx('giggle'); voiceSay('hee hee hee!', 'snatcher'); void d; });
bus.on('tithe', d => { sfx('drone'); if (!d.gone) voiceSay('your due... is due.', 'tithe'); });
bus.on('drain', () => sfx('drain', { vol: .5 }));
bus.on('fall', () => sfx('die'));
bus.on('rise', () => sfx('oneup'));
bus.on('join', d => { sfx('join'); bark(hpi(d), 'join'); });
bus.on('ricochet', () => sfx('clink', { pitch: 1.4 }));
bus.on('rankdown', () => sfx('hit', { vol: .3, pitch: 1.4 }));
bus.on('ui', d => sfx(d.k === 'move' ? 'uiMove' : d.k === 'back' ? 'uiBack' : d.k === 'join' ? 'join' : 'uiPick'));
bus.on('king', d => {
  if (d.what === 'stomp') sfx('stomp'); else if (d.what === 'throw') sfx('whistle'); else if (d.what === 'eat' || d.what === 'gulp') sfx('chomp', { pitch: .5 });
  else if (d.what === 'dead') { sfx('roar'); sfx('crumble'); } else if (d.what === 'phase') { sfx('roar'); layer(d.phase === 2 ? 'p2' : 'p3', true); } else if (d.what === 'chargewind' || d.what === 'stompwind' || d.what === 'wave') sfx('roar', { vol: .5 });
  if (d.line) NARR.speakAs(d.line, 'king', 'KING FAMISH');
});
