/* Dodging Daisies — original procedural Web Audio score and effects. */
const TAU = Math.PI * 2;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const NOISE = new WeakMap();

function noiseBuffer(ctx) {
  if (NOISE.has(ctx)) return NOISE.get(ctx);
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x4d414953;
  for (let i = 0; i < data.length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    data[i] = ((seed >>> 0) / 0xffffffff) * 2 - 1;
  }
  NOISE.set(ctx, buffer);
  return buffer;
}

function envelope(param, at, duration, level, attack = 0.008) {
  param.setValueAtTime(0.0001, at);
  param.exponentialRampToValueAtTime(Math.max(0.0002, level), at + Math.min(attack, duration * 0.3));
  param.exponentialRampToValueAtTime(0.0001, at + duration);
}

function tone(ctx, bus, at, frequency, duration, level, type = 'triangle', endFrequency = frequency, watch) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(10, frequency), at);
  if (endFrequency !== frequency) osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFrequency), at + duration);
  envelope(gain.gain, at, duration, level);
  osc.connect(gain).connect(bus);
  osc.start(at); osc.stop(at + duration + 0.02);
  watch?.(osc, gain);
  return osc;
}

function noise(ctx, bus, at, duration, level, frequency = 1700, kind = 'highpass', watch) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = kind; filter.frequency.value = frequency; filter.Q.value = 0.7;
  const gain = ctx.createGain();
  envelope(gain.gain, at, duration, level, 0.003);
  source.connect(filter).connect(gain).connect(bus);
  source.start(at); source.stop(at + duration + 0.02);
  watch?.(source, filter, gain);
}

function syllable(ctx, bus, at, pitch, duration, formant, level, watch) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(pitch * 0.78, at);
  osc.frequency.exponentialRampToValueAtTime(pitch * 1.16, at + duration * 0.38);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.88, at + duration);
  const first = ctx.createBiquadFilter(); first.type = 'bandpass'; first.frequency.value = formant; first.Q.value = 5;
  const second = ctx.createBiquadFilter(); second.type = 'bandpass'; second.frequency.value = formant * 2.2; second.Q.value = 8;
  const gain = ctx.createGain(); envelope(gain.gain, at, duration, level, 0.012);
  osc.connect(first).connect(gain); osc.connect(second).connect(gain); gain.connect(bus);
  osc.start(at); osc.stop(at + duration + 0.02);
  watch?.(osc, first, second, gain);
}

function musicStep(ctx, bus, at, step, watch) {
  const measure = Math.floor(step / 16) % 4;
  const beat = step % 16;
  const roots = [48, 45, 53, 55];
  const root = roots[measure];
  const melody = [12, null, 16, null, 19, 21, 19, null, 16, null, 14, 12, null, 14, 16, null];
  if (beat % 2 === 0) {
    const walk = [0, 0, 7, 9, 0, 12, 7, 10][beat / 2];
    tone(ctx, bus, at, midi(root - 12 + walk), 0.19, 0.35, 'triangle', undefined, watch);
  }
  if (beat % 4 === 2) {
    for (const interval of [0, 4, 7, 11]) tone(ctx, bus, at, midi(root + 12 + interval), 0.12, 0.035, 'sine', undefined, watch);
  }
  if (beat % 4 === 0) {
    tone(ctx, bus, at, 125, 0.13, 0.4, 'sine', 42, watch);
    noise(ctx, bus, at, 0.035, 0.035, 800, 'lowpass', watch);
  }
  if (beat % 8 === 4) noise(ctx, bus, at, 0.105, 0.16, 1500, 'highpass', watch);
  noise(ctx, bus, at, beat % 4 === 2 ? 0.07 : 0.028, beat % 2 ? 0.028 : 0.048, 6500, 'highpass', watch);
  const m = melody[(beat + (measure % 2 ? 4 : 0)) % 16];
  if (m !== null) {
    tone(ctx, bus, at, midi(root + m + 12), 0.15, 0.10, 'triangle', undefined, watch);
    tone(ctx, bus, at + 0.075, midi(root + m + 12), 0.12, 0.018, 'sine', undefined, watch);
  }
}

export class AudioSystem {
  constructor() {
    this.musicVolume = 0.10;
    this.effectsVolume = 0.65;
    this.muted = false;
    this.ctx = null;
    this.unlocked = false;
    this.scheduledNotes = 0;
    this.playedEffects = 0;
    this.voices = 0;
    this.active = 0;
    this.step = 0;
    this.nextStep = 0;
    this.voiceUntil = 0;
    this.lastEvents = new Map();
    this.engineTarget = 52;
    this._watch = (source, ...nodes) => {
      this.scheduledNotes++;
      this.active++;
      source.onended = () => {
        this.active--;
        source.disconnect();
        for (const node of nodes) node.disconnect();
      };
    };
  }

  async unlock() {
    if (!this.ctx) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return false;
      this.ctx = new AudioContextClass();
      const ctx = this.ctx;
      this.output = ctx.createGain(); this.output.gain.value = this.muted ? 0 : 0.72;
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVolume;
      this.fxBus = ctx.createGain(); this.fxBus.gain.value = this.effectsVolume;
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -10; this.limiter.knee.value = 12; this.limiter.ratio.value = 6;
      this.limiter.attack.value = 0.004; this.limiter.release.value = 0.16;
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512;
      this.musicBus.connect(this.limiter); this.fxBus.connect(this.limiter);
      this.limiter.connect(this.output).connect(this.analyser).connect(ctx.destination);
      this.meter = new Float32Array(this.analyser.fftSize);
      this.engine = ctx.createOscillator(); this.engine.type = 'sawtooth'; this.engine.frequency.value = 52;
      this.engineFilter = ctx.createBiquadFilter(); this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 180;
      this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0;
      this.engine.connect(this.engineFilter).connect(this.engineGain).connect(this.fxBus); this.engine.start();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.unlocked = this.ctx.state === 'running';
    this.nextStep = Math.max(this.nextStep, this.ctx.currentTime + 0.04);
    return this.unlocked;
  }

  setMusic(value) {
    this.musicVolume = clamp(value);
    if (this.ctx) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.035);
  }

  setEffects(value) {
    this.effectsVolume = clamp(value);
    if (this.ctx) this.fxBus.gain.setTargetAtTime(this.effectsVolume, this.ctx.currentTime, 0.035);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.ctx) this.output.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.025);
  }

  play(name) {
    if (!this.unlocked || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const at = ctx.currentTime + 0.007;
    const previous = this.lastEvents.get(name) ?? -99;
    if (at - previous < ({collect:0.022,boost:0.18,near:0.3,select:0.045}[name] ?? 0.07)) return;
    this.lastEvents.set(name, at); this.playedEffects++;
    const t = (frequency, duration, level, type = 'triangle', end = frequency, delay = 0) => tone(ctx, this.fxBus, at + delay, frequency, duration, level, type, end, this._watch);
    const n = (duration, level, frequency, kind = 'highpass', delay = 0) => noise(ctx, this.fxBus, at + delay, duration, level, frequency, kind, this._watch);
    if (name === 'collect') {
      const note = [84, 88, 91, 93][this.playedEffects % 4];
      t(midi(note), 0.075, 0.10, 'sine', midi(note + 4));
      t(midi(note - 12), 0.035, 0.025, 'square');
    } else if (name === 'gate') {
      t(450, 0.09, 0.12, 'triangle', 760);
      t(760, 0.085, 0.09, 'sine', 1080, 0.05);
      n(0.08, 0.035, 1500);
    } else if (name === 'boost') {
      t(88, 0.3, 0.065, 'sawtooth', 220);
      n(0.22, 0.07, 1800);
    } else if (name === 'crash') {
      t(150, 0.5, 0.25, 'sawtooth', 24);
      t(65, 0.4, 0.34, 'sine', 27);
      n(0.48, 0.5, 900, 'lowpass');
      n(0.13, 0.23, 2300, 'highpass');
    } else if (name === 'clear' || name === 'win') {
      const notes = name === 'win' ? [72, 76, 79, 84, 79, 84, 88, 91, 96] : [72, 76, 79, 84, 88];
      notes.forEach((note, index) => t(midi(note), index === notes.length - 1 ? 0.6 : 0.18, 0.15, 'triangle', midi(note), index * 0.075));
      n(0.32, 0.07, 4200, 'highpass', 0.18);
    } else if (name === 'start') {
      [60, 64, 67, 72].forEach((note, index) => t(midi(note), 0.18, 0.12, 'triangle', midi(note), index * 0.09));
      t(64, 0.35, 0.07, 'sawtooth', 140, 0.12);
    } else if (name === 'near') {
      t(600, 0.16, 0.11, 'sine', 1600); n(0.11, 0.03, 2600);
    } else if (name === 'deny') {
      t(170, 0.09, 0.08, 'square', 110); t(110, 0.1, 0.06, 'triangle', 90, 0.08);
    } else if (name === 'count') {
      t(660, 0.12, 0.12, 'square'); t(1320, 0.08, 0.02, 'sine');
    } else {
      t(880, 0.055, 0.07, 'sine', 1100); t(440, 0.035, 0.04, 'triangle');
    }
  }

  voice(seed = 'daisy') {
    if (!this.unlocked || !this.ctx) return;
    const ctx = this.ctx;
    if (ctx.currentTime < this.voiceUntil) return;
    let hash = 0;
    for (const character of String(seed)) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
    const count = 4 + hash % 3;
    const formants = [680, 1150, 400, 850, 1450];
    let at = ctx.currentTime + 0.025;
    for (let i = 0; i < count; i++) {
      hash = (Math.imul(hash ^ (hash >>> 13), 1664525) + 1013904223) >>> 0;
      const duration = 0.065 + (hash % 40) / 1000;
      const pitch = 220 + hash % 170;
      syllable(ctx, this.fxBus, at, pitch, duration, formants[hash % formants.length], 0.30, this._watch);
      at += duration + 0.018;
    }
    this.voiceUntil = at + 0.2; this.voices++;
  }

  update(state = {}, dt = 0) {
    if (!this.unlocked || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (this.nextStep < now - 0.3) this.nextStep = now + 0.025;
    let limit = 0;
    while (this.nextStep < now + 0.12 && limit++ < 4) {
      musicStep(this.ctx, this.musicBus, this.nextStep, this.step++, this._watch);
      this.nextStep += 60 / 112 / 4;
    }
    const mode = state.mode || '';
    const running = ['playing', 'play', 'game', 'attract', 'race', 'running'].includes(mode) || Boolean(state.attract);
    const player = state.players?.[0];
    const boost = Boolean(player?.boost);
    const target = running ? (boost ? 110 : 58) + Math.sin(now * 22) * 2.5 : 34;
    this.engine.frequency.setTargetAtTime(target, now, 0.07);
    this.engineFilter.frequency.setTargetAtTime(boost ? 410 : 180, now, 0.08);
    this.engineGain.gain.setTargetAtTime(running ? (boost ? 0.025 : 0.013) : 0, now, 0.09);
  }

  getDebug() {
    let rms = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.meter);
      for (const value of this.meter) rms += value * value;
      rms = Math.sqrt(rms / this.meter.length);
    }
    return {
      unlocked: this.unlocked, contextState: this.ctx?.state ?? 'locked', musicVolume: this.musicVolume,
      effectsVolume: this.effectsVolume, muted: this.muted, scheduledNotes: this.scheduledNotes,
      playedEffects: this.playedEffects, voices: this.voices, active: this.active, musicStep: this.step, rms,
    };
  }

  async dispose() {
    this.unlocked = false;
    if (this.ctx) { this.engine.stop(); await this.ctx.close(); }
  }
}

/** A real, deterministic offline rendering of the same score, effects, and formant voice synthesis. */
export async function renderAudioProof() {
  const OfflineClass = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!OfflineClass) return {supported:false, peak:0, rms:0, frames:0};
  const sampleRate = 44100;
  const ctx = new OfflineClass(2, sampleRate * 2, sampleRate);
  const music = ctx.createGain(); music.gain.value = 0.10; music.connect(ctx.destination);
  const fx = ctx.createGain(); fx.gain.value = 0.65; fx.connect(ctx.destination);
  for (let step = 0; step < 12; step++) musicStep(ctx, music, 0.03 + step * 60 / 112 / 4, step);
  tone(ctx, fx, 0.1, 1200, 0.09, 0.1, 'sine', 1800);
  syllable(ctx, fx, 0.4, 260, 0.1, 680, 0.25);
  syllable(ctx, fx, 0.55, 330, 0.09, 1150, 0.25);
  noise(ctx, fx, 1.1, 0.22, 0.22, 900, 'lowpass');
  const rendered = await ctx.startRendering();
  const data = rendered.getChannelData(0);
  let sum = 0, peak = 0, nonzero = 0;
  for (const sample of data) { sum += sample * sample; peak = Math.max(peak, Math.abs(sample)); if (Math.abs(sample) > 0.000001) nonzero++; }
  return {supported:true, peak, rms:Math.sqrt(sum / data.length), frames:data.length, nonzero, duration:rendered.duration, musicVolume:0.10};
}
