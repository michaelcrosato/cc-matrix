/** Instruments take a context so live and offline renders share them. */

export function midiHz(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function envGain(ctx, t, attack, hold, release, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return g;
}

export function epiano(ctx, dest, t, freq, dur = 0.4, amp = 0.35) {
  const carrier = ctx.createOscillator();
  const tine = ctx.createOscillator();
  const body = ctx.createOscillator();
  const index = ctx.createGain();
  const g = envGain(ctx, t, 0.008, dur * 0.25, dur, amp);
  carrier.type = 'sine';
  body.type = 'sine';
  tine.type = 'sine';
  carrier.frequency.setValueAtTime(freq, t);
  body.frequency.setValueAtTime(freq, t);
  tine.frequency.setValueAtTime(freq * 14, t);
  index.gain.setValueAtTime(freq * 1.4, t);
  index.gain.exponentialRampToValueAtTime(1, t + 0.18);
  tine.connect(index);
  index.connect(carrier.frequency);
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.28;
  carrier.connect(g);
  body.connect(bodyGain);
  bodyGain.connect(g);
  g.connect(dest);
  const stop = t + dur + 0.05;
  carrier.start(t); body.start(t); tine.start(t);
  carrier.stop(stop); body.stop(stop); tine.stop(stop);
}

export function slapBass(ctx, dest, t, freq, dur = 0.3, amp = 0.4) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = envGain(ctx, t, 0.005, 0.04, dur, amp);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, t);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, t);
  filter.frequency.exponentialRampToValueAtTime(180, t + dur);
  const click = ctx.createOscillator();
  const cg = envGain(ctx, t, 0.002, 0.01, 0.03, amp * 0.4);
  click.type = 'square';
  click.frequency.setValueAtTime(freq * 3, t);
  osc.connect(filter); filter.connect(g); g.connect(dest);
  click.connect(cg); cg.connect(dest);
  osc.start(t); click.start(t);
  osc.stop(t + dur + 0.05); click.stop(t + 0.08);
}

export function marimba(ctx, dest, t, freq, dur = 0.35, amp = 0.3) {
  const a = ctx.createOscillator();
  const b = ctx.createOscillator();
  const g = envGain(ctx, t, 0.004, 0.02, dur, amp);
  a.type = 'sine'; b.type = 'sine';
  a.frequency.setValueAtTime(freq, t);
  b.frequency.setValueAtTime(freq * 4, t);
  const bg = ctx.createGain();
  bg.gain.value = 0.18;
  a.connect(g); b.connect(bg); bg.connect(g); g.connect(dest);
  a.start(t); b.start(t);
  a.stop(t + dur + 0.05); b.stop(t + dur * 0.4);
}

export function vibes(ctx, dest, t, freq, dur = 0.5, amp = 0.28) {
  const a = ctx.createOscillator();
  const b = ctx.createOscillator();
  const trem = ctx.createOscillator();
  const tg = ctx.createGain();
  const g = envGain(ctx, t, 0.02, dur * 0.4, dur, amp);
  a.type = 'sine'; b.type = 'sine'; trem.type = 'sine';
  a.frequency.setValueAtTime(freq, t);
  b.frequency.setValueAtTime(freq * 4, t);
  trem.frequency.setValueAtTime(5.5, t);
  tg.gain.value = amp * 0.15;
  trem.connect(tg); tg.connect(g.gain);
  a.connect(g); b.connect(g); g.connect(dest);
  a.start(t); b.start(t); trem.start(t);
  const stop = t + dur + 0.1;
  a.stop(stop); b.stop(stop); trem.stop(stop);
}

export function pad(ctx, dest, t, freq, dur = 1.2, amp = 0.12) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, t);
  const g = envGain(ctx, t, 0.25, dur, 0.4, amp);
  filter.connect(g); g.connect(dest);
  for (const det of [-7, 0, 6]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq * 2 ** (det / 1200), t);
    o.connect(filter);
    o.start(t); o.stop(t + dur + 0.5);
  }
}

export function brass(ctx, dest, t, freq, dur = 0.2, amp = 0.28) {
  const carrier = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const index = ctx.createGain();
  const g = envGain(ctx, t, 0.02, 0.05, dur, amp);
  carrier.type = 'sine'; mod.type = 'sine';
  carrier.frequency.setValueAtTime(freq, t);
  mod.frequency.setValueAtTime(freq, t);
  index.gain.setValueAtTime(freq * 1.5, t);
  index.gain.exponentialRampToValueAtTime(freq * 0.2, t + dur);
  mod.connect(index); index.connect(carrier.frequency);
  carrier.connect(g); g.connect(dest);
  carrier.start(t); mod.start(t);
  carrier.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
}

export function flute(ctx, dest, t, freq, dur = 0.6, amp = 0.16) {
  const o = ctx.createOscillator();
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.sin(i * 0.17) * 0.5;
  noise.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  const ng = ctx.createGain();
  ng.gain.value = 0.08;
  const g = envGain(ctx, t, 0.08, dur * 0.5, 0.2, amp);
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.connect(g);
  noise.connect(bp); bp.connect(ng); ng.connect(g); g.connect(dest);
  o.start(t); noise.start(t);
  o.stop(t + dur + 0.1); noise.stop(t + dur);
}

export function kick(ctx, dest, t, amp = 0.7) {
  const o = ctx.createOscillator();
  const g = envGain(ctx, t, 0.002, 0.02, 0.2, amp);
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.3);
}

export function snare(ctx, dest, t, amp = 0.35) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.sin(i * 12.7 + i * i * 0.001);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  const g = envGain(ctx, t, 0.002, 0.02, 0.12, amp);
  src.connect(filter); filter.connect(g); g.connect(dest);
  src.start(t); src.stop(t + 0.25);
}

export function shaker(ctx, dest, t, amp = 0.12) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.sin(i * 1.7) * (i % 7 === 0 ? 1 : 0.2);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 6000;
  const g = envGain(ctx, t, 0.002, 0.02, 0.04, amp);
  src.connect(filter); filter.connect(g); g.connect(dest);
  src.start(t); src.stop(t + 0.08);
}

export function woodblock(ctx, dest, t, freq = 880, amp = 0.3) {
  const o = ctx.createOscillator();
  const g = envGain(ctx, t, 0.001, 0.01, 0.08, amp);
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + 0.12);
}

export function brush(ctx, dest, t, amp = 0.1) {
  shaker(ctx, dest, t, amp * 0.7);
  woodblock(ctx, dest, t, 420, amp * 0.25);
}

export const INSTRUMENTS = {
  epiano, slapBass, marimba, vibes, pad, brass, flute, kick, snare, shaker, woodblock, brush,
};
