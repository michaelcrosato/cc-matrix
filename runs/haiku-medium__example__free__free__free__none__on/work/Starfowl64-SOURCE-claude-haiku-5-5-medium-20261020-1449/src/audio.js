// Procedural audio via WebAudio: no sound files are shipped, every effect is synthesised.

let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = null;
let musicStep = 0;
let musicOn = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.22;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.5;
  sfxGain.connect(master);
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

function tone({ freq = 440, type = 'square', dur = 0.12, vol = 0.3, slideTo = null, when = 0, dest = null }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(dest || sfxGain);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ dur = 0.2, vol = 0.3, when = 0, cutoff = 2000 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + when;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxGain);
  src.start(t);
}

const SFX = {
  laser() { tone({ freq: 980, slideTo: 420, type: 'square', dur: 0.09, vol: 0.12 }); },
  lockOn() { tone({ freq: 1400, type: 'triangle', dur: 0.05, vol: 0.18 }); },
  lockFire() { tone({ freq: 700, slideTo: 1500, type: 'sawtooth', dur: 0.2, vol: 0.2 }); },
  hit() { noise({ dur: 0.12, vol: 0.25, cutoff: 1400 }); },
  explode() { noise({ dur: 0.55, vol: 0.5, cutoff: 900 }); tone({ freq: 120, slideTo: 40, type: 'sine', dur: 0.5, vol: 0.4 }); },
  bigExplode() { noise({ dur: 1.4, vol: 0.7, cutoff: 700 }); tone({ freq: 90, slideTo: 25, type: 'sine', dur: 1.2, vol: 0.6 }); },
  bomb() { tone({ freq: 60, slideTo: 30, type: 'sine', dur: 0.9, vol: 0.6 }); noise({ dur: 0.9, vol: 0.5, cutoff: 500 }); },
  pickup() { tone({ freq: 660, type: 'triangle', dur: 0.1, vol: 0.25 }); tone({ freq: 990, type: 'triangle', dur: 0.14, vol: 0.25, when: 0.08 }); },
  barrel() { tone({ freq: 300, slideTo: 900, type: 'sawtooth', dur: 0.35, vol: 0.18 }); },
  uturn() { tone({ freq: 200, slideTo: 800, type: 'sawtooth', dur: 0.6, vol: 0.15 }); },
  boost() { noise({ dur: 0.4, vol: 0.18, cutoff: 3000 }); },
  warning() { tone({ freq: 880, type: 'square', dur: 0.16, vol: 0.18 }); tone({ freq: 880, type: 'square', dur: 0.16, vol: 0.18, when: 0.25 }); },
  menu() { tone({ freq: 520, type: 'triangle', dur: 0.06, vol: 0.2 }); },
  select() { tone({ freq: 740, type: 'triangle', dur: 0.1, vol: 0.22 }); tone({ freq: 1110, type: 'triangle', dur: 0.12, vol: 0.22, when: 0.07 }); },
  back() { tone({ freq: 440, slideTo: 220, type: 'triangle', dur: 0.12, vol: 0.2 }); },
  medal() { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.22, when: i * 0.12 })); },
  fanfare() { [392, 523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'square', dur: 0.25, vol: 0.14, when: i * 0.18 })); },
};

export function sfx(name) {
  if (SFX[name]) SFX[name]();
}

// Simple looping chiptune-style bed: a bass pulse with an arpeggio over it.
const CHORDS = [
  [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 196, 246.9],
];

function musicBeat() {
  const c = ensure();
  if (!c || !musicOn) return;
  const bar = Math.floor(musicStep / 16) % CHORDS.length;
  const chord = CHORDS[bar];
  const step = musicStep % 16;
  if (step % 4 === 0) tone({ freq: chord[0] / 2, type: 'triangle', dur: 0.35, vol: 0.5, dest: musicGain });
  const arp = chord[step % 3];
  tone({ freq: arp * 2, type: 'square', dur: 0.1, vol: 0.12, dest: musicGain });
  musicStep++;
}

export function startMusic(bpm = 118) {
  ensure();
  if (musicOn) return;
  musicOn = true;
  musicStep = 0;
  const interval = (60 / bpm) / 4 * 1000;
  musicBeat();
  musicTimer = setInterval(musicBeat, interval);
}

export function stopMusic() {
  musicOn = false;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

export function setVolumes({ music = 0.22, sfxLevel = 0.5 } = {}) {
  ensure();
  if (musicGain) musicGain.gain.value = music;
  if (sfxGain) sfxGain.gain.value = sfxLevel;
}
