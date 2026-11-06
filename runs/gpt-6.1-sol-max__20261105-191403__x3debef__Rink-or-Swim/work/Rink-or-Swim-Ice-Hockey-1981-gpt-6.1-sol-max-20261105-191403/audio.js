export class RinkAudio {
  constructor() {
    this.ctx = null;
    this.music = 0.1;
    this.sfx = 0.7;
    this.muted = false;
    this.step = 0;
    this.next = 0;
    this.events = 0;
  }
  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.65;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.music;
    this.musicBus.connect(this.master);
    this.fxBus = this.ctx.createGain();
    this.fxBus.gain.value = this.sfx;
    this.fxBus.connect(this.master);
    this.next = this.ctx.currentTime + 0.05;
  }
  levels(music, sfx) {
    this.music = music;
    this.sfx = sfx;
    if (this.ctx) {
      this.musicBus.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
      this.fxBus.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
    }
  }
  stop() {
    this.muted = true;
    if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
  }
  resume() {
    this.muted = false;
    if (this.ctx) this.master.gain.setTargetAtTime(0.65, this.ctx.currentTime, 0.01);
  }
  tone(
    freq,
    duration = 0.1,
    type = "square",
    volume = 0.1,
    bus = this.fxBus,
    time = this.ctx?.currentTime || 0,
    endFreq = 0,
  ) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), time + duration);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(time);
    osc.stop(time + duration + 0.02);
    this.events++;
  }
  noise(duration = 0.12, volume = 0.15, freq = 1800, time = this.ctx?.currentTime || 0) {
    if (!this.ctx || this.muted) return;
    const n = this.ctx.createBuffer(
        1,
        Math.ceil(this.ctx.sampleRate * duration),
        this.ctx.sampleRate,
      ),
      a = n.getChannelData(0);
    let seed = 88291;
    for (let i = 0; i < a.length; i++) {
      seed = (seed * 16807) % 2147483647;
      a[i] = (seed / 1073741824 - 1) * (1 - i / a.length);
    }
    const src = this.ctx.createBufferSource(),
      filter = this.ctx.createBiquadFilter(),
      gain = this.ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    gain.gain.value = volume;
    src.buffer = n;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.fxBus);
    src.start(time);
    this.events++;
  }
  voice(excitement = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const vowel = [550, 740, 410, 880, 630, 970, 490][i] * excitement;
      this.tone(vowel, 0.075, "sawtooth", 0.055, this.fxBus, t + i * 0.095, vowel * 0.7);
      this.tone(vowel * 2.1, 0.07, "sine", 0.025, this.fxBus, t + i * 0.095);
    }
  }
  event(type) {
    if (!this.ctx || this.muted) return;
    switch (type) {
      case "menu":
        this.tone(640, 0.055, "triangle", 0.12);
        break;
      case "pickup":
        this.tone(900, 0.045, "square", 0.06);
        break;
      case "shot":
        this.noise(0.08, 0.18, 3500);
        this.tone(230, 0.11, "triangle", 0.2, undefined, undefined, 75);
        break;
      case "pass":
        this.tone(550, 0.09, "triangle", 0.12, undefined, undefined, 250);
        break;
      case "bank":
        this.tone(370, 0.08, "square", 0.08, undefined, undefined, 190);
        break;
      case "hit":
        this.noise(0.25, 0.45, 850);
        this.tone(95, 0.23, "sine", 0.4, undefined, undefined, 30);
        break;
      case "checkSwing":
        this.noise(0.13, 0.08, 2300);
        break;
      case "drop":
        this.tone(1700, 0.17, "sine", 0.14);
        this.tone(2300, 0.17, "sine", 0.08);
        break;
      case "save":
        this.noise(0.08, 0.13, 700);
        break;
      case "goal": {
        const t = this.ctx.currentTime;
        [196, 246.94, 293.66, 392].forEach((n, i) => {
          this.tone(n, 0.9, "sawtooth", 0.08, this.fxBus, t + i * 0.08);
        });
        this.noise(1.2, 0.25, 4000);
        this.voice(1.05);
        break;
      }
      case "end":
        this.voice(0.8);
        [392, 330, 261, 196].forEach((n, i) => {
          this.tone(n, 0.25, "square", 0.1, this.fxBus, this.ctx.currentTime + i * 0.16);
        });
        break;
    }
  }
  update(energy = false) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (this.next < now - 1) this.next = now + 0.05;
    while (this.next < now + 0.14) {
      const tick = this.step % 32;
      const bass = [36, 36, 43, 41][Math.floor(tick / 8)],
        melody = [72, 76, 79, 76, 74, 72, 67, 69, 72, 76, 79, 84, 81, 79, 76, 74];
      if (tick % 2 === 0) {
        const n = melody[Math.floor(tick / 2)];
        this.tone(440 * 2 ** ((n - 69) / 12), 0.18, "triangle", 0.22, this.musicBus, this.next);
        this.tone(440 * 2 ** ((bass - 69) / 12), 0.2, "sine", 0.4, this.musicBus, this.next);
      }
      if (tick % 4 === 0) this.tone(130, 0.13, "sine", 0.4, this.musicBus, this.next, 38);
      if (tick % 4 === 2) this.tone(190, 0.045, "square", 0.12, this.musicBus, this.next);
      this.tone(7200, 0.025, "triangle", energy ? 0.035 : 0.02, this.musicBus, this.next);
      this.step++;
      this.next += 60 / 116 / 2;
    }
  }
  rms() {
    if (!this.ctx) return 0;
    const a = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(a);
    return Math.sqrt(a.reduce((s, n) => s + ((n - 128) / 128) ** 2, 0) / a.length);
  }
}
