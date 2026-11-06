/* Original procedural score and foley. No samples or recorded voices. */
const TAU = Math.PI * 2;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, Number(n) || 0));
const noteHz = (n) => 440 * 2 ** ((n - 69) / 12);
const BPM = 108;
const STEP = 60 / BPM / 4;

function envelope(ctx, output, time, duration, peak, attack = 0.006) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  gain.connect(output);
  return gain;
}

function tone(ctx, output, hz, time, duration, level, type = 'triangle', bend = 0) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, time);
  if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(35, hz + bend), time + duration);
  const gain = envelope(ctx, output, time, duration, level);
  osc.connect(gain);
  osc.start(time);
  osc.stop(time + duration + 0.015);
}

function noiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 19261;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    data[i] = (seed >>> 0) / 2147483648 - 1;
  }
  return buffer;
}

function hiss(ctx, output, noise, time, duration, level, hz = 6000, type = 'highpass') {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = hz;
  filter.Q.value = 0.7;
  source.connect(filter);
  const gain = envelope(ctx, output, time, duration, level, 0.003);
  filter.connect(gain);
  source.start(time);
  source.stop(time + duration + 0.015);
}

function drum(ctx, output, noise, type, time, strength = 1) {
  if (type === 'kick') {
    tone(ctx, output, 142, time, 0.16, 0.48 * strength, 'sine', -103);
  } else if (type === 'snare') {
    hiss(ctx, output, noise, time, 0.12, 0.23 * strength, 1500);
    tone(ctx, output, 170, time, 0.07, 0.13 * strength, 'triangle', -45);
  } else {
    hiss(ctx, output, noise, time, type === 'open' ? 0.17 : 0.032, 0.09 * strength, 7200);
  }
}

function pluck(ctx, output, midi, time, length = 0.19, level = 0.1) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(5500, time);
  filter.frequency.exponentialRampToValueAtTime(900, time + length);
  filter.Q.value = 0.9;
  filter.connect(output);
  tone(ctx, filter, noteHz(midi), time, length, level, 'sawtooth');
  tone(ctx, filter, noteHz(midi) * 1.004, time, length, level * 0.35, 'triangle');
}

// A newly composed twelve-bar coastal shuffle; the tune never quotes the source soundtrack.
function musicStep(ctx, output, noise, step, time) {
  const beat = step % 16;
  const bar = Math.floor(step / 16) % 12;
  const roots = [40, 40, 45, 40, 45, 45, 40, 40, 47, 45, 40, 47];
  const root = roots[bar];
  if (beat === 0 || beat === 7 || beat === 10) drum(ctx, output, noise, 'kick', time, beat === 0 ? 1 : 0.75);
  if (beat === 4 || beat === 12) drum(ctx, output, noise, 'snare', time);
  if (!(beat % 2)) drum(ctx, output, noise, beat === 14 ? 'open' : 'hat', time, beat % 4 ? 0.65 : 1);
  if (!(beat % 2)) {
    const bass = [0, 7, 12, 7, 0, 7, 10, 7][beat / 2];
    tone(ctx, output, noteHz(root + bass), time, 0.17, 0.22, 'triangle');
  }
  if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
    for (const [i, interval] of [12, 16, 19].entries()) pluck(ctx, output, root + interval, time + i * 0.008, 0.12, 0.047);
  }
  const melody = [24, null, 28, 31, null, 28, 26, null, 24, 26, null, 28, 31, null, 33, 31];
  if ((bar % 4 !== 3 || beat >= 8) && melody[beat] !== null && beat % 2 === bar % 2) {
    pluck(ctx, output, root + melody[beat], time, 0.22, 0.12);
    // A short, quiet slapback is synthesized as another note rather than a recording.
    pluck(ctx, output, root + melody[beat], time + 0.105, 0.15, 0.027);
  }
}

function effect(ctx, output, noise, name, value, time) {
  const power = clamp(value, 0.2, 2);
  switch (name) {
    case 'jump':
      tone(ctx, output, 230, time, 0.19, 0.15 * power, 'triangle', 550);
      hiss(ctx, output, noise, time, 0.12, 0.05, 3000);
      break;
    case 'land':
      tone(ctx, output, 120, time, 0.1, 0.2 * power, 'sine', -75);
      hiss(ctx, output, noise, time, 0.09, 0.07 * power, 800, 'lowpass');
      break;
    case 'score':
    case 'catch':
      [76, 80, 83].forEach((n, i) => tone(ctx, output, noteHz(n), time + i * 0.055, 0.18, 0.11 * power, 'triangle'));
      break;
    case 'bail':
      tone(ctx, output, 340, time, 0.28, 0.17 * power, 'sawtooth', -260);
      hiss(ctx, output, noise, time, 0.22, 0.11 * power, 1300, 'lowpass');
      break;
    case 'kick':
      tone(ctx, output, 260, time, 0.075, 0.15 * power, 'sine', -105);
      hiss(ctx, output, noise, time, 0.035, 0.045, 2100, 'bandpass');
      break;
    case 'menu':
      tone(ctx, output, 740, time, 0.075, 0.08 * power, 'triangle', 110);
      break;
    case 'win':
      [64, 68, 71, 76, 80, 83, 88].forEach((n, i) => pluck(ctx, output, n, time + i * 0.085, 0.38, 0.1 * power));
      break;
    case 'surf':
      hiss(ctx, output, noise, time, 0.24, 0.09 * power, 1600, 'bandpass');
      break;
    default:
      tone(ctx, output, 440, time, 0.06, 0.06, 'triangle');
  }
}

function gibberish(ctx, output, time, mood, seed = 0) {
  const happy = mood !== 'bail' && mood !== 'sad';
  const syllables = happy ? 5 : 3;
  for (let i = 0; i < syllables; i++) {
    const at = time + i * 0.095;
    const base = (happy ? 225 : 145) + ((i * 31 + seed * 17) % 95);
    const source = ctx.createOscillator();
    source.type = 'sawtooth';
    source.frequency.setValueAtTime(base, at);
    source.frequency.exponentialRampToValueAtTime(base * (i % 2 ? 0.83 : 1.25), at + 0.075);
    const vowel = ctx.createBiquadFilter();
    vowel.type = 'bandpass';
    vowel.frequency.value = [650, 1100, 1700, 850, 1350][(i + seed) % 5];
    vowel.Q.value = 4;
    source.connect(vowel);
    const gain = envelope(ctx, output, at, 0.085, 0.13, 0.009);
    vowel.connect(gain);
    source.start(at);
    source.stop(at + 0.1);
  }
}

export class CoastAudio {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.1;
    this.sfxVolume = 0.7;
    this.muted = false;
    this.voiceCount = 0;
    this.effectCount = 0;
    this.musicSteps = 0;
    this.event = 'halfpipe';
    this.active = true;
    this.lastSurf = -100;
    this.timer = null;
    this.failure = null;
  }

  async unlock() {
    try {
      if (!this.ctx) {
        const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioCtor) return false;
        this.ctx = new AudioCtor();
        this.noise = noiseBuffer(this.ctx);
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.65;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 4;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyserBuffer = new Float32Array(1024);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicVolume;
        this.fxGain = this.ctx.createGain();
        this.fxGain.gain.value = this.sfxVolume;
        this.musicGain.connect(this.compressor);
        this.fxGain.connect(this.compressor);
        this.compressor.connect(this.master);
        this.master.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.nextStepTime = this.ctx.currentTime + 0.04;
      }
      await this.ctx.resume();
      if (!this.timer) {
        this.schedule();
        this.timer = globalThis.setInterval(() => this.schedule(), 70);
      }
      return this.ctx.state === 'running';
    } catch (error) {
      this.failure = String(error);
      return false;
    }
  }

  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.nextStepTime < this.ctx.currentTime - 0.5) this.nextStepTime = this.ctx.currentTime + 0.025;
    while (this.nextStepTime < this.ctx.currentTime + 0.18) {
      musicStep(this.ctx, this.musicGain, this.noise, this.musicSteps++, this.nextStepTime);
      this.nextStepTime += STEP;
    }
  }

  update(dt, state = {}) {
    this.event = state.event ?? this.event;
    this.active = state.active ?? this.active;
    if (this.ctx && this.active && this.event === 'surf' && state.speed > 1 && this.ctx.currentTime - this.lastSurf > 0.3) {
      this.lastSurf = this.ctx.currentTime;
      this.sfx('surf', clamp(state.speed / 10, 0.2, 0.8));
    }
  }

  sfx(name, value = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.effectCount++;
    effect(this.ctx, this.fxGain, this.noise, name, value, this.ctx.currentTime + 0.005);
  }

  voice(mood = 'happy') {
    if (!this.ctx || this.ctx.state !== 'running') return;
    gibberish(this.ctx, this.fxGain, this.ctx.currentTime + 0.015, mood, this.voiceCount++);
  }

  setMusic(value) {
    this.musicVolume = clamp(value);
    this.musicGain?.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.035);
  }

  setSfx(value) {
    this.sfxVolume = clamp(value);
    this.fxGain?.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.035);
  }

  mute(value) {
    this.muted = Boolean(value);
    this.master?.gain.setTargetAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime, 0.025);
  }

  diagnostics() {
    let rms = 0;
    let peak = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.analyserBuffer);
      for (const sample of this.analyserBuffer) {
        rms += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      rms = Math.sqrt(rms / this.analyserBuffer.length);
    }
    return {
      state: this.ctx?.state || 'locked',
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      muted: this.muted,
      voiceCount: this.voiceCount,
      effectCount: this.effectCount,
      musicSteps: this.musicSteps,
      rms,
      peak,
      failure: this.failure,
    };
  }

  destroy() {
    if (this.timer) globalThis.clearInterval(this.timer);
    this.timer = null;
    this.ctx?.close();
  }
}

// A reproducible, speaker-free proof that all audio paths generate finite samples.
export async function renderAudioProof(seconds = 4) {
  const OfflineCtor = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!OfflineCtor) return { supported: false, reason: 'OfflineAudioContext unavailable' };
  const length = Math.max(2, seconds);
  const ctx = new OfflineCtor(1, Math.ceil(length * 44100), 44100);
  const output = ctx.createGain();
  output.gain.value = 0.35;
  output.connect(ctx.destination);
  const music = ctx.createGain();
  music.gain.value = 0.1;
  music.connect(output);
  const noise = noiseBuffer(ctx);
  for (let step = 0; step * STEP < length - 0.4; step++) musicStep(ctx, music, noise, step, 0.02 + step * STEP);
  const names = ['jump', 'land', 'score', 'bail', 'kick', 'catch', 'menu', 'win', 'surf'];
  names.forEach((name, i) => effect(ctx, output, noise, name, 0.65, 0.1 + i * (length - 0.9) / names.length));
  gibberish(ctx, output, Math.max(0.1, length - 0.65), 'happy', 2);
  const rendered = await ctx.startRendering();
  const samples = rendered.getChannelData(0);
  let sum = 0;
  let peak = 0;
  let finite = true;
  for (const sample of samples) {
    finite = finite && Number.isFinite(sample);
    sum += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  return { supported: true, finite, rms: Math.sqrt(sum / samples.length), peak, samples: samples.length, seconds: length, musicVolume: 0.1, effects: names.length, voices: 1 };
}
