// The most important sound in the game. A Web Audio graph on any BaseAudioContext, so a test can render it offline.
// Firing frequency f0 = rpm / 60 x cylinders / 2. Saw at f0, square at f0 / 2, triangle at 2 x f0, filtered noise for exhaust.
export function noiseBuffer(actx, seconds = 2) {
  const n = Math.floor(actx.sampleRate * seconds), b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0); let s = 12345;
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; d[i] = (s / 0x7fffffff) * 2 - 1; }
  return b;
}
export class EngineSynth {
  // data: { cylinders, filter, exhaust, turbo, sportExhaust, redline, idle }
  constructor(actx, dest, data, shared = {}) {
    this.ctx = actx; this.data = data; this.lastRpm = 0; this.lastThrottle = 0; this.crackle = 0; this.gainTarget = 1; this.lastLift = 0;
    const t = actx.currentTime;
    const osc = (type, g) => { const o = actx.createOscillator(); o.type = type; const a = actx.createGain(); a.gain.value = g; o.connect(a); o.start(t); return { o, a }; };
    this.saw = osc('sawtooth', 0.34); this.sq = osc('square', 0.26); this.tri = osc('triangle', 0.14);
    this.noise = actx.createBufferSource(); this.noise.buffer = shared.noise ?? noiseBuffer(actx); this.noise.loop = true; this.noise.start(t);
    this.noiseBand = actx.createBiquadFilter(); this.noiseBand.type = 'bandpass'; this.noiseBand.Q.value = 0.9; this.noiseGain = actx.createGain(); this.noiseGain.gain.value = 0.2; this.noise.connect(this.noiseBand); this.noiseBand.connect(this.noiseGain);
    this.lp = actx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.Q.value = 1.1;
    for (const v of [this.saw, this.sq, this.tri]) v.a.connect(this.lp);
    this.noiseGain.connect(this.lp);
    this.out = actx.createGain(); this.out.gain.value = 0;
    this.pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
    this.lp.connect(this.out);
    if (this.pan) { this.out.connect(this.pan); this.pan.connect(dest); } else this.out.connect(dest);
    // Turbo: a whistle rising with spool, a puff of filtered noise on lift.
    this.whistle = actx.createOscillator(); this.whistle.type = 'sine'; this.whistleGain = actx.createGain(); this.whistleGain.gain.value = 0; this.whistle.connect(this.whistleGain); this.whistleGain.connect(this.pan ?? dest); this.whistle.start(t);
    this.puffSrc = actx.createBufferSource(); this.puffSrc.buffer = this.noise.buffer; this.puffSrc.loop = true; this.puffFilter = actx.createBiquadFilter(); this.puffFilter.type = 'highpass'; this.puffFilter.frequency.value = 1800; this.puffGain = actx.createGain(); this.puffGain.gain.value = 0; this.puffSrc.connect(this.puffFilter); this.puffFilter.connect(this.puffGain); this.puffGain.connect(this.pan ?? dest); this.puffSrc.start(t);
    // Overrun crackle: short pops of noise with the sport exhaust.
    this.crackleGain = actx.createGain(); this.crackleGain.gain.value = 0; this.crackleBand = actx.createBiquadFilter(); this.crackleBand.type = 'bandpass'; this.crackleBand.frequency.value = 900; this.crackleBand.Q.value = 2; this.noise.connect(this.crackleBand); this.crackleBand.connect(this.crackleGain); this.crackleGain.connect(this.pan ?? dest);
    this.seed = 7; this.limT = 0;
  }
  set({ rpm, throttle, spool = 0, gain = 1, pan = 0, dt = 1 / 60 }) {
    const d = this.data, a = this.ctx, t = a.currentTime, k = 0.012;
    this.lastRpm = rpm; this.lastThrottle = throttle;
    const cyl = d.cylinders ?? 4, f0 = Math.max(18, (rpm / 60) * (cyl / 2));
    this.saw.o.frequency.setTargetAtTime(f0, t, k); this.sq.o.frequency.setTargetAtTime(f0 / 2, t, k); this.tri.o.frequency.setTargetAtTime(2 * f0, t, k);
    const rn = Math.min(1.2, rpm / (d.redline ?? 7000)), cutoff = (d.filter ?? 1200) * (0.45 + 1.5 * throttle * rn + 0.75 * rn);
    this.lp.frequency.setTargetAtTime(Math.min(9000, cutoff), t, k * 2);
    this.noiseBand.frequency.setTargetAtTime(Math.min(4000, 220 + f0 * 1.6), t, k);
    const loud = (d.exhaust ?? 1) * (d.sportExhaust ? 1.25 : 1);
    this.noiseGain.gain.setTargetAtTime(0.14 * loud * (0.4 + throttle), t, k);
    let body = (0.35 + 0.65 * throttle) * loud * gain;
    // Rev-limiter stutter at redline.
    if (rpm >= (d.redline ?? 7000) - 20 && throttle > 0.2) { this.limT += dt * 28; if (this.limT % 1 < 0.42) body *= 0.25; }
    this.out.gain.setTargetAtTime(body * 0.5, t, 0.008);
    if (this.pan) this.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.03);
    // Turbo
    if (d.turbo) { this.whistle.frequency.setTargetAtTime(1500 + 3400 * spool, t, 0.04); this.whistleGain.gain.setTargetAtTime(0.032 * spool * spool * gain * (0.4 + throttle), t, 0.05); const lift = this.prevThrottle > 0.6 && throttle < 0.2 && spool > 0.45; if (lift) { this.puffGain.gain.cancelScheduledValues(t); this.puffGain.gain.setValueAtTime(0.13 * gain, t); this.puffGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.26); } }
    // Overrun crackle on lift.
    if (d.sportExhaust && throttle < 0.08 && rpm > (d.redline ?? 7000) * 0.5) { this.seed = (Math.imul(this.seed, 1103515245) + 12345) & 0x7fffffff; if (this.seed % 100 < 9) { this.crackleGain.gain.cancelScheduledValues(t); this.crackleGain.gain.setValueAtTime(0.32 * gain, t); this.crackleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05); this.crackle++; } }
    this.prevThrottle = throttle;
  }
  silence() { const t = this.ctx.currentTime; this.out.gain.setTargetAtTime(0, t, 0.03); this.whistleGain.gain.setTargetAtTime(0, t, 0.03); this.puffGain.gain.setTargetAtTime(0, t, 0.03); this.crackleGain.gain.setTargetAtTime(0, t, 0.03); }
  dispose() { try { for (const v of [this.saw, this.sq, this.tri]) v.o.stop(); this.noise.stop(); this.whistle.stop(); this.puffSrc.stop(); } catch { /* already stopped */ } try { (this.pan ?? this.out).disconnect(); this.out.disconnect(); this.whistleGain.disconnect(); this.puffGain.disconnect(); this.crackleGain.disconnect(); } catch { /* already gone */ } }
}
