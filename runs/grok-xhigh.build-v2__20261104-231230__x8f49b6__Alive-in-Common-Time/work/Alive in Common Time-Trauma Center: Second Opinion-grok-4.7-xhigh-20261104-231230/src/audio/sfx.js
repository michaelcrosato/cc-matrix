/** Procedural effects. No samples on disk. */

export const EFFECT_IDS = [
  'heartbeat', 'ecg', 'flatline', 'scalpel', 'forceps', 'pop', 'glass', 'suction', 'gel',
  'stitch', 'thread', 'laser', 'scanner', 'clamp', 'syringe', 'defib', 'chitter', 'screech',
  'scratch', 'stamp', 'ui-move', 'ui-confirm', 'ui-back', 'rain', 'murmur', 'door', 'phone', 'alarm',
];

function envGain(ctx, dest, when, dur, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + Math.min(0.02, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  g.connect(dest);
  return g;
}

function osc(ctx, dest, when, dur, freq, type, peak) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  o.connect(envGain(ctx, dest, when, dur, peak));
  o.start(when);
  o.stop(when + dur + 0.02);
  return o;
}

function noise(ctx, dest, when, dur, peak, hp = 800) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let s = (Math.floor(when * 1000) + len) | 1;
  for (let i = 0; i < len; i++) {
    s = (s * 16807 + 1) % 2147483647;
    data[i] = (s / 2147483647) * 2 - 1;
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hp;
  src.buffer = buf;
  src.connect(filter);
  filter.connect(envGain(ctx, dest, when, dur, peak));
  src.start(when);
}

export function scheduleEffect(ctx, dest, id, when = 0) {
  switch (id) {
    case 'heartbeat':
      osc(ctx, dest, when, 0.12, 90, 'sine', 0.5);
      osc(ctx, dest, when + 0.16, 0.1, 70, 'sine', 0.35);
      break;
    case 'ecg':
      osc(ctx, dest, when, 0.06, 880, 'square', 0.2);
      break;
    case 'flatline':
      osc(ctx, dest, when, 0.8, 440, 'sine', 0.25);
      break;
    case 'scalpel':
      noise(ctx, dest, when, 0.18, 0.3, 1200);
      break;
    case 'forceps':
      osc(ctx, dest, when, 0.05, 1400, 'square', 0.2);
      break;
    case 'pop':
      osc(ctx, dest, when, 0.08, 220, 'sine', 0.4);
      break;
    case 'glass':
      osc(ctx, dest, when, 0.4, 1560, 'sine', 0.15);
      osc(ctx, dest, when, 0.35, 2100, 'sine', 0.08);
      osc(ctx, dest, when, 0.3, 2740, 'sine', 0.05);
      break;
    case 'suction':
      noise(ctx, dest, when, 0.35, 0.25, 200);
      break;
    case 'gel':
      noise(ctx, dest, when, 0.2, 0.18, 500);
      break;
    case 'stitch':
      osc(ctx, dest, when, 0.04, 1800, 'triangle', 0.2);
      break;
    case 'thread':
      noise(ctx, dest, when, 0.15, 0.15, 2000);
      break;
    case 'laser':
      osc(ctx, dest, when, 0.25, 190, 'sawtooth', 0.12);
      break;
    case 'scanner':
      osc(ctx, dest, when, 0.12, 1320, 'sine', 0.2);
      break;
    case 'clamp':
      osc(ctx, dest, when, 0.07, 320, 'square', 0.3);
      break;
    case 'syringe':
      noise(ctx, dest, when, 0.16, 0.2, 2500);
      break;
    case 'defib':
      osc(ctx, dest, when, 0.4, 90, 'sine', 0.2);
      osc(ctx, dest, when + 0.35, 0.2, 60, 'sine', 0.6);
      break;
    case 'chitter':
      osc(ctx, dest, when, 0.08, 2400, 'square', 0.12);
      osc(ctx, dest, when + 0.09, 0.08, 1800, 'square', 0.12);
      break;
    case 'screech':
      osc(ctx, dest, when, 0.3, 1600, 'sawtooth', 0.15);
      break;
    case 'scratch':
      noise(ctx, dest, when, 0.2, 0.28, 900);
      break;
    case 'stamp':
      osc(ctx, dest, when, 0.18, 70, 'sine', 0.55);
      break;
    case 'ui-move':
      osc(ctx, dest, when, 0.04, 660, 'square', 0.12);
      break;
    case 'ui-confirm':
      osc(ctx, dest, when, 0.08, 880, 'square', 0.18);
      break;
    case 'ui-back':
      osc(ctx, dest, when, 0.08, 330, 'square', 0.16);
      break;
    case 'rain':
      noise(ctx, dest, when, 0.8, 0.12, 600);
      break;
    case 'murmur':
      noise(ctx, dest, when, 0.5, 0.08, 300);
      break;
    case 'door':
      osc(ctx, dest, when, 0.2, 120, 'triangle', 0.3);
      break;
    case 'phone':
      osc(ctx, dest, when, 0.15, 480, 'sine', 0.2);
      osc(ctx, dest, when + 0.2, 0.15, 620, 'sine', 0.2);
      break;
    case 'alarm':
      osc(ctx, dest, when, 0.25, 740, 'square', 0.18);
      break;
    default:
      osc(ctx, dest, when, 0.1, 440, 'sine', 0.15);
  }
}
