/** Animalese blips from the actual text, so a line always sounds the same. */

import { castOf } from '../data/cast.js';

export const VOICE_IDS = ['ren', 'bea', 'bell', 'pip', 'sorrento', 'ines', 'voss', 'patient', 'narration'];

const FORMANTS = {
  a: [730, 1090],
  e: [530, 1840],
  i: [270, 2290],
  o: [570, 840],
  u: [300, 870],
};

function vowelOf(chunk) {
  const m = chunk.toLowerCase().match(/[aeiou]/);
  return m ? m[0] : 'a';
}

function chunksOf(text) {
  const clean = String(text || 'ah').replace(/[^a-zA-Z]/g, ' ').trim();
  const words = clean.length ? clean.split(/\s+/) : ['ah'];
  const out = [];
  for (const word of words) {
    for (let i = 0; i < word.length; i += 3) out.push(word.slice(i, i + 3));
  }
  return out.length ? out.slice(0, 28) : ['ah'];
}

function blip(ctx, dest, when, freq, f1, f2, dur, peak, breath) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(Math.max(40, freq), when);
  const b1 = ctx.createBiquadFilter();
  const b2 = ctx.createBiquadFilter();
  b1.type = 'bandpass';
  b2.type = 'bandpass';
  b1.frequency.value = f1;
  b2.frequency.value = f2;
  b1.Q.value = 6;
  b2.Q.value = 8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(peak, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(b1);
  b1.connect(b2);
  b2.connect(g);
  g.connect(dest);
  osc.start(when);
  osc.stop(when + dur + 0.02);
  if (breath > 0) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, Math.max(1, len), ctx.sampleRate);
    const data = buf.getChannelData(0);
    let s = 17;
    for (let i = 0; i < data.length; i++) {
      s = (s * 48271) % 2147483647;
      data[i] = ((s / 2147483647) * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    const ng = ctx.createGain();
    src.buffer = buf;
    ng.gain.value = peak * breath;
    src.connect(ng);
    ng.connect(dest);
    src.start(when);
  }
}

export function scheduleVoice(ctx, dest, who, text, when = 0) {
  const voice = castOf(who);
  const parts = chunksOf(text);
  const dur = voice.clipped ? 0.05 : 0.07;
  const gap = dur / voice.rate;
  const ask = /\?\s*$/.test(text);
  const shout = /!\s*$/.test(text);
  const fall = /\.\s*$/.test(text);
  parts.forEach((chunk, i) => {
    const v = vowelOf(chunk);
    const [f1, f2] = FORMANTS[v];
    const tilt = ask ? 1 + i * 0.03 : fall ? 1 - i * 0.02 : 1;
    const waver = voice.waver ? 1 + Math.sin(i * 1.7) * voice.waver : 1;
    const mono = voice.monotone ? 1 : tilt * waver;
    const peak = (shout ? 0.28 : 0.18) * (voice.clipped ? 0.8 : 1);
    const t = when + i * gap;
    blip(ctx, dest, t, voice.pitch * mono, f1 * voice.formant, f2 * voice.formant, dur, peak, voice.breath || 0);
    if (voice.chorus) blip(ctx, dest, t + 0.012, voice.pitch * mono * 1.01, f1, f2, dur, peak * 0.4, 0);
  });
  return parts.length * gap;
}
