// Original procedural score and Foley. No sampled or downloaded audio.
const TAU = Math.PI * 2;
const clamp01 = n => Math.min(1, Math.max(0, Number(n) || 0));
const midiHz = n => 440 * 2 ** ((n - 69) / 12);

export class AudioDirector {
  constructor() {
    this.context = null;
    this.musicVolume = 0.10;
    this.sfxVolume = 0.65;
    this.muted = false;
    this.playing = false;
    this.heat = 0;
    this.stage = 1;
    this.nextStepTime = 0;
    this.step = 0;
    this.lastVoice = -Infinity;
    this.events = 0;
    this.notes = 0;
    this.activeNodes = 0;
    this.noiseBuffer = null;
    this._unlocking = null;
    this._visibility = () => {
      // Avoid a suspended tab queuing seconds of notes on its return.
      if (this.context) this.nextStepTime = this.context.currentTime + 0.06;
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this._visibility);
  }
  async unlock() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context({latencyHint: 'interactive'});
      this._buildGraph(this.context);
    }
    if (this.context.state === 'suspended') {
      if (!this._unlocking) this._unlocking = this.context.resume().catch(() => false).finally(() => { this._unlocking = null; });
      await this._unlocking;
    }
    this.nextStepTime = Math.max(this.nextStepTime, this.context.currentTime + 0.025);
    return this.context.state === 'running';
  }
  _buildGraph(ctx) {
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.music = ctx.createGain();
    this.music.gain.value = this.musicVolume;
    this.effects = ctx.createGain();
    this.effects.gain.value = this.sfxVolume;
    this.voices = ctx.createGain();
    this.voices.gain.value = this.sfxVolume * 0.64;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.16;
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.voices.connect(this.master);
    this.master.connect(compressor);
    compressor.connect(ctx.destination);
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    // Deterministic noise keeps testing and the little percussion texture stable.
    let seed = 0x7c83;
    for (let i = 0; i < data.length; i++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      data[i] = (seed / 2147483648 - 1);
    }
  }
  _track(node) {
    this.activeNodes++;
    node.onended = () => { this.activeNodes = Math.max(0, this.activeNodes - 1); node.disconnect(); };
  }
  _tone(freq, time, duration, volume, type = 'triangle', target = this.effects, slide = null, detune = 0) {
    const ctx = this.context;
    if (!ctx || !target) return;
    const t = Math.max(time, ctx.currentTime);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slide !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + duration);
    osc.detune.value = detune;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(volume, t + Math.min(0.008, duration / 4));
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(env); env.connect(target);
    this._track(osc);
    osc.start(t); osc.stop(t + duration + 0.015);
    osc.addEventListener('ended', () => env.disconnect());
  }
  _noise(time, duration, volume, frequency = 1800, target = this.effects) {
    const ctx = this.context;
    if (!ctx || !target) return;
    const t = Math.max(time, ctx.currentTime);
    const noise = ctx.createBufferSource(); noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 0.7;
    const env = ctx.createGain();
    env.gain.setValueAtTime(volume, t); env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    noise.connect(filter); filter.connect(env); env.connect(target);
    this._track(noise);
    noise.start(t, 0.23); noise.stop(t + duration);
    noise.addEventListener('ended', () => {filter.disconnect(); env.disconnect();});
  }
  _piano(note, time, length, volume = 0.3) {
    const hz = midiHz(note);
    this._tone(hz, time, length, volume, 'triangle', this.music);
    this._tone(hz * 2, time, length * 0.55, volume * 0.19, 'sine', this.music, null, 3);
    this._tone(hz * 3, time, length * 0.3, volume * 0.065, 'sine', this.music);
    this.notes++;
  }
  update(_dt, {playing = false, heat = 0, stage = 1} = {}) {
    this.playing = !!playing;
    this.heat = clamp01(heat);
    this.stage = Math.max(1, Number(stage) || 1);
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (!playing || this.muted || this.musicVolume <= 0) {
      this.nextStepTime = now + 0.06;
      return;
    }
    if (this.nextStepTime < now - 0.05) this.nextStepTime = now + 0.025;
    let scheduled = 0;
    // A bounded look-ahead window; no timers survive a pause or restart.
    while (this.nextStepTime < now + 0.15 && scheduled++ < 4) {
      this._scoreStep(this.step++, this.nextStepTime);
      const eighth = 60 / (112 + this.heat * 12 + Math.min(this.stage - 1, 3) * 3) / 2;
      this.nextStepTime += eighth * (this.step % 2 ? 1.16 : 0.84);
    }
  }
  _scoreStep(step, time) {
    const s = step % 64;
    const bar = Math.floor(s / 8);
    const beat = s % 8;
    // C, A7, Dm7, G7; ragtime chromatic turns are an original tune.
    const roots = [48, 45, 50, 43, 48, 45, 50, 43];
    const chords = [[64,67,72],[61,64,67],[62,65,69],[62,65,71],[64,67,72],[61,64,67],[62,65,69],[62,65,71]];
    const melody = [76,79,81,79,76,75,74,72, 73,76,79,78,76,73,72,69, 74,77,81,79,77,76,74,72, 71,74,77,79,83,81,79,77, 76,79,84,83,81,79,76,72, 73,76,81,79,78,76,73,69, 74,77,81,84,83,81,77,74, 71,74,79,77,76,74,72,79];
    if (beat % 2 === 0) {
      if (beat === 0 || beat === 4) this._piano(roots[bar] - (beat === 4 ? 5 : 0), time, 0.28, 0.44);
      else chords[bar].forEach((n, i) => this._piano(n, time + i * 0.009, 0.19, 0.22));
    }
    this._piano(melody[s], time + (beat % 2 ? 0.008 : 0), beat === 7 ? 0.23 : 0.19, 0.34);
    if (beat === 2 || beat === 6) this._noise(time, 0.055, 0.055, 3500, this.music);
    if (this.heat > 0.65 && beat % 2 === 0) this._tone(900, time, 0.025, 0.065, 'square', this.music, 650);
  }
  sfx(name) {
    if (!this.context || this.context.state !== 'running' || this.muted) return;
    const t = this.context.currentTime + 0.005;
    this.events++;
    switch (name) {
      case 'jump': this._tone(175, t, 0.18, 0.25, 'triangle', this.effects, 610); this._noise(t, 0.04, 0.07, 900); break;
      case 'duck': this._tone(260, t, 0.11, 0.14, 'triangle', this.effects, 80); break;
      case 'coin': case 'loot':
        this._tone(1319, t, 0.09, 0.21, 'sine'); this._tone(1976, t + 0.065, 0.19, 0.16, 'sine'); break;
      case 'hit':
        this._noise(t, 0.16, 0.27, 900); this._tone(185, t, 0.31, 0.32, 'sawtooth', this.effects, 45); this._tone(460, t + 0.06, 0.12, 0.13, 'square', this.effects, 120); break;
      case 'elevator': case 'lift':
        this._tone(784, t, 0.32, 0.19, 'sine'); this._tone(1047, t + 0.11, 0.4, 0.14, 'sine'); break;
      case 'catch':
        [72,76,79,84].forEach((n,i) => this._tone(midiHz(n), t + i * 0.065, 0.3, 0.2, 'triangle'));
        this._noise(t + 0.02, 0.13, 0.12, 2100); break;
      case 'win':
        [72,76,79,84,79,84,88].forEach((n,i) => this._tone(midiHz(n), t + i * 0.11, 0.32, 0.22, 'triangle'));
        [48,60,64,67].forEach(n => this._tone(midiHz(n), t + 0.55, 0.7, 0.15, 'triangle')); break;
      case 'lose':
        [67,66,65,60,48].forEach((n,i) => this._tone(midiHz(n), t + i * 0.17, 0.32, 0.2, 'triangle')); break;
      case 'tick': this._tone(880, t, 0.045, 0.1, 'sine'); break;
      case 'menu': this._tone(659, t, 0.07, 0.13, 'sine'); this._tone(988, t + 0.04, 0.08, 0.09, 'sine'); break;
      case 'dash': this._noise(t, 0.17, 0.13, 1800); this._tone(220, t, 0.12, 0.14, 'triangle', this.effects, 660); break;
      default: this._tone(440, t, 0.08, 0.1, 'triangle');
    }
  }
  speak(mood = 'cop') {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.muted || ctx.currentTime - this.lastVoice < 0.75) return;
    this.lastVoice = ctx.currentTime;
    this.events++;
    const villain = /thief|crook|lose|taunt/.test(mood);
    const cheerful = /win|catch|hello/.test(mood);
    const syllables = cheerful ? 6 : 4;
    const vowelPairs = [[750,1150],[350,2000],[500,1500],[400,900],[650,1700],[300,2300]];
    for (let i = 0; i < syllables; i++) {
      const t = ctx.currentTime + 0.02 + i * 0.105;
      const d = 0.075 + (i % 2) * 0.025;
      const base = (villain ? 142 : 205) * [1,1.18,0.94,1.28,1.08,1.4][i];
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(base, t); osc.frequency.linearRampToValueAtTime(base * (i === syllables - 1 ? 0.72 : 1.12), t + d);
      const env = ctx.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(0.19, t + 0.007); env.gain.exponentialRampToValueAtTime(0.0001, t + d);
      const a = ctx.createBiquadFilter(); const b = ctx.createBiquadFilter();
      a.type = b.type = 'bandpass';
      const pair = vowelPairs[(i + (villain ? 2 : 0)) % vowelPairs.length];
      a.frequency.value = pair[0]; a.Q.value = 4;
      b.frequency.value = pair[1]; b.Q.value = 5;
      osc.connect(a); osc.connect(b); a.connect(env); b.connect(env); env.connect(this.voices);
      this._track(osc); osc.start(t); osc.stop(t + d + 0.01);
      osc.addEventListener('ended', () => {env.disconnect(); a.disconnect(); b.disconnect();});
      this._noise(t - 0.005, 0.018, 0.018, 1800, this.voices);
    }
  }
  setMusic(value) {
    this.musicVolume = clamp01(value);
    if (this.music) this.music.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.035);
  }
  setSfx(value) {
    this.sfxVolume = clamp01(value);
    if (this.effects) {
      this.effects.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.035);
      this.voices.gain.setTargetAtTime(this.sfxVolume * 0.64, this.context.currentTime, 0.035);
    }
  }
  mute(value = true) {
    this.muted = !!value;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.7, this.context.currentTime, 0.02);
  }
  inspect() {
    return {state: this.context?.state || 'locked', musicVolume: this.musicVolume, sfxVolume: this.sfxVolume, muted: this.muted, events: this.events, notes: this.notes, activeNodes: this.activeNodes, scoreStep: this.step, procedural: true};
  }
  async dispose() {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._visibility);
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this.activeNodes = 0;
  }
  static async renderProbe() {
    const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!Offline) return {supported: false};
    const director = new AudioDirector();
    const ctx = new Offline(1, 44100 * 3, 44100);
    director.context = ctx; director._buildGraph(ctx);
    for (let i = 0; i < 8; i++) director._scoreStep(i, 0.03 + i * 0.23);
    // The same exact instrument and effects paths as the realtime context.
    director._tone(175, 0.12, 0.18, 0.25, 'triangle', director.effects, 610);
    director._noise(0.6, 0.16, 0.27, 900);
    director._tone(1319, 1.2, 0.09, 0.21, 'sine');
    director._tone(1976, 1.265, 0.19, 0.16, 'sine');
    const buffer = await ctx.startRendering();
    let sum = 0, peak = 0, finite = true;
    for (const value of buffer.getChannelData(0)) {sum += value * value; peak = Math.max(peak, Math.abs(value)); if (!Number.isFinite(value)) finite = false;}
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', director._visibility);
    return {supported: true, duration: buffer.duration, sampleRate: buffer.sampleRate, peak, rms: Math.sqrt(sum / buffer.length), finite, musicVolume: director.musicVolume};
  }
}
