import { makeImpulse, INST } from './instruments.js';
import { Sequencer, scheduleStep } from './sequencer.js';
import { TRACKS, STINGS } from './tracks.js';
import { SFX, playSting } from './sfx.js';
import { speakLine } from './voice.js';
export class AudioEngine {
  constructor() {
    this.ctx = null; this.settings = { music: 10, sfx: 80, voice: 80 }; this.tiltDeg = 9; this.seq = new Sequencer(this); this.stopped = false; this.levels = { music: 0, sfx: 0, voice: 0 };
    this.detuneAt = (t) => this.tiltDeg * 1.6 * Math.sin(t * .7);
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) { try { this.ctx = new AC(); this.build(this.ctx); this.timer = setInterval(() => this.seq.tick(), 25); } catch { this.ctx = null; } }
  }
  build(ctx) {
    this.master = ctx.createDynamicsCompressor(); this.master.threshold.value = -10; this.master.ratio.value = 6; this.master.connect(ctx.destination);
    this.music = ctx.createGain(); this.sfxBus = ctx.createGain(); this.voice = ctx.createGain();
    this.music.connect(this.master); this.sfxBus.connect(this.master); this.voice.connect(this.master);
    this.reverbSend = ctx.createGain(); const dry = ctx.createGain(); dry.gain.value = .86; const wet = ctx.createGain(); wet.gain.value = .22; const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx);
    this.reverbSend.connect(dry).connect(this.music); this.reverbSend.connect(conv).connect(wet).connect(this.music);
    this.an = {}; for (const b of ['music', 'sfxBus', 'voice']) { const a = ctx.createAnalyser(); a.fftSize = 1024; this[b].connect(a); this.an[b] = a; }
    this.applyVolumes();
  }
  applyVolumes() { if (!this.ctx) return; this.music.gain.value = this.settings.music / 100; this.sfxBus.gain.value = this.settings.sfx / 100; this.voice.gain.value = this.settings.voice / 100; }
  setVolume(k, v) { this.settings[k] = v; this.applyVolumes(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended' && !this.stopped) { const p = this.ctx.resume(); if (p && p.catch) p.catch(() => {}); } }
  get running() { return !!this.ctx && this.ctx.state === 'running'; }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  playTrack(name, o) { if (this.stopped) return; this.seq.play(name, o); }
  stopTrack(fade) { this.seq.stop(fade); }
  sfx(name, p) { if (!this.running || this.stopped) return; const f = SFX[name]; if (f) f(this.ctx, this.sfxBus, this.ctx.currentTime + .002, p); }
  sting(name) { if (!this.running || this.stopped) return; const d = STINGS[name]; if (d) playSting(this.ctx, this.sfxBus, d, this.ctx.currentTime + .01); }
  speak(who, text) { if (!this.running || this.stopped) return 0; if (!this.voiceGate) this.newVoiceGate(); return speakLine(this.ctx, this.voiceGate, who, text, this.ctx.currentTime + .02)[0]; }
  newVoiceGate() { this.voiceGate = this.ctx.createGain(); this.voiceGate.connect(this.voice); }
  hushVoice() { if (this.voiceGate) { const g = this.voiceGate; g.gain.setTargetAtTime(0, this.ctx.currentTime, .02); this.voiceGate = null; setTimeout(() => { try { g.disconnect(); } catch { /* already gone */ } }, 500); } }
  level(bus) { const a = this.an?.[bus]; if (!a) return 0; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; return Math.sqrt(s / d.length); }
  /** Session end: stop all sound. */
  silence() { this.stopped = true; this.seq.stop(.05); if (this.timer) clearInterval(this.timer); if (this.ctx) { try { this.ctx.suspend(); } catch { /* already closed */ } } }
}
/** Offline render for tests. kind: track | sting | sfx | voice | click */
export async function renderOffline(kind, name, seconds = 4, opts = {}) {
  const sr = 22050, ctx = new OfflineAudioContext(2, Math.floor(sr * seconds), sr);
  const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination); const out = ctx.createGain(); out.gain.value = opts.gain ?? 1; out.connect(comp);
  let blips = 0;
  if (kind === 'track') { const tr = TRACKS[name]; const s16 = 15 / tr.bpm; const det = () => 0; let st = 0; for (let t = .01; t < seconds; t += s16) { scheduleStep(ctx, out, tr, st++, t + (st % 2 === 0 ? s16 * tr.swing : 0), det); } }
  else if (kind === 'sting') playSting(ctx, out, STINGS[name], .01);
  else if (kind === 'sfx') SFX[name](ctx, out, .01, opts.params);
  else if (kind === 'voice') { const r = speakLine(ctx, out, name, opts.text || 'Please step on. Not on me. On the island!', .01); blips = r[1]; }
  else if (kind === 'inst') INST[name](ctx, out, .01, 60, .5, .7);
  const buf = await ctx.startRendering(); const d = buf.getChannelData(0); let s = 0, peak = 0, bad = false;
  for (const v of d) { if (!Number.isFinite(v)) bad = true; s += v * v; peak = Math.max(peak, Math.abs(v)); }
  return { rms: Math.sqrt(s / d.length), peak, finite: !bad, blips };
}
