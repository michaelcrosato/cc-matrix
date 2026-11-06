import { INST } from './instruments.js';
import { TRACKS } from './tracks.js';
// Schedules one 16th-note step of a track.
export function scheduleStep(ctx, out, track, stepN, t, detuneAt) {
  const bar = Math.floor(stepN / 16), step = stepN % 16, chord = track.bars[bar % track.bars.length], s16 = 15 / track.bpm;
  for (const p of track.parts) {
    if (p.from && bar < p.from) continue;
    if (p.every && bar % p.every !== 0) continue;
    const fn = INST[p.inst]; const v = p.vel ?? .5, det = detuneAt(t);
    if (p.hits) { if (p.hits.includes(step)) fn(ctx, out, t, p.note || 0, .1, v); continue; }
    if (p.motif) { const b = p.motif[bar % p.motif.length]; for (const [st, n, l] of b) if (st === step) fn(ctx, out, t, n, l * s16, v, det); continue; }
    if (p.chord) { for (const [st, l] of p.chord) if (st === step) for (let i = 1; i < chord.length; i++) fn(ctx, out, t, chord[i], l * s16, v * .7, det + (i - 2) * 1.5); continue; }
    if (p.arp) { for (const [st, i] of p.arp) if (st === step) fn(ctx, out, t, chord[i], s16 * 2, v, det); continue; }
    if (p.bass) { for (const [st, off, l] of p.bass) if (st === step) fn(ctx, out, t, chord[0] + off, l * s16, v, det); continue; }
  }
}
export class Sequencer {
  constructor(audio) { this.audio = audio; this.track = null; this.name = null; this.step = 0; this.next = 0; this.gain = null; }
  play(name, { bpm, startAt } = {}) {
    if (this.name === name && !bpm && !startAt) return;
    this.stop(.6);
    const a = this.audio; if (!a.ctx) { this.name = name; return; }
    const t = TRACKS[name]; if (!t) return;
    this.track = bpm ? { ...t, bpm } : t; this.name = name; this.step = 0;
    this.next = startAt ?? a.ctx.currentTime + .08;
    this.gain = a.ctx.createGain(); this.gain.gain.value = 1; this.gain.connect(a.reverbSend);
    this.tick();
  }
  stop(fade = .4) { const a = this.audio; if (this.gain && a.ctx) { const g = this.gain; g.gain.setTargetAtTime(0, a.ctx.currentTime, Math.max(.01, fade / 3)); setTimeout(() => { try { g.disconnect(); } catch { /* it had already gone */ } }, (fade + 1) * 1000); } this.gain = null; this.track = null; this.name = null; }
  tick() {
    const a = this.audio; if (!this.track || !a.ctx || a.ctx.state !== 'running') { if (a.ctx && this.track) this.next = a.ctx.currentTime + .05; return; }
    if (this.next < a.ctx.currentTime - .5) this.next = a.ctx.currentTime + .03;
    const s16 = 15 / this.track.bpm; const horizon = a.ctx.currentTime + .25;
    while (this.next < horizon) {
      const swing = (this.step % 2 === 1) ? s16 * this.track.swing : 0;
      scheduleStep(a.ctx, this.gain, this.track, this.step, this.next + swing, a.detuneAt);
      this.step++; this.next += s16; this.lastPlayed = a.ctx.currentTime;
    }
  }
}
