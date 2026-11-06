/* Boiler Buddies — original procedural score, effects and nonsense voices.
   All oscillators, percussion and room response are generated in this file. */

const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const SCORE = [
  [74, null, 71, 67, 69, null, 71, 69],
  [68, 71, 76, null, 74, 71, 68, null],
  [72, null, 76, 79, 76, 74, 72, null],
  [78, 76, 74, null, 72, 69, 66, null],
  [67, 71, 74, 79, null, 78, 76, 74],
  [76, null, 74, 71, 68, 71, 74, null],
  [72, 76, 79, 81, 79, 76, 72, 69],
  [74, null, 72, 69, 66, null, 69, 66],
];
const CHORDS = [
  [55, 59, 62, 64], [52, 56, 59, 62],
  [57, 60, 64, 67], [50, 54, 57, 60],
  [55, 59, 62, 64], [52, 56, 59, 62],
  [57, 60, 64, 67], [50, 54, 57, 60],
];
const BASS = [
  [31, 38, 40, 42], [28, 35, 38, 40],
  [33, 40, 43, 42], [26, 33, 36, 37],
  [31, 38, 40, 42], [28, 35, 38, 40],
  [33, 40, 43, 45], [26, 33, 36, 30],
];

export class AudioEngine {
  constructor(options = {}) {
    this.context = options.context || null;
    this.musicVolume = 0.1;
    this.sfxVolume = 0.65;
    this.scene = 'title';
    this.step = 0;
    this.nextNote = 0;
    this.timer = null;
    this.built = false;
    this.autoSchedule = options.autoSchedule !== false;
    this.nodes = new Set();
    this.effectCount = 0;
    this.voiceCount = 0;
    this.musicNotes = 0;
    if (this.context) this._build();
  }

  _build() {
    if (this.built) return;
    const c = this.context;
    this.musicBus = c.createGain();
    this.effectsBus = c.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.effectsBus.gain.value = this.sfxVolume;
    this.master = c.createGain();
    this.master.gain.value = 0.82;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -9;
    this.compressor.knee.value = 14;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.12;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 1024;
    this._samples = new Float32Array(1024);
    this.musicBus.connect(this.master);
    this.effectsBus.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(c.destination);

    // A short handmade boiler-room ambience, with no downloaded impulse file.
    this.room = c.createConvolver();
    const impulse = c.createBuffer(2, Math.floor(c.sampleRate * 0.72), c.sampleRate);
    let seed = 29087;
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] = (seed / 2147483648 - 1) * (1 - i / data.length) ** 3 * 0.3;
      }
    }
    this.room.buffer = impulse;
    const wet = c.createGain();
    wet.gain.value = 0.1;
    this.musicBus.connect(this.room);
    this.room.connect(wet);
    wet.connect(this.master);

    this.noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const noise = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      noise[i] = seed / 2147483648 - 1;
    }
    this.built = true;
    this.nextNote = c.currentTime + 0.04;
  }

  async unlock() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context({ latencyHint: 'interactive' });
      this._build();
    }
    if (this.context.state === 'suspended' && this.context.resume) await this.context.resume();
    if (this.autoSchedule && this.timer === null && this.context.state !== 'closed') {
      this.nextNote = this.context.currentTime + 0.025;
      this.timer = setInterval(() => this._tick(), 30);
      this._tick();
    }
    return true;
  }

  setMusicVolume(value) {
    this.musicVolume = clamp01(value);
    if (this.built) this.musicBus.gain.setTargetAtTime(this.scene === 'pause' ? 0 : this.musicVolume, this.context.currentTime, 0.035);
  }

  setSfxVolume(value) {
    this.sfxVolume = clamp01(value);
    if (this.built) this.effectsBus.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.025);
  }

  setScene(scene) {
    if (scene === this.scene) return;
    this.scene = scene;
    this.step = 0;
    if (this.built) {
      this.nextNote = this.context.currentTime + 0.03;
      this.musicBus.gain.setTargetAtTime(scene === 'pause' ? 0 : this.musicVolume, this.context.currentTime, 0.06);
    }
  }

  _duration() {
    const bpm = { title: 104, play: 124, bonus: 154, boss: 142, win: 116, pause: 104 }[this.scene] || 124;
    return 60 / bpm / 2;
  }

  _tick() {
    if (!this.built || this.context.state !== 'running') return;
    if (this.scene === 'pause') {
      this.nextNote = this.context.currentTime + 0.03;
      return;
    }
    // Losing browser focus never creates a burst of overdue music.
    if (this.nextNote < this.context.currentTime - 0.15) this.nextNote = this.context.currentTime + 0.025;
    while (this.nextNote < this.context.currentTime + 0.14) {
      this._scheduleStep(this.step, this.nextNote);
      const swing = this.scene === 'bonus' ? 0.04 : 0.1;
      this.nextNote += this._duration() * (this.step % 2 === 0 ? 1 + swing : 1 - swing);
      this.step++;
    }
  }

  _track(node) {
    this.nodes.add(node);
    node.onended = () => {
      this.nodes.delete(node);
      try { node.disconnect(); } catch { /* A stopped context already detached it. */ }
    };
    return node;
  }

  _tone(bus, frequency, time, duration, options = {}) {
    const c = this.context;
    const osc = this._track(c.createOscillator());
    const gain = c.createGain();
    osc.type = options.wave || 'triangle';
    osc.frequency.setValueAtTime(Math.max(15, frequency), time);
    if (options.end) osc.frequency.exponentialRampToValueAtTime(Math.max(15, options.end), time + duration);
    if (options.detune) osc.detune.value = options.detune;
    const amp = options.amp ?? 0.12;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp), time + Math.min(0.008, duration * 0.1));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    if (options.filter) {
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = options.filter;
      gain.connect(filter);
      filter.connect(bus);
    } else gain.connect(bus);
    osc.start(time);
    osc.stop(time + duration + 0.015);
  }

  _noise(bus, time, duration, amp = 0.15, frequency = 1800, type = 'highpass') {
    const c = this.context;
    const source = this._track(c.createBufferSource());
    source.buffer = this.noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = c.createGain();
    gain.gain.setValueAtTime(amp, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(time, (Math.sin(time * 39.13) * 0.5 + 0.5) * 0.4, duration);
  }

  _pluck(bus, note, time, duration = 0.24, amp = 0.13) {
    this._tone(bus, midi(note), time, duration, { wave: 'triangle', amp });
    this._tone(bus, midi(note) * 2, time, duration * 0.4, { wave: 'sine', amp: amp * 0.22 });
  }

  _scheduleStep(step, time) {
    const beat = step % 8;
    const bar = Math.floor(step / 8) % 8;
    const bus = this.musicBus;
    const duration = this._duration();
    const bonus = this.scene === 'bonus';
    const boss = this.scene === 'boss';
    const title = this.scene === 'title';
    const transpose = boss ? -2 : bonus ? 12 : 0;
    if (beat % 2 === 0) {
      const note = BASS[bar][beat / 2] + (boss ? -2 : 0);
      this._tone(bus, midi(note), time, duration * 1.55, { wave: 'triangle', amp: 0.3 });
      this._tone(bus, midi(note) * 2, time, duration * 0.8, { wave: 'sine', amp: 0.06 });
      // Felt kick.
      this._tone(bus, 128, time, 0.12, { wave: 'sine', amp: 0.23, end: 40 });
    }
    if (beat === 2 || beat === 6) {
      this._noise(bus, time, 0.1, 0.16, 1600, 'highpass');
      this._tone(bus, 170, time, 0.06, { wave: 'triangle', amp: 0.08, end: 95 });
    }
    this._noise(bus, time, beat % 2 ? 0.037 : 0.022, beat % 2 ? 0.065 : 0.04, 6500, 'highpass');
    if (beat === 1 || beat === 5 || (bonus && beat === 7)) {
      for (const note of CHORDS[bar]) {
        this._tone(bus, midi(note + (boss ? -2 : 0)), time, duration * 0.7, { wave: 'triangle', amp: 0.075 });
      }
    }
    const lead = SCORE[bar][beat];
    if (lead !== null && (!title || beat % 2 === 0)) {
      this._pluck(bus, lead + transpose, time + 0.006, duration * (beat === 7 ? 0.65 : 1.15), 0.15);
      this.musicNotes++;
    }
    if (boss && beat % 2 === 1) this._tone(bus, midi(43 + (bar % 2) * 3), time, 0.13, { wave: 'sawtooth', amp: 0.045, filter: 800 });
    // A little reply from the pipes at the end of every other bar.
    if (bar % 2 && beat === 7 && !title) {
      this._pluck(bus, 86 + (bonus ? 7 : 0), time + duration * 0.45, 0.08, 0.08);
    }
  }

  play(name, atTime) {
    if (!this.built || this.context.state === 'closed') return;
    const t = Math.max(this.context.currentTime + 0.002, atTime ?? this.context.currentTime + 0.002);
    const bus = this.effectsBus;
    const tone = (f, d, opt = {}, delay = 0) => this._tone(bus, f, t + delay, d, opt);
    const pluck = (n, delay = 0, d = 0.18, a = 0.2) => this._pluck(bus, n, t + delay, d, a);
    const noise = (d, a, f, type = 'highpass', delay = 0) => this._noise(bus, t + delay, d, a, f, type);
    this.effectCount++;
    switch (name) {
      case 'jump':
        tone(230, 0.18, { wave: 'triangle', amp: 0.21, end: 740 });
        tone(460, 0.1, { wave: 'sine', amp: 0.05, end: 920 });
        break;
      case 'bump':
        tone(155, 0.14, { wave: 'sine', amp: 0.48, end: 48 });
        noise(0.055, 0.24, 1300, 'lowpass');
        tone(380, 0.08, { wave: 'triangle', amp: 0.13, end: 160 });
        break;
      case 'flip':
        [74, 78, 83].forEach((n, i) => pluck(n, i * 0.042, 0.16, 0.16));
        tone(170, 0.15, { wave: 'triangle', amp: 0.18, end: 450 });
        break;
      case 'kick':
        noise(0.09, 0.35, 1300, 'bandpass');
        tone(380, 0.15, { wave: 'sawtooth', amp: 0.12, end: 65, filter: 1100 });
        pluck(79, 0.035, 0.12, 0.17);
        break;
      case 'coin':
        pluck(83, 0, 0.11, 0.21);
        pluck(90, 0.06, 0.3, 0.16);
        break;
      case 'hurt':
        [66, 63, 59, 54].forEach((n, i) => tone(midi(n), 0.1, { wave: 'square', amp: 0.075, filter: 1450 }, i * 0.065));
        noise(0.18, 0.18, 800, 'lowpass');
        break;
      case 'pow':
        tone(180, 0.65, { wave: 'sine', amp: 0.62, end: 28 });
        noise(0.5, 0.5, 1700, 'lowpass');
        [400, 570, 810, 1100].forEach((f, i) => tone(f, 0.32, { wave: 'triangle', amp: 0.13, end: f * 0.7 }, i * 0.035));
        break;
      case 'clear':
        [67, 71, 74, 79, 76, 79, 83, 86].forEach((n, i) => pluck(n, i * 0.075, 0.28, 0.16));
        [55, 59, 62, 67].forEach((n) => pluck(n, 0.45, 0.5, 0.1));
        break;
      case 'win':
        [67, 67, 71, 74, 79, 78, 76, 74, 79, 83, 86, 91].forEach((n, i) => pluck(n, i * 0.13, i === 11 ? 0.9 : 0.24, 0.17));
        [43, 55, 59, 62, 67].forEach((n) => pluck(n, 1.4, 1.1, 0.12));
        break;
      case 'lose':
        [74, 72, 71, 66, 62, 55].forEach((n, i) => tone(midi(n), i === 5 ? 0.75 : 0.21, { wave: 'triangle', amp: 0.2, end: midi(n - 1) }, i * 0.18));
        break;
      case 'ui':
        pluck(79, 0, 0.09, 0.11);
        break;
      case 'freeze':
        [90, 95, 102, 107].forEach((n, i) => tone(midi(n), 0.55, { wave: 'sine', amp: 0.085, end: midi(n - 2) }, i * 0.055));
        noise(0.4, 0.12, 5200, 'highpass');
        break;
      case 'spawn':
        [210, 315, 472].forEach((f, i) => tone(f, 0.1, { wave: 'sine', amp: 0.16, end: f * 1.4 }, i * 0.055));
        break;
      default:
        pluck(72, 0, 0.08, 0.1);
    }
  }

  voice(seed = 1, atTime) {
    if (!this.built || this.context.state === 'closed') return;
    let rand = (Number(seed) || 1) >>> 0;
    const random = () => {
      rand = (Math.imul(rand, 1664525) + 1013904223) >>> 0;
      return rand / 4294967296;
    };
    const c = this.context;
    const vowels = [[700, 1200], [330, 2200], [380, 850], [580, 1800], [300, 900]];
    let time = Math.max(c.currentTime + 0.01, atTime ?? c.currentTime + 0.01);
    const count = 4 + Math.floor(random() * 4);
    for (let i = 0; i < count; i++) {
      const duration = 0.065 + random() * 0.055;
      const pitch = (155 + random() * 130) * (i === count - 1 ? 0.85 : 1);
      const vowel = vowels[Math.floor(random() * vowels.length)];
      const source = this._track(c.createOscillator());
      source.type = 'sawtooth';
      source.frequency.setValueAtTime(pitch, time);
      source.frequency.linearRampToValueAtTime(pitch * (0.93 + random() * 0.18), time + duration);
      for (let band = 0; band < 2; band++) {
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = vowel[band];
        filter.Q.value = band === 0 ? 5 : 7;
        const envelope = c.createGain();
        envelope.gain.setValueAtTime(0.0001, time);
        envelope.gain.exponentialRampToValueAtTime(band === 0 ? 0.22 : 0.14, time + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(this.effectsBus);
      }
      source.start(time);
      source.stop(time + duration + 0.01);
      if (i % 2 === 0) this._noise(this.effectsBus, time, 0.02, 0.035, 2500, 'highpass');
      time += duration + 0.022;
    }
    this.voiceCount++;
  }

  // Kept for render loops that expect an audio update hook; audio uses its own clock.
  update() {}

  measure() {
    if (!this.built) return { rms: 0, peak: 0, active: false, scene: this.scene, effects: this.effectCount, voices: this.voiceCount, musicNotes: this.musicNotes };
    this.analyser.getFloatTimeDomainData(this._samples);
    let energy = 0;
    let peak = 0;
    for (const value of this._samples) {
      energy += value * value;
      peak = Math.max(peak, Math.abs(value));
    }
    return { rms: Math.sqrt(energy / this._samples.length), peak, active: this.context.state === 'running', scene: this.scene, effects: this.effectCount, voices: this.voiceCount, musicNotes: this.musicNotes };
  }

  async renderTest(seconds = 2) {
    const OfflineContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!OfflineContext) return { supported: false };
    const duration = Math.max(1, Math.min(10, seconds));
    const context = new OfflineContext(2, Math.floor(44100 * duration), 44100);
    const engine = new AudioEngine({ context, autoSchedule: false });
    engine.setScene('play');
    let time = 0.01;
    let step = 0;
    while (time < duration - 0.1) {
      engine._scheduleStep(step, time);
      time += engine._duration() * (step % 2 ? 0.9 : 1.1);
      step++;
    }
    engine.play('jump', 0.08);
    engine.play('bump', 0.35);
    engine.play('coin', 0.6);
    engine.voice(1983, Math.min(duration - 0.7, 1));
    const buffer = await context.startRendering();
    let peak = 0;
    let energy = 0;
    let finite = true;
    const data = buffer.getChannelData(0);
    for (const value of data) {
      finite = finite && Number.isFinite(value);
      peak = Math.max(peak, Math.abs(value));
      energy += value * value;
    }
    return { supported: true, seconds: duration, samples: data.length, peak, rms: Math.sqrt(energy / data.length), finite, musicVolume: engine.musicVolume, voices: engine.voiceCount, effects: engine.effectCount };
  }

  dispose() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    for (const node of this.nodes) {
      try { node.stop(); } catch { /* Already stopped. */ }
    }
    this.nodes.clear();
    if (this.context && this.context.state !== 'closed' && this.context.close) this.context.close();
    this.built = false;
  }
}
