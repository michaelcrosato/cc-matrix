import { INSTRUMENTS } from './instruments.js';
import { TRACKS, ROOTS, QUALITY } from './tracks.js';

export function parseChord(name) {
  const [root, q] = name.split(':');
  const r = ROOTS[root], iv = QUALITY[q];
  const notes = iv.map((i) => {
    let n = r + 24 + i;
    while (n < 56) n += 12;
    while (n > 76) n -= 12;
    return n;
  });
  return { root: r, notes, iv };
}
const DEG = { r: 0, 3: 1, 5: 2, 7: 3, 9: 3 };
function bassNote(ch, sym) {
  if (sym === 'r') return ch.root;
  if (sym === 'o') return ch.root + 12;
  const third = ch.iv.find((i) => i === 3 || i === 4 || i === 5) ?? 4;
  if (sym === '3') return ch.root + third;
  if (sym === '5') return ch.root + 7;
  if (sym === '7') return ch.root + (ch.iv.includes(11) ? 11 : 10);
  return ch.root + (DEG[sym] || 0);
}
/** Emit every note of bar b: fn(time, inst, midi, lenSec, vel). */
export function emitBar(track, b, t0, stepDur, fn) {
  const chords = track.chords;
  const chord = parseChord(chords[b % chords.length]);
  const sw = (step) => (step % 2 === 1 ? (track.swing || 0) * stepDur : 0);
  for (const p of track.parts) {
    if (p.from !== undefined && b < p.from) continue;
    if (p.every && b % p.every !== 0) continue;
    if (p.everyBar && b % p.everyBar !== p.everyBar - 1) continue;
    const vel = p.vel ?? 0.5;
    if (p.comp) {
      for (const [s, len] of p.comp) for (const n of chord.notes) fn(t0 + s * stepDur + sw(s), p.inst, n, len * stepDur, vel);
    } else if (p.line) {
      for (const [s, sym, len] of p.line) fn(t0 + s * stepDur + sw(s), p.inst, bassNote(chord, sym) + (p.oct || 0), len * stepDur, vel);
    } else if (p.hits) {
      for (let s = 0; s < 16; s++) if (p.hits[s] === 'x') fn(t0 + s * stepDur + sw(s), p.inst, p.note || 60, stepDur, vel);
    } else if (p.melody) {
      const bar = p.melody[b % p.melody.length];
      for (const [s, n, len] of bar) fn(t0 + s * stepDur + sw(s), p.inst, n, len * stepDur, vel);
    }
  }
}

/** Look-ahead scheduler on currentTime. One track at a time, with a fade on change. */
export class Sequencer {
  constructor(mix) {
    this.mix = mix; this.track = null; this.id = null; this.gain = null;
    this.bar = 0; this.barTime = 0; this.startTime = 0; this.paused = false; this.pausedPos = 0;
    this.tiltDeg = 0; this.ahead = 0.15; this.lastTick = 0; this.bpm = 0;
  }
  play(id, { bpm = null, at = null, fade = 0.5, sectionOffset = 0 } = {}) {
    const track = TRACKS[id];
    if (!track) return;
    if (this.id === id && !bpm && !at) return;
    this.stop(fade);
    const ctx = this.mix.ctx;
    this.gain = ctx.createGain();
    const t = at ?? ctx.currentTime + 0.05;
    this.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.gain.gain.linearRampToValueAtTime(1, Math.max(t, ctx.currentTime + 0.02));
    this.gain.connect(this.mix.musicIn);
    const send = ctx.createGain(); send.gain.value = 0.2; this.gain.connect(send); send.connect(this.mix.reverb);
    this.track = track; this.id = id; this.bpm = bpm || track.bpm;
    this.bar = sectionOffset; this.startTime = t; this.barTime = t; this.paused = false;
  }
  stop(fade = 0.5) {
    if (!this.gain) { this.track = null; this.id = null; return; }
    const ctx = this.mix.ctx, g = this.gain;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + Math.max(0.02, fade));
    this.gain = null; this.track = null; this.id = null;
  }
  get stepDur() { return 60 / this.bpm / 4; }
  /** Seconds since this track started. */
  position() { return this.track ? (this.paused ? this.pausedPos : this.mix.ctx.currentTime - this.startTime) : 0; }
  pause() { if (this.track && !this.paused) { this.pausedPos = this.position(); this.paused = true; } }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (!this.track) return;
    const ctx = this.mix.ctx, dt = ctx.currentTime + 0.05 - (this.startTime + this.pausedPos);
    this.startTime += dt; this.barTime += dt;
  }
  /** Detune while the island is crooked: tilt° × 1.6 × sin(t × 0.7) cents. Zero when level. */
  detuneAt(t) { return this.tiltDeg * 1.6 * Math.sin(t * 0.7); }
  tick() {
    if (!this.track || this.paused) return;
    const ctx = this.mix.ctx;
    const now = ctx.currentTime;
    if (now < this.lastTick) this.lastTick = now;
    const ahead = this.ahead;
    let guard = 0;
    if (this.barTime < now - 2) {
      const barDur = this.stepDur * 16;
      const skip = Math.floor((now - this.barTime) / barDur);
      this.barTime += skip * barDur; this.bar += skip;
    }
    while (this.barTime < now + ahead && guard++ < 8) {
      this._emit(this.bar, this.barTime);
      this.barTime += this.stepDur * 16; this.bar++;
    }
  }
  _emit(bar, t0) {
    const ctx = this.mix.ctx, gain = this.gain;
    emitBar(this.track, bar, t0, this.stepDur, (t, inst, midi, len, vel) => {
      const f = INSTRUMENTS[inst];
      if (f) f(ctx, gain, t, midi, len, vel, this.detuneAt(t));
    });
  }
}
