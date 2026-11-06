const mtof = (n) => 440 * 2 ** ((n - 69) / 12);
export function tone(
  ctx,
  dest,
  freq,
  time,
  length = 0.35,
  gain = 0.2,
  type = 'sine',
  endFreq = 0,
) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, time);
  if (endFreq)
    o.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq),
      time + length,
    );
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(gain, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, time + length);
  o.connect(g).connect(dest);
  o.start(time);
  o.stop(time + length + 0.02);
  return o;
}
export function gibberish(ctx, dest, time, seed = 3) {
  const vowels = [550, 900, 420, 1200, 680];
  for (let i = 0; i < 7; i++) {
    const at = time + i * 0.105,
      filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = vowels[(i + seed) % vowels.length];
    filter.Q.value = 2.8;
    filter.connect(dest);
    tone(
      ctx,
      filter,
      155 + ((i * 37 + seed * 19) % 100),
      at,
      0.09,
      0.16,
      'sawtooth',
      220 + ((i * 23) % 80),
    );
  }
}
export class Soundscape {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.note = 0;
    this.nextNote = 0;
    this.active = false;
    this.lastPedal = 0;
    this.voices = 0;
    this.meters = { music: 0.1, sfx: 0.7, voice: 0.65 };
  }
  async wake() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.master;
      this.music = this.ctx.createGain();
      this.music.gain.value = this.settings.music;
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = this.settings.sfx;
      this.voice = this.ctx.createGain();
      this.voice.gain.value = this.settings.voice;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.voice.connect(this.master);
      this.master.connect(this.analyser).connect(this.ctx.destination);
      const delay = this.ctx.createDelay(0.8),
        feedback = this.ctx.createGain(),
        soft = this.ctx.createBiquadFilter();
      delay.delayTime.value = 0.31;
      feedback.gain.value = 0.2;
      soft.type = 'lowpass';
      soft.frequency.value = 1800;
      this.music.connect(delay).connect(soft).connect(feedback).connect(delay);
      soft.connect(this.master);
      this.active = true;
      this.nextNote = this.ctx.currentTime + 0.1;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }
  apply() {
    if (!this.ctx) return;
    for (const key of ['master', 'music', 'sfx', 'voice'])
      this[key].gain.setTargetAtTime(
        this.settings[key],
        this.ctx.currentTime,
        0.05,
      );
    this.meters.music = this.settings.music;
  }
  update(phase, moving = false) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.active) return;
    const now = this.ctx.currentTime;
    const chords = [
      [50, 57, 62, 65],
      [46, 53, 58, 62],
      [48, 55, 60, 64],
      [53, 60, 65, 69],
    ];
    while (this.nextNote < now + 0.16) {
      const chord = chords[Math.floor(this.note / 16) % 4],
        pattern = [0, 2, 1, 3, 2, 1, 3, 2],
        idx = pattern[this.note % 8];
      const octave = phase === 'flight' ? 12 : 0;
      tone(
        this.ctx,
        this.music,
        mtof(chord[idx] + 12 + octave),
        this.nextNote,
        1.8,
        0.18,
        'sine',
      );
      tone(
        this.ctx,
        this.music,
        mtof(chord[idx] + 24 + octave),
        this.nextNote,
        0.9,
        0.035,
        'triangle',
      );
      if (this.note % 8 === 0)
        tone(
          this.ctx,
          this.music,
          mtof(chord[0] - 12),
          this.nextNote,
          3.5,
          0.2,
          'triangle',
        );
      this.note++;
      this.nextNote += phase === 'flight' ? 0.31 : 0.42;
    }
    if (moving && now - this.lastPedal > 0.28) {
      tone(
        this.ctx,
        this.sfx,
        1000 + Math.random() * 300,
        now,
        0.018,
        0.015,
        'triangle',
      );
      this.lastPedal = now;
    }
  }
  fx(kind, value = 0) {
    if (!this.ctx || !this.active) return;
    const t = this.ctx.currentTime + 0.005;
    if (kind === 'click') {
      tone(this.ctx, this.sfx, 620, t, 0.06, 0.11, 'triangle');
    } else if (kind === 'collect') {
      [62, 69, 74, 77].forEach((n, i) =>
        tone(this.ctx, this.sfx, mtof(n), t + i * 0.1, 0.7, 0.2, 'sine'),
      );
    } else if (kind === 'pulse' || kind === 'bridge' || kind === 'flower') {
      tone(this.ctx, this.sfx, 180, t, 1, 0.24, 'sine', 720);
      [0, 4, 7, 12].forEach((n, i) =>
        tone(
          this.ctx,
          this.sfx,
          mtof(62 + n),
          t + i * 0.08,
          1.2,
          0.12,
          'triangle',
        ),
      );
    } else if (kind === 'candy') {
      tone(this.ctx, this.sfx, 600, t, 0.18, 0.1, 'triangle', 150);
    } else if (kind === 'ring' || kind === 'note') {
      [0, 7, 12].forEach((n, i) =>
        tone(
          this.ctx,
          this.sfx,
          mtof(64 + value * 2 + n),
          t + i * 0.07,
          0.7,
          0.17,
          'sine',
        ),
      );
    } else if (kind === 'miss') {
      tone(this.ctx, this.sfx, 240, t, 0.22, 0.12, 'triangle', 200);
    } else if (kind === 'rescue') {
      tone(this.ctx, this.sfx, 370, t, 0.5, 0.15, 'sine', 140);
    } else if (kind === 'launch' || kind === 'won') {
      [50, 57, 62, 65, 69, 74, 77, 81].forEach((n, i) =>
        tone(this.ctx, this.sfx, mtof(n), t + i * 0.13, 2, 0.15, 'triangle'),
      );
    }
  }
  speak(seed = 0) {
    if (!this.ctx || !this.active) return;
    this.voices++;
    gibberish(this.ctx, this.voice, this.ctx.currentTime + 0.03, seed);
  }
  silence() {
    if (!this.ctx) return;
    this.active = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
  }
  resume() {
    if (!this.ctx) return;
    this.active = true;
    this.nextNote = this.ctx.currentTime + 0.1;
    this.apply();
  }
  level() {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((s, n) => s + n * n, 0) / data.length);
  }
  async offlineCheck() {
    const ctx = new OfflineAudioContext(1, 44100 * 2, 44100),
      gain = ctx.createGain();
    gain.gain.value = 0.1;
    gain.connect(ctx.destination);
    [0, 4, 7].forEach((n, i) =>
      tone(ctx, gain, mtof(62 + n), 0.05 + i * 0.2, 0.8, 0.3),
    );
    gibberish(ctx, ctx.destination, 0.8, 2);
    const b = await ctx.startRendering(),
      d = b.getChannelData(0);
    let sum = 0,
      peak = 0;
    for (const n of d) {
      sum += n * n;
      peak = Math.max(peak, Math.abs(n));
    }
    return {
      rms: Math.sqrt(sum / d.length),
      peak,
      samples: d.length,
      musicDefault: 0.1,
    };
  }
}
