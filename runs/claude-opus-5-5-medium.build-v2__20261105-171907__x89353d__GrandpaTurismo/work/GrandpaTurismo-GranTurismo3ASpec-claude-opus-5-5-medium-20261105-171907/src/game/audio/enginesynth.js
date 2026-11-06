// The engine sound: a Web Audio graph on any BaseAudioContext, so a test can render it offline.
// Firing frequency f0 = rpm / 60 × cylinders / 2. Saw at f0, square at f0/2, triangle at 2×f0, filtered noise, all through a low-pass that opens with throttle and rpm.
function lfsrNoise(actx, seconds = 1.2) {
  const n = Math.floor(actx.sampleRate * seconds), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0); let a = 0x2f6e2b1;
  for (let i = 0; i < n; i++) { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); d[i] = ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1; }
  return buf;
}
export const noiseBuffer = lfsrNoise;
export class EngineSynth {
  constructor(actx, dest, car = {}) {
    this.actx = actx; this.car = { cylinders: 4, cut: 2800, bite: 0.7, loud: 1, redline: 7000, turbo: false, sport: false, ...car };
    const c = actx, now = c.currentTime;
    this.out = c.createGain(); this.out.gain.value = 0; this.pan = c.createStereoPanner ? c.createStereoPanner() : null;
    this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.Q.value = 2.2; this.filter.frequency.value = 800;
    this.saw = c.createOscillator(); this.saw.type = 'sawtooth'; this.sq = c.createOscillator(); this.sq.type = 'square'; this.tri = c.createOscillator(); this.tri.type = 'triangle';
    this.sawG = c.createGain(); this.sqG = c.createGain(); this.triG = c.createGain(); this.sawG.gain.value = 0.42; this.sqG.gain.value = 0.28 * this.car.bite; this.triG.gain.value = 0.2;
    this.noise = c.createBufferSource(); this.noise.buffer = lfsrNoise(c); this.noise.loop = true;
    this.noiseF = c.createBiquadFilter(); this.noiseF.type = 'bandpass'; this.noiseF.frequency.value = 900; this.noiseF.Q.value = 0.7; this.noiseG = c.createGain(); this.noiseG.gain.value = 0.12;
    this.saw.connect(this.sawG); this.sq.connect(this.sqG); this.tri.connect(this.triG); this.noise.connect(this.noiseF); this.noiseF.connect(this.noiseG);
    for (const g of [this.sawG, this.sqG, this.triG, this.noiseG]) g.connect(this.filter);
    this.filter.connect(this.out);
    // turbo whistle and puff
    this.whistle = c.createOscillator(); this.whistle.type = 'sine'; this.whistleG = c.createGain(); this.whistleG.gain.value = 0; this.whistle.connect(this.whistleG); this.whistleG.connect(this.out);
    // the overrun crackle and blow-off share a noise tail
    this.pop = c.createBufferSource(); this.pop.buffer = this.noise.buffer; this.pop.loop = true; this.popF = c.createBiquadFilter(); this.popF.type = 'bandpass'; this.popF.frequency.value = 1800; this.popG = c.createGain(); this.popG.gain.value = 0; this.pop.connect(this.popF); this.popF.connect(this.popG); this.popG.connect(this.out);
    if (this.pan) { this.out.connect(this.pan); this.pan.connect(dest); } else this.out.connect(dest);
    for (const o of [this.saw, this.sq, this.tri, this.noise, this.whistle, this.pop]) o.start(now);
    this.lastRpm = 0; this.lastThrottle = 0; this.limiterT = 0; this.prevThrottle = 0; this.crackleT = 0; this.seq = 1;
    this.set({ rpm: 900, throttle: 0 }, 0);
  }
  /** One frame: rpm, throttle 0..1, spool 0..1, level 0..1 (the mix), dt in seconds. */
  set(s, dt = 1 / 60) {
    const c = this.car, t = this.actx.currentTime, rpm = s.rpm ?? 900, th = s.throttle ?? 0, tc = 0.015;
    this.lastRpm = rpm; this.lastThrottle = th;
    const f0 = Math.max(18, (rpm / 60) * (c.cylinders / 2));
    this.saw.frequency.setTargetAtTime(f0, t, tc); this.sq.frequency.setTargetAtTime(f0 / 2, t, tc); this.tri.frequency.setTargetAtTime(f0 * 2, t, tc);
    const cut = c.cut * (0.32 + 0.5 * th + 0.55 * Math.min(1, rpm / (c.redline || 7000)));
    this.filter.frequency.setTargetAtTime(Math.min(9000, cut * (c.sport ? 1.3 : 1)), t, tc);
    this.noiseF.frequency.setTargetAtTime(400 + rpm * 0.2, t, tc);
    let gain = (0.35 + 0.65 * th) * (c.sport ? 1.25 : 1) * c.loud * 0.42 * (s.level ?? 1);
    // rev-limiter stutter at redline
    if (rpm >= (c.redline || 7000) - 30 && th > 0.3) { this.limiterT += dt; if (Math.sin(this.limiterT * 55) < 0) gain *= 0.35; }
    if (s.mute) gain = 0;
    this.out.gain.setTargetAtTime(gain, t, 0.012);
    if (this.pan && s.pan != null) this.pan.pan.setTargetAtTime(s.pan, t, 0.03);
    // turbo: a sine whistle rising with spool, and a puff on lift
    if (c.turbo) { this.whistle.frequency.setTargetAtTime(1800 + (s.spool ?? 0) * 3200, t, 0.03); this.whistleG.gain.setTargetAtTime((s.spool ?? 0) * 0.05 * th, t, 0.05); if (this.prevThrottle > 0.6 && th < 0.2 && (s.spool ?? 0) > 0.4) { this.popG.gain.setValueAtTime(0.25, t); this.popG.gain.setTargetAtTime(0, t, 0.08); this.popF.frequency.setValueAtTime(2800, t); } }
    // overrun crackle with the sport exhaust
    if (c.sport && th < 0.05 && rpm > (c.redline || 7000) * 0.5) { this.crackleT -= dt; if (this.crackleT <= 0) { this.seq = (this.seq * 16807) % 2147483647; this.crackleT = 0.03 + (this.seq % 100) / 900; this.popF.frequency.setValueAtTime(1300, t); this.popG.gain.setValueAtTime(0.32, t); this.popG.gain.setTargetAtTime(0, t, 0.018); this.crackled = (this.crackled ?? 0) + 1; } }
    this.prevThrottle = th;
  }
  dispose() { try { this.out.gain.cancelScheduledValues(0); this.out.gain.value = 0; for (const o of [this.saw, this.sq, this.tri, this.noise, this.whistle, this.pop]) o.stop(); this.out.disconnect(); this.pan?.disconnect(); } catch { /* already stopped */ } }
}
