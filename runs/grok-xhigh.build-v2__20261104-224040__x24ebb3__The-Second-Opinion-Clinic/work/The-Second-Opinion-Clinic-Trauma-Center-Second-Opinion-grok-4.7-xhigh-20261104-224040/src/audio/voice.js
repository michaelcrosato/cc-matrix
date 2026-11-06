import { renderSound } from '../../pixel-engine.js';
import { CAST } from '../content/story.js';

const VOWEL = { a: [700, 1200], e: [450, 1900], i: [320, 2200], o: [520, 900], u: [340, 780], y: [320, 2200] };

/** One glottal syllable. Pure PCM so Node can hear it with no audio device. */
export function renderSyllable(pitch = 1, vowel = 'a', ms = 110, sampleRate = 22050) {
  const n = Math.max(1, Math.floor((sampleRate * ms) / 1000));
  const out = new Float32Array(n);
  const pair = VOWEL[vowel] || VOWEL.a;
  const f0 = 120 * pitch;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.sin((Math.PI * i) / n);
    const pulse = (t * f0) % 1 < 0.12 ? 1 : 0.15;
    const tone = Math.sin(2 * Math.PI * pair[0] * t) * 0.55 + Math.sin(2 * Math.PI * pair[1] * t) * 0.35;
    out[i] = pulse * env * tone * 0.6;
  }
  return out;
}

export function voicePcm(who, text, sampleRate = 22050) {
  const pitch = CAST[who]?.pitch || 1;
  const parts = [];
  let total = 0;
  const gap = new Float32Array(Math.floor(sampleRate * 0.035));
  for (const raw of String(text || '')) {
    const ch = raw.toLowerCase();
    if (ch === ' ') {
      parts.push(gap);
      total += gap.length;
      continue;
    }
    const vowel = VOWEL[ch] ? ch : 'a';
    const ms = ch === '!' ? 80 : ch === '?' ? 140 : 100;
    const syl = renderSyllable(pitch, vowel, ms, sampleRate);
    parts.push(syl);
    total += syl.length;
  }
  const out = new Float32Array(Math.max(1, total));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function rms(samples) {
  let s = 0;
  for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i];
  return Math.sqrt(s / Math.max(1, samples.length));
}

export const CLICK = { wave: 'square', freq: 740, freqEnd: 180, decay: 0.07, volume: 0.4, duty: 0.25 };
export const ALARM = { wave: 'square', freq: 440, freqEnd: 880, decay: 0.28, volume: 0.35, duty: 0.5 };

export function effectBuffer(def = CLICK) {
  return renderSound(def);
}

export function wavDataUrl(samples, sampleRate = 22050) {
  const bytes = 44 + samples.length * 2;
  const buf = new ArrayBuffer(bytes);
  const view = new DataView(buf);
  const write = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  write(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  const bin = new Uint8Array(buf);
  let text = '';
  for (let i = 0; i < bin.length; i++) text += String.fromCharCode(bin[i]);
  return `data:audio/wav;base64,${btoa(text)}`;
}
