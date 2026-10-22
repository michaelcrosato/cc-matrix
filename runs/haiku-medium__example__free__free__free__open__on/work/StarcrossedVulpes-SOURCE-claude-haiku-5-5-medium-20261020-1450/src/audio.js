// Procedural audio: Web Audio synth for sound effects and a small step sequencer for music.
// No audio files are needed, so the single-file build stays self-contained.
import { settings } from './settings.js';

let ctx = null;
let sfxBus = null;
let musBus = null;
let noiseBuf = null;
let timer = null;
let track = null;
let wanted = null;    // requested track; started as soon as audio is ready
let step = 0;
let nextTime = 0;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.connect(master);
  musBus = ctx.createGain();
  musBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  if (wanted) startTrack(wanted);
}

export function applyVolumes() {
  if (!ctx) return;
  sfxBus.gain.value = settings.sfxVol / 10;
  musBus.gain.value = (settings.musicVol / 10) * 0.6;
}

function env(node, t, peak, attack, release) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function tone({ type = 'square', f0, f1 = f0, dur, vol = 0.2, dest = sfxBus, when = 0, attack = 0.005 }) {
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  env(g, t, vol, attack, dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + attack + 0.05);
}

function noise({ dur, vol = 0.3, f0 = 2000, f1 = 200, type = 'lowpass', when = 0, dest = sfxBus }) {
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.frequency.setValueAtTime(f0, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = ctx.createGain();
  env(g, t, vol, 0.004, dur);
  src.connect(filt).connect(g).connect(dest);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

const SFX = {
  laser: () => tone({ type: 'square', f0: 1400, f1: 300, dur: 0.12, vol: 0.09 }),
  laserEnemy: () => tone({ type: 'sawtooth', f0: 520, f1: 180, dur: 0.18, vol: 0.07 }),
  homing: () => tone({ type: 'triangle', f0: 900, f1: 1500, dur: 0.2, vol: 0.1 }),
  cannon: () => { tone({ type: 'sawtooth', f0: 160, f1: 40, dur: 0.35, vol: 0.2 }); noise({ dur: 0.2, vol: 0.12 }); },
  explode: () => noise({ dur: 0.55, vol: 0.45, f0: 2400, f1: 90 }),
  explodeBig: () => { noise({ dur: 1.4, vol: 0.7, f0: 1800, f1: 40 }); tone({ type: 'sine', f0: 90, f1: 25, dur: 1.2, vol: 0.35 }); },
  hit: () => tone({ type: 'triangle', f0: 260, f1: 90, dur: 0.22, vol: 0.3 }),
  hurt: () => { tone({ type: 'sawtooth', f0: 220, f1: 60, dur: 0.5, vol: 0.25 }); noise({ dur: 0.3, vol: 0.2, f0: 800, f1: 100 }); },
  lock: () => tone({ type: 'sine', f0: 1320, f1: 1320, dur: 0.06, vol: 0.12 }),
  lockAll: () => [0, 0.08, 0.16].forEach((w) => tone({ type: 'sine', f0: 1040, dur: 0.08, vol: 0.12, when: w })),
  roll: () => noise({ dur: 0.5, vol: 0.25, f0: 400, f1: 3000, type: 'bandpass' }),
  boost: () => noise({ dur: 0.7, vol: 0.2, f0: 300, f1: 2400, type: 'bandpass' }),
  bomb: () => { noise({ dur: 1.2, vol: 0.8, f0: 3000, f1: 60 }); tone({ type: 'sine', f0: 140, f1: 30, dur: 1.0, vol: 0.5 }); },
  pickup: () => [0, 0.06, 0.12].forEach((w, i) => tone({ type: 'square', f0: 660 * (1 + i * 0.25), dur: 0.1, vol: 0.1, when: w })),
  ring: () => [0, 0.05].forEach((w, i) => tone({ type: 'sine', f0: 1500 + i * 500, dur: 0.35, vol: 0.18, when: w })),
  warn: () => [0, 0.3].forEach((w) => tone({ type: 'sawtooth', f0: 600, f1: 400, dur: 0.25, vol: 0.12, when: w })),
  transform: () => { tone({ type: 'sawtooth', f0: 120, f1: 1200, dur: 1.4, vol: 0.2 }); noise({ dur: 1.4, vol: 0.2, f0: 200, f1: 4000, type: 'bandpass' }); },
  menu: () => tone({ type: 'square', f0: 880, dur: 0.04, vol: 0.06 }),
  confirm: () => [0, 0.06].forEach((w, i) => tone({ type: 'square', f0: 700 + i * 300, dur: 0.07, vol: 0.09, when: w })),
  back: () => tone({ type: 'square', f0: 440, f1: 300, dur: 0.08, vol: 0.07 }),
  say: () => tone({ type: 'triangle', f0: 1100, f1: 1000, dur: 0.05, vol: 0.05 }),
  medal: () => [0, 0.15, 0.3, 0.6].forEach((w, i) => tone({ type: 'square', f0: [523, 659, 784, 1046][i], dur: 0.25, vol: 0.12, when: w })),
  fail: () => [0, 0.25, 0.5].forEach((w, i) => tone({ type: 'sawtooth', f0: [330, 294, 247][i], dur: 0.35, vol: 0.14, when: w })),
};

export function sfx(name) {
  if (!ctx || !SFX[name]) return;
  if (ctx.state === 'suspended') ctx.resume();
  SFX[name]();
}

// ---- Music -------------------------------------------------------------
// Each track is a 16-step bar. Lead/bass chars: 0-9 = scale degree, '.' = rest.
// Drums: k = kick, s = snare, h = hat, '.' = none.
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};
const TRACKS = {
  title:    { bpm: 84, root: 57, scale: 'minor', lead: '0...2.4.6...4.2.0.', bass: '0.......0.......', drums: '................' },
  plains:   { bpm: 124, root: 62, scale: 'major', lead: '0.2.4.5.4.2.0.2.4.6.5.4.2.0.', bass: '0.0.0.0.4.4.4.4.', drums: 'k.h.k.hsk.h.k.hs' },
  asteroid: { bpm: 138, root: 52, scale: 'minor', lead: '0.3.2.0.5.4.3.1.0.2.3.1.', bass: '0.0.0.0.0.0.2.2.', drums: 'k.h.k.hsk.h.k.h.' },
  fortress: { bpm: 108, root: 50, scale: 'phrygian', lead: '0.1.0.3.1.0.5.4.0.1.0.3.6.5.', bass: '0.......0.......', drums: 'k...k.s.k...k.s.' },
  boss:     { bpm: 150, root: 45, scale: 'minor', lead: '0.0.7.0.0.7.9.7.0.0.7.0.8.7.5.4', bass: '0.0.0.0.0.0.0.0.', drums: 'k.k.k.sk..k.k.sk' },
  results:  { bpm: 100, root: 62, scale: 'major', lead: '0...2.4.7...9...', bass: '0.......4.......', drums: '................' },
};

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function degreeMidi(t, ch) {
  const sc = SCALES[t.scale];
  const d = parseInt(ch, 10);
  return t.root + sc[d % sc.length] + 12 * Math.floor(d / sc.length);
}

function scheduleStep(t, s, when, stepDur) {
  const lead = t.lead[s % t.lead.length];
  if (lead !== '.') {
    const m = degreeMidi(t, lead);
    tone({ type: 'square', f0: midiToFreq(m + 12), dur: stepDur * 1.5, vol: 0.05, dest: musBus, when: when - ctx.currentTime, attack: 0.01 });
  }
  const bass = t.bass[s % t.bass.length];
  if (bass !== '.') {
    const m = degreeMidi(t, bass) - 12;
    tone({ type: 'sawtooth', f0: midiToFreq(m), dur: stepDur * 1.8, vol: 0.06, dest: musBus, when: when - ctx.currentTime, attack: 0.01 });
  }
  const dr = t.drums[s % t.drums.length];
  const w = when - ctx.currentTime;
  if (dr === 'k') tone({ type: 'sine', f0: 140, f1: 40, dur: 0.18, vol: 0.5, dest: musBus, when: w });
  if (dr === 's') noise({ dur: 0.14, vol: 0.25, f0: 3000, f1: 800, type: 'highpass', dest: musBus, when: w });
  if (dr === 'h') noise({ dur: 0.04, vol: 0.08, f0: 8000, f1: 6000, type: 'highpass', dest: musBus, when: w });
}

export function playMusic(name) {
  wanted = name;
  startTrack(name);
}

function startTrack(name) {
  if (track === name && timer) return;
  stopMusic();
  if (!ctx || !name || !TRACKS[name]) return;
  track = name;
  if (ctx.state === 'suspended') ctx.resume();
  const t = TRACKS[name];
  const stepDur = 60 / t.bpm / 4;
  step = 0;
  nextTime = ctx.currentTime + 0.08;
  timer = setInterval(() => {
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(t, step, nextTime, stepDur);
      nextTime += stepDur;
      step = (step + 1) % 16;
    }
  }, 25);
}

export function stopMusic() {
  wanted = null;
  if (timer) clearInterval(timer);
  timer = null;
  track = null;
}
