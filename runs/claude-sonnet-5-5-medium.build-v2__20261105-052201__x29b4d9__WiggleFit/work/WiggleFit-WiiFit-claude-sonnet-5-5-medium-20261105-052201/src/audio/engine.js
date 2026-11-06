import { I, mtof } from './instruments.js';
import { TRACKS } from './tracks.js';
import { SFX } from './sfx.js';
import { speak, plan } from './voice.js';

export function buildGraph(ctx, vols) {
  const master = ctx.createDynamicsCompressor(); master.threshold.value = -10; master.knee.value = 12; master.ratio.value = 6; master.attack.value = 0.005; master.release.value = 0.2;
  const trim = ctx.createGain(); trim.gain.value = 0.9; master.connect(trim); trim.connect(ctx.destination);
  const mk = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; };
  const music = mk(vols.music), sfx = mk(vols.sfx), voice = mk(vols.voice);
  const an = {}; for (const [k, g] of Object.entries({ music, sfx, voice })) { const a = ctx.createAnalyser(); a.fftSize = 1024; g.connect(a); an[k] = a; }
  // reverb send for music
  const conv = ctx.createConvolver(); const len = Math.floor(ctx.sampleRate * 1.6); const ib = ctx.createBuffer(2, len, ctx.sampleRate); let s = 7;
  for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = ((s / 4294967296) * 2 - 1) * Math.pow(1 - i / len, 2.6); } }
  conv.buffer = ib; const send = ctx.createGain(); send.gain.value = 0.22; const musicIn = ctx.createGain(); musicIn.connect(music); musicIn.connect(send); send.connect(conv); conv.connect(music);
  return { master, music, sfx, voice, musicIn, an };
}
export function noteEvents(trackName, bar, step) { const tr = TRACKS[trackName]; return tr.parts(bar, step); }
// schedule one bar of a track at time t0 (used live and offline)
export function scheduleBar(ctx, out, trackName, bar, t0, bpmOverride, detuneFn) {
  const tr = TRACKS[trackName]; const bpm = bpmOverride || tr.bpm; const stepDur = 60 / bpm / 4;
  for (let s = 0; s < 16; s++) {
    const sw = (s % 2 === 1) ? tr.swing * stepDur : 0; const t = t0 + s * stepDur + sw; const cents = detuneFn ? detuneFn(t) : 0;
    for (const n of tr.parts(bar, s)) {
      const inst = I[n.i]; if (!inst) continue; const dur = (n.l || 0.2) * 4 * stepDur / 1.0 * 1;
      if (['kick', 'snare', 'brush', 'shaker', 'rim'].includes(n.i)) inst(ctx, out, t, n.v);
      else if (n.i === 'wood') inst(ctx, out, t, n.v, n.f); else inst(ctx, out, t, n.m, dur, n.v, cents);
    }
  }
  return 16 * stepDur;
}
export class AudioEngine {
  constructor(settings) {
    this.ctx = null; this.g = null; this.settings = settings; this.track = null; this.bar = 0; this.nextT = 0; this.timer = null; this.tilt = 0; this.bpm = 0; this.voiceEnd = 0; this.wantTrack = null; this.fade = 1; this.silent = false;
    this.events = { sfx: 0, voice: 0, music: 0 }; this.needsGesture = false;
  }
  vols() { const s = this.settings; return { music: s.music / 100, sfx: s.sound / 100, voice: s.voice / 100 }; }
  ensure() {
    if (this.ctx) return this.ctx; if (this.disabled) return null;
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); this.g = buildGraph(this.ctx, this.vols()); this.ctx.onstatechange = () => {}; if (this.wantTrack) this.play(this.wantTrack, this.bpm); this.startTimer(); } catch (e) { this.ctx = null; }
    return this.ctx;
  }
  wake() { const c = this.ensure(); if (c && c.state === 'suspended') { try { c.resume(); } catch (e) { /* ignore */ } } }
  get state() { return this.ctx ? this.ctx.state : 'none'; }
  applyVolumes() { if (!this.g) return; const v = this.vols(); const t = this.ctx.currentTime; this.g.music.gain.setTargetAtTime(v.music * this.fade, t, 0.05); this.g.sfx.gain.setTargetAtTime(v.sfx, t, 0.05); this.g.voice.gain.setTargetAtTime(v.voice, t, 0.05); }
  startTimer() { if (this.timer) return; this.timer = setInterval(() => this.tick(), 25); }
  setTilt(deg) { this.tilt = deg; }
  detune(t) { return this.tilt * 1.6 * Math.sin(t * 0.7); }
  play(name, bpm) {
    this.wantTrack = name; this.bpm = bpm || 0; if (!this.ctx) return;
    if (this.track === name && (bpm || 0) === this.curBpm) return;
    this.track = name; this.curBpm = bpm || 0; this.bar = 0; this.nextT = this.ctx.currentTime + 0.1; this.events.music++;
  }
  stopMusic() { this.track = null; this.wantTrack = null; }
  tick() {
    if (!this.ctx || !this.track || this.ctx.state !== 'running' || this.silent) return;
    while (this.nextT < this.ctx.currentTime + 0.15) {
      const len = scheduleBar(this.ctx, this.g.musicIn, this.track, this.bar, this.nextT, this.bpm || 0, (t) => this.detune(t));
      this.nextT += len; this.bar++;
    }
  }
  sfx(name, ...a) { if (this.silent) return; const c = this.ensure(); if (!c || c.state !== 'running' || !SFX[name]) return; this.events.sfx++; SFX[name](c, this.g.sfx, c.currentTime + 0.005, ...a); }
  // returns spoken duration (seconds) even when the context isn't running, so on-screen typing still works
  speak(text, voice) { const pl = plan(text, voice); if (this.silent) return pl.duration; const c = this.ensure(); if (c && c.state === 'running') { this.events.voice++; const t = Math.max(c.currentTime + 0.02, this.voiceEnd - 0.05); speak(c, this.g.voice, t, text, voice); this.voiceEnd = t + pl.duration; } return pl.duration; }
  stopAll() { this.silent = true; this.stopMusic(); if (this.timer) { clearInterval(this.timer); this.timer = null; } if (this.ctx) { try { this.ctx.suspend(); } catch (e) { /* ignore */ } } }
  level(bus) { if (!this.g) return 0; const a = this.g.an[bus]; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length); }
}
