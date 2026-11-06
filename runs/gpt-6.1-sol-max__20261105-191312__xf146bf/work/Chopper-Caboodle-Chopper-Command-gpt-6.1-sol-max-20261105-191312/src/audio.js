const melody = [76, 79, 81, 79, 74, 72, 74, 0, 76, 79, 84, 81, 79, 76, 74, 0];
export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.nextBeat = 0;
    this.beat = 0;
    this.events = 0;
    this.musicNotes = 0;
    this.muted = false;
  }
  async unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.65;
      this.master.connect(this.ctx.destination);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.master.connect(this.analyser);
      this.music = this.ctx.createGain();
      this.music.connect(this.master);
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.rotor = this.ctx.createOscillator();
      this.rotor.type = "sawtooth";
      this.rotor.frequency.value = 39;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 170;
      this.rotorGain = this.ctx.createGain();
      this.rotorGain.gain.value = 0;
      this.rotor.connect(filter);
      filter.connect(this.rotorGain);
      this.rotorGain.connect(this.sfx);
      this.rotor.start();
    }
    this.apply();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }
  apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.settings.music, t, 0.05);
    this.sfx.gain.setTargetAtTime(this.settings.sfx, t, 0.05);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.65, t, 0.03);
  }
  tone(
    freq,
    duration = 0.12,
    type = "square",
    gain = 0.1,
    when = 0,
    route = "sfx",
    endFreq = null,
  ) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + when,
      o = this.ctx.createOscillator(),
      v = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 10), t + duration);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(gain, t + 0.005);
    v.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(v);
    v.connect(this[route]);
    o.start(t);
    o.stop(t + duration + 0.015);
    this.events++;
  }
  hiss(duration = 0.15, gain = 0.1, cutoff = 1100, when = 0, route = "sfx") {
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + when,
      b = this.ctx.createBufferSource(),
      f = this.ctx.createBiquadFilter(),
      v = this.ctx.createGain();
    b.buffer = this.noise;
    f.type = "lowpass";
    f.frequency.value = cutoff;
    v.gain.setValueAtTime(gain, t);
    v.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    b.connect(f);
    f.connect(v);
    v.connect(this[route]);
    b.start(t);
    b.stop(t + duration);
    this.events++;
  }
  play(name) {
    if (!this.ctx || this.muted) return;
    if (name === "gun") {
      this.tone(180, 0.065, "triangle", 0.17, 0, "sfx", 55);
      this.hiss(0.045, 0.075, 2600);
    } else if (name === "rocket") {
      this.tone(130, 0.36, "sawtooth", 0.17, 0, "sfx", 720);
      this.hiss(0.35, 0.15, 900);
    } else if (name === "boom") {
      this.hiss(0.6, 0.36, 750);
      this.tone(94, 0.48, "sine", 0.32, 0, "sfx", 23);
    } else if (name === "hit") {
      this.hiss(0.1, 0.14, 2000);
      this.tone(260, 0.1, "triangle", 0.1, 0, "sfx", 68);
    } else if (name === "flare") {
      this.hiss(0.55, 0.13, 5000);
      for (let i = 0; i < 3; i++) this.tone(600 + i * 220, 0.2, "sine", 0.08, i * 0.08);
    } else if (name === "rescue") {
      for (let i = 0; i < 5; i++)
        this.tone([523, 659, 784, 1047, 1319][i], 0.3, "triangle", 0.16, i * 0.075);
      this.voice();
    } else if (name === "alert") {
      this.tone(660, 0.16, "square", 0.07);
      this.tone(440, 0.16, "square", 0.06, 0.2);
    } else if (name === "win") {
      for (let i = 0; i < 8; i++)
        this.tone([523, 659, 784, 1047, 784, 880, 988, 1047][i], 0.4, "triangle", 0.16, i * 0.12);
    } else
      this.tone(
        name === "back" ? 240 : 460,
        0.055,
        "sine",
        0.1,
        0,
        "sfx",
        name === "back" ? 160 : 700,
      );
  }
  voice() {
    if (!this.ctx || this.muted) return;
    this.hiss(0.12, 0.025, 2400);
    for (let i = 0; i < 7; i++) {
      const t = this.ctx.currentTime + i * 0.085,
        o = this.ctx.createOscillator(),
        f = this.ctx.createBiquadFilter(),
        v = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime([210, 310, 250, 370, 280, 320, 190][i], t);
      o.frequency.linearRampToValueAtTime([300, 220, 340, 250, 360, 210, 240][i], t + 0.07);
      f.type = "bandpass";
      f.frequency.value = [850, 1500, 650, 1900, 1100, 600, 1300][i];
      f.Q.value = 4;
      v.gain.setValueAtTime(0.035, t);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      o.connect(f);
      f.connect(v);
      v.connect(this.sfx);
      o.start(t);
      o.stop(t + 0.08);
      this.events++;
    }
  }
  update(playing, speed = 0, boss = false) {
    if (!this.ctx) return;
    this.rotorGain.gain.setTargetAtTime(playing ? 0.032 : 0, this.ctx.currentTime, 0.08);
    this.rotor.frequency.setTargetAtTime(36 + Math.abs(speed) * 0.8, this.ctx.currentTime, 0.1);
    if (!playing || this.ctx.state !== "running") {
      this.nextBeat = this.ctx.currentTime;
      return;
    }
    if (this.nextBeat < this.ctx.currentTime - 0.2) this.nextBeat = this.ctx.currentTime;
    while (this.nextBeat < this.ctx.currentTime + 0.15) {
      const offset = Math.max(0, this.nextBeat - this.ctx.currentTime),
        b = this.beat++;
      if (b % 4 === 0) this.tone(120, 0.22, "sine", 0.42, offset, "music", 36);
      if (b % 4 === 2) this.hiss(0.13, 0.13, 1600, offset, "music");
      this.hiss(0.035, b % 2 ? 0.045 : 0.075, 7600, offset, "music");
      if (b % 2 === 0) {
        const note = [36, 36, 43, 39, 36, 46, 43, 34][Math.floor(b / 2) % 8];
        this.tone(440 * 2 ** ((note - 69) / 12), 0.22, "triangle", 0.3, offset, "music");
      }
      const n = melody[Math.floor(b / 2) % melody.length];
      if (b % 2 === 0 && n) {
        this.tone(440 * 2 ** ((n - 69) / 12), 0.19, "square", 0.055, offset, "music");
        this.musicNotes++;
      }
      this.nextBeat += 60 / (boss ? 140 : 118) / 4;
    }
  }
  silence() {
    if (this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(0, this.ctx.currentTime);
      this.rotorGain.gain.value = 0;
    }
  }
  level() {
    if (!this.analyser) return 0;
    const a = new Float32Array(512);
    this.analyser.getFloatTimeDomainData(a);
    return Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
  }
}
