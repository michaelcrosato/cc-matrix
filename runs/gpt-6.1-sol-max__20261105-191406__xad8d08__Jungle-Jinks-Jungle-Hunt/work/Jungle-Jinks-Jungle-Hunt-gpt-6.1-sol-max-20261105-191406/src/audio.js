export class JungleAudio {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.1;
    this.effectsVolume = 0.7;
    this.masterVolume = 0.75;
    this.beat = 0;
    this.nextBeat = 0;
    this.stage = 0;
    this.paused = false;
    this.ended = false;
    this.notesPlayed = 0;
    this.voicesPlayed = 0;
  }
  async unlock() {
    if (this.ended) return;
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.music = this.ctx.createGain();
      this.music.gain.value = this.musicVolume;
      this.fx = this.ctx.createGain();
      this.fx.gain.value = this.effectsVolume;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.music.connect(this.master);
      this.fx.connect(this.master);
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const a = this.noise.getChannelData(0);
      let seed = 8403;
      for (let i = 0; i < a.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        a[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
      }
      this.nextBeat = this.ctx.currentTime + 0.08;
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }
  setVolumes(music, effects) {
    this.musicVolume = music;
    this.effectsVolume = effects;
    if (this.ctx) {
      this.music.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
      this.fx.gain.setTargetAtTime(effects, this.ctx.currentTime, 0.05);
    }
  }
  note(freq, dur = 0.2, type = "sine", gain = 0.2, at = null, bus = null, endFreq = null) {
    if (!this.ctx || this.ended) return;
    const t = at ?? this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.009);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus || this.fx);
    o.start(t);
    o.stop(t + dur + 0.03);
    this.notesPlayed++;
  }
  percussion(at, gain = 0.12, high = true) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource(),
      g = this.ctx.createGain(),
      f = this.ctx.createBiquadFilter();
    s.buffer = this.noise;
    f.type = high ? "highpass" : "bandpass";
    f.frequency.value = high ? 4300 : 320;
    f.Q.value = 1.1;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + (high ? 0.07 : 0.14));
    s.connect(f);
    f.connect(g);
    g.connect(this.music);
    s.start(at);
    s.stop(at + 0.18);
  }
  update(stage, paused = false) {
    this.stage = stage;
    this.paused = paused;
    if (this.ctx?.state !== "running" || this.ended) return;
    const now = this.ctx.currentTime;
    if (this.nextBeat < now - 0.5) this.nextBeat = now + 0.04;
    const melody = [
      0, 7, 12, 7, 3, 10, 7, 3, 5, 12, 15, 12, 10, 7, 3, 7, 0, 7, 10, 7, 3, 5, 7, 10, 12, 10, 7, 5, 3, 7, 3,
      -2,
    ];
    const bpm = stage === 2 ? 114 : 98,
      step = 60 / bpm / 2;
    while (this.nextBeat < now + 0.13) {
      const b = this.beat % 32,
        t = this.nextBeat,
        root = stage === 1 ? 174.614 : 195.998,
        db = paused ? 0.32 : 1;
      this.note(root * 2 ** (melody[b] / 12), 0.24, "sine", 0.36 * db, t, this.music);
      this.note(root * 4 * 2 ** (melody[b] / 12), 0.08, "triangle", 0.035 * db, t + 0.006, this.music);
      if (b % 4 === 0) {
        this.note(root * 0.5 * 2 ** ((b < 16 ? 0 : 5) / 12), 0.32, "triangle", 0.26 * db, t, this.music);
        this.note(130, 0.13, "sine", 0.22 * db, t, this.music, 45);
      }
      if (b % 2 === 1) this.percussion(t, 0.07 * db, true);
      if (b % 4 === 2) this.percussion(t, 0.14 * db, false);
      if (b === 7 || b === 23) {
        this.note(1600, 0.11, "sine", 0.035, t, this.music, 2300);
        this.note(2200, 0.1, "sine", 0.025, t + 0.13, this.music, 1400);
      }
      this.beat++;
      this.nextBeat += step;
    }
  }
  effect(kind) {
    if (!this.ctx || this.ended) return;
    const t = this.ctx.currentTime;
    const cases = {
      jump: [290, 0.16, "triangle", 0.2, 620],
      grab: [155, 0.16, "sine", 0.22, 420],
      release: [400, 0.18, "sine", 0.18, 950],
      land: [110, 0.11, "triangle", 0.13, 45],
      cut: [950, 0.12, "sawtooth", 0.09, 140],
      hurt: [190, 0.3, "sawtooth", 0.13, 55],
      bubble: [480, 0.16, "sine", 0.15, 1200],
      gong: [174.6, 0.8, "sine", 0.4, 170],
      checkpoint: [523.25, 0.18, "triangle", 0.17, 700],
      rock: [85, 0.22, "triangle", 0.2, 30],
      click: [650, 0.06, "sine", 0.1, 430],
    };
    if (kind === "pickup") {
      [659.25, 830.61, 987.77].forEach((f, i) => {
        this.note(f, 0.18, "sine", 0.16, t + i * 0.06);
      });
      return;
    }
    if (kind === "win") {
      [392, 493.88, 587.33, 784, 987.77, 1174.66].forEach((f, i) => {
        this.note(f, 0.5, "triangle", 0.15, t + i * 0.12);
      });
      this.voice("hooray");
      return;
    }
    const p = cases[kind];
    if (p) this.note(p[0], p[1], p[2], p[3], t, null, p[4]);
  }
  voice(mood = "hello") {
    if (!this.ctx || this.ended) return;
    this.voicesPlayed++;
    const seq =
      mood === "hurt"
        ? [310, 210, 160]
        : mood === "hooray"
          ? [340, 450, 590, 470, 620]
          : [420, 330, 510, 370];
    const start = this.ctx.currentTime;
    seq.forEach((freq, i) => {
      const t = start + i * 0.105,
        o = this.ctx.createOscillator(),
        f = this.ctx.createBiquadFilter(),
        g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * (i % 2 ? 1.18 : 0.84), t + 0.09);
      f.type = "bandpass";
      f.frequency.value = 900 + (i % 3) * 430;
      f.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
      o.connect(f);
      f.connect(g);
      g.connect(this.fx);
      o.start(t);
      o.stop(t + 0.11);
    });
  }
  stop() {
    this.ended = true;
    if (this.ctx) {
      this.master.gain.setValueAtTime(0, this.ctx.currentTime);
      this.ctx.suspend();
    }
  }
  levels() {
    if (!this.analyser) return 0;
    const a = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(a);
    return Math.sqrt(a.reduce((s, v) => s + ((v - 128) / 128) ** 2, 0) / a.length);
  }
  async offlineProof() {
    const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!C) return { supported: false };
    const c = new C(1, 22050, 22050),
      g = c.createGain();
    g.gain.value = 0.1;
    g.connect(c.destination);
    const synth = new JungleAudio();
    synth.ctx = c;
    synth.fx = g;
    synth.music = g;
    [392, 493.88, 587.33, 784, 987.77].forEach((freq, i) => {
      synth.note(freq, 0.22, "triangle", 0.3, 0.05 + i * 0.13);
    });
    synth.voice("hooray");
    const b = await c.startRendering(),
      a = b.getChannelData(0);
    let sum = 0,
      peak = 0;
    for (const v of a) {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    return {
      supported: true,
      rms: Math.sqrt(sum / a.length),
      peak,
      samples: a.length,
    };
  }
}
