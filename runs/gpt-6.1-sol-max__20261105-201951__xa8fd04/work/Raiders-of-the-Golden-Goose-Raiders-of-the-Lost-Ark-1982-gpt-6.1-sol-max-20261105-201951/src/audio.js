class PulpAudio {
  constructor() {
    this.ctx = null;
    this.nextNote = 0;
    this.note = 0;
    this.played = { music: 0, effects: 0, voices: 0 };
    this.muted = false;
    this.level = 0;
    this.lastVoice = 0;
  }
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = settings.master;
        this.music = this.ctx.createGain();
        this.music.gain.value = settings.music;
        this.sfx = this.ctx.createGain();
        this.sfx.gain.value = settings.sfx;
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.music.connect(this.master);
        this.sfx.connect(this.master);
        this.master.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
        const a = this.noise.getChannelData(0),
          r = rngFactory(903);
        for (let i = 0; i < a.length; i++) a[i] = r() * 2 - 1;
        this.nextNote = this.ctx.currentTime + 0.1;
      } catch {
        return;
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }
  updateSettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : settings.master, t, 0.05);
    this.music.gain.setTargetAtTime(settings.music, t, 0.05);
    this.sfx.gain.setTargetAtTime(settings.sfx, t, 0.05);
  }
  tone(freq, time, duration, gain = 0.1, type = "triangle", dest = this.sfx, endFreq = null) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), time + duration);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    o.connect(g);
    g.connect(dest);
    o.start(time);
    o.stop(time + duration + 0.02);
  }
  hiss(duration, gain = 0.15, filter = 1700) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx,
      t = c.currentTime,
      b = c.createBufferSource(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    b.buffer = this.noise;
    f.type = "bandpass";
    f.frequency.value = filter;
    f.Q.value = 0.6;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    b.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    b.start(t);
    b.stop(t + duration);
  }
  effect(kind) {
    if (!this.ctx || this.muted) return;
    this.played.effects++;
    const t = this.ctx.currentTime;
    switch (kind) {
      case "whip":
        this.hiss(0.16, 0.38, 2400);
        this.tone(180, t + 0.06, 0.07, 0.22, "sawtooth", this.sfx, 45);
        break;
      case "shot":
        this.hiss(0.22, 0.5, 950);
        this.tone(100, t, 0.15, 0.3, "square", this.sfx, 28);
        break;
      case "hit":
        this.tone(150, t, 0.13, 0.15, "sawtooth", this.sfx, 55);
        this.hiss(0.1, 0.1, 600);
        break;
      case "jump":
        this.tone(200, t, 0.18, 0.05, "triangle", this.sfx, 420);
        break;
      case "roll":
        this.hiss(0.25, 0.12, 500);
        break;
      case "pickup":
        [523, 659, 784].forEach((n, i) => this.tone(n, t + i * 0.07, 0.23, 0.08));
        break;
      case "lens":
        this.tone(330, t, 0.3, 0.1, "sine");
        this.tone(660, t + 0.1, 0.4, 0.07, "triangle");
        this.hiss(0.1, 0.1, 700);
        break;
      case "gate":
        this.hiss(1.3, 0.3, 190);
        this.tone(65, t, 1.1, 0.12, "sawtooth");
        break;
      case "grapple":
        this.hiss(0.35, 0.17, 1400);
        this.tone(220, t, 0.35, 0.08, "sine", this.sfx, 640);
        break;
      case "dart":
        this.hiss(0.13, 0.08, 3500);
        break;
      case "empty":
        this.tone(900, t, 0.035, 0.035, "square");
        break;
      case "ui":
        this.tone(440, t, 0.065, 0.035, "triangle");
        break;
      case "rumble":
        this.hiss(0.6, 0.27, 100);
        this.tone(38, t, 0.6, 0.18, "sawtooth");
        break;
      case "win":
        [262, 330, 392, 523, 659, 784, 1046].forEach((n, i) =>
          this.tone(n, t + i * 0.16, 0.65, 0.11, "triangle"),
        );
        break;
      case "fail":
        [220, 207, 196, 147].forEach((n, i) => this.tone(n, t + i * 0.2, 0.45, 0.08, "triangle"));
        break;
    }
  }
  voice(text, low = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (t - this.lastVoice < 0.6) return;
    this.lastVoice = t;
    this.played.voices++;
    const syllables = Math.min(22, Math.max(5, Math.floor(text.length / 4)));
    for (let i = 0; i < syllables; i++) {
      const base = (low ? 125 : 210) + ((text.charCodeAt(i % text.length) * 13 + i * 17) % 190);
      this.tone(base, t + i * 0.075, 0.063, 0.027, "sawtooth");
      this.tone(base * 2.3, t + i * 0.075, 0.04, 0.009, "sine");
    }
  }
  scheduleMusic(phase, t) {
    const melody = [
      0, 7, 12, 10, 7, 3, 5, 7, 0, 7, 12, 15, 14, 10, 7, 5, 3, 7, 10, 12, 7, 5, 3, 2, 0, 3, 7, 10, 7, 5, 2, 0,
    ];
    const fast = phase === "escape",
      beat = fast ? 0.205 : 0.32;
    while (this.nextNote < t + 0.12) {
      const k = this.note % 32,
        root = fast ? 146.83 : 130.81,
        n = melody[k],
        f = root * 2 ** (n / 12);
      this.tone(f, this.nextNote, beat * 0.83, 0.22, "triangle", this.music);
      if (k % 4 === 0) {
        this.tone(root / 2, this.nextNote, beat * 3, 0.23, "triangle", this.music);
        this.tone(f * 1.5, this.nextNote, beat * 1.8, 0.07, "sine", this.music);
      }
      if (k % 2 === 0) this.tone(k % 4 === 0 ? 60 : 120, this.nextNote, 0.11, 0.16, "sine", this.music, 24);
      this.note++;
      this.played.music++;
      this.nextNote += beat;
    }
  }
  tick(phase, dt) {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;
    this.updateSettings();
    const t = this.ctx.currentTime;
    if (this.nextNote < t - 0.5) this.nextNote = t + 0.05;
    this.scheduleMusic(phase, t);
    const bins = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(bins);
    this.level = Math.sqrt(bins.reduce((s, x) => s + x * x, 0) / bins.length);
  }
  async renderCheck() {
    const output = {};
    for (const kind of ["music", "effects", "voices"]) {
      const ctx = new OfflineAudioContext(1, 88200, 44100),
        a = new PulpAudio();
      a.ctx = ctx;
      a.master = ctx.createGain();
      a.master.gain.value = 0.7;
      a.music = ctx.createGain();
      a.music.gain.value = 0.1;
      a.sfx = ctx.createGain();
      a.sfx.gain.value = 0.8;
      a.music.connect(a.master);
      a.sfx.connect(a.master);
      a.master.connect(ctx.destination);
      a.noise = ctx.createBuffer(1, 44100, 44100);
      const noise = a.noise.getChannelData(0),
        r = rngFactory(903);
      for (let i = 0; i < noise.length; i++) noise[i] = r() * 2 - 1;
      a.lastVoice = -10;
      a.nextNote = 0.05;
      if (kind === "music") a.scheduleMusic("escape", 1.35);
      if (kind === "effects") {
        a.effect("whip");
        a.effect("shot");
      }
      if (kind === "voices") a.voice("Ancient warnings. Recent bullets. Promising.");
      const buffer = await ctx.startRendering(),
        samples = buffer.getChannelData(0);
      let energy = 0,
        peak = 0;
      for (const v of samples) {
        energy += v * v;
        peak = Math.max(peak, Math.abs(v));
      }
      output[kind] = {
        rms: Math.sqrt(energy / samples.length),
        peak,
        events: a.played[kind],
        gain: kind === "music" ? 0.1 : 0.8,
      };
    }
    return output;
  }
  stop() {
    this.muted = true;
    if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
  }
  resume() {
    this.muted = false;
    this.updateSettings();
  }
}
const audio = new PulpAudio();
