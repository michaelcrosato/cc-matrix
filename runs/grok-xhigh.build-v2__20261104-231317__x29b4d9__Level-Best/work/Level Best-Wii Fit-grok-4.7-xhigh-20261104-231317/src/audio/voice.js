/** Animalese blips. Each voice has its own gain so peaks sit near −6 dB. */

import { cosmetic } from '../core/rng.js';

export const VOICES = {
  trudy: { pitch: 420, rate: 16, wave: 'square', gain: 0.08, formant: 1.35, noise: 0.02 },
  stillwater: { pitch: 170, rate: 7, wave: 'sine', gain: 0.55, formant: 0.85, noise: 0.18 },
  bolster: { pitch: 95, rate: 11, wave: 'sawtooth', gain: 0.42, formant: 0.7, noise: 0.04 },
  guest: { pitch: 260, rate: 12, wave: 'triangle', gain: 0.28, formant: 1, noise: 0.05 },
  gary: { pitch: 700, rate: 9, wave: 'square', gain: 0.2, formant: 1.6, noise: 0.02 },
};

const FORMANTS = {
  a: [800, 1200], e: [400, 2200], i: [300, 2700], o: [500, 900], u: [350, 700],
};

function vowelOf(text) {
  const m = text.toLowerCase().match(/[aeiou]/);
  return m ? m[0] : 'a';
}

function blip(ctx, dest, t, voice, vowel, punct) {
  const pair = FORMANTS[vowel] || FORMANTS.a;
  let pitch = voice.pitch * (1 + (cosmetic('voice') - 0.5) * 0.04);
  if (punct === '?') pitch *= 1.18;
  if (punct === '!') pitch *= 1.28;
  if (punct === '.') pitch *= 0.9;
  const osc = ctx.createOscillator();
  osc.type = voice.wave;
  osc.frequency.setValueAtTime(pitch, t);
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f2.type = 'bandpass';
  f1.frequency.value = pair[0] * voice.formant;
  f2.frequency.value = pair[1] * voice.formant;
  f1.Q.value = 6;
  f2.Q.value = 5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(voice.gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(f1); f1.connect(f2); f2.connect(g);
  if (voice.noise > 0) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.sin(i * 0.9) * 0.5;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const ng = ctx.createGain();
    ng.gain.value = voice.noise * voice.gain;
    src.connect(ng); ng.connect(g);
    src.start(t); src.stop(t + 0.05);
  }
  g.connect(dest);
  osc.start(t); osc.stop(t + 0.07);
}

function tick(ctx, dest, t, voice) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (i % 5) / 5 - 0.5;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.value = voice.gain * 0.25;
  src.connect(g); g.connect(dest);
  src.start(t); src.stop(t + 0.02);
}

/** Speak text. Returns how long the line takes, in seconds. */
export function speak(ctx, dest, time, text, who = 'trudy') {
  const voice = VOICES[who] || VOICES.guest;
  const gap = 1 / voice.rate;
  let t = time;
  let group = '';
  const flush = (punct) => {
    if (!group) return;
    blip(ctx, dest, t, voice, vowelOf(group), punct);
    group = '';
    t += gap;
  };
  for (const ch of text) {
    if (/[aeiou]/i.test(ch)) group += ch;
    else if (/[a-z]/i.test(ch)) {
      tick(ctx, dest, t, voice);
      t += gap * 0.45;
    } else {
      flush(ch);
      t += gap * 0.7;
    }
  }
  flush('.');
  return t - time;
}

export function squawk(ctx, dest, t) {
  speak(ctx, dest, t, 'Nee nee!', 'gary');
}
