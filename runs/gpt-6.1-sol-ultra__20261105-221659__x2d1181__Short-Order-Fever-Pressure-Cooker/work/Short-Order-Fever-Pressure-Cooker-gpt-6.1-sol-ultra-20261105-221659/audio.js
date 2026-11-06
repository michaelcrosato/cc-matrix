const kitchenMidi = n => 440 * 2 ** ((n - 69) / 12);

function kitchenTone(ctx, out, options = {}, track) {
  const { time = ctx.currentTime, frequency = 440, endFrequency = frequency,
    duration = .12, type = 'triangle', volume = .1, attack = .006,
    filter = 0, filterType = 'lowpass', q = .8, detune = 0 } = options;
  const source = ctx.createOscillator();
  const envelope = ctx.createGain();
  source.type = type;
  source.frequency.setValueAtTime(Math.max(12, frequency), time);
  source.frequency.exponentialRampToValueAtTime(Math.max(12, endFrequency), time + duration);
  source.detune.value = detune;
  envelope.gain.setValueAtTime(0, time);
  envelope.gain.linearRampToValueAtTime(volume, time + Math.min(attack, duration * .25));
  envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
  if (filter) {
    const shaping = ctx.createBiquadFilter();
    shaping.type = filterType;
    shaping.frequency.value = filter;
    shaping.Q.value = q;
    source.connect(shaping);
    shaping.connect(envelope);
  } else source.connect(envelope);
  envelope.connect(out);
  source.start(time);
  source.stop(time + duration + .025);
  if (track) track(source);
  source.addEventListener('ended', () => { source.disconnect(); envelope.disconnect(); }, { once: true });
  return source;
}

function kitchenNoise(ctx, out, buffer, options = {}, track) {
  const { time = ctx.currentTime, duration = .1, volume = .1, frequency = 2200,
    type = 'highpass', rate = 1 } = options;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const envelope = ctx.createGain();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  filter.type = type;
  filter.frequency.value = frequency;
  envelope.gain.setValueAtTime(volume, time);
  envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(out);
  source.start(time);
  source.stop(time + duration + .02);
  if (track) track(source);
  source.addEventListener('ended', () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); }, { once: true });
}

function kitchenNoiseBuffer(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = b.getChannelData(0);
  let seed = 41041;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 1073741823.5) - 1;
  }
  return b;
}

export class KitchenAudio {
  constructor() {
    this.ctx = null;
    this.musicVolume = .10;
    this.sfxVolume = .65;
    this.notes = 0;
    this.effects = 0;
    this.voices = 0;
    this.step = 0;
    this.nextBeat = 0;
    this.stopped = false;
    this.sources = new Set();
    this.voiceAt = -100;
    this.lastWarning = -100;
    this.track = source => {
      this.sources.add(source);
      source.addEventListener('ended', () => this.sources.delete(source), { once: true });
    };
  }

  async unlock() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return false;
    if (!this.ctx) {
      this.ctx = new Audio({ latencyHint: 'interactive' });
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.master = this.ctx.createGain();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 5;
      this.compressor.attack.value = .003;
      this.compressor.release.value = .15;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.noise = kitchenNoiseBuffer(this.ctx);
      this.musicBus.gain.value = this.musicVolume;
      this.sfxBus.gain.value = this.sfxVolume;
      this.master.gain.value = .8;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.resume();
    return this.ctx.state === 'running';
  }

  setVolumes(music = .1, sfx = .65) {
    this.musicVolume = Math.max(0, Math.min(1, Number(music)));
    this.sfxVolume = Math.max(0, Math.min(1, Number(sfx)));
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, .025);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, .025);
  }

  tone(options, music = false) {
    if (!this.ctx || this.stopped) return;
    kitchenTone(this.ctx, music ? this.musicBus : this.sfxBus, options, this.track);
    if (music) this.notes++;
  }

  hiss(options, music = false) {
    if (!this.ctx || this.stopped) return;
    kitchenNoise(this.ctx, music ? this.musicBus : this.sfxBus, this.noise, options, this.track);
  }

  tick(state, dt) {
    if (!this.ctx || this.stopped || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (this.nextBeat < now - .2) this.nextBeat = now + .035;
    const tempo = state?.shift >= 3 ? 124 : state?.shift === 2 ? 118 : 112;
    const eighth = 60 / tempo / 2;
    while (this.nextBeat < now + .12) {
      this.playStep(this.nextBeat, this.step++);
      // Alternating long/short eighths make the kitchen shuffle swing.
      this.nextBeat += eighth * ((this.step % 2) ? 1.24 : .76);
    }
    if (state?.pressure > 78 && now - this.lastWarning > 5) {
      this.lastWarning = now;
      this.sfx('warning');
    }
  }

  playStep(time, step) {
    const chords = [[53,57,60,64], [50,53,57,60], [55,58,62,65], [48,52,58,62]];
    const chord = chords[Math.floor(step / 16) % chords.length];
    const slot = step % 8;
    const bar = Math.floor(step / 8);
    if (slot % 2 === 0) {
      const walking = [chord[0] - 12, chord[2] - 12, chord[1] - 12, chord[0] - 11];
      this.tone({ time, frequency: kitchenMidi(walking[slot / 2]), duration: .25, volume: .24,
        type: 'triangle', filter: 650, attack: .008 }, true);
    }
    if (slot === 0 || slot === 3 || slot === 6) {
      chord.slice(1).forEach((n, i) => this.tone({ time: time + i * .009,
        frequency: kitchenMidi(n + 12), duration: slot === 0 ? .27 : .16,
        volume: .085, type: 'triangle', filter: 2400, attack: .004 }, true));
    }
    const melody = [0, null, 2, 3, 1, null, 2, 1, 0, 1, 2, null, 3, 2, 1, null];
    const m = melody[step % melody.length];
    if (m !== null && bar % 4 !== 3) {
      this.tone({ time: time + .012, frequency: kitchenMidi(chord[m] + 24),
        duration: .11 + (slot === 6 ? .12 : 0), volume: .063,
        type: 'sine', attack: .008 }, true);
      this.tone({ time: time + .013, frequency: kitchenMidi(chord[m] + 36),
        duration: .055, volume: .016, type: 'sine' }, true);
    }
    this.hiss({ time, duration: slot % 2 ? .075 : .04, volume: .035,
      frequency: 6000, rate: 1.5 }, true);
    if (slot === 0 || slot === 4) {
      this.tone({ time, frequency: 130, endFrequency: 43, duration: .16,
        volume: .28, type: 'sine', attack: .001 }, true);
    }
    if (slot === 2 || slot === 6) {
      this.hiss({ time, duration: .09, volume: .12, frequency: 1500, type: 'bandpass' }, true);
      this.tone({ time, frequency: 210, endFrequency: 120, duration: .06,
        volume: .055, type: 'triangle' }, true);
    }
    if (step % 32 === 31) this.hiss({ time, duration: .24, volume: .045, frequency: 4500 }, true);
  }

  sfx(name) {
    if (!this.ctx || this.stopped) return;
    this.effects++;
    const time = this.ctx.currentTime + .005;
    const sequence = (notes, duration = .08, volume = .11, type = 'triangle') =>
      notes.forEach((n, i) => this.tone({ time: time + i * duration * .65,
        frequency: kitchenMidi(n), duration, volume, type }));
    switch (name) {
      case 'catch':
        this.tone({ time, frequency: 320, endFrequency: 920, duration: .075, volume: .15 });
        this.hiss({ time, duration: .03, volume: .065, frequency: 900, type: 'bandpass' });
        break;
      case 'serve':
        sequence([72,76,79,84], .14, .12);
        this.tone({ time, frequency: 1760, duration: .5, volume: .04, type: 'sine' });
        this.voice('happy');
        break;
      case 'wrong': case 'discard':
        sequence([46,42], .12, .12, 'sawtooth');
        this.hiss({ time, duration: .13, volume: .08, frequency: 700, type: 'bandpass' });
        break;
      case 'dash':
        this.hiss({ time, duration: .17, volume: .12, frequency: 1100, type: 'bandpass', rate: 1.6 });
        this.tone({ time, frequency: 250, endFrequency: 100, duration: .12, volume: .04 });
        break;
      case 'bell':
        [1,2.76,5.4].forEach((ratio, i) => this.tone({ time, frequency: 1150 * ratio,
          duration: .8 - i * .17, volume: .11 / (i + 1), type: 'sine' }));
        this.voice('bell');
        break;
      case 'warning':
        sequence([74,69,74], .16, .06, 'square');
        break;
      case 'win':
        sequence([60,64,67,72,76,79,84], .2, .11);
        [60,64,67,72].forEach(n => this.tone({ time: time + 1, frequency: kitchenMidi(n),
          duration: 1.2, volume: .055, type: 'triangle' }));
        this.voice('happy');
        break;
      case 'lose':
        sequence([67,63,60,55,48], .26, .11);
        this.voice('sad');
        break;
      case 'spill':
        this.hiss({ time, duration: .28, volume: .15, frequency: 800, type: 'lowpass', rate: .65 });
        this.tone({ time, frequency: 220, endFrequency: 45, duration: .25, volume: .13 });
        break;
      case 'ui':
      default:
        sequence([76,81], .05, .065, 'sine');
        break;
    }
  }

  voice(mood = 'happy') {
    if (!this.ctx || this.stopped || this.ctx.currentTime - this.voiceAt < .55) return;
    this.voiceAt = this.ctx.currentTime;
    this.voices++;
    const syllables = mood === 'sad' ? [0,-3,-7,-10] : mood === 'bell' ? [0,5,9,5,12] : [0,4,7,2,9];
    const formants = [760,1100,1850,950,1450];
    syllables.forEach((pitch, i) => {
      const time = this.ctx.currentTime + .035 + i * .082;
      const frequency = 195 * 2 ** (pitch / 12);
      this.tone({ time, frequency, endFrequency: frequency * 1.2, duration: .07,
        volume: .085, type: 'sawtooth', filter: formants[i % formants.length],
        filterType: 'bandpass', q: 3, attack: .008 });
      this.tone({ time, frequency: frequency * 2.01, endFrequency: frequency * 1.8,
        duration: .055, volume: .025, type: 'triangle', filter: 2400 });
    });
  }

  stop() {
    this.stopped = true;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .012);
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
    this.nextBeat = 0;
  }

  resume() {
    this.stopped = false;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(.8, this.ctx.currentTime, .025);
    this.nextBeat = Math.max(this.nextBeat, this.ctx.currentTime + .035);
  }

  getDiagnostics() {
    let rms = 0;
    if (this.analyser) {
      const samples = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(samples);
      rms = Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length);
    }
    return { supported: !!(globalThis.AudioContext || globalThis.webkitAudioContext),
      unlocked: !!this.ctx, state: this.ctx?.state || 'locked', stopped: this.stopped,
      musicVolume: this.musicVolume, sfxVolume: this.sfxVolume, notes: this.notes,
      effects: this.effects, voices: this.voices, activeSources: this.sources.size, rms };
  }

  static async testAudio() {
    if (!globalThis.OfflineAudioContext) return { supported: false, rms: 0, peak: 0 };
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const out = ctx.createGain();
    out.gain.value = .4;
    out.connect(ctx.destination);
    kitchenTone(ctx, out, { time: .02, frequency: 220, endFrequency: 440,
      duration: .25, volume: .16, type: 'triangle' });
    kitchenTone(ctx, out, { time: .3, frequency: 660, duration: .25, volume: .12, type: 'sine' });
    kitchenNoise(ctx, out, kitchenNoiseBuffer(ctx), { time: .62, duration: .2,
      volume: .1, frequency: 1800, type: 'bandpass' });
    const rendered = await ctx.startRendering();
    const samples = rendered.getChannelData(0);
    let energy = 0, peak = 0, finite = true;
    for (const n of samples) { energy += n * n; peak = Math.max(peak, Math.abs(n)); finite &&= Number.isFinite(n); }
    return { supported: true, rms: Math.sqrt(energy / samples.length), peak, finite,
      frames: samples.length, sampleRate: rendered.sampleRate };
  }
}
