// Entire soundtrack, percussion, radio chatter and effects are synthesized here.
// Call unlock from an input gesture, then update once per rendered frame.
export class GameAudio {
  constructor(options = {}) {
    this.context = options.context || null;
    this.musicVolume = 0.1;
    this.sfxVolume = 0.75;
    this.muted = false;
    this.paused = false;
    this.ready = false;
    this.failed = false;
    this.stage = 0;
    this.mode = 'title';
    this.step = 0;
    this.nextBeat = 0;
    this.tempo = 124;
    this.seed = options.seed || 1977;
    this.stats = { effects: 0, notes: 0, radioSyllables: 0, voices: 0, peakVoices: 0 };
    this.lastEffects = Object.create(null);
    this._masterLevel = 0.64;
  }

  async unlock() {
    if (this.failed) return false;
    try {
      if (!this.context) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) { this.failed = true; return false; }
        this.context = new Audio({ latencyHint: 'interactive' });
      }
      if (!this.ready) this._build();
      if (this.context.state === 'suspended' && this.context.resume && !this.context.startRendering) await this.context.resume();
      return true;
    } catch (_) { this.failed = true; return false; }
  }

  _build() {
    const c = this.context;
    this.master = c.createGain();
    this.master.gain.value = this._masterLevel;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 14;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;
    this.music = c.createGain();
    this.sfx = c.createGain();
    this.music.gain.value = this.musicVolume;
    this.sfx.gain.value = this.sfxVolume;
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(c.destination);
    const length = c.sampleRate * 2;
    this.noise = c.createBuffer(1, length, c.sampleRate);
    const data = this.noise.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < length; i++) {
      const white = this._random() * 2 - 1;
      previous = (previous + white * 0.025) / 1.025;
      data[i] = white * 0.72 + previous * 1.5;
    }
    this.ready = true;
    this.nextBeat = c.currentTime + 0.04;
  }

  _random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  _connectVoice(source, chain, bus, pan) {
    const c = this.context;
    let current = source;
    for (const node of chain) { current.connect(node); current = node; }
    let panner;
    if (c.createStereoPanner) {
      panner = c.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan || 0));
      current.connect(panner);
      panner.connect(bus);
    } else current.connect(bus);
    this.stats.voices++;
    this.stats.peakVoices = Math.max(this.stats.peakVoices, this.stats.voices);
    source.onended = () => {
      source.disconnect();
      for (const node of chain) node.disconnect();
      if (panner) panner.disconnect();
      this.stats.voices = Math.max(0, this.stats.voices - 1);
    };
  }

  _tone({ at, duration = 0.12, frequency = 440, endFrequency, type = 'triangle', volume = 0.15,
    bus = this.sfx, pan = 0, attack = 0.003, cutoff = 5000, resonance = 0.6, detune = 0 }) {
    const c = this.context;
    const start = Math.max(c.currentTime, at ?? c.currentTime + 0.002);
    const finish = start + Math.max(duration, 0.015);
    const oscillator = c.createOscillator();
    const envelope = c.createGain();
    const filter = c.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(10, frequency), start);
    oscillator.detune.value = detune;
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(10, endFrequency), finish);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.24), finish);
    filter.Q.value = resonance;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(attack, duration * 0.3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, finish);
    this._connectVoice(oscillator, [filter, envelope], bus, pan, finish);
    oscillator.start(start);
    oscillator.stop(finish + 0.025);
  }

  _noise({ at, duration = 0.12, volume = 0.1, cutoff = 4000, endCutoff = 200,
    type = 'lowpass', bus = this.sfx, pan = 0, playbackRate = 1 }) {
    const c = this.context;
    const start = Math.max(c.currentTime, at ?? c.currentTime + 0.002);
    const finish = start + duration;
    const source = c.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    source.playbackRate.value = playbackRate;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endCutoff), finish);
    filter.Q.value = 0.8;
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, finish);
    this._connectVoice(source, [filter, envelope], bus, pan, finish);
    source.start(start, this._random());
    source.stop(finish + 0.025);
  }

  setMusic(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this._refreshVolumes();
  }

  setSfx(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this._refreshVolumes();
  }

  setMuted(value) { this.muted = !!value; this._refreshVolumes(); }

  pause(value) {
    this.paused = !!value;
    this._refreshVolumes();
    if (!this.paused && this.ready) this.nextBeat = this.context.currentTime + 0.04;
  }

  _refreshVolumes() {
    if (!this.ready) return;
    const now = this.context.currentTime;
    this.music.gain.setTargetAtTime(this.muted || this.paused ? 0 : this.musicVolume, now, 0.025);
    this.sfx.gain.setTargetAtTime(this.muted ? 0 : this.sfxVolume * (this.paused ? 0.25 : 1), now, 0.025);
  }

  update(_dt, state = {}) {
    if (!this.ready || this.paused || this.context.state === 'closed') return;
    const stage = Number(state.stage ?? this.stage);
    if (Number.isFinite(stage) && stage !== this.stage) {
      this.stage = stage;
      this.play('wave', { intensity: 0.5 });
    }
    this.mode = state.mode ?? this.mode;
    this._scheduleMusic(this.context.currentTime + 0.15);
  }

  _scheduleMusic(until) {
    const now = this.context.currentTime;
    if (this.nextBeat < now - 0.15) this.nextBeat = now + 0.02;
    let safety = 0;
    while (this.nextBeat < until && safety++ < 2048) {
      this._musicStep(this.step++, this.nextBeat);
      this.nextBeat += 60 / this.tempo / 4;
    }
  }

  _musicStep(step, at) {
    const bus = this.music;
    const bar = Math.floor(step / 16) % 8;
    const beat = step % 16;
    const root = [38, 38, 41, 41, 43, 43, 45, 45][bar];
    const hz = (note) => 440 * Math.pow(2, (note - 69) / 12);
    const active = !['title', 'menu', 'attract', 'credits', 'about'].includes(this.mode);
    const boss = this.stage >= 3 || this.mode === 'boss';
    const drive = active ? 1 : 0.67;
    // A plucked walking bass keeps the tune buoyant even between waves.
    if (beat % 2 === 0) {
      const bass = [0, 0, 7, 10, 12, 10, 7, 3][beat / 2];
      this._tone({ at, frequency: hz(root + bass), duration: 0.18, volume: 0.35 * drive,
        cutoff: 1100, type: 'triangle', bus, pan: -0.12 });
      this.stats.notes++;
    }
    // Short offbeat chord stabs suggest a surf guitar without sample playback.
    if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
      for (const [i, note] of [12, 15, 19].entries()) {
        this._tone({ at: at + i * 0.008, frequency: hz(root + note + 12), duration: 0.105,
          volume: 0.071 * drive, cutoff: 3300, type: 'sawtooth', bus,
          pan: i === 0 ? -0.4 : 0.35, detune: i * 3 - 3 });
        this.stats.notes++;
      }
    }
    const melody = [74, 0, 77, 0, 81, 79, 77, 0, 74, 0, 72, 0, 69, 72, 74, 0,
      74, 0, 77, 0, 81, 0, 84, 81, 79, 77, 79, 0, 77, 0, 74, 0,
      79, 0, 82, 0, 86, 84, 82, 0, 79, 0, 77, 0, 74, 77, 79, 0,
      81, 0, 80, 0, 77, 0, 76, 0, 74, 0, 72, 73, 74, 0, 0, 0];
    const note = melody[step % melody.length];
    if (note && (active || step % 2 === 0)) {
      this._tone({ at, frequency: hz(note + (boss ? -12 : 0)), duration: beat % 4 === 0 ? 0.23 : 0.12,
        volume: 0.115 * drive, cutoff: boss ? 2700 : 4700, type: 'triangle', bus, pan: 0.18 });
      this._tone({ at: at + 0.09, frequency: hz(note + (boss ? -12 : 0)), duration: 0.12,
        volume: 0.022 * drive, cutoff: 1700, type: 'triangle', bus, pan: -0.35 });
      this.stats.notes += 2;
    }
    if (beat % 4 === 0) {
      this._tone({ at, frequency: boss ? 125 : 105, endFrequency: 42, duration: 0.16,
        volume: 0.4 * drive, type: 'sine', cutoff: 1100, bus });
      if (beat === 4 || beat === 12) {
        this._noise({ at, duration: 0.115, volume: 0.13 * drive, type: 'highpass',
          cutoff: 1000, endCutoff: 750, bus, pan: -0.1 });
        this._tone({ at, frequency: 185, endFrequency: 95, duration: 0.08,
          volume: 0.09, type: 'triangle', cutoff: 1700, bus });
      }
    }
    if (beat % 2 === 0 || boss) {
      this._noise({ at, duration: beat === 14 ? 0.11 : 0.035, volume: 0.045 * drive,
        type: 'highpass', cutoff: 6500, endCutoff: 4500, bus, pan: 0.32 });
    }
  }

  play(name, parameters = {}) {
    if (!this.ready || this.context.state === 'closed' || this.muted) return false;
    const p = typeof parameters === 'number' ? { intensity: parameters } : parameters || {};
    const at = this.context.currentTime + 0.002 + Math.max(0, Number(p.delay) || 0);
    const pan = Math.max(-1, Math.min(1, Number(p.pan ?? p.x) || 0));
    const force = Math.max(0.1, Math.min(2, Number(p.intensity ?? p.size) || 1));
    const tone = (options) => this._tone({ at, pan, ...options });
    const noise = (options) => this._noise({ at, pan, ...options });
    const aliases = { fire: 'shoot', cannon: 'shoot', kill: 'explosion', pickup: 'powerup',
      damage: 'hit', win: 'victory', lose: 'defeat', click: 'menu', launch: 'start', chatter: 'radio' };
    name = aliases[name] || name;
    // Keep overlapping automatic fire crisp rather than accumulating too much bass.
    const cooldown = { shoot: 0.035, hit: 0.025, overheat: 0.5, radio: 0.9, bomb: 0.08 }[name] || 0;
    if ((this.lastEffects[name] ?? -Infinity) + cooldown > at) return false;
    this.lastEffects[name] = at;
    this.stats.effects++;
    switch (name) {
      case 'shoot':
        tone({ frequency: 210 + this._random() * 35, endFrequency: 57, duration: 0.13,
          volume: 0.3 * force, type: 'triangle', cutoff: 2200 });
        tone({ frequency: 780, endFrequency: 190, duration: 0.045, volume: 0.065 * force,
          type: 'square', cutoff: 1600 });
        noise({ duration: 0.065, volume: 0.18 * force, cutoff: 4300, endCutoff: 600 });
        break;
      case 'hit':
        tone({ frequency: 650 + this._random() * 300, endFrequency: 170, duration: 0.09,
          volume: 0.17 * force, type: 'square', cutoff: 2600 });
        noise({ duration: 0.065, volume: 0.12 * force, cutoff: 5000, endCutoff: 1200 });
        break;
      case 'explosion':
        tone({ frequency: 88, endFrequency: 26, duration: 0.45 * force,
          volume: 0.43 * force, type: 'sine', cutoff: 1500 });
        noise({ duration: 0.4 * force, volume: 0.55 * force, cutoff: 3200, endCutoff: 90,
          playbackRate: 0.8 });
        tone({ at: at + 0.014, frequency: 180, endFrequency: 35, duration: 0.22,
          volume: 0.12, type: 'sawtooth', cutoff: 1400 });
        break;
      case 'overheat':
        noise({ duration: 0.6, volume: 0.14, cutoff: 3800, endCutoff: 700, type: 'bandpass' });
        for (let i = 0; i < 3; i++) tone({ at: at + i * 0.13, frequency: 415,
          endFrequency: 390, duration: 0.075, volume: 0.14, type: 'triangle', cutoff: 2500 });
        break;
      case 'sonar':
        tone({ frequency: 1480, endFrequency: 1330, duration: 0.65, volume: 0.19,
          type: 'sine', cutoff: 6000, attack: 0.012 });
        tone({ at: at + 0.18, frequency: 1480, endFrequency: 1330, duration: 0.65,
          volume: 0.035, type: 'sine', cutoff: 3000, pan: -pan });
        break;
      case 'bomb':
        tone({ frequency: 1400, endFrequency: 170, duration: Math.max(0.2, p.duration || 0.8),
          volume: 0.085 * force, type: 'sine', cutoff: 3000, attack: 0.04 });
        break;
      case 'powerup':
        [587.33, 739.99, 880, 1174.66].forEach((frequency, i) => tone({ at: at + i * 0.065,
          frequency, duration: 0.21, volume: 0.15, type: 'triangle', cutoff: 6500, pan: i * 0.2 - 0.3 }));
        break;
      case 'boss':
        for (let i = 0; i < 3; i++) {
          tone({ at: at + i * 0.38, frequency: 146.83, endFrequency: 138.59, duration: 0.32,
            volume: 0.24, type: 'sawtooth', cutoff: 1300 });
          tone({ at: at + i * 0.38, frequency: 220, endFrequency: 207.65, duration: 0.32,
            volume: 0.13, type: 'triangle', cutoff: 1700 });
        }
        break;
      case 'victory':
        [62, 65, 69, 74, 72, 74, 77, 81].forEach((note, i) => tone({ at: at + i * 0.13,
          frequency: 440 * 2 ** ((note - 69) / 12), duration: i === 7 ? 0.75 : 0.24,
          volume: 0.18, type: 'triangle', cutoff: 5000 }));
        [146.83, 174.61, 220].forEach((frequency) => tone({ at: at + 0.91, frequency,
          duration: 1.1, volume: 0.09, type: 'sawtooth', cutoff: 1800 }));
        break;
      case 'defeat':
        [293.66, 261.63, 233.08, 146.83].forEach((frequency, i) => tone({ at: at + i * 0.2,
          frequency, endFrequency: frequency * 0.96, duration: 0.4, volume: 0.16,
          type: 'triangle', cutoff: 1700 }));
        break;
      case 'menu':
        tone({ frequency: p.back ? 370 : 740, endFrequency: p.back ? 260 : 880,
          duration: 0.075, volume: 0.1, cutoff: 4500, type: 'sine' });
        break;
      case 'start':
      case 'wave':
        [440, 587.33, 880].forEach((frequency, i) => tone({ at: at + i * 0.075,
          frequency, duration: 0.18, volume: name === 'wave' ? 0.085 : 0.14,
          type: 'triangle', cutoff: 4000 }));
        break;
      case 'radio': {
        // Paired oscillators and changing formants produce small Animalese syllables.
        const syllables = Math.max(3, Math.min(11, Number(p.syllables) || 6));
        noise({ duration: 0.045, volume: 0.07, cutoff: 2400, endCutoff: 1100, type: 'bandpass' });
        for (let i = 0; i < syllables; i++) {
          const vowel = [800, 1300, 1900, 1100, 600][Math.floor(this._random() * 5)];
          const fundamental = (p.low ? 130 : 240) + this._random() * 180;
          const start = at + 0.05 + i * 0.083;
          tone({ at: start, frequency: fundamental, endFrequency: fundamental * (0.8 + this._random() * 0.4),
            duration: 0.056 + this._random() * 0.025, volume: 0.07,
            type: 'sawtooth', cutoff: vowel, resonance: 5 });
          tone({ at: start, frequency: fundamental * 2.02, duration: 0.045,
            volume: 0.018, type: 'sine', cutoff: vowel * 1.6 });
          this.stats.radioSyllables++;
        }
        noise({ at: at + 0.07 + syllables * 0.083, duration: 0.045, volume: 0.05,
          cutoff: 2200, endCutoff: 900, type: 'bandpass' });
        break;
      }
      default: return false;
    }
    return true;
  }

  diagnostics() {
    return { ready: this.ready, failed: this.failed, state: this.context?.state || 'locked',
      musicVolume: this.musicVolume, sfxVolume: this.sfxVolume, muted: this.muted,
      paused: this.paused, stage: this.stage, ...this.stats };
  }

  dispose() {
    if (this.ready) {
      this.master.gain.setValueAtTime(0, this.context.currentTime);
      this.music.disconnect();
      this.sfx.disconnect();
      this.master.disconnect();
      this.compressor.disconnect();
      if (this.context.close) this.context.close().catch(() => {});
    }
    this.ready = false;
  }
}
