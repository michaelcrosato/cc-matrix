// src/audio.js
// Procedural Web Audio API N64 Synthesizer & Sound Effects Engine

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.engineFilter = null;

    this.masterVolume = 0.8;
    this.musicVolume = 0.55;
    this.sfxVolume = 0.85;
    this.muted = false;

    this.currentTheme = null;
    this.musicTempoMult = 1.0;
    this.stepIndex = 0;
    this.musicTimer = null;
    this.rouletteTickTimer = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.updateVolumes();
      this.setupEngineLoop();
    } catch (e) {
      // Ignore audio init errors in restricted headless environments
    }
  }

  updateVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, now, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicVolume, now, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.02);
  }

  setVolumes({ master, music, sfx }) {
    if (typeof master === 'number') this.masterVolume = master;
    if (typeof music === 'number') this.musicVolume = music;
    if (typeof sfx === 'number') this.sfxVolume = sfx;
    this.updateVolumes();
  }

  setupEngineLoop() {
    if (!this.ctx) return;
    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'triangle';
      this.engineOsc.frequency.value = 55;
      this.engineSubOsc.frequency.value = 27.5;

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 260;
      this.engineFilter.Q.value = 3.5;

      this.engineGain.gain.value = 0.0;

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc.start();
      this.engineSubOsc.start();
    } catch (e) {}
  }

  updateEngineSound(speedRatio, isDrifting, isBoosting, active) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const now = this.ctx.currentTime;
    if (!active || this.ctx.state !== 'running') {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }
    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    const baseFreq = 52 + clamped * 115 + (isBoosting ? 42 : 0) + (isDrifting ? 14 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(220 + clamped * 650 + (isBoosting ? 500 : 0), now, 0.04);
    this.engineGain.gain.setTargetAtTime(0.065 + clamped * 0.055, now, 0.05);
  }

  playTone(freq, duration = 0.12, type = 'square', vol = 0.2, slideFreq = null, dest = null) {
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideFreq), now + duration);
      }
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(dest || this.sfxGain);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {}
  }

  playNoise(duration = 0.15, filterFreq = 800, vol = 0.2) {
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;
      filter.Q.value = 1.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
    } catch (e) {}
  }

  playUIMove() {
    this.playTone(540, 0.055, 'triangle', 0.15, 680);
  }

  playUIConfirm() {
    this.playTone(587.33, 0.08, 'square', 0.18, 880);
    setTimeout(() => this.playTone(880, 0.14, 'square', 0.18, 1174.66), 60);
  }

  playUIBack() {
    this.playTone(440, 0.1, 'triangle', 0.16, 293.66);
  }

  playCountdownBeep(finalGo = false) {
    if (finalGo) {
      this.playTone(880, 0.42, 'square', 0.3, 880);
      this.playTone(1318.5, 0.42, 'sawtooth', 0.18, 1318.5);
    } else {
      this.playTone(440, 0.22, 'square', 0.25, 440);
    }
  }

  playHop() {
    this.playTone(210, 0.12, 'sine', 0.24, 480);
  }

  playDriftSpark(tier = 1) {
    const base = tier === 1 ? 660 : tier === 2 ? 880 : 1174;
    this.playTone(base, 0.09, 'sawtooth', 0.16, base * 1.35);
  }

  playBoost() {
    this.playNoise(0.32, 1100, 0.26);
    this.playTone(220, 0.3, 'sawtooth', 0.22, 660);
  }

  playItemBoxBreak() {
    this.playTone(523.25, 0.07, 'square', 0.2, 1046.5);
    setTimeout(() => this.playTone(783.99, 0.09, 'square', 0.2, 1567.98), 45);
  }

  playRouletteTick() {
    this.playTone(700 + Math.random() * 260, 0.04, 'square', 0.1);
  }

  playItemLock() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.1, 'square', 0.18), i * 50);
    });
  }

  playShellShoot() {
    this.playTone(360, 0.14, 'sawtooth', 0.22, 160);
    this.playNoise(0.1, 1400, 0.15);
  }

  playShellBounce() {
    this.playTone(520, 0.06, 'triangle', 0.16, 300);
  }

  playHitExplosion() {
    this.playNoise(0.38, 380, 0.35);
    this.playTone(150, 0.35, 'sawtooth', 0.28, 42);
  }

  playSpinOut() {
    const freqs = [620, 480, 720, 400, 640];
    freqs.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.07, 'triangle', 0.2, f * 0.75), idx * 55);
    });
  }

  playLightning() {
    this.playNoise(0.55, 600, 0.4);
    this.playTone(980, 0.45, 'sawtooth', 0.3, 95);
  }

  playLapFanfare(isFinalLap = false) {
    const seq = isFinalLap
      ? [587.33, 587.33, 587.33, 783.99, 987.77, 1174.66]
      : [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => {
      setTimeout(() => this.playTone(f, i === seq.length - 1 ? 0.28 : 0.1, 'square', 0.24), i * 85);
    });
  }

  startMusic(theme = 'title', tempoMult = 1.0) {
    this.init();
    this.musicTempoMult = tempoMult;
    if (this.currentTheme === theme && this.musicTimer) return;
    this.currentTheme = theme;
    this.stepIndex = 0;
    if (this.musicTimer) clearInterval(this.musicTimer);

    const patterns = {
      title: {
        bpm: 136,
        lead: [523.25, 659.25, 783.99, 1046.5, 880, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 783.99],
        bass: [130.81, 130.81, 196.00, 196.00, 220.00, 220.00, 174.61, 196.00]
      },
      sunny: {
        bpm: 146,
        lead: [659.25, 783.99, 880.0, 783.99, 659.25, 523.25, 587.33, 659.25, 698.46, 880.0, 1046.5, 880.0, 783.99, 659.25, 587.33, 783.99],
        bass: [130.81, 164.81, 196.00, 164.81, 174.61, 220.00, 196.00, 146.83]
      },
      castle: {
        bpm: 142,
        lead: [440, 466.16, 440, 392, 440, 523.25, 466.16, 392, 349.23, 392, 440, 466.16, 523.25, 587.33, 523.25, 440],
        bass: [110, 110, 116.54, 110, 98, 98, 130.81, 116.54]
      },
      rainbow: {
        bpm: 158,
        lead: [783.99, 987.77, 1174.66, 1567.98, 1318.5, 1174.66, 987.77, 783.99, 880, 1046.5, 1318.5, 1760, 1567.98, 1318.5, 1174.66, 1318.5],
        bass: [196, 246.94, 293.66, 246.94, 220, 261.63, 329.63, 293.66]
      },
      battle: {
        bpm: 150,
        lead: [493.88, 587.33, 659.25, 739.99, 659.25, 587.33, 493.88, 392, 493.88, 587.33, 698.46, 659.25, 587.33, 493.88, 440, 493.88],
        bass: [123.47, 123.47, 146.83, 164.81, 123.47, 123.47, 110, 98]
      },
      star: {
        bpm: 176,
        lead: [783.99, 783.99, 783.99, 659.25, 783.99, 880, 880, 880, 698.46, 880, 783.99, 659.25, 587.33, 659.25, 783.99, 1046.5],
        bass: [196, 196, 164.81, 196, 220, 220, 174.61, 220]
      },
      victory: {
        bpm: 138,
        lead: [523.25, 659.25, 783.99, 1046.5, 1318.5, 1046.5, 1318.5, 1567.98, 1318.5, 1046.5, 783.99, 1046.5, 880, 1174.66, 1046.5, 1046.5],
        bass: [130.81, 164.81, 196, 261.63, 220, 174.61, 196, 130.81]
      }
    };

    const pat = patterns[theme] || patterns.title;
    const stepMs = Math.max(85, Math.floor((60000 / (pat.bpm * this.musicTempoMult)) / 2));

    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;
      const leadNote = pat.lead[this.stepIndex % pat.lead.length];
      const bassNote = pat.bass[Math.floor(this.stepIndex / 2) % pat.bass.length];
      if (leadNote) {
        this.playTone(leadNote, stepMs / 1000 * 0.8, 'square', 0.08, null, this.musicGain);
      }
      if (this.stepIndex % 2 === 0 && bassNote) {
        this.playTone(bassNote, stepMs / 1000 * 1.4, 'triangle', 0.11, null, this.musicGain);
      }
      this.stepIndex++;
    }, stepMs);
  }

  setMusicTempo(mult) {
    if (Math.abs(this.musicTempoMult - mult) > 0.01 && this.currentTheme) {
      const t = this.currentTheme;
      this.currentTheme = null;
      this.startMusic(t, mult);
    }
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTheme = null;
  }
}
