// All sound is synthesized with Web Audio: no sample files to ship.
// SFX are one-shot voices; music is a small step sequencer with a lookahead scheduler.
import { settings } from './settings.js';

let ctx = null;
let master = null;
let sfxBus = null;
let musBus = null;
let noiseBuf = null;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.connect(master);
  musBus = ctx.createGain();
  musBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
}

export function applyVolumes() {
  if (!ctx) return;
  sfxBus.gain.value = settings.sfxVol * 0.6;
  musBus.gain.value = settings.musicVol * 0.3;
}

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// One oscillator with a pitch sweep and a decay envelope.
function tone({ f0, f1 = f0, dur = 0.2, type = 'square', vol = 0.3, bus = null, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus || sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Filtered noise burst, used for explosions, hats and whooshes.
function noise({ dur = 0.3, cutoff = 1200, q = 0.7, vol = 0.4, sweepTo = null, type = 'lowpass', delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(cutoff, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random());
  src.stop(t + dur + 0.02);
}

export const sfx = {
  laser() { tone({ f0: 1400, f1: 300, dur: 0.12, type: 'sawtooth', vol: 0.12 }); },
  missile() {
    noise({ dur: 0.5, cutoff: 500, sweepTo: 2000, vol: 0.25 });
    tone({ f0: 180, f1: 90, dur: 0.4, type: 'triangle', vol: 0.2 });
  },
  explode(size = 1) {
    noise({ dur: 0.5 + 0.4 * size, cutoff: 2600, sweepTo: 180, vol: Math.min(0.7, 0.35 * size) });
    tone({ f0: 160 / size, f1: 40, dur: 0.4, type: 'sine', vol: 0.25 });
  },
  hit() { tone({ f0: 320, f1: 120, dur: 0.18, type: 'square', vol: 0.18 }); },
  hurt() {
    tone({ f0: 220, f1: 60, dur: 0.5, type: 'sawtooth', vol: 0.25 });
    noise({ dur: 0.3, cutoff: 900, vol: 0.3 });
  },
  pickup() {
    [72, 76, 79, 84].forEach((m, i) => tone({ f0: midiHz(m), dur: 0.12, type: 'square', vol: 0.14, delay: i * 0.05 }));
  },
  ring() {
    tone({ f0: midiHz(88), dur: 0.5, type: 'sine', vol: 0.25 });
    tone({ f0: midiHz(93), dur: 0.6, type: 'sine', vol: 0.18, delay: 0.05 });
  },
  bomb() {
    noise({ dur: 1.2, cutoff: 3000, sweepTo: 60, vol: 0.7 });
    tone({ f0: 90, f1: 25, dur: 1.0, type: 'sine', vol: 0.5 });
  },
  roll() { noise({ dur: 0.45, cutoff: 400, sweepTo: 2400, type: 'bandpass', q: 1.5, vol: 0.3 }); },
  boost() { noise({ dur: 0.8, cutoff: 300, sweepTo: 1600, vol: 0.25 }); },
  warn() {
    tone({ f0: 880, dur: 0.15, type: 'square', vol: 0.12 });
    tone({ f0: 880, dur: 0.15, type: 'square', vol: 0.12, delay: 0.25 });
  },
  blip() { tone({ f0: 660, dur: 0.06, type: 'square', vol: 0.12 }); },
  select() { tone({ f0: 990, f1: 1320, dur: 0.08, type: 'square', vol: 0.12 }); },
  back() { tone({ f0: 500, f1: 260, dur: 0.1, type: 'square', vol: 0.1 }); },
  lockOn() { tone({ f0: 1760, f1: 1760, dur: 0.05, type: 'square', vol: 0.08 }); },
  fanfare() {
    [67, 72, 76, 79, 84].forEach((m, i) => tone({ f0: midiHz(m), dur: 0.35, type: 'square', vol: 0.15, delay: i * 0.12 }));
  },
};

// ---- Music ---------------------------------------------------------------

// Track: bpm, bass (MIDI notes, one per 8th), arp (MIDI notes, one per 16th), drums bool.
export const TRACKS = {
  title: {
    bpm: 96,
    bass: [45, 45, 48, 48, 41, 41, 43, 43],
    arp: [57, 60, 64, 69, 64, 60, 57, 52, 57, 60, 64, 69, 72, 69, 64, 60],
    drums: false,
  },
  plains: {
    bpm: 150,
    bass: [45, 45, 45, 48, 41, 41, 43, 43],
    arp: [57, 60, 64, 69, 72, 69, 64, 60, 62, 65, 69, 74, 77, 74, 69, 65],
    drums: true,
  },
  belt: {
    bpm: 124,
    bass: [38, 38, 41, 43, 36, 36, 38, 39],
    arp: [50, 53, 57, 62, 65, 62, 57, 53, 49, 52, 56, 61, 64, 61, 56, 52],
    drums: true,
  },
};

let musicTimer = null;
let musicTrack = null;
let musicStep = 0;
let nextTime = 0;

export function playMusic(name) {
  stopMusic();
  if (!ctx) return;
  musicTrack = TRACKS[name];
  if (!musicTrack) return;
  musicStep = 0;
  nextTime = ctx.currentTime + 0.1;
  musicTimer = setInterval(scheduleMusic, 40);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  musicTrack = null;
}

function scheduleMusic() {
  if (!ctx || !musicTrack) return;
  const step16 = 60 / musicTrack.bpm / 4;
  while (nextTime < ctx.currentTime + 0.15) {
    const s = musicStep;
    const at = nextTime - ctx.currentTime;
    if (s % 2 === 0) {
      const b = musicTrack.bass[(s / 2) % musicTrack.bass.length];
      tone({ f0: midiHz(b), dur: step16 * 1.8, type: 'sawtooth', vol: 0.09, bus: musBus, delay: at });
    }
    const a = musicTrack.arp[s % musicTrack.arp.length];
    tone({ f0: midiHz(a + 12), dur: step16 * 0.9, type: 'square', vol: 0.035, bus: musBus, delay: at });
    if (musicTrack.drums) {
      if (s % 8 === 0) {
        tone({ f0: 120, f1: 40, dur: 0.18, type: 'sine', vol: 0.35, bus: musBus, delay: at });
      }
      if (s % 4 === 2) {
        noise({ dur: 0.05, cutoff: 6000, type: 'highpass', vol: 0.12, delay: at });
      }
    }
    nextTime += step16;
    musicStep++;
  }
}
