// Engine sound: a Web Audio graph on any BaseAudioContext, so a test can render it offline. Plan section 10.
export class EngineSynth {
  constructor(ctx, dest, o = {}) {
    this.ctx = ctx; this.cyl = o.cyl ?? 4; this.exh = o.exh ?? 0.5; this.turbo = !!o.turbo; this.gainMul = o.gain ?? 1; this.lastRpm = 0; this.lastThrottle = 0; this.stopped = false;
    const mk = (type) => { const n = ctx.createOscillator(); n.type = type; return n; };
    this.saw = mk('sawtooth'); this.sq = mk('square'); this.tri = mk('triangle'); this.whistle = mk('sine');
    this.gSaw = ctx.createGain(); this.gSq = ctx.createGain(); this.gTri = ctx.createGain(); this.gW = ctx.createGain(); this.gSaw.gain.value = 0.5; this.gSq.gain.value = 0.28; this.gTri.gain.value = 0.35; this.gW.gain.value = 0;
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.Q.value = 2.5; this.lp.frequency.value = 600;
    const len = ctx.sampleRate; const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let s = 1234567; for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
    this.noise = ctx.createBufferSource(); this.noise.buffer = buf; this.noise.loop = true; this.nBand = ctx.createBiquadFilter(); this.nBand.type = 'bandpass'; this.nBand.Q.value = 0.8; this.nBand.frequency.value = 400; this.gN = ctx.createGain(); this.gN.gain.value = 0.1;
    this.master = ctx.createGain(); this.master.gain.value = 0; this.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    this.saw.connect(this.gSaw).connect(this.lp); this.sq.connect(this.gSq).connect(this.lp); this.tri.connect(this.gTri).connect(this.lp); this.noise.connect(this.nBand).connect(this.gN).connect(this.lp); this.lp.connect(this.master); this.whistle.connect(this.gW).connect(this.master);
    if (this.pan) { this.master.connect(this.pan); this.pan.connect(dest); } else this.master.connect(dest);
    for (const n of [this.saw, this.sq, this.tri, this.whistle, this.noise]) n.start();
    this.update(900, 0, 0, 1, 1);
  }
  // rpm, throttle 0..1, spool 0..1, volume 0..1, pan -1..1
  update(rpm, throttle, spool = 0, volume = 1, pan = 0, limiter = false) {
    this.lastRpm = rpm; this.lastThrottle = throttle; const c = this.ctx, t = c.currentTime, f0 = Math.max(10, (rpm / 60) * (this.cyl / 2)); const k = 0.04;
    this.saw.frequency.setTargetAtTime(f0, t, k); this.sq.frequency.setTargetAtTime(f0 / 2, t, k); this.tri.frequency.setTargetAtTime(f0 * 2, t, k);
    const cutoff = 300 + (rpm / 8000) * 1800 * (0.5 + this.exh) + throttle * 1400; this.lp.frequency.setTargetAtTime(cutoff, t, 0.05);
    this.nBand.frequency.setTargetAtTime(200 + rpm * 0.4, t, 0.05); this.gN.gain.setTargetAtTime(0.05 + throttle * 0.18 * (0.5 + this.exh), t, 0.05);
    let g = (0.35 + 0.65 * throttle) * volume * this.gainMul * (0.7 + 0.3 * this.exh); if (limiter) g *= 0.5 + 0.5 * Math.sin(t * 90) ** 2;
    this.master.gain.setTargetAtTime(g * 0.5, t, 0.04); if (this.pan) this.pan.pan.setTargetAtTime(pan, t, 0.05);
    if (this.turbo) { this.whistle.frequency.setTargetAtTime(1200 + spool * 2600, t, 0.06); this.gW.gain.setTargetAtTime(spool * throttle * 0.06 * volume, t, 0.08); }
  }
  stop() { if (this.stopped) return; this.stopped = true; const t = this.ctx.currentTime; this.master.gain.setTargetAtTime(0, t, 0.02); setTimeout(() => { for (const n of [this.saw, this.sq, this.tri, this.whistle, this.noise]) { try { n.stop(); } catch {} } try { this.master.disconnect(); } catch {} }, 150); }
}
