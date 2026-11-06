class SoundDesk {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.1;
    this.effectsVolume = 0.7;
    this.muted = false;
    this.nextBeat = 0;
    this.beat = 0;
    this.active = true;
    this.notes = 0;
  }
  async unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.ctx = new C();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(c.destination);
      this.music = c.createGain();
      this.music.connect(this.master);
      this.fx = c.createGain();
      this.fx.connect(this.master);
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 1024;
      this.fx.connect(this.analyser);
      this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 77;
      for (let i = 0; i < d.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        d[i] = (seed / 4294967296) * 2 - 1;
      }
      this.motor = c.createOscillator();
      this.motor.type = 'sawtooth';
      this.motor.frequency.value = 41;
      this.motorGain = c.createGain();
      this.motorGain.gain.value = 0;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      this.motor.connect(filter).connect(this.motorGain).connect(this.fx);
      this.motor.start();
      this.nextBeat = c.currentTime + 0.05;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.applyVolumes();
  }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVolume, t, 0.05);
    this.fx.gain.setTargetAtTime(this.effectsVolume, t, 0.05);
    this.master.gain.setTargetAtTime(this.muted || !this.active ? 0 : 0.7, t, 0.03);
  }
  tone(f, t, d = 0.12, v = 0.2, type = 'square', bus = this.fx, end = null) {
    if (!this.ctx || !bus) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f), t);
    if (end) o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + d + 0.02);
    this.notes++;
  }
  hiss(t, d = 0.15, v = 0.2, cut = 1700, bus = this.fx) {
    if (!this.ctx || !bus) return;
    const c = this.ctx,
      s = c.createBufferSource(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    s.buffer = this.noise;
    f.type = 'lowpass';
    f.frequency.value = cut;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(bus);
    s.start(t);
    s.stop(t + d);
    this.notes++;
  }
  effect(name) {
    if (!this.ctx || !this.active) return;
    const t = this.ctx.currentTime;
    if (name === 'fire') {
      this.tone(170, t, 0.12, 0.18, 'square', this.fx, 55);
      this.hiss(t, 0.08, 0.12, 1700);
    }
    if (name === 'gun') {
      this.tone(280, t, 0.07, 0.1, 'sawtooth', this.fx, 120);
      this.hiss(t, 0.06, 0.07, 2500);
    }
    if (name === 'bounce') {
      this.tone(470, t, 0.12, 0.12, 'sine', this.fx, 920);
      this.tone(730, t + 0.035, 0.1, 0.06, 'triangle');
    }
    if (name === 'hit') {
      this.hiss(t, 0.6, 0.5, 900);
      this.tone(130, t, 0.4, 0.3, 'sawtooth', this.fx, 28);
      this.tone(700, t + 0.04, 0.18, 0.09, 'square', this.fx, 180);
    }
    if (name === 'trick') {
      this.hiss(t, 0.35, 0.13, 2300);
      this.tone(220, t, 0.25, 0.12, 'triangle', this.fx, 790);
    }
    if (name === 'deny') {
      this.tone(145, t, 0.09, 0.08, 'square');
      this.tone(110, t + 0.1, 0.12, 0.07, 'square');
    }
    if (name === 'ui') this.tone(590, t, 0.055, 0.065, 'triangle', this.fx, 890);
    if (name === 'start') {
      [330, 440, 660, 880].forEach((f, i) => this.tone(f, t + i * 0.11, 0.18, 0.12, 'triangle'));
    }
    if (name === 'win') {
      [392, 494, 587, 784, 659, 784].forEach((f, i) =>
        this.tone(f, t + i * 0.13, 0.25, 0.15, 'triangle'),
      );
      this.voice(1);
    }
    if (name === 'lose') {
      [330, 294, 262, 196].forEach((f, i) => this.tone(f, t + i * 0.15, 0.25, 0.12, 'triangle'));
      this.voice(0);
    }
  }
  voice(mood = 1) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = c.currentTime + 0.12;
    [0, 1, 2, 3, 4].forEach((i) => {
      const o = c.createOscillator(),
        g = c.createGain(),
        f = c.createBiquadFilter();
      const at = t + i * 0.087;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime((mood ? 230 : 150) + [0, 60, 25, 95, -20][i], at);
      f.type = 'bandpass';
      f.frequency.setValueAtTime([700, 1200, 550, 1600, 850][i], at);
      f.Q.value = 5;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.12, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
      o.connect(f).connect(g).connect(this.fx);
      o.start(at);
      o.stop(at + 0.08);
      this.notes++;
    });
  }
  update(moving = 0, air = false) {
    if (!this.ctx || !this.active) return;
    const c = this.ctx;
    this.motorGain.gain.setTargetAtTime(moving * 0.027, c.currentTime, 0.1);
    this.motor.frequency.setTargetAtTime((air ? 77 : 36) + moving * 27, c.currentTime, 0.12);
    if (this.nextBeat < c.currentTime - 0.3) this.nextBeat = c.currentTime + 0.02;
    const step = 60 / 108 / 2;
    while (this.nextBeat < c.currentTime + 0.16) {
      this.sequence(this.beat++, this.nextBeat);
      this.nextBeat += step;
    }
  }
  sequence(n, t) {
    const k = n % 32,
      root = [130.81, 130.81, 174.61, 196][Math.floor(k / 8)];
    if (k % 2 === 0) {
      this.tone(root * (k % 4 === 2 ? 0.75 : 1), t, 0.21, 0.32, 'triangle', this.music);
      this.tone(58, t, 0.12, 0.25, 'sine', this.music, 28);
    }
    if (k % 4 === 2) {
      this.hiss(t, 0.12, 0.13, 2400, this.music);
      this.tone(160, t, 0.07, 0.07, 'triangle', this.music);
    }
    this.hiss(t, 0.045, k % 2 ? 0.04 : 0.025, 7000, this.music);
    if (k % 4 === 0)
      [1, 1.25, 1.5].forEach((a) =>
        this.tone(root * a * 2, t, 0.11, 0.047, 'triangle', this.music),
      );
    const melody = [
      0, 0, 7, 0, 12, 10, 7, 5, 0, 3, 5, 7, 10, 7, 3, -1, 5, 5, 9, 7, 5, 2, 0, -1, 7, 10, 12, 10, 7,
      5, 3, -1,
    ];
    if (melody[k] >= 0 && k % 2 === 0)
      this.tone(261.63 * 2 ** (melody[k] / 12), t + 0.02, 0.18, 0.105, 'triangle', this.music);
  }
  stop() {
    this.active = false;
    this.applyVolumes();
    if (this.motorGain && this.ctx) this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
  }
  resume() {
    this.active = true;
    this.applyVolumes();
  }
  static async offlineCheck() {
    const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!C) return { supported: false };
    const c = new C(1, 48000, 24000),
      s = new SoundDesk();
    s.ctx = c;
    s.master = c.createGain();
    s.master.gain.value = 0.7;
    s.master.connect(c.destination);
    s.fx = c.createGain();
    s.fx.gain.value = 0.7;
    s.fx.connect(s.master);
    s.music = c.createGain();
    s.music.gain.value = 0.1;
    s.music.connect(s.master);
    s.noise = c.createBuffer(1, 24000, 24000);
    const data = s.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.sin(i * 78.23) * Math.cos(i * 5.37);
    s.effect('fire');
    s.effect('hit');
    s.voice(1);
    for (let i = 0; i < 6; i++) s.sequence(i, 0.5 + i * 0.23);
    const buffer = await c.startRendering();
    let sum = 0,
      peak = 0;
    for (const v of buffer.getChannelData(0)) {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    return { supported: true, rms: Math.sqrt(sum / buffer.length), peak, notes: s.notes };
  }
}
