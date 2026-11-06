/** Step-sequenced tracks. Every note is a function of (ctx, destination, time). */

export const TRACK_IDS = [
  'title', 'story-calm', 'story-comic', 'story-tense', 'story-sad', 'story-villain',
  'or-calm', 'or-tense', 'strain-adagio', 'strain-staccato', 'strain-legato', 'strain-fermata',
  'coda', 'rounds', 'rain', 'credits', 'hush',
];

const DIES = [65, 64, 65, 62, 64, 60, 62, 62];

function midi(m) {
  return 440 * 2 ** ((m - 69) / 12);
}

function tone(ctx, dest, when, freq, dur, type, gain) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(30, freq), when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function kick(ctx, dest, when) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, when);
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.18);
  g.gain.setValueAtTime(0.5, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
  osc.connect(g);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + 0.3);
}

function hat(ctx, dest, when) {
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let s = 1;
  for (let i = 0; i < len; i++) {
    s = (s * 16807) % 2147483647;
    data[i] = (s / 2147483647 * 2 - 1) * (1 - i / len);
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = buf;
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  g.gain.value = 0.15;
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(when);
}

const LOOPS = {
  title: { bpm: 72, bass: DIES, lead: [60, 64, 67, 64], kick: true, hat: false, wave: 'triangle', gain: 0.22 },
  'story-calm': { bpm: 70, bass: [53, 55, 53, 50], lead: [65, 64, 62, 60], kick: false, hat: false, wave: 'sine', gain: 0.18 },
  'story-comic': { bpm: 120, bass: [55, 55, 58, 53], lead: [67, 70, 67, 62], kick: true, hat: true, wave: 'square', gain: 0.14 },
  'story-tense': { bpm: 96, bass: [46, 48, 46, 43], lead: [58, 61, 58, 55], kick: true, hat: false, wave: 'sawtooth', gain: 0.16 },
  'story-sad': { bpm: 64, bass: [50, 53, 48, 45], lead: [62, 65, 64, 60], kick: false, hat: false, wave: 'triangle', gain: 0.18 },
  'story-villain': { bpm: 66, bass: DIES, lead: [65, 68, 65, 62], kick: true, hat: false, wave: 'sawtooth', gain: 0.16 },
  'or-calm': { bpm: 76, bass: [41, 43, 41, 39], lead: [60, 63, 67, 63], kick: true, hat: true, wave: 'triangle', gain: 0.18 },
  'or-tense': { bpm: 92, bass: [39, 41, 39, 36], lead: [58, 61, 63, 58], kick: true, hat: true, wave: 'sawtooth', gain: 0.16 },
  'strain-adagio': { bpm: 60, bass: [44, 46, 44, 41], lead: [56, 58, 56, 53], kick: false, hat: false, wave: 'sine', gain: 0.2 },
  'strain-staccato': { bpm: 132, bass: [48, 48, 51, 46], lead: [72, 70, 72, 67], kick: true, hat: true, wave: 'square', gain: 0.12 },
  'strain-legato': { bpm: 80, bass: [43, 46, 48, 46], lead: [62, 65, 67, 65], kick: false, hat: false, wave: 'triangle', gain: 0.18 },
  'strain-fermata': { bpm: 40, bass: [36, 36, 36, 36], lead: [60, 64, 67, 72], kick: false, hat: false, wave: 'sine', gain: 0.22 },
  coda: { bpm: 84, bass: DIES, lead: [65, 69, 72, 65, 64, 62, 60, 62], kick: true, hat: true, wave: 'sawtooth', gain: 0.14 },
  rounds: { bpm: 100, bass: [43, 46, 41, 39], lead: [67, 70, 72, 67], kick: true, hat: true, wave: 'square', gain: 0.14 },
  rain: { bpm: 60, bass: [45, 48, 45, 41], lead: [60, 64, 60, 57], kick: false, hat: false, wave: 'sine', gain: 0.16 },
  credits: { bpm: 76, bass: [48, 52, 55, 52], lead: [64, 67, 72, 67], kick: true, hat: false, wave: 'triangle', gain: 0.2 },
  hush: { bpm: 48, bass: [36, 36, 43, 36], lead: [55, 55, 55, 55], kick: true, hat: false, wave: 'sine', gain: 0.2 },
};

export function scheduleTrack(ctx, dest, id, when = 0, seconds = 2.4) {
  const spec = LOOPS[id] || LOOPS.title;
  const beat = 60 / spec.bpm;
  const bars = Math.max(1, Math.ceil(seconds / (beat * 4)));
  for (let i = 0; i < bars * 4; i++) {
    const t = when + i * beat;
    if (t > when + seconds) break;
    const bass = spec.bass[i % spec.bass.length];
    tone(ctx, dest, t, midi(bass), beat * 0.9, 'sine', spec.gain);
    const lead = spec.lead[i % spec.lead.length];
    tone(ctx, dest, t, midi(lead), beat * 0.45, spec.wave, spec.gain * 0.7);
    if (spec.kick && i % 2 === 0) kick(ctx, dest, t);
    if (spec.hat && i % 2 === 1) hat(ctx, dest, t);
  }
}
