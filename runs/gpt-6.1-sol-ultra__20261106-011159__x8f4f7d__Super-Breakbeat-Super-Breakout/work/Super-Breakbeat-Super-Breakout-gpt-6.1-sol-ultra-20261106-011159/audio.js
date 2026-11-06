/** Super Breakbeat: all sound is synthesized. No sampled or fetched audio. */
const NOTE = n => 440 * 2 ** ((n - 69) / 12);
const bounded = value => Math.max(0, Math.min(1, Number(value) || 0));

export class ArcadeAudio {
  constructor({ context = null, musicVolume = 0.1, sfxVolume = 0.7 } = {}) {
    this.context = context;
    this.musicVolume = bounded(musicVolume);
    this.sfxVolume = bounded(sfxVolume);
    this.muted = false;
    this.active = true;
    this.beat = 0;
    this.nextStep = 0;
    this.lastMusicActive = false;
    this.counts = { effects: 0, notes: 0, voices: 0, musicSteps: 0 };
    this.played = {};
    this.sources = new Set();
    if (context) this.connect(context);
  }

  connect(context) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.72;
    this.music = context.createGain();
    this.music.gain.value = this.musicVolume;
    this.effects = context.createGain();
    this.effects.gain.value = this.sfxVolume;
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.15;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(context.destination);
    this.nextStep = context.currentTime + 0.045;
  }

  async unlock() {
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return false;
      this.connect(new AudioContextClass());
    }
    if (this.context.state === 'suspended' && this.context.resume) await this.context.resume();
    return this.context.state === 'running';
  }

  smoothGain(node, value) {
    if (!node || !this.context) return;
    node.gain.cancelScheduledValues(this.context.currentTime);
    node.gain.setTargetAtTime(value, this.context.currentTime, 0.025);
  }

  setMusicVolume(value) {
    this.musicVolume = bounded(value);
    this.smoothGain(this.music, this.musicVolume);
  }

  setSfxVolume(value) {
    this.sfxVolume = bounded(value);
    this.smoothGain(this.effects, this.sfxVolume);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this.smoothGain(this.master, this.muted ? 0 : 0.72);
  }

  tone(frequency, duration, { at, type = 'triangle', gain = 0.13, end, bus, attack = 0.004 } = {}) {
    if (!this.context || this.context.state === 'closed') return;
    const ctx = this.context;
    const start = Math.max(ctx.currentTime, at ?? ctx.currentTime);
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(25, frequency), start);
    if (end) osc.frequency.exponentialRampToValueAtTime(Math.max(25, end), start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(attack, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(envelope);
    envelope.connect(bus || this.effects);
    this.sources.add(osc);
    osc.onended = () => { this.sources.delete(osc); osc.disconnect(); envelope.disconnect(); };
    osc.start(start);
    osc.stop(start + duration + 0.015);
    this.counts.notes++;
  }

  voice(at = this.context?.currentTime || 0, bright = false) {
    if (!this.context) return;
    // Three short formant syllables: intentionally nonlinguistic "bwee-boo-bip".
    const syllables = bright ? [[280, 1350], [350, 1850], [430, 2200]] : [[210, 950], [290, 1600], [240, 1150]];
    syllables.forEach(([fundamental, formant], index) => {
      const start = at + index * 0.085;
      const osc = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      const envelope = this.context.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(fundamental, start);
      osc.frequency.exponentialRampToValueAtTime(fundamental * 1.15, start + 0.07);
      filter.type = 'bandpass';
      filter.frequency.value = formant;
      filter.Q.value = 3.5;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(0.2, start + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
      osc.connect(filter); filter.connect(envelope); envelope.connect(this.effects);
      this.sources.add(osc);
      osc.onended = () => { this.sources.delete(osc); osc.disconnect(); filter.disconnect(); envelope.disconnect(); };
      osc.start(start); osc.stop(start + 0.08);
    });
    this.counts.voices++;
  }

  play(name, pitch = 0) {
    if (!this.context || this.context.state === 'closed') return;
    const at = this.context.currentTime + 0.004;
    const shift = 2 ** (Math.max(-24, Math.min(36, pitch)) / 12);
    const note = (hz, length, options = {}) => this.tone(hz * shift, length, { at, ...options });
    this.counts.effects++;
    this.played[name] = (this.played[name] || 0) + 1;
    switch (name) {
      case 'paddle': note(235, 0.09, { type: 'square', gain: 0.09, end: 380 * shift }); break;
      case 'brick': note(540, 0.105, { gain: 0.17 }); note(1080, 0.055, { gain: 0.045 }); break;
      case 'wall': note(130, 0.055, { gain: 0.08, type: 'square' }); break;
      case 'launch':
        [0, 4, 7, 12].forEach((n, i) => note(NOTE(60 + n), 0.16, { at: at + i * 0.045, gain: 0.11 }));
        break;
      case 'loss':
        [0, -3, -7, -12].forEach((n, i) => note(NOTE(57 + n), 0.22, { at: at + i * 0.11, type: 'triangle', gain: 0.18 }));
        break;
      case 'clear':
        [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => note(NOTE(60 + n), 0.32, { at: at + i * 0.08, gain: 0.13 }));
        this.voice(at + 0.56, true);
        break;
      case 'rescue':
        [7, 12, 19, 24].forEach((n, i) => note(NOTE(60 + n), 0.2, { at: at + i * 0.06, gain: 0.13 }));
        this.voice(at + 0.22, true);
        break;
      case 'pulse':
        note(90, 0.35, { end: 900 * shift, gain: 0.2 });
        note(880, 0.45, { end: 110 * shift, gain: 0.12, type: 'sine' });
        break;
      case 'voice': this.voice(at, pitch > 0); break;
      case 'menu': note(520, 0.075, { gain: 0.08 }); note(780, 0.09, { at: at + 0.035, gain: 0.065 }); break;
      default: note(440, 0.06, { gain: 0.06 });
    }
  }

  musicStep(at) {
    const step = this.beat++;
    const root = [45, 45, 41, 43][Math.floor(step / 16) % 4];
    const melody = [12, 19, 24, 19, 15, 22, 19, 15, 12, 19, 22, 24, 19, 15, 10, 7];
    const options = { at, bus: this.music };
    if (step % 4 === 0) {
      this.tone(120, 0.13, { ...options, end: 38, type: 'sine', gain: 0.3 });
      this.tone(NOTE(root), 0.24, { ...options, gain: 0.24 });
    }
    if (step % 4 === 2) {
      this.tone(175, 0.075, { ...options, end: 80, type: 'triangle', gain: 0.2 });
      this.tone(920, 0.035, { ...options, gain: 0.07, type: 'square' });
    }
    this.tone(5100, 0.018, { ...options, type: 'square', gain: step % 2 ? 0.018 : 0.028 });
    this.tone(NOTE(root + melody[step % melody.length]), 0.18, { ...options, type: 'triangle', gain: 0.16 });
    if (step % 8 === 0) {
      [12, 15, 19].forEach(interval => this.tone(NOTE(root + interval), 0.85, { ...options, type: 'sine', gain: 0.065, attack: 0.04 }));
    }
    this.counts.musicSteps++;
  }

  update(_dt, active = true) {
    this.active = Boolean(active);
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (!this.active) {
      this.nextStep = now + 0.04;
      this.lastMusicActive = false;
      return;
    }
    if (!this.lastMusicActive || this.nextStep < now - 0.2) this.nextStep = now + 0.025;
    this.lastMusicActive = true;
    let safety = 0;
    while (this.nextStep < now + 0.12 && safety++ < 4) {
      this.musicStep(this.nextStep);
      this.nextStep += 0.15;
    }
  }

  diagnostics() {
    let rms = 0;
    if (this.analyser) {
      const waveform = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(waveform);
      rms = Math.sqrt(waveform.reduce((total, value) => total + value * value, 0) / waveform.length);
    }
    return { initialized: Boolean(this.context), state: this.context?.state || 'locked', musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume, muted: this.muted, active: this.active, rms, activeOscillators: this.sources.size,
      ...this.counts, played: { ...this.played }, audioFiles: 0 };
  }

  async renderTest(OfflineContext = globalThis.OfflineAudioContext) {
    return renderAudioTest(OfflineContext);
  }

  dispose() {
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
    this.master?.disconnect();
    if (this.context?.close) this.context.close();
    this.context = null;
  }
}

export async function renderAudioTest(OfflineContext = globalThis.OfflineAudioContext) {
  if (!OfflineContext) return { supported: false, reason: 'OfflineAudioContext unavailable' };
  const context = new OfflineContext(1, 44100 * 4, 44100);
  const engine = new ArcadeAudio({ context });
  const names = ['paddle', 'brick', 'wall', 'launch', 'loss', 'clear', 'rescue', 'pulse', 'menu'];
  names.forEach(name => engine.play(name));
  for (let beat = 0; beat < 24; beat++) engine.musicStep(beat * 0.15);
  const buffer = await context.startRendering();
  const samples = buffer.getChannelData(0);
  let energy = 0, peak = 0, finite = true;
  for (const sample of samples) { energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); finite &&= Number.isFinite(sample); }
  return { supported: true, sampleRate: buffer.sampleRate, seconds: buffer.duration,
    rms: Math.sqrt(energy / samples.length), peak, finite, effects: engine.counts.effects,
    voices: engine.counts.voices, musicSteps: engine.counts.musicSteps, musicVolume: engine.musicVolume,
    audioFiles: 0, played: { ...engine.played } };
}
