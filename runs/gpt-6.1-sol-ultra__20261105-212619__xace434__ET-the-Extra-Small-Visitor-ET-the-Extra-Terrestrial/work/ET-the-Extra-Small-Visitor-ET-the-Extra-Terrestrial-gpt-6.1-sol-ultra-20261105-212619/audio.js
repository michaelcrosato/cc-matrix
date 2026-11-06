// Every audible sound is synthesized here. No sample, music or voice files.
const TAU = Math.PI * 2;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, Number.isFinite(+x) ? +x : a));
const HARMONY = [
  [50, 57, 62, 66], [47, 54, 59, 62], [43, 55, 59, 62], [45, 57, 61, 64],
  [50, 57, 62, 66], [54, 57, 61, 66], [43, 55, 59, 64], [45, 57, 62, 64],
  [47, 54, 59, 66], [43, 55, 59, 62], [50, 57, 62, 66], [45, 57, 61, 64],
  [43, 55, 62, 67], [47, 54, 59, 66], [45, 57, 61, 64], [50, 57, 62, 66],
];
// A small original melody. Rests and answered phrases leave room for the world.
const MELODY = [
  74, 0, 78, 81, 0, 78, 76, 0, 71, 0, 74, 78, 0, 76, 74, 0,
  79, 0, 78, 74, 0, 71, 69, 0, 73, 0, 76, 81, 0, 76, 73, 0,
  78, 81, 86, 0, 85, 81, 78, 0, 78, 0, 81, 85, 0, 83, 81, 0,
  79, 0, 83, 86, 0, 83, 79, 0, 81, 0, 78, 76, 0, 74, 0, 0,
];

export class GameAudio {
  constructor({ context = null } = {}) {
    this.ctx = context;
    this.musicVolume = 0.10;
    this.sfxVolume = 0.68;
    this.initialized = false;
    this.paused = false;
    this.unlocked = false;
    this.beat = 0;
    this.nextBeat = 0;
    this.stepTimer = 0;
    this.ambientTimer = 0;
    this.voiceTimer = -100;
    this.motion = { stage: 0, moving: false, danger: 0, flying: false };
    this.stats = { notes: 0, effects: 0, syllables: 0, activeSources: 0, ticks: 0 };
    this.seed = 0x51a19;
    this.sources = new Set();
    if (context) this._build();
  }

  _random() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  _build() {
    if (this.initialized || !this.ctx) return;
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.78;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -19;
    this.compressor.knee.value = 22;
    this.compressor.ratio.value = 3.5;
    this.compressor.attack.value = 0.008;
    this.compressor.release.value = 0.28;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyserData = new Float32Array(this.analyser.fftSize);
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(c.destination);
    this.music = c.createGain();
    this.music.gain.value = this.musicVolume;
    this.effects = c.createGain();
    this.effects.gain.value = this.sfxVolume;
    this.voices = c.createGain();
    this.voices.gain.value = this.sfxVolume * 0.85;
    this.ambience = c.createGain();
    this.ambience.gain.value = this.sfxVolume * 0.16;
    for (const bus of [this.music, this.effects, this.voices, this.ambience]) bus.connect(this.master);
    this.reverb = c.createConvolver();
    const length = Math.floor(c.sampleRate * 1.8);
    const impulse = c.createBuffer(2, length, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (this._random() * 2 - 1) * (1 - i / length) ** 3 * 0.55;
    }
    this.reverb.buffer = impulse;
    this.reverbGain = c.createGain();
    this.reverbGain.gain.value = 0.24;
    this.reverb.connect(this.reverbGain).connect(this.master);
    this.music.connect(this.reverb);
    this.noise = c.createBuffer(1, Math.floor(c.sampleRate * 2), c.sampleRate);
    const noiseData = this.noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < noiseData.length; i++) {
      brown = (brown + (this._random() * 2 - 1) * 0.075) / 1.075;
      noiseData[i] = brown * 3.5;
    }
    this.initialized = true;
    this.nextBeat = c.currentTime + 0.10;
  }

  async unlock() {
    if (!this.ctx) {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return false;
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
    }
    this._build();
    try {
      if (this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') await this.ctx.resume();
      this.unlocked = this.ctx.state === 'running' || this.ctx.constructor.name === 'OfflineAudioContext';
      if (this.nextBeat < this.ctx.currentTime) this.nextBeat = this.ctx.currentTime + 0.06;
      return this.unlocked;
    } catch {
      return false;
    }
  }

  _track(source, cleanup) {
    this.sources.add(source);
    this.stats.activeSources++;
    source.onended = () => {
      this.sources.delete(source);
      this.stats.activeSources = Math.max(0, this.stats.activeSources - 1);
      source.disconnect();
      for (const node of cleanup) node.disconnect();
    };
  }

  _tone(freq, at, duration, gain, type = 'sine', bus = this.effects, options = {}) {
    if (!this.initialized || gain <= 0) return;
    const c = this.ctx;
    at = Math.max(c.currentTime, at);
    duration = Math.max(0.025, duration);
    const source = c.createOscillator();
    source.type = type;
    source.frequency.setValueAtTime(Math.max(12, freq), at);
    if (options.end) source.frequency.exponentialRampToValueAtTime(Math.max(12, options.end), at + duration * 0.88);
    if (options.detune) source.detune.value = options.detune;
    const env = c.createGain();
    const attack = Math.min(options.attack || 0.009, duration * 0.35);
    env.gain.setValueAtTime(0.00001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.00002, gain), at + attack);
    env.gain.exponentialRampToValueAtTime(Math.max(0.00002, gain * (options.sustain || 0.25)), at + duration * 0.48);
    env.gain.exponentialRampToValueAtTime(0.00001, at + duration);
    const nodes = [env];
    if (options.filter) {
      const filter = c.createBiquadFilter();
      filter.type = options.filterType || 'lowpass';
      filter.frequency.setValueAtTime(options.filter, at);
      filter.Q.value = options.q || 0.7;
      if (options.filterEnd) filter.frequency.exponentialRampToValueAtTime(options.filterEnd, at + duration);
      source.connect(filter).connect(env);
      nodes.push(filter);
    } else source.connect(env);
    if (options.pan !== undefined && c.createStereoPanner) {
      const pan = c.createStereoPanner();
      pan.pan.value = clamp(options.pan, -1, 1);
      env.connect(pan).connect(bus);
      nodes.push(pan);
    } else env.connect(bus);
    this._track(source, nodes);
    source.start(at);
    source.stop(at + duration + 0.015);
    this.stats.notes++;
  }

  _noise(at, duration, gain, freq = 800, bus = this.effects, options = {}) {
    if (!this.initialized) return;
    const c = this.ctx;
    at = Math.max(c.currentTime, at);
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = options.type || 'bandpass';
    filter.frequency.setValueAtTime(freq, at);
    filter.Q.value = options.q || 0.7;
    if (options.end) filter.frequency.exponentialRampToValueAtTime(options.end, at + duration);
    const env = c.createGain();
    env.gain.setValueAtTime(0.00001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + Math.min(duration * 0.25, 0.18));
    env.gain.exponentialRampToValueAtTime(0.00001, at + duration);
    src.connect(filter).connect(env).connect(bus);
    this._track(src, [filter, env]);
    src.start(at, this._random());
    src.stop(at + duration + 0.02);
  }

  _bell(midi, at, length = 1, amplitude = 0.2, bus = this.music, pan = 0) {
    const f = hz(midi);
    this._tone(f, at, length, amplitude, 'sine', bus, { pan });
    this._tone(f * 2.002, at, length * 0.42, amplitude * 0.28, 'sine', bus, { pan });
    this._tone(f * 3.99, at, length * 0.15, amplitude * 0.06, 'sine', bus, { pan });
  }

  _scoreBeat(at) {
    const flying = this.motion.flying || this.motion.stage === 'flight' || this.motion.stage === 'escape';
    const danger = clamp(this.motion.danger, 0, 1);
    const bpm = flying ? 108 : danger > 0.65 ? 92 : 76;
    const interval = 60 / bpm;
    const b = this.beat++;
    const bar = Math.floor(b / 4);
    const chord = HARMONY[bar % HARMONY.length];
    const n = b % 4;
    if (n === 0) {
      // Breathing, detuned reeds make an orchestra-sized sound at living-room volume.
      for (let i = 1; i < chord.length; i++) {
        this._tone(hz(chord[i]), at + i * 0.018, interval * 4.7, 0.075, 'triangle', this.music,
          { attack: 0.18, sustain: 0.72, detune: i % 2 ? 5 : -5, filter: 1400, pan: (i - 2) * 0.34 });
        if (flying) this._tone(hz(chord[i] + 12), at, interval * 3.8, 0.032, 'sawtooth', this.music,
          { attack: 0.15, sustain: 0.8, filter: 1700, pan: (2 - i) * 0.3 });
      }
      this._tone(hz(chord[0] - 12), at, interval * 3.8, 0.20, 'sine', this.music, { attack: 0.06, sustain: 0.7 });
    }
    const arp = [1, 2, 3, 2][n];
    this._bell(chord[arp] + 12 + (bar % 4 === 3 && n === 3 ? 12 : 0), at, 1.25, 0.24, this.music, n % 2 ? 0.3 : -0.3);
    if (flying) this._bell(chord[[2, 3, 1, 3][n]] + 24, at + interval * 0.5, 0.85, 0.15, this.music, n % 2 ? -0.45 : 0.45);
    const melody = MELODY[b % MELODY.length];
    if (melody && (bar % 4 !== 3 || flying)) {
      this._tone(hz(melody + (flying ? 0 : -12)), at + 0.04, interval * (flying ? 1.25 : 1.8), flying ? 0.20 : 0.13,
        'triangle', this.music, { attack: 0.04, sustain: 0.65, filter: 2400 });
      this._tone(hz(melody), at + 0.045, interval * 1.6, 0.045, 'sine', this.music, { attack: 0.05, sustain: 0.6 });
    }
    if (danger > 0.25 || flying) {
      this._noise(at, 0.12, 0.10 * (danger + 0.4), 220, this.music, { type: 'lowpass' });
      this._tone(55, at, 0.18, 0.11, 'sine', this.music, { end: 35 });
    }
    return interval;
  }

  update(dt, state = {}) {
    this.motion = { ...this.motion, ...state };
    if (!this.initialized || this.paused || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this.stats.ticks++;
    if (this.nextBeat < now - 0.4) this.nextBeat = now + 0.04;
    let scheduled = 0;
    while (this.nextBeat < now + 0.22 && scheduled++ < 4) this.nextBeat += this._scoreBeat(this.nextBeat);
    this.stepTimer -= dt;
    if (state.moving && !state.flying && this.stepTimer <= 0) {
      this.sfx('step');
      this.stepTimer = state.boost ? 0.24 : 0.38;
    }
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 3.8 + this._random() * 3.5;
      const pan = this._random() * 1.5 - 0.75;
      const f = 2100 + this._random() * 800;
      for (let i = 0; i < 3; i++) this._tone(f, now + i * 0.10, 0.075, 0.05, 'sine', this.ambience, { pan });
      this._noise(now, 4.8, state.flying ? 0.28 : 0.11, state.flying ? 740 : 380, this.ambience, { end: state.flying ? 1600 : 540, q: 0.35 });
    }
  }

  note(index = 0) {
    if (!this.initialized || this.paused || this.ctx.state === 'closed') return;
    const notes = [69, 76, 81];
    const selected = notes[((Math.trunc(index) % notes.length) + notes.length) % notes.length];
    this._bell(selected, this.ctx.currentTime + 0.005, 0.95, 0.25, this.effects);
    this.stats.effects++;
  }

  sfx(name) {
    if (!this.initialized || this.paused || this.ctx.state === 'closed') return;
    const at = this.ctx.currentTime + 0.005;
    this.stats.effects++;
    switch (name) {
      case 'step':
      case 'footstep':
        this._noise(at, 0.085, 0.07, 300 + this._random() * 300);
        this._tone(110 + this._random() * 20, at, 0.07, 0.022, 'sine');
        break;
      case 'select':
      case 'ui':
        this._bell(81, at, 0.16, 0.16, this.effects);
        break;
      case 'back':
      case 'cancel':
        this._tone(520, at, 0.15, 0.11, 'sine', this.effects, { end: 280 });
        break;
      case 'candy':
      case 'drop':
        this._bell(86, at, 0.23, 0.18, this.effects, -0.12);
        this._noise(at, 0.08, 0.06, 1800);
        break;
      case 'collect':
      case 'part':
        [74, 78, 81, 86].forEach((n, i) => this._bell(n, at + i * 0.075, 0.70, 0.19, this.effects, (i - 1.5) * 0.14));
        break;
      case 'heal':
        [62, 69, 74, 78, 81, 86].forEach((n, i) => this._bell(n, at + i * 0.11, 0.95, 0.17, this.effects, (i - 2.5) * 0.14));
        this._noise(at, 0.9, 0.10, 600, this.effects, { end: 2400 });
        break;
      case 'pulse':
      case 'heart':
        [0, 0.15].forEach((t, i) => this._tone(150 - i * 35, at + t, 0.25, 0.18 - i * 0.04, 'sine', this.effects, { end: 55 }));
        this._bell(86, at + 0.16, 1.1, 0.08, this.effects);
        break;
      case 'alarm':
      case 'spotted':
        [0, 0.24].forEach((t) => this._tone(410, at + t, 0.20, 0.14, 'triangle', this.effects, { end: 560, filter: 950 }));
        break;
      case 'hit':
      case 'hurt':
      case 'lose':
        this._tone(165, at, 0.48, 0.23, 'triangle', this.effects, { end: 58, filter: 560 });
        this._noise(at, 0.28, 0.15, 400, this.effects, { end: 100 });
        break;
      case 'bike':
      case 'pedal':
        [0, 0.09, 0.18].forEach((t) => this._noise(at + t, 0.045, 0.09, 1100));
        this._bell(74, at + 0.04, 0.40, 0.11, this.effects);
        break;
      case 'flight':
      case 'launch':
        this._noise(at, 2.1, 0.22, 300, this.effects, { end: 2000, q: 0.4 });
        [62, 66, 69, 74, 78, 81, 86, 90].forEach((n, i) => this._bell(n, at + i * 0.12, 1.3, 0.16, this.effects, (i - 3.5) * 0.12));
        break;
      case 'ring':
      case 'checkpoint':
        this._bell(86, at, 0.75, 0.18, this.effects, -0.15);
        this._bell(93, at + 0.08, 0.9, 0.13, this.effects, 0.15);
        break;
      case 'signal':
      case 'tune':
        [69, 74, 81].forEach((n, i) => this._tone(hz(n), at + i * 0.13, 0.22, 0.13, 'sine'));
        this._noise(at + 0.02, 0.35, 0.05, 1700);
        break;
      case 'win':
      case 'goodbye':
        [62, 69, 74, 78, 81, 86, 85, 81, 78, 74].forEach((n, i) => this._bell(n, at + i * 0.19, 1.6, 0.17, this.effects, Math.sin(i) * 0.32));
        [50, 57, 62, 66, 69].forEach((n, i) => this._tone(hz(n), at + 0.5, 3.5, 0.045, 'triangle', this.effects, { attack: 0.2, sustain: 0.6, pan: (i - 2) * 0.2 }));
        break;
      default:
        this._bell(78, at, 0.18, 0.10, this.effects);
    }
  }

  speak(text = '', alien = true) {
    if (!this.initialized || this.paused || this.ctx.state === 'closed') return;
    const c = this.ctx;
    if (c.currentTime - this.voiceTimer < 0.18) return;
    this.voiceTimer = c.currentTime;
    // Text only seeds phrasing; it never becomes intelligible speech.
    const count = clamp(Math.ceil(String(text).length / 7), 3, 11);
    let code = [...String(text)].reduce((v, ch) => (v * 31 + ch.charCodeAt(0)) >>> 0, 17);
    for (let i = 0; i < count; i++) {
      code = (code * 1664525 + 1013904223) >>> 0;
      const unit = code / 4294967296;
      const t = c.currentTime + 0.02 + i * (alien ? 0.14 : 0.10);
      const length = alien ? 0.12 + unit * 0.07 : 0.085 + unit * 0.04;
      const base = (alien ? 135 : 260) * 2 ** ((Math.floor(unit * 8) - 3) / 12);
      const rise = i === count - 1 ? 0.79 : unit > 0.5 ? 1.15 : 0.93;
      const vowel = [480, 710, 1000, 1450][Math.floor(unit * 4)];
      this._tone(base, t, length, 0.12, alien ? 'sawtooth' : 'triangle', this.voices,
        { end: base * rise, filter: vowel, filterEnd: vowel * (unit > 0.5 ? 1.5 : 0.7), q: 3.8, attack: 0.014, sustain: 0.5 });
      this._tone(base * 2.008, t + 0.01, length * 0.8, 0.031, 'sine', this.voices, { end: base * rise * 2 });
      this.stats.syllables++;
    }
  }

  setMusic(volume) {
    this.musicVolume = clamp(volume, 0, 1);
    if (this.initialized) this.music.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.04);
  }

  setSfx(volume) {
    this.sfxVolume = clamp(volume, 0, 1);
    if (this.initialized) {
      this.effects.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.04);
      this.voices.gain.setTargetAtTime(this.sfxVolume * 0.85, this.ctx.currentTime, 0.04);
      this.ambience.gain.setTargetAtTime(this.sfxVolume * 0.16, this.ctx.currentTime, 0.04);
    }
  }

  pause(value) {
    this.paused = !!value;
    if (!this.initialized) return;
    this.master.gain.setTargetAtTime(this.paused ? 0.00001 : 0.78, this.ctx.currentTime, 0.06);
    if (!this.paused) this.nextBeat = this.ctx.currentTime + 0.10;
  }

  inspect() {
    let rms = 0;
    if (this.initialized && this.analyser.getFloatTimeDomainData) {
      this.analyser.getFloatTimeDomainData(this.analyserData);
      rms = Math.sqrt(this.analyserData.reduce((sum, sample) => sum + sample * sample, 0) / this.analyserData.length);
    }
    return {
      initialized: this.initialized,
      unlocked: this.unlocked,
      state: this.ctx?.state || 'locked',
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      paused: this.paused,
      rms,
      ...this.stats,
    };
  }

  dispose() {
    for (const source of this.sources) {
      try { source.stop(); } catch { /* A source may have just finished. */ }
    }
    this.sources.clear();
    if (this.initialized) {
      this.master.disconnect();
      this.compressor.disconnect();
      this.analyser.disconnect();
    }
    if (this.ctx && typeof this.ctx.close === 'function' && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
  }
}

export function synthTest(context) {
  const audio = new GameAudio({ context });
  audio.unlocked = true;
  for (let i = 0, t = 0.02; i < 8; i++) t += audio._scoreBeat(t);
  audio.sfx('collect');
  audio.speak('Wonderful strange little friend.', true);
  audio.sfx('pulse');
  return audio;
}
