// Every sound is synthesized. No audio assets or speech services are used.
export class HockeyAudio {
  constructor(options = {}) {
    this.ctx = null;
    this.musicVolume = 0.10;
    this.sfxVolume = 0.65;
    this.enabled = false;
    this.step = 0;
    this.nextBeat = 0;
    this.lastVoice = -10;
    this.lastSkate = -10;
    this.state = 'title';
    this.stats = { tones: 0, noises: 0, voices: 0, musicNotes: 0, effects: 0 };
    if (options.context) this._init(options.context);
  }
  _init(ctx) {
    this.ctx = ctx;
    this.offline = typeof ctx.startRendering === 'function';
    this.master = ctx.createGain();
    this.master.gain.value = 0.82;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.18;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    const length = Math.ceil(ctx.sampleRate * 1.5);
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 8137;
    for (let i = 0; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    this.enabled = true;
    this.nextBeat = ctx.currentTime + 0.03;
  }
  async unlock() {
    try {
      if (!this.ctx) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return false;
        this._init(new AudioContext());
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      if (this.nextBeat < this.ctx.currentTime) this.nextBeat = this.ctx.currentTime + 0.02;
      return true;
    } catch { return false; }
  }
  setMusic(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.ctx) this.musicBus.gain.setTargetAtTime(this.musicVolume * (this.paused ? 0.38 : 1), this.ctx.currentTime, 0.035);
  }
  setSfx(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.035);
  }
  _tone(frequency, time, duration, gain = 0.15, type = 'triangle', bus = this.sfxBus, endFrequency) {
    if (!this.ctx || gain <= 0) return;
    const osc = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(10, frequency), time);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFrequency), time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + Math.min(0.009, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(envelope); envelope.connect(bus);
    osc.start(time); osc.stop(time + duration + 0.008);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
    this.stats.tones++;
  }
  _noise(time, duration, gain, cutoff = 1800, filterType = 'lowpass') {
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const envelope = this.ctx.createGain();
    source.buffer = this.noise;
    source.loop = true;
    filter.type = filterType;
    filter.frequency.value = cutoff;
    filter.Q.value = filterType === 'bandpass' ? 1.5 : 0.7;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + Math.min(0.025, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(this.sfxBus);
    source.start(time); source.stop(time + duration + 0.01);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    this.stats.noises++;
  }
  update(dt, state = 'play') {
    if (!this.ctx || (this.ctx.state === 'suspended' && !this.offline) || !this.enabled) return;
    const name = typeof state === 'string' ? state : (state.phase || state.mode || 'play');
    const paused = name === 'pause' || name === 'paused' || !!state.paused;
    if (paused !== this.paused) { this.paused = paused; this.setMusic(this.musicVolume); }
    this.state = name;
    const now = this.ctx.currentTime;
    if (this.nextBeat < now - 0.1) this.nextBeat = now + 0.015;
    let budget = 8;
    while (this.nextBeat < now + 0.16 && budget-- > 0) {
      this._musicStep(this.step++, this.nextBeat);
      this.nextBeat += 60 / 134 / 2;
    }
  }
  _musicStep(step, time) {
    const i = step % 32;
    const chords = [[50, 54, 57], [55, 59, 62], [57, 61, 64], [47, 50, 54]];
    const chord = chords[Math.floor(step / 16) % 4];
    const melody = [74, null, 78, 81, 78, null, 76, 74, 69, null, 71, 73, 74, null, null, null,
                    78, null, 81, 83, 81, 78, 76, null, 74, 73, 71, 69, 74, null, 81, null];
    const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
    if (i % 4 === 0) {
      this._tone(hz(chord[0] - 12), time, 0.21, 0.24, 'triangle', this.musicBus);
      this._tone(hz(chord[0]), time, 0.16, 0.07, 'sine', this.musicBus);
      this.stats.musicNotes += 2;
    }
    if (i % 4 === 2) {
      for (const note of chord) {
        this._tone(hz(note + 12), time, 0.15, 0.055, 'triangle', this.musicBus);
        this.stats.musicNotes++;
      }
    }
    if (melody[i] !== null) {
      this._tone(hz(melody[i]), time, 0.17, 0.11, 'triangle', this.musicBus);
      this._tone(hz(melody[i] + 12), time, 0.1, 0.018, 'sine', this.musicBus);
      this.stats.musicNotes += 2;
    }
    if (i % 2 === 0) this._tone(i % 4 === 0 ? 90 : 240, time, 0.045, 0.055, 'square', this.musicBus, 30);
  }
  sfx(name, intensity = 1) {
    if (!this.ctx || !this.enabled || (this.ctx.state === 'suspended' && !this.offline)) return;
    const t = this.ctx.currentTime + 0.003;
    const a = Math.max(0.05, Math.min(1.5, Number(intensity) || 1));
    this.stats.effects++;
    switch (name) {
      case 'shoot': case 'shot': case 'slap':
        this._noise(t, 0.13, 0.28 * a, 3400);
        this._tone(210, t, 0.12, 0.29 * a, 'triangle', this.sfxBus, 48);
        this._tone(780, t + 0.015, 0.07, 0.1 * a, 'sine', this.sfxBus, 220);
        break;
      case 'pass':
        this._tone(520, t, 0.075, 0.17 * a, 'triangle', this.sfxBus, 170);
        this._noise(t, 0.045, 0.1 * a, 2600);
        break;
      case 'check': case 'hit': case 'board':
        this._noise(t, 0.23, 0.35 * a, 1200);
        this._tone(130, t, 0.2, 0.33 * a, 'sine', this.sfxBus, 32);
        this._tone(340, t + 0.015, 0.055, 0.08 * a, 'square', this.sfxBus, 80);
        break;
      case 'goal':
        this._noise(t, 1.4, 0.12 * a, 2100, 'bandpass');
        [293.66, 369.99, 440, 587.33].forEach((n, i) => {
          this._tone(n, t + i * 0.12, 0.52, 0.18 * a, 'sawtooth');
          this._tone(n / 2, t + i * 0.12, 0.65, 0.16 * a, 'triangle');
        });
        this.voice('goal');
        break;
      case 'whistle': case 'faceoff':
        this._tone(2350, t, 0.14, 0.09 * a, 'sine', this.sfxBus, 2550);
        this._tone(2850, t, 0.14, 0.045 * a, 'sine', this.sfxBus, 3020);
        this._tone(2400, t + 0.19, 0.21, 0.08 * a, 'sine', this.sfxBus, 2200);
        break;
      case 'skate':
        if (t - this.lastSkate < 0.12) return;
        this.lastSkate = t;
        this._noise(t, 0.11, 0.09 * a, 4300, 'highpass');
        break;
      case 'boost': case 'dash':
        this._noise(t, 0.28, 0.17 * a, 2200, 'bandpass');
        this._tone(170, t, 0.22, 0.13 * a, 'triangle', this.sfxBus, 790);
        break;
      case 'save': case 'post':
        this._tone(880, t, 0.24, 0.16 * a, 'sine');
        this._tone(1430, t, 0.17, 0.08 * a, 'sine');
        this._noise(t, 0.04, 0.1 * a, 3100);
        break;
      case 'power': case 'ready':
        [440, 554.37, 659.25, 880].forEach((n, i) => this._tone(n, t + i * 0.06, 0.19, 0.12 * a, 'triangle'));
        break;
      case 'win': case 'victory':
        [62, 66, 69, 74, 69, 74, 78].forEach((n, i) => this._tone(440 * 2 ** ((n - 69) / 12), t + i * 0.15, 0.34, 0.2 * a, 'triangle'));
        this.voice('win');
        break;
      case 'buzzer': case 'end':
        this._tone(123.47, t, 0.7, 0.2 * a, 'sawtooth');
        this._tone(130.81, t, 0.7, 0.13 * a, 'square');
        break;
      case 'switch':
        this._tone(560, t, 0.045, 0.12 * a, 'sine');
        this._tone(840, t + 0.04, 0.06, 0.1 * a, 'sine');
        break;
      case 'ui': case 'select': case 'click':
        this._tone(740, t, 0.065, 0.12 * a, 'triangle', this.sfxBus, 980);
        break;
      case 'back':
        this._tone(620, t, 0.08, 0.1 * a, 'triangle', this.sfxBus, 370);
        break;
      case 'charge':
        this._tone(230, t, 0.19, 0.08 * a, 'triangle', this.sfxBus, 450);
        break;
      default:
        this._tone(600, t, 0.065, 0.09 * a, 'triangle');
    }
  }
  voice(mood = 'play') {
    if (!this.ctx || !this.enabled || (this.ctx.state === 'suspended' && !this.offline)) return;
    const now = this.ctx.currentTime + 0.025;
    if (now - this.lastVoice < 0.85) return;
    this.lastVoice = now;
    this.stats.voices++;
    // Short vowel-like syllables: filtered saw waves, not intelligible speech.
    const excited = mood === 'goal' || mood === 'win';
    const syllables = excited ? [0, 5, 9, 7, 12, 4, 7] : [0, 3, -2, 5];
    const vowels = [[700, 1220], [300, 2300], [450, 800], [550, 1700], [350, 1000]];
    syllables.forEach((pitch, i) => {
      const t = now + i * (excited ? 0.105 : 0.12);
      const osc = this.ctx.createOscillator();
      const envelope = this.ctx.createGain();
      const formants = vowels[(i + (excited ? 2 : 0)) % vowels.length];
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime((excited ? 190 : 135) * 2 ** (pitch / 12), t);
      osc.frequency.exponentialRampToValueAtTime((excited ? 185 : 125) * 2 ** (pitch / 12), t + 0.09);
      envelope.gain.setValueAtTime(0.0001, t);
      envelope.gain.exponentialRampToValueAtTime(excited ? 0.09 : 0.07, t + 0.015);
      envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
      const filters = formants.map((frequency, j) => {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = j ? 6 : 4;
        osc.connect(filter); filter.connect(envelope); return filter;
      });
      envelope.connect(this.sfxBus);
      osc.start(t); osc.stop(t + 0.1);
      osc.onended = () => { osc.disconnect(); envelope.disconnect(); filters.forEach(f => f.disconnect()); };
      this.stats.tones++;
    });
  }
  levels() {
    if (!this.analyser) return { rms: 0, peak: 0 };
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0, peak = 0;
    for (const x of data) { sum += x * x; peak = Math.max(peak, Math.abs(x)); }
    return { rms: Math.sqrt(sum / data.length), peak };
  }
  static async audit() {
    const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!Context) return { supported: false };
    const ctx = new Context(1, 44100 * 3, 44100);
    const audio = new HockeyAudio({ context: ctx });
    for (let i = 0; i < 12; i++) audio._musicStep(i, 0.03 + i * 0.2);
    audio.sfx('shoot'); audio.sfx('pass'); audio.sfx('check'); audio.sfx('goal');
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    let sum = 0, peak = 0, finite = true;
    for (const x of data) { sum += x * x; peak = Math.max(peak, Math.abs(x)); finite &&= Number.isFinite(x); }
    return { supported: true, finite, rms: Math.sqrt(sum / data.length), peak, samples: data.length, stats: audio.stats, musicDefault: audio.musicVolume };
  }
  async dispose() {
    if (this.ctx && this.ctx.close) await this.ctx.close();
    this.ctx = null; this.enabled = false;
  }
}
