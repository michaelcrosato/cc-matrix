/** Short effects. Variation comes from the caller. */

import { woodblock } from './instruments.js';

function noise(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const low = Math.sin(i * 0.02) * 0.55;
    const grit = Math.sin(i * 0.37 + (i % 13)) * 0.35;
    data[i] = low + grit;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

function burst(ctx, dest, t, seconds, freq, amp, type = 'bandpass') {
  const src = noise(ctx, seconds);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(amp, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  src.connect(filter); filter.connect(g); g.connect(dest);
  src.start(t); src.stop(t + seconds + 0.02);
}

export function woodClack(ctx, dest, t, amp = 0.4) {
  burst(ctx, dest, t, 0.08, 1400, amp);
  burst(ctx, dest, t + 0.03, 0.06, 900, amp * 0.5);
  burst(ctx, dest, t + 0.05, 0.05, 1800, amp * 0.3);
}

export function toySpring(ctx, dest, t, amp = 0.3) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(880, t + 0.25);
  g.gain.setValueAtTime(amp, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.32);
}

export function splash(ctx, dest, t, big = false) {
  burst(ctx, dest, t, big ? 0.6 : 0.25, big ? 500 : 1400, big ? 0.55 : 0.3, 'lowpass');
}

export function marble(ctx, dest, t, amp = 0.25) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1400 + (t * 100) % 400, t);
  g.gain.setValueAtTime(amp, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.14);
}

export function plateHum(ctx, dest, t, speed = 6) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(180 + speed * 40, t);
  g.gain.value = 0.08;
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.4);
}

export function plateCrash(ctx, dest, t) { burst(ctx, dest, t, 0.35, 2200, 0.45); }
export function fruitThud(ctx, dest, t) { burst(ctx, dest, t, 0.12, 180, 0.4, 'lowpass'); }
export function urchin(ctx, dest, t) { burst(ctx, dest, t, 0.1, 2400, 0.35); }
export function whistle(ctx, dest, t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(1400, t);
  o.frequency.linearRampToValueAtTime(1800, t + 0.15);
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.32);
}
export function bell(ctx, dest, t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = 988;
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.62);
}
export function breath(ctx, dest, t, out = false) {
  burst(ctx, dest, t, 0.45, out ? 600 : 900, 0.12, 'bandpass');
}
export function wind(ctx, dest, t) { burst(ctx, dest, t, 0.5, 700, 0.28, 'bandpass'); }
export function creak(ctx, dest, t) {
  const o = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(90, t);
  o.frequency.linearRampToValueAtTime(140, t + 0.4);
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 8;
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(filter); filter.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.52);
}
export function uiMove(ctx, dest, t) { woodblock(ctx, dest, t, 660, 0.2); }
export function uiConfirm(ctx, dest, t) { woodblock(ctx, dest, t, 880, 0.28); }
export function uiBack(ctx, dest, t) { woodblock(ctx, dest, t, 440, 0.22); }
export function stamp(ctx, dest, t) { burst(ctx, dest, t, 0.15, 200, 0.5, 'lowpass'); }
export function drumRoll(ctx, dest, t) {
  for (let i = 0; i < 8; i++) woodblock(ctx, dest, t + i * 0.05, 500 + i * 30, 0.16);
}
export function footClick(ctx, dest, t) { woodblock(ctx, dest, t, 1200, 0.55); }

export const SFX = {
  woodClack, toySpring, splash, marble, plateHum, plateCrash, fruitThud, urchin, whistle, bell,
  breath, wind, creak, uiMove, uiConfirm, uiBack, stamp, drumRoll, footClick,
};
