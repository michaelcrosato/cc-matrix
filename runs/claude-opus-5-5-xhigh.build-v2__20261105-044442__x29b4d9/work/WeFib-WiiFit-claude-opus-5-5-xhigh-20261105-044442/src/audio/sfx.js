import { noiseSrc, mtof, INSTRUMENTS } from './instruments.js';

const rnd = (m, a, b) => a + (b - a) * m.r();

function burst(m, t, out, freq, q, dur, vel, type = 'bandpass', rate = 1) {
  const ctx = m.ctx;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g); g.connect(out);
  noiseSrc(ctx, t, dur + 0.02, f, rate);
  return f;
}
function tone(m, t, out, type, f0, f1, dur, vel, a = 0.003) {
  const ctx = m.ctx;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  return o;
}

export const SFX = {
  clack(m, t, o = {}) { // wood clack: three resonant noise bursts, tuned per limb
    const base = o.pitch || rnd(m, 700, 1200);
    burst(m, t, m.sfx, base, 11, 0.05, 0.75);
    burst(m, t + rnd(m, 0.02, 0.05), m.sfx, base * 1.34, 12, 0.04, 0.5);
    burst(m, t + rnd(m, 0.06, 0.11), m.sfx, base * 0.72, 10, 0.05, 0.45);
  },
  fall(m, t) { for (let i = 0; i < 6; i++) SFX.clack(m, t + i * 0.07 + rnd(m, 0, 0.03), { pitch: rnd(m, 500, 1300) }); },
  spring(m, t) { // toy spring: rising sine with vibrato
    const o = tone(m, t, m.sfx, 'sine', 180, 900, 0.34, 0.5);
    const l = m.ctx.createOscillator(); l.frequency.value = 26;
    const g = m.ctx.createGain(); g.gain.value = 60; l.connect(g); g.connect(o.frequency); l.start(t); l.stop(t + 0.36);
  },
  splash(m, t, o = {}) {
    const big = o.big ?? 1;
    const f = burst(m, t, m.sfx, 3200, 0.5, 0.7 * big + 0.2, 0.7, 'lowpass');
    f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(420, t + 0.6 * big + 0.2);
    for (let i = 0; i < 4; i++) tone(m, t + 0.05 + i * 0.06, m.sfx, 'sine', rnd(m, 500, 1100), rnd(m, 200, 500), 0.08, 0.1);
    if (big > 1) tone(m, t, m.sfx, 'sine', 110, 44, 0.35, 0.5);
  },
  marble(m, t, o = {}) { tone(m, t, m.sfx, 'sine', o.pitch || rnd(m, 1800, 3900), rnd(m, 1500, 3000), 0.05, 0.22); },
  marbleRoll(m, t) { for (let i = 0; i < 5; i++) tone(m, t + i * 0.035, m.sfx, 'sine', rnd(m, 1600, 3600), rnd(m, 1400, 3000), 0.03, 0.1); },
  plateHum(m, t, o = {}) { tone(m, t, m.sfx, 'sine', o.pitch || 320, (o.pitch || 320) * 1.02, 0.12, 0.08, 0.03); },
  plateCrash(m, t) {
    burst(m, t, m.sfx, 4200, 3, 0.26, 0.6);
    for (let i = 0; i < 6; i++) tone(m, t + i * 0.03, m.sfx, 'triangle', rnd(m, 1800, 4800), rnd(m, 1400, 3200), 0.1, 0.18);
  },
  thud(m, t, o = {}) { tone(m, t, m.sfx, 'sine', o.pitch || 190, 70, 0.11, 0.6); burst(m, t, m.sfx, 900, 1, 0.04, 0.2); },
  spike(m, t) { tone(m, t, m.sfx, 'sawtooth', 1500, 240, 0.14, 0.35); burst(m, t, m.sfx, 5000, 2, 0.06, 0.3); },
  whistle(m, t) {
    const o = tone(m, t, m.sfx, 'square', 2300, 2500, 0.5, 0.2, 0.02);
    const l = m.ctx.createOscillator(); l.frequency.value = 38;
    const g = m.ctx.createGain(); g.gain.value = 130; l.connect(g); g.connect(o.frequency); l.start(t); l.stop(t + 0.52);
  },
  bell(m, t) { INSTRUMENTS.bell(m.ctx, m.sfx, t, 84, 1, 1.1); INSTRUMENTS.bell(m.ctx, m.sfx, t + 0.02, 91, 1, 0.5); },
  breathIn(m, t, o = {}) { const f = burst(m, t, m.sfx, 900, 1, o.dur || 2, 0.05); f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(2200, t + (o.dur || 2)); },
  breathOut(m, t, o = {}) { const f = burst(m, t, m.sfx, 900, 1, o.dur || 2, 0.05); f.frequency.setValueAtTime(1800, t); f.frequency.linearRampToValueAtTime(500, t + (o.dur || 2)); },
  gust(m, t, o = {}) { // rising band-passed noise
    const d = o.dur || 1.1;
    const f = m.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2;
    f.frequency.setValueAtTime(320, t); f.frequency.exponentialRampToValueAtTime(1900, t + d * 0.8);
    const g = m.ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.5, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.4);
    f.connect(g); g.connect(m.sfx);
    noiseSrc(m.ctx, t, d + 0.45, f);
  },
  creak(m, t, o = {}) { // slow saw through a resonant filter
    const d = o.dur || 1.8;
    const os = m.ctx.createOscillator(); os.type = 'sawtooth';
    os.frequency.setValueAtTime(42, t); os.frequency.linearRampToValueAtTime(58, t + d * 0.4); os.frequency.linearRampToValueAtTime(36, t + d);
    const f = m.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 16;
    f.frequency.setValueAtTime(420, t); f.frequency.linearRampToValueAtTime(820, t + d * 0.55); f.frequency.linearRampToValueAtTime(330, t + d);
    const g = m.ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.7, t + 0.15); g.gain.setValueAtTime(0.7, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    os.connect(f); f.connect(g); g.connect(m.sfx); os.start(t); os.stop(t + d + 0.02);
  },
  uiMove(m, t) { INSTRUMENTS.woodblock(m.ctx, m.sfx, t, 79, 0, 0.5); },
  uiConfirm(m, t) { INSTRUMENTS.woodblock(m.ctx, m.sfx, t, 84, 0, 0.7); INSTRUMENTS.woodblock(m.ctx, m.sfx, t + 0.07, 91, 0, 0.7); },
  uiBack(m, t) { INSTRUMENTS.woodblock(m.ctx, m.sfx, t, 76, 0, 0.6); INSTRUMENTS.woodblock(m.ctx, m.sfx, t + 0.07, 69, 0, 0.6); },
  stamp(m, t) { tone(m, t, m.sfx, 'sine', 150, 50, 0.16, 0.9); burst(m, t, m.sfx, 1400, 1, 0.05, 0.4); },
  drumRoll(m, t, o = {}) {
    const d = o.dur || 2;
    let at = t, i = 0;
    while (at < t + d) { burst(m, at, m.sfx, 2400, 0.8, 0.05, 0.18 + (0.4 * (at - t)) / d); at += 0.045; i++; }
    return i;
  },
  foot(m, t, o = {}) { // Step Class's click: music is only 10%, so the beat must read without it
    INSTRUMENTS.woodblock(m.ctx, m.sfx, t, o.note || 88, 0, o.vel || 0.9);
  },
  metronome(m, t, o = {}) { INSTRUMENTS.rim(m.ctx, m.sfx, t, 0, 0, o.vel || 0.8); },
  squawk(m, t) { // Gary: FM squawk
    const c = tone(m, t, m.sfx, 'sawtooth', 780, 520, 0.28, 0.32, 0.01);
    const mod = m.ctx.createOscillator(); mod.frequency.value = 62;
    const g = m.ctx.createGain(); g.gain.value = 460; mod.connect(g); g.connect(c.frequency); mod.start(t); mod.stop(t + 0.3);
  },
  boing(m, t) { tone(m, t, m.sfx, 'triangle', 120, 480, 0.25, 0.5); },
  sneeze(m, t) { burst(m, t, m.sfx, 2600, 0.8, 0.22, 0.7); tone(m, t, m.sfx, 'sawtooth', 420, 170, 0.18, 0.3); },
  catch(m, t) { tone(m, t, m.sfx, 'sine', mtof(72 + Math.floor(rnd(m, 0, 8))), 300, 0.1, 0.4); burst(m, t, m.sfx, 700, 1.2, 0.05, 0.3); },
  gullLand(m, t) { burst(m, t, m.sfx, 1800, 1, 0.1, 0.2); tone(m, t, m.sfx, 'sine', 300, 160, 0.08, 0.2); },
  whoosh(m, t) { const f = burst(m, t, m.sfx, 800, 1.1, 0.4, 0.3); f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2800, t + 0.34); },
};
