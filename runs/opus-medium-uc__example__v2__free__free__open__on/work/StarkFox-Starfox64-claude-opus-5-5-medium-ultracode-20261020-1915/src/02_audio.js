// ===== 02_audio.js — procedural Web Audio: SFX, loops, tracker music, stingers, radio voices =====
const AudioSys = (() => {
  let ctx = null;
  let master, comp, musicVol, sfxVol, voiceVol, duckFilter, duckGain, stingerDuck, delayIn, convolver, musicRevSend, sfxRevSend;
  let noiseBuf = null;
  const vols = { master: 1, music: 0.7, sfx: 0.85, voice: 0.8 };
  const DUMMY = { set() {}, stop() {} };

  // ---------------- helpers ----------------
  const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function noteToMidi(n) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    if (!m) return null;
    return 12 * (parseInt(m[3], 10) + 1) + NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const now = () => ctx.currentTime;

  function makeNoise() {
    const len = ctx.sampleRate * 2;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function makeImpulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  function makeDrive(amount) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    return curve;
  }

  /** oscillator with pitch sweep + envelope */
  function tone(type, f0, f1, t, dur, gain, out, o = {}) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 !== null && f1 !== undefined && f1 !== f0) {
      if (o.linear) osc.frequency.linearRampToValueAtTime(Math.max(1, f1), t + (o.sweep ?? dur));
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + (o.sweep ?? dur));
    }
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    const a = o.attack ?? 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + a);
    if (o.hold) g.gain.setValueAtTime(gain, t + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter; f.frequency.value = o.cutoff ?? 3000; f.Q.value = o.q ?? 0.7;
      if (o.cutoffEnd) f.frequency.exponentialRampToValueAtTime(o.cutoffEnd, t + dur);
      osc.connect(f); node = f;
    }
    node.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.05);
    return osc;
  }
  /** filtered noise burst */
  function noise(t, dur, gain, out, o = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.setValueAtTime(o.f0 ?? 3000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.sweep ?? dur));
    f.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    const a = o.attack ?? 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + a);
    if (o.hold) g.gain.setValueAtTime(gain, t + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
    return src;
  }

  // ---------------- SFX definitions ----------------
  // each: (t, out, p, rev) => duration ; p = pitch multiplier, rev = reverb send node
  const SFX = {
    laser(t, o, p) {
      tone('square', 1500 * p, 210 * p, t, 0.13, 0.28, o, { filter: 'lowpass', cutoff: 5000 });
      tone('sawtooth', 760 * p, 140 * p, t, 0.1, 0.12, o);
      noise(t, 0.03, 0.12, o, { type: 'highpass', f0: 5000 });
      return 0.14;
    },
    laserTwin(t, o, p) {
      tone('square', 1650 * p, 260 * p, t, 0.14, 0.2, o, { filter: 'lowpass', cutoff: 5500 });
      tone('square', 1720 * p, 280 * p, t + 0.012, 0.14, 0.2, o, { filter: 'lowpass', cutoff: 5500 });
      tone('sawtooth', 820 * p, 160 * p, t, 0.11, 0.1, o);
      noise(t, 0.035, 0.12, o, { type: 'highpass', f0: 5200 });
      return 0.16;
    },
    laserHyper(t, o, p, rev) {
      tone('sawtooth', 2400 * p, 300 * p, t, 0.18, 0.22, o, { filter: 'lowpass', cutoff: 7000 });
      tone('square', 1200 * p, 150 * p, t, 0.17, 0.18, o);
      tone('sine', 3600 * p, 900 * p, t, 0.12, 0.12, rev);
      noise(t, 0.05, 0.16, o, { type: 'bandpass', f0: 6000, f1: 1500, q: 2 });
      return 0.2;
    },
    enemyLaser(t, o, p) {
      tone('sawtooth', 720 * p, 170 * p, t, 0.2, 0.16, o, { filter: 'bandpass', cutoff: 1100, q: 1.4 });
      tone('square', 360 * p, 90 * p, t, 0.18, 0.08, o);
      return 0.21;
    },
    lock(t, o, p) {
      tone('sine', 1320 * p, null, t, 0.06, 0.25, o);
      tone('sine', 1760 * p, null, t + 0.07, 0.09, 0.25, o);
      tone('square', 1760 * p, null, t + 0.07, 0.06, 0.05, o);
      return 0.17;
    },
    chargeShot(t, o, p, rev) {
      tone('sawtooth', 260 * p, 1300 * p, t, 0.12, 0.25, o, { filter: 'lowpass', cutoff: 4000 });
      tone('sine', 140 * p, 40 * p, t + 0.05, 0.45, 0.6, o);
      noise(t, 0.5, 0.35, o, { type: 'bandpass', f0: 1200, f1: 300, q: 1.2 });
      tone('triangle', 2200 * p, 600 * p, t, 0.35, 0.12, rev);
      return 0.55;
    },
    bomb(t, o, p) {
      noise(t, 0.5, 0.3, o, { type: 'bandpass', f0: 400, f1: 2400, q: 2, attack: 0.08 });
      tone('sawtooth', 180 * p, 620 * p, t, 0.45, 0.16, o, { filter: 'lowpass', cutoff: 1800, attack: 0.05 });
      tone('sine', 90 * p, 60 * p, t, 0.3, 0.3, o);
      return 0.5;
    },
    bombExplode(t, o, p, rev) {
      noise(t, 2.4, 0.9, o, { f0: 7000 * p, f1: 120, sweep: 2.2, attack: 0.005 });
      noise(t, 2.6, 0.5, rev, { f0: 3000, f1: 100, sweep: 2.4 });
      tone('sine', 70 * p, 22, t, 1.6, 1.0, o, { sweep: 1.2 });
      tone('sawtooth', 120 * p, 30, t, 0.8, 0.25, o, { filter: 'lowpass', cutoff: 400 });
      noise(t + 0.15, 1.4, 0.3, o, { type: 'bandpass', f0: 900, f1: 150, q: 1 });
      return 2.6;
    },
    explosion(t, o, p, rev) {
      noise(t, 0.9, 0.7, o, { f0: 3800 * p, f1: 140, sweep: 0.8 });
      noise(t, 0.9, 0.2, rev, { f0: 2000, f1: 150 });
      tone('sine', 120 * p, 38, t, 0.5, 0.7, o, { sweep: 0.4 });
      return 0.95;
    },
    explosionSmall(t, o, p) {
      noise(t, 0.38, 0.5, o, { f0: 5000 * p, f1: 300, sweep: 0.35 });
      tone('sine', 190 * p, 60, t, 0.22, 0.4, o);
      return 0.4;
    },
    explosionBig(t, o, p, rev) {
      for (let i = 0; i < 4; i++) {
        const dt = i * 0.17 + Math.random() * 0.05;
        noise(t + dt, 1.4 - i * 0.15, 0.7 - i * 0.1, o, { f0: (4500 - i * 700) * p, f1: 110, sweep: 1.2 });
      }
      noise(t, 2.4, 0.45, rev, { f0: 2500, f1: 90, sweep: 2.2 });
      tone('sine', 55 * p, 18, t, 1.9, 1.0, o, { sweep: 1.5 });
      tone('square', 80 * p, 25, t, 0.6, 0.15, o, { filter: 'lowpass', cutoff: 300 });
      return 2.4;
    },
    hit(t, o, p) {
      tone('square', 950 * p, 520 * p, t, 0.06, 0.18, o);
      tone('triangle', 2200 * p, 1700 * p, t, 0.08, 0.1, o);
      noise(t, 0.05, 0.25, o, { type: 'bandpass', f0: 3200, q: 1.5 });
      return 0.09;
    },
    playerHit(t, o, p) {
      const sh = ctx.createWaveShaper(); sh.curve = makeDrive(4); sh.connect(o);
      noise(t, 0.3, 0.6, sh, { type: 'bandpass', f0: 1400, f1: 400, q: 0.9 });
      tone('sawtooth', 240 * p, 55 * p, t, 0.3, 0.35, sh);
      tone('square', 130 * p, 70 * p, t, 0.2, 0.2, sh);
      return 0.32;
    },
    deflect(t, o, p, rev) {
      tone('sine', 2400 * p, 2300 * p, t, 0.3, 0.2, o);
      tone('sine', 3620 * p, 3500 * p, t, 0.22, 0.12, o);
      tone('triangle', 4800 * p, null, t, 0.12, 0.06, rev);
      noise(t, 0.03, 0.2, o, { type: 'highpass', f0: 6000 });
      return 0.32;
    },
    roll(t, o, p) {
      noise(t, 0.55, 0.45, o, { type: 'bandpass', f0: 350, f1: 2200, sweep: 0.25, q: 2.5, attack: 0.08 });
      noise(t + 0.25, 0.3, 0.25, o, { type: 'bandpass', f0: 2200, f1: 400, q: 2.5, attack: 0.02 });
      tone('sawtooth', 110 * p, 240 * p, t, 0.5, 0.06, o, { filter: 'lowpass', cutoff: 900, attack: 0.1 });
      return 0.6;
    },
    ring(t, o, p, rev) {
      [84, 88, 91, 96].forEach((m, i) => {
        tone('triangle', mtof(m) * p, null, t + i * 0.05, 0.32, 0.18, o);
        tone('sine', mtof(m + 12) * p, null, t + i * 0.05, 0.25, 0.06, rev);
      });
      return 0.5;
    },
    goldRing(t, o, p, rev) {
      [84, 88, 91, 96, 100, 103].forEach((m, i) => {
        tone('square', mtof(m) * p, null, t + i * 0.045, 0.3, 0.09, o, { filter: 'lowpass', cutoff: 6000 });
        tone('sine', mtof(m + 12) * p, null, t + i * 0.045, 0.6, 0.08, rev);
      });
      tone('triangle', mtof(108) * p, null, t + 0.3, 0.7, 0.1, rev);
      return 0.9;
    },
    pickup(t, o, p) {
      [72, 76, 79, 84].forEach((m, i) => tone('square', mtof(m) * p, null, t + i * 0.04, 0.1, 0.12, o, { filter: 'lowpass', cutoff: 5000 }));
      return 0.3;
    },
    oneUp(t, o, p, rev) {
      [76, 79, 88, 84, 86, 91].forEach((m, i) => {
        tone('square', mtof(m) * p, null, t + i * 0.09, 0.12, 0.13, o, { filter: 'lowpass', cutoff: 5000 });
        tone('sine', mtof(m) * p, null, t + i * 0.09, 0.2, 0.05, rev);
      });
      return 0.7;
    },
    checkpoint(t, o, p, rev) {
      tone('triangle', mtof(81) * p, null, t, 0.35, 0.2, o);
      tone('triangle', mtof(88) * p, null, t + 0.12, 0.6, 0.2, o);
      tone('sine', mtof(93) * p, null, t + 0.12, 0.6, 0.08, rev);
      return 0.75;
    },
    wingBreak(t, o, p) {
      noise(t, 0.45, 0.6, o, { type: 'bandpass', f0: 2500, f1: 500, q: 1.2 });
      tone('sawtooth', 420 * p, 70 * p, t, 0.45, 0.3, o, { filter: 'lowpass', cutoff: 2000 });
      tone('square', 1900 * p, 1300 * p, t + 0.05, 0.12, 0.12, o);
      tone('square', 1500 * p, 1100 * p, t + 0.18, 0.1, 0.1, o);
      return 0.5;
    },
    alarm(t, o, p) {
      for (let i = 0; i < 2; i++) {
        tone('square', 880 * p, null, t + i * 0.3, 0.14, 0.13, o, { filter: 'lowpass', cutoff: 3000 });
        tone('square', 660 * p, null, t + i * 0.3 + 0.15, 0.14, 0.13, o, { filter: 'lowpass', cutoff: 3000 });
      }
      return 0.6;
    },
    bossAlarm(t, o, p, rev) {
      for (let i = 0; i < 3; i++) {
        tone('sawtooth', 380 * p, 820 * p, t + i * 0.55, 0.5, 0.16, o, { linear: true, sweep: 0.27, filter: 'lowpass', cutoff: 2500 });
        tone('sawtooth', 385 * p, 830 * p, t + i * 0.55, 0.5, 0.06, rev, { linear: true, sweep: 0.27 });
      }
      return 1.7;
    },
    menuMove(t, o, p) {
      tone('sine', 1250 * p, 1150 * p, t, 0.04, 0.12, o);
      noise(t, 0.015, 0.04, o, { type: 'highpass', f0: 7000 });
      return 0.05;
    },
    menuConfirm(t, o, p, rev) {
      tone('triangle', 880 * p, null, t, 0.08, 0.2, o);
      tone('triangle', 1320 * p, null, t + 0.07, 0.16, 0.2, o);
      tone('sine', 2640 * p, null, t + 0.07, 0.2, 0.04, rev);
      return 0.24;
    },
    menuBack(t, o, p) {
      tone('triangle', 660 * p, null, t, 0.08, 0.18, o);
      tone('triangle', 440 * p, null, t + 0.07, 0.12, 0.18, o);
      return 0.2;
    },
    pause(t, o, p, rev) {
      [76, 72, 79].forEach((m, i) => tone('square', mtof(m) * p, null, t + i * 0.06, 0.1, 0.1, o, { filter: 'lowpass', cutoff: 3500 }));
      tone('sine', mtof(91) * p, null, t + 0.12, 0.3, 0.05, rev);
      return 0.3;
    },
    missileWarn(t, o, p) {
      for (let i = 0; i < 3; i++) tone('square', 1050 * p, null, t + i * 0.11, 0.06, 0.12, o, { filter: 'lowpass', cutoff: 4000 });
      return 0.35;
    },
    shieldDown(t, o, p) {
      const lfo = ctx.createOscillator(); lfo.frequency.value = 18;
      const lg = ctx.createGain(); lg.gain.value = 60; lfo.connect(lg);
      const osc = tone('sawtooth', 820 * p, 90 * p, t, 0.7, 0.2, o, { filter: 'lowpass', cutoff: 2500 });
      lg.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + 0.75);
      return 0.75;
    },
    somersault(t, o, p) {
      noise(t, 1.0, 0.4, o, { type: 'bandpass', f0: 300, f1: 2600, sweep: 0.6, q: 2, attack: 0.15 });
      tone('sawtooth', 90 * p, 260 * p, t, 0.95, 0.12, o, { filter: 'lowpass', cutoff: 1200, attack: 0.1, sweep: 0.6 });
      tone('sine', 60 * p, 120 * p, t, 0.9, 0.2, o, { attack: 0.1 });
      return 1.0;
    },
    uturn(t, o, p) {
      noise(t, 0.85, 0.4, o, { type: 'bandpass', f0: 2200, f1: 350, sweep: 0.7, q: 2, attack: 0.1 });
      tone('sawtooth', 240 * p, 85 * p, t, 0.8, 0.12, o, { filter: 'lowpass', cutoff: 1200, attack: 0.08 });
      return 0.85;
    },
    radioOpen(t, o, p) {
      noise(t, 0.07, 0.25, o, { type: 'bandpass', f0: 2200, q: 1.5 });
      tone('sine', 1850 * p, null, t + 0.02, 0.05, 0.12, o);
      return 0.09;
    },
  };
  const POLY = { laser: 6, laserTwin: 6, laserHyper: 6, enemyLaser: 6, explosion: 6, explosionSmall: 6, explosionBig: 3, hit: 6, menuMove: 3, bombExplode: 2, ring: 3, goldRing: 2, deflect: 4 };
  const active = {};

  function play(name, { pan = 0, pitch = 1, volume = 1 } = {}) {
    if (!ctx || !SFX[name]) return;
    const t = now();
    const list = (active[name] ||= []);
    while (list.length && list[0] <= t) list.shift();
    if (list.length >= (POLY[name] ?? 4)) return;
    const g = ctx.createGain(); g.gain.value = clamp(volume, 0, 2);
    const pn = ctx.createStereoPanner(); pn.pan.value = clamp(pan, -1, 1);
    g.connect(pn); pn.connect(sfxVol);
    const rev = ctx.createGain(); rev.gain.value = clamp(volume, 0, 2); rev.connect(sfxRevSend);
    const d = SFX[name](t, g, pitch, rev);
    list.push(t + d); list.sort((a, b) => a - b);
    setTimeout(() => { try { g.disconnect(); pn.disconnect(); rev.disconnect(); } catch (e) { /* already gone */ } }, (d + 0.5) * 1000);
  }

  // ---------------- loops ----------------
  function loop(name) {
    if (!ctx) return DUMMY;
    const t = now();
    const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(1, t + 0.06);
    out.connect(sfxVol);
    const nodes = [];
    const startAll = () => nodes.forEach((n) => n.start && n.start(t));
    let setFn = () => {};
    const smooth = (param, v, tc = 0.06) => param.setTargetAtTime(v, now(), tc);
    const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; nodes.push(s); return s; };
    const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; nodes.push(o); return o; };

    if (name === 'charge') {
      const a = osc('sawtooth', 110), b = osc('square', 111.5);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 6;
      const trem = ctx.createGain(); trem.gain.value = 0.7;
      const lfo = osc('sine', 6); const lg = ctx.createGain(); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(trem.gain);
      const vol = ctx.createGain(); vol.gain.value = 0.08;
      const shim = osc('sine', 1800); const sg = ctx.createGain(); sg.gain.value = 0; shim.connect(sg); sg.connect(out);
      a.connect(f); b.connect(f); f.connect(trem); trem.connect(vol); vol.connect(out);
      setFn = ({ level = 0 } = {}) => {
        const l = clamp(level, 0, 1);
        smooth(a.frequency, 110 + l * 330); smooth(b.frequency, 111.5 + l * 336);
        smooth(f.frequency, 400 + l * 3600); smooth(lfo.frequency, 6 + l * 22);
        smooth(vol.gain, 0.08 + l * 0.12);
        smooth(sg.gain, l >= 1 ? 0.05 : 0); smooth(shim.frequency, 1800 + l * 600);
      };
    } else if (name === 'engine') {
      const n = noiseSrc();
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.9;
      const ng = ctx.createGain(); ng.gain.value = 0.09;
      const lo = osc('triangle', 55), lo2 = osc('sawtooth', 55.7);
      const lf = ctx.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 260;
      const lg = ctx.createGain(); lg.gain.value = 0.1;
      n.connect(bp); bp.connect(ng); ng.connect(out);
      lo.connect(lf); lo2.connect(lf); lf.connect(lg); lg.connect(out);
      setFn = ({ speed = 0.5, boost = 0, brake = 0 } = {}) => {
        const s = clamp(speed, 0, 1) + (boost ? 0.6 : 0) - (brake ? 0.35 : 0);
        smooth(bp.frequency, 300 + s * 900, 0.15); smooth(ng.gain, 0.05 + s * 0.06 + (boost ? 0.06 : 0), 0.15);
        smooth(lo.frequency, 45 + s * 40, 0.2); smooth(lo2.frequency, 45.7 + s * 41, 0.2);
        smooth(lf.frequency, 200 + s * 400, 0.2);
      };
      setFn({});
    } else if (name === 'boost') {
      const n = noiseSrc();
      const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 900; hp.Q.value = 1.2;
      hp.frequency.setValueAtTime(600, t); hp.frequency.exponentialRampToValueAtTime(2400, t + 0.6);
      const ng = ctx.createGain(); ng.gain.value = 0.22;
      const s = osc('sawtooth', 120); s.frequency.setValueAtTime(90, t); s.frequency.exponentialRampToValueAtTime(220, t + 0.6);
      const sf = ctx.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 900;
      const sg = ctx.createGain(); sg.gain.value = 0.07;
      n.connect(hp); hp.connect(ng); ng.connect(out); s.connect(sf); sf.connect(sg); sg.connect(out);
      setFn = ({ level = 1 } = {}) => { smooth(ng.gain, 0.22 * level); smooth(sg.gain, 0.07 * level); };
    } else if (name === 'lowShield') {
      const o = osc('square', 1180);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000;
      const amp = ctx.createGain(); amp.gain.value = 0.045;
      const lfo = osc('square', 2.6); const lg = ctx.createGain(); lg.gain.value = 0.045; lfo.connect(lg); lg.connect(amp.gain);
      o.connect(f); f.connect(amp); amp.connect(out);
      setFn = ({ rate = 2.6 } = {}) => smooth(lfo.frequency, rate);
    } else {
      out.disconnect();
      return DUMMY;
    }
    startAll();
    let stopped = false;
    return {
      set(p) { if (!stopped) setFn(p || {}); },
      stop() {
        if (stopped) return; stopped = true;
        const tt = now();
        out.gain.cancelScheduledValues(tt); out.gain.setValueAtTime(out.gain.value, tt); out.gain.linearRampToValueAtTime(0.0001, tt + 0.1);
        nodes.forEach((n) => { try { n.stop(tt + 0.15); } catch (e) { /* not started */ } });
        setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, 400);
      },
    };
  }

  // ---------------- music: tracker data ----------------
  // Line syntax: "NOTE:len" (len in 16th steps, default 1), ".:len" rest, "-" extends previous.
  // Bass tokens are chord-relative degrees: R 3 5 8 b7 -5 (fifth below) ; arp tokens are chord-tone indices 0..n.
  // Drum lanes: k kick, s snare, h hat, o open hat, c crash, t tom ; 'x' hit, 'X' accent, '.' rest.
  const SONGS = {
    title: {
      bpm: 108, loop: true, loopTo: 0,
      inst: {
        lead: { wave: 'square', cutoff: 3200, vol: 0.12, attack: 0.01, release: 0.12, vib: 5, delay: 0.3 },
        lead2: { wave: 'sawtooth', cutoff: 2000, vol: 0.05, attack: 0.02, release: 0.2, vib: 4, oct: -12 },
        bass: { wave: 'sawtooth', cutoff: 700, vol: 0.18, release: 0.08 },
        pad: { vol: 0.045, cutoff: 1800 },
        arp: { wave: 'square', cutoff: 2500, vol: 0.035 },
      },
      sections: {
        A: {
          bars: 8, chords: 'C G Am Em F C Dm G',
          lead: 'G4:2 C5:6 E5:2 G5:6 F5:3 E5:1 D5:4 B4:4 G4:4 A4:2 C5:2 E5:4 A5:8 G5:3 F5:1 E5:4 B4:8 A4:2 C5:2 F5:6 E5:2 F5:2 A5:2 G5:8 E5:4 C5:4 D5:2 E5:2 F5:4 A5:4 G5:4 G5:12 .:4',
          bass: 'R:4 R:2 5:2 8:4 5:4',
          arp: '0 1 2 1 0 1 2 3 0 1 2 1 0 1 2 3',
          drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        },
        B: {
          bars: 8, chords: 'F G Em Am F G C C',
          lead: 'C6:4 A5:4 F5:4 A5:4 B5:4 G5:4 D5:4 G5:4 B5:6 A5:2 G5:4 E5:4 A5:8 E5:4 C5:4 F5:4 A5:4 C6:6 B5:2 B5:4 D6:4 G5:8 C6:8 G5:4 E5:4 C6:12 .:4',
          lead2: 'C6:4 A5:4 F5:4 A5:4 B5:4 G5:4 D5:4 G5:4 B5:6 A5:2 G5:4 E5:4 A5:8 E5:4 C5:4 F5:4 A5:4 C6:6 B5:2 B5:4 D6:4 G5:8 C6:8 G5:4 E5:4 C6:12 .:4',
          bass: 'R:2 R:2 8:2 R:2 5:2 R:2 8:2 5:2',
          arp: '0 2 1 3 0 2 1 3 0 2 1 3 0 2 1 3',
          drums: { k: 'x.....x.x.......', s: '....x.......x..x', h: 'x.xxx.x.x.xxx.x.', c: 'x...............................................................................................................................' },
        },
      },
      order: ['A', 'B'],
    },
    stage1: {
      bpm: 140, loop: true, loopTo: 1,
      inst: {
        lead: { wave: 'square', cutoff: 3800, vol: 0.12, attack: 0.005, release: 0.1, vib: 6, delay: 0.25 },
        lead2: { wave: 'sawtooth', cutoff: 2400, vol: 0.05, attack: 0.01, release: 0.1, vib: 5, oct: 12 },
        bass: { wave: 'sawtooth', cutoff: 900, vol: 0.2, release: 0.06 },
        pad: { vol: 0.04, cutoff: 2200 },
        arp: { wave: 'square', cutoff: 3000, vol: 0.03 },
      },
      sections: {
        I: {
          bars: 4, chords: 'D D C D',
          bass: 'R:2 R:2 8:2 R:2 5:2 R:2 8:2 5:2',
          arp: '0 1 2 3 2 1 0 1 0 1 2 3 2 1 0 1',
          drums: { k: 'x.....x.x.......', s: '............xxxx', h: 'x.xxx.xxx.xxx.xx', c: 'x...............................................................' },
        },
        A: {
          bars: 8, chords: 'D C G D D C G A',
          lead: 'A4:2 D5:2 F#5:2 A5:6 F#5:2 A5:2 G5:4 E5:4 C5:4 E5:4 D5:2 G5:2 B5:4 A5:2 G5:2 D5:4 A5:12 .:4 A4:2 D5:2 F#5:2 A5:6 B5:2 C6:2 C6:4 B5:2 G5:2 E5:8 D5:2 G5:2 B5:2 D6:6 B5:2 G5:2 A5:4 C#6:4 E6:8',
          bass: 'R:2 R:2 8:2 R:2 5:2 R:2 8:2 5:2',
          arp: '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1',
          drums: { k: 'x.....x.x.....x.', s: '....x.......x.xx', h: 'x.xxx.xxx.xxx.xx', c: 'x...............................................................................................................................' },
        },
        B: {
          bars: 8, chords: 'Bm G D A Bm G E A',
          lead: 'F#5:6 D5:2 B4:8 G5:6 D5:2 B4:8 A5:4 F#5:4 D5:4 F#5:4 E5:12 .:4 B5:6 A5:2 F#5:8 G5:4 B5:4 D6:8 E6:4 D6:2 B5:2 G#5:8 A5:4 B5:4 C#6:8',
          lead2: 'D5:16 D5:16 F#5:16 C#5:16 D5:16 D5:16 E5:16 E5:16',
          bass: 'R:3 R:1 R:2 5:2 R:2 8:2 5:2 R:2',
          arp: '2 1 0 1 2 1 0 1 2 1 0 1 2 1 0 1',
          drums: { k: 'x.x...x.x.x...x.', s: '....X.......X...', h: 'xxxxxxxxxxxxxxxx', c: 'x...............................................................' },
        },
      },
      order: ['I', 'A', 'B', 'A', 'B'],
    },
    stage2: {
      bpm: 128, loop: true, loopTo: 0,
      inst: {
        lead: { wave: 'sawtooth', cutoff: 2200, vol: 0.09, attack: 0.04, release: 0.25, vib: 5, delay: 0.4 },
        lead2: { wave: 'square', cutoff: 1800, vol: 0.06, attack: 0.01, release: 0.1, vib: 0 },
        bass: { wave: 'square', cutoff: 500, vol: 0.2, release: 0.05 },
        pad: { vol: 0.055, cutoff: 1200 },
        arp: { wave: 'square', cutoff: 1800, vol: 0.04 },
      },
      sections: {
        A: {
          bars: 8, chords: 'Em Em C C Am Am B B',
          lead: 'E5:6 G5:2 B5:8 A5:4 G5:4 F#5:8 E5:6 G5:2 C6:8 B5:4 A5:4 G5:8 A5:6 C6:2 E6:8 D6:4 C6:4 B5:8 B5:4 D#6:4 F#6:4 D#6:4 B5:16',
          bass: 'R:1 R:1 8:1 R:1 R:1 8:1 R:1 5:1 R:1 R:1 8:1 R:1 b7:2 5:2',
          arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1',
          drums: { k: 'x.......x.x.....', s: '....x.......x...', h: '..x...x...x...x.' },
        },
        B: {
          bars: 8, chords: 'Em D C B Em D C B',
          lead2: 'B4:4 E5:4 G5:4 E5:4 A4:4 D5:4 F#5:4 D5:4 G4:4 C5:4 E5:4 C5:4 F#4:4 B4:4 D#5:4 F#5:4 B5:4 E6:4 G6:4 E6:4 A5:4 D6:4 F#6:4 D6:4 G5:4 C6:4 E6:4 C6:4 F#5:4 B5:4 D#6:4 F#6:4',
          bass: 'R:2 8:2 R:2 8:2 R:2 8:2 R:2 8:2',
          arp: '0 2 1 2 0 2 1 2 0 2 1 2 0 2 1 2',
          drums: { k: 'x..x..x...x..x..', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
        },
      },
      order: ['A', 'B'],
    },
    boss: {
      bpm: 162, loop: true, loopTo: 0,
      inst: {
        lead: { wave: 'square', cutoff: 4200, vol: 0.11, attack: 0.004, release: 0.08, vib: 7, delay: 0.2 },
        lead2: { wave: 'sawtooth', cutoff: 2600, vol: 0.05, attack: 0.005, release: 0.08, vib: 6, oct: -12 },
        bass: { wave: 'sawtooth', cutoff: 1100, vol: 0.2, release: 0.04 },
        pad: { vol: 0.035, cutoff: 1600 },
        arp: { wave: 'square', cutoff: 3200, vol: 0.03 },
      },
      sections: {
        A: {
          bars: 8, chords: 'Am Bb Am G Am Bb Am E',
          lead: 'A5:2 A5:2 C6:2 A5:2 E6:4 D6:4 D6:2 C6:2 Bb5:4 F5:8 A5:2 A5:2 C6:2 A5:2 E6:4 F6:4 E6:4 D6:4 B5:8 E6:2 E6:2 F6:2 E6:2 D6:4 C6:4 D6:4 F6:4 Bb5:8 C6:2 B5:2 A5:2 G#5:2 A5:8 G#5:4 B5:4 E6:8',
          lead2: 'A5:2 A5:2 C6:2 A5:2 E6:4 D6:4 D6:2 C6:2 Bb5:4 F5:8 A5:2 A5:2 C6:2 A5:2 E6:4 F6:4 E6:4 D6:4 B5:8 E6:2 E6:2 F6:2 E6:2 D6:4 C6:4 D6:4 F6:4 Bb5:8 C6:2 B5:2 A5:2 G#5:2 A5:8 G#5:4 B5:4 E6:8',
          bass: 'R:1 R:1 8:1 R:1 R:1 8:1 R:1 R:1 8:1 R:1 R:1 8:1 R:1 5:1 b7:1 8:1',
          arp: '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1',
          drums: { k: 'x..x..x.x..x..x.', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx', c: 'x...............................................................' },
        },
        B: {
          bars: 8, chords: 'F G Am Am F G E E',
          lead: 'F5:4 A5:4 C6:8 D6:4 B5:4 G5:8 E6:6 D6:2 C6:8 A5:16 F6:4 E6:4 C6:8 D6:4 B5:4 G5:8 G#5:4 B5:4 E6:4 D6:4 B5:16',
          bass: 'R:2 R:2 8:2 R:2 R:2 8:2 R:2 5:2',
          arp: '0 2 1 2 0 2 1 2 0 2 1 2 0 2 1 2',
          drums: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..x...x...x...x.', t: '............................................................xxxx' },
        },
      },
      order: ['A', 'B'],
    },
    results: {
      bpm: 120, loop: true, loopTo: 0,
      inst: {
        lead: { wave: 'square', cutoff: 4000, vol: 0.11, attack: 0.005, release: 0.15, vib: 5, delay: 0.35 },
        bass: { wave: 'sawtooth', cutoff: 800, vol: 0.17, release: 0.08 },
        pad: { vol: 0.05, cutoff: 2400 },
        arp: { wave: 'square', cutoff: 3000, vol: 0.035 },
      },
      sections: {
        A: {
          bars: 4, chords: 'C F G C',
          lead: 'C5:2 E5:2 G5:2 C6:10 A5:4 C6:4 F6:8 G5:2 B5:2 D6:2 G6:6 F6:2 D6:2 E6:4 G6:4 C6:8',
          bass: 'R:4 5:4 8:4 5:4',
          arp: '0 1 2 3 0 1 2 3 0 1 2 3 0 1 2 3',
          drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        },
        B: {
          bars: 4, chords: 'Am F G C',
          lead: 'E6:4 C6:4 A5:8 F5:4 A5:4 C6:8 D6:4 B5:4 G5:4 B5:4 C6:16',
          bass: 'R:4 5:4 8:4 5:4',
          arp: '0 2 1 3 0 2 1 3 0 2 1 3 0 2 1 3',
          drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        },
      },
      order: ['A', 'B'],
    },
    gameover: {
      bpm: 76, loop: false,
      inst: {
        lead: { wave: 'triangle', cutoff: 2400, vol: 0.18, attack: 0.03, release: 0.4, vib: 4, delay: 0.45 },
        bass: { wave: 'triangle', cutoff: 600, vol: 0.2, release: 0.3 },
        pad: { vol: 0.06, cutoff: 1100 },
      },
      sections: {
        A: {
          bars: 5, chords: 'Am F Dm E Am',
          lead: 'E5:8 C5:8 A4:8 F4:8 D5:6 C5:2 A4:8 G#4:8 E4:8 A4:16',
          bass: 'R:16',
        },
      },
      order: ['A'],
    },
  };
  // attract: title arrangement, faster with busier arps and stage drums
  SONGS.attract = {
    ...SONGS.title, bpm: 124,
    inst: { ...SONGS.title.inst, arp: { wave: 'square', cutoff: 3200, vol: 0.045 } },
    sections: {
      A: { ...SONGS.title.sections.A, arp: '0 1 2 3 0 1 2 3 0 1 2 3 0 1 2 3', drums: SONGS.stage1.sections.A.drums },
      B: { ...SONGS.title.sections.B, drums: SONGS.stage1.sections.B.drums },
    },
  };

  const CHORD_Q = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], dim: [0, 3, 6], '5': [0, 7] };
  function parseChord(sym) {
    const m = /^([A-G])([#b]?)(.*)$/.exec(sym);
    const root = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const iv = CHORD_Q[m[3]] ?? CHORD_Q[''];
    return { root: ((root % 12) + 12) % 12, iv, minor: iv[1] === 3 };
  }
  /** parse a tokenised line into {len, map(step -> {tok,len})} */
  function parseLine(str) {
    const map = new Map();
    let step = 0, last = null;
    for (const tok of (str || '').trim().split(/\s+/).filter(Boolean)) {
      if (tok === '-') { if (last) last.len++; step++; continue; }
      const [v, l] = tok.split(':');
      const len = l ? parseInt(l, 10) : 1;
      if (v !== '.') { last = { tok: v, len }; map.set(step, last); } else last = null;
      step += len;
    }
    return { len: Math.max(1, step), map };
  }
  function compile(def) {
    if (def._c) return def._c;
    const secs = {};
    for (const [k, s] of Object.entries(def.sections)) {
      const len = s.bars * 16;
      secs[k] = {
        len,
        chords: (s.chords || 'C').trim().split(/\s+/).map(parseChord),
        lead: s.lead ? parseLine(s.lead) : null,
        lead2: s.lead2 ? parseLine(s.lead2) : null,
        bass: s.bass ? parseLine(s.bass) : null,
        arp: s.arp ? parseLine(s.arp) : null,
        drums: Object.fromEntries(Object.entries(s.drums || {}).map(([l, p]) => [l, p.replace(/[\s|]/g, '')])),
      };
    }
    def._c = { secs, stepDur: 60 / def.bpm / 4 };
    return def._c;
  }
  function bassDeg(tok, ch) {
    switch (tok) {
      case 'R': return 0; case '3': return ch.minor ? 3 : 4; case '5': return 7; case '8': return 12;
      case 'b7': return 10; case '-5': return -5; case '4': return 5; case '6': return 9; default: return 0;
    }
  }

  // instruments
  function synthNote(inst, midi, t, dur, out, send) {
    const f = mtof(midi + (inst.oct || 0));
    const g = ctx.createGain();
    const a = inst.attack ?? 0.005, r = inst.release ?? 0.1;
    const end = t + Math.max(dur, a + 0.02);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(inst.vol, t + a);
    g.gain.setValueAtTime(inst.vol * 0.8, Math.max(t + a, end - 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, end + r);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = inst.cutoff ?? 3000; filt.Q.value = 1.5;
    const o = ctx.createOscillator(); o.type = inst.wave || 'square'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = inst.wave || 'square'; o2.frequency.value = f; o2.detune.value = 7;
    const mix = ctx.createGain(); mix.gain.value = 0.6;
    o.connect(filt); o2.connect(mix); mix.connect(filt);
    if (inst.vib) {
      const l = ctx.createOscillator(); l.frequency.value = 5.5;
      const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(inst.vib, t + Math.min(0.4, dur));
      l.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
      l.start(t); l.stop(end + r + 0.05);
    }
    filt.connect(g); g.connect(out);
    if (inst.delay && send) { const sg = ctx.createGain(); sg.gain.value = inst.delay; g.connect(sg); sg.connect(send); }
    o.start(t); o2.start(t); o.stop(end + r + 0.05); o2.stop(end + r + 0.05);
  }
  function bassNote(inst, midi, t, dur, out) {
    const f = mtof(midi);
    const o = ctx.createOscillator(); o.type = inst.wave || 'sawtooth'; o.frequency.value = f;
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = f / 2;
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 4;
    flt.frequency.setValueAtTime((inst.cutoff ?? 800) * 2.2, t); flt.frequency.exponentialRampToValueAtTime(inst.cutoff ?? 800, t + 0.08);
    const g = ctx.createGain(); const end = t + dur;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(inst.vol, t + 0.004);
    g.gain.setValueAtTime(inst.vol * 0.75, Math.max(t + 0.005, end - 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, end + (inst.release ?? 0.06));
    const sg = ctx.createGain(); sg.gain.value = 0.5;
    o.connect(flt); flt.connect(g); sub.connect(sg); sg.connect(g); g.connect(out);
    const stopAt = end + (inst.release ?? 0.06) + 0.05;
    o.start(t); sub.start(t); o.stop(stopAt); sub.stop(stopAt);
  }
  function padChord(inst, ch, t, dur, out) {
    const base = 52 + ((ch.root - 4 + 12) % 12); // root voiced between E3..D#4
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(inst.vol, t + Math.min(0.3, dur * 0.3));
    g.gain.setValueAtTime(inst.vol, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = inst.cutoff ?? 1500;
    flt.connect(g); g.connect(out);
    ch.iv.slice(0, 4).forEach((iv) => {
      [-8, 8].forEach((dt) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(base + iv); o.detune.value = dt;
        o.connect(flt); o.start(t); o.stop(t + dur + 0.4);
      });
    });
  }
  function arpNote(inst, midi, t, dur, out, send) {
    const o = ctx.createOscillator(); o.type = inst.wave || 'square'; o.frequency.value = mtof(midi);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = inst.cutoff ?? 2500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(inst.vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
    o.connect(flt); flt.connect(g); g.connect(out);
    if (send) { const sg = ctx.createGain(); sg.gain.value = 0.35; g.connect(sg); sg.connect(send); }
    o.start(t); o.stop(t + dur);
  }
  function drum(lane, accent, t, out) {
    const v = accent ? 1.25 : 1;
    switch (lane) {
      case 'k': tone('sine', 160, 42, t, 0.32, 0.75 * v, out, { sweep: 0.11 }); tone('triangle', 900, 100, t, 0.02, 0.15 * v, out); break;
      case 's': noise(t, 0.18, 0.32 * v, out, { type: 'bandpass', f0: 1900, q: 0.7 }); tone('triangle', 200, 150, t, 0.1, 0.25 * v, out); break;
      case 'h': noise(t, 0.04, 0.09 * v, out, { type: 'highpass', f0: 7500 }); break;
      case 'o': noise(t, 0.24, 0.08 * v, out, { type: 'highpass', f0: 6500 }); break;
      case 'c': noise(t, 1.3, 0.16 * v, out, { type: 'highpass', f0: 4200, f1: 2500 }); break;
      case 't': tone('sine', 210, 85, t, 0.25, 0.45 * v, out, { sweep: 0.2 }); break;
      default: break;
    }
  }

  // ---------------- music: player / scheduler ----------------
  let players = [];
  let current = null;
  let schedTimer = null;
  const LOOKAHEAD = 0.12;

  function scheduleStep(pl, t) {
    const def = pl.def, c = pl.c;
    const sec = c.secs[def.order[pl.idx]];
    const s = pl.step, sd = c.stepDur;
    const bar = Math.floor(s / 16);
    const ch = sec.chords[bar % sec.chords.length];
    const out = pl.gain, send = delayIn;
    if (s % 16 === 0 && def.inst.pad) padChord(def.inst.pad, ch, t, sd * 16, out);
    for (const ln of ['lead', 'lead2']) {
      const line = sec[ln];
      if (!line || !def.inst[ln]) continue;
      const e = line.map.get(s % line.len);
      if (e) { const m = noteToMidi(e.tok); if (m !== null) synthNote(def.inst[ln], m, t, e.len * sd * 0.95, out, send); }
    }
    if (sec.bass && def.inst.bass) {
      const e = sec.bass.map.get(s % sec.bass.len);
      if (e) bassNote(def.inst.bass, 36 + ((ch.root + 12 - 0) % 12) + bassDeg(e.tok, ch), t, e.len * sd * 0.9, out);
    }
    if (sec.arp && def.inst.arp) {
      const e = sec.arp.map.get(s % sec.arp.len);
      if (e) {
        const i = parseInt(e.tok, 10) || 0, n = ch.iv.length;
        arpNote(def.inst.arp, 60 + ch.root + ch.iv[i % n] + 12 * Math.floor(i / n), t, e.len * sd, out, send);
      }
    }
    for (const [lane, pat] of Object.entries(sec.drums)) {
      const chh = pat[s % pat.length];
      if (chh === 'x' || chh === 'X') drum(lane, chh === 'X', t, out);
    }
    // advance
    pl.step++;
    if (pl.step >= sec.len) {
      pl.step = 0; pl.idx++;
      if (pl.idx >= def.order.length) {
        if (def.loop) pl.idx = def.loopTo ?? 0;
        else { pl.done = true; }
      }
    }
  }
  function tick() {
    if (!ctx) return;
    const t = now();
    for (const pl of players) {
      if (pl.done) continue;
      if (pl.next < t - 0.25) pl.next = t + 0.05; // recover after tab sleep
      while (pl.next < t + LOOKAHEAD && !pl.done) {
        scheduleStep(pl, pl.next);
        pl.next += pl.c.stepDur;
      }
    }
    players = players.filter((p) => !(p.dead && p.killAt <= t) && !(p.done && p !== current));
  }

  function music(trackId, { fade = 1.2 } = {}) {
    if (!ctx) { pendingTrack = trackId; return; }
    if (current && current.id === trackId && !current.dead) return;
    const t = now();
    if (current) {
      const old = current;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
      old.dead = true; old.killAt = t + fade + 0.2;
      setTimeout(() => { old.done = true; try { old.gain.disconnect(); } catch (e) { /* gone */ } }, (fade + 0.6) * 1000);
      current = null;
    }
    const def = SONGS[trackId];
    if (!def || trackId === 'none') return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + Math.max(0.05, fade * 0.6));
    g.connect(duckFilter);
    const pl = { id: trackId, def, c: compile(def), gain: g, idx: 0, step: 0, next: t + 0.06, done: false, dead: false };
    players.push(pl);
    current = pl;
  }
  let pendingTrack = null;

  // ---------------- stingers ----------------
  const STINGERS = {
    missionStart: { bpm: 150, wave: 'square', notes: [['G4', 0, 0.33], ['C5', 0.33, 0.33], ['E5', 0.66, 0.34], ['G5', 1, 1], ['E5', 2, 0.5], ['G5', 2.5, 0.5], ['C6', 3, 3]], chord: ['C4', 'E4', 'G4'], chordAt: 3 },
    missionClear: { bpm: 140, wave: 'square', notes: [['C5', 0, 0.5], ['E5', 0.5, 0.5], ['G5', 1, 0.5], ['C6', 1.5, 1.5], ['A5', 3, 0.5], ['B5', 3.5, 0.5], ['C6', 4, 0.5], ['D6', 4.5, 0.5], ['E6', 5, 3]], chord: ['C4', 'G4', 'E5'], chordAt: 5 },
    checkpoint: { bpm: 180, wave: 'triangle', notes: [['E5', 0, 0.5], ['G5', 0.5, 0.5], ['C6', 1, 1.5]] },
    allClear: { bpm: 160, wave: 'square', notes: [['C5', 0, 0.25], ['E5', 0.25, 0.25], ['G5', 0.5, 0.25], ['C6', 0.75, 0.25], ['E6', 1, 0.25], ['G6', 1.25, 0.25], ['C7', 1.5, 2]], chord: ['C4', 'E4', 'G4', 'C5'], chordAt: 1.5 },
    warning: { bpm: 200, wave: 'sawtooth', notes: [['A5', 0, 0.9], ['F5', 1, 0.9], ['A5', 2, 0.9], ['F5', 3, 0.9], ['A5', 4, 0.9], ['F5', 5, 0.9]] },
  };
  function stinger(id) {
    if (!ctx || !STINGERS[id]) return;
    const s = STINGERS[id], beat = 60 / s.bpm, t = now() + 0.03;
    let len = 0;
    const out = ctx.createGain(); out.gain.value = 0.9; out.connect(sfxVol);
    const send = ctx.createGain(); send.gain.value = 0.5; send.connect(sfxRevSend);
    const inst = { wave: s.wave, cutoff: 4500, vol: 0.13, attack: 0.005, release: 0.2, vib: 6 };
    for (const [n, st, d] of s.notes) {
      synthNote(inst, noteToMidi(n), t + st * beat, d * beat * 0.95, out, send);
      len = Math.max(len, (st + d) * beat);
    }
    if (s.chord) for (const n of s.chord) synthNote({ ...inst, wave: 'sawtooth', vol: 0.05, cutoff: 2000, vib: 0 }, noteToMidi(n), t + s.chordAt * beat, (len - s.chordAt * beat), out, send);
    // duck music under the stinger
    const g = stingerDuck.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.3, t + 0.08); g.setValueAtTime(0.3, t + len); g.linearRampToValueAtTime(1, t + len + 0.6);
    setTimeout(() => { try { out.disconnect(); send.disconnect(); } catch (e) { /* gone */ } }, (len + 1.5) * 1000);
  }

  // ---------------- radio voices ----------------
  const VOWELS = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [570, 840], [660, 1720], [440, 1020], [390, 1990]];
  const CHARS = {
    vix: { f: 190, fs: 1.1, wave: 'sawtooth', rate: 1.0, growl: 0, jitter: 3 },
    marlow: { f: 120, fs: 0.92, wave: 'sawtooth', rate: 0.85, growl: 0, jitter: 2 },
    kestrel: { f: 235, fs: 1.2, wave: 'square', rate: 1.15, growl: 0, jitter: 4 },
    tobi: { f: 330, fs: 1.45, wave: 'square', rate: 1.25, growl: 0, jitter: 5 },
    croak: { f: 72, fs: 0.78, wave: 'sawtooth', rate: 0.8, growl: 38, jitter: 2 },
    jackal: { f: 165, fs: 1.25, wave: 'square', rate: 1.05, growl: 0, jitter: 3, nasal: true },
    hq: { f: 135, fs: 0.95, wave: 'sawtooth', rate: 0.9, growl: 0, jitter: 2 },
  };
  function voiceDuration(c, text) {
    const syl = clamp(Math.ceil((text || '').length / 4), 2, 16);
    return { syl, dur: Math.min(3.5, syl * 0.13 / c.rate + 0.1) };
  }
  function voice(charId, text) {
    const c = CHARS[charId] || CHARS.vix;
    const { syl, dur } = voiceDuration(c, text);
    if (!ctx) return dur;
    const t = now() + 0.02;
    const sylDur = (dur - 0.1) / syl;
    const question = /\?\s*$/.test(text || ''), exclaim = /!\s*$/.test(text || '');
    // radio chain
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = c.nasal ? 2600 : 3300;
    const sh = ctx.createWaveShaper(); sh.curve = makeDrive(c.growl ? 3 : 1.8);
    const vg = ctx.createGain(); vg.gain.value = 0.9;
    hp.connect(lp); lp.connect(sh); sh.connect(vg); vg.connect(voiceVol);
    if (c.nasal) { const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1400; pk.gain.value = 9; pk.Q.value = 2; lp.disconnect(); lp.connect(pk); pk.connect(sh); }
    // source
    const src = ctx.createOscillator(); src.type = c.wave;
    const env = ctx.createGain(); env.gain.setValueAtTime(0.0001, t);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 7;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 9;
    const g1 = ctx.createGain(); g1.gain.value = 1.4; const g2 = ctx.createGain(); g2.gain.value = 0.9;
    src.connect(f1); src.connect(f2); f1.connect(g1); f2.connect(g2); g1.connect(env); g2.connect(env);
    if (c.growl) {
      const gr = ctx.createGain(); gr.gain.value = 0.6; env.connect(gr); gr.connect(hp);
      const am = ctx.createOscillator(); am.frequency.value = c.growl; const ag = ctx.createGain(); ag.gain.value = 0.4;
      am.connect(ag); ag.connect(gr.gain); am.start(t); am.stop(t + dur + 0.1);
    } else env.connect(hp);
    const r = makeRng(Math.floor(Math.random() * 1e9));
    let prev = c.f;
    src.frequency.setValueAtTime(c.f, t);
    for (let i = 0; i < syl; i++) {
      const st = t + i * sylDur;
      const v = VOWELS[Math.floor(r() * VOWELS.length)];
      const last = i === syl - 1;
      const contour = last ? (question ? 5 : exclaim ? 1 : -4) : 0;
      const semi = (r() * 2 - 1) * c.jitter + (i === 0 && exclaim ? 2 : 0);
      const pitch = c.f * Math.pow(2, semi / 12);
      src.frequency.setValueAtTime(prev, st);
      src.frequency.exponentialRampToValueAtTime(pitch, st + 0.03);
      prev = pitch;
      if (last) { prev = pitch * Math.pow(2, contour / 12); src.frequency.exponentialRampToValueAtTime(prev, st + sylDur); }
      f1.frequency.setTargetAtTime(v[0] * c.fs, st, 0.02);
      f2.frequency.setTargetAtTime(v[1] * c.fs, st, 0.02);
      const on = sylDur * (0.68 + r() * 0.2);
      env.gain.setValueAtTime(0.0001, st);
      env.gain.linearRampToValueAtTime(0.55, st + 0.015);
      env.gain.setValueAtTime(0.5, st + on - 0.02);
      env.gain.linearRampToValueAtTime(0.0001, st + on);
    }
    src.start(t); src.stop(t + dur + 0.1);
    // squelch clicks
    noise(t - 0.01, 0.06, 0.18, voiceVol, { type: 'bandpass', f0: 2400, q: 1.4 });
    noise(t + dur - 0.02, 0.09, 0.22, voiceVol, { type: 'bandpass', f0: 1800, q: 1.2 });
    tone('sine', 1900, null, t + dur, 0.04, 0.08, voiceVol);
    setTimeout(() => { try { vg.disconnect(); } catch (e) { /* gone */ } }, (dur + 0.8) * 1000);
    return dur;
  }

  // ---------------- init / volume / duck ----------------
  function applyVolumes() {
    if (!ctx) return;
    const t = now();
    master.gain.setTargetAtTime(vols.master, t, 0.05);
    musicVol.gain.setTargetAtTime(vols.music * 0.55, t, 0.05);
    sfxVol.gain.setTargetAtTime(vols.sfx, t, 0.05);
    voiceVol.gain.setTargetAtTime(vols.voice, t, 0.05);
  }
  function setVolumes(v = {}) {
    for (const k of ['master', 'music', 'sfx', 'voice']) if (typeof v[k] === 'number') vols[k] = clamp(v[k], 0, 1);
    applyVolumes();
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive' });
    noiseBuf = makeNoise();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.connect(comp); comp.connect(ctx.destination);
    musicVol = ctx.createGain(); sfxVol = ctx.createGain(); voiceVol = ctx.createGain();
    musicVol.connect(master); sfxVol.connect(master); voiceVol.connect(master);
    duckFilter = ctx.createBiquadFilter(); duckFilter.type = 'lowpass'; duckFilter.frequency.value = 20000; duckFilter.Q.value = 0.5;
    duckGain = ctx.createGain(); stingerDuck = ctx.createGain();
    duckFilter.connect(duckGain); duckGain.connect(stingerDuck); stingerDuck.connect(musicVol);
    // reverb
    convolver = ctx.createConvolver(); convolver.buffer = makeImpulse(2.2, 3);
    const revRet = ctx.createGain(); revRet.gain.value = 0.32; convolver.connect(revRet); revRet.connect(master);
    musicRevSend = ctx.createGain(); musicRevSend.gain.value = 0.22; musicVol.connect(musicRevSend); musicRevSend.connect(convolver);
    sfxRevSend = ctx.createGain(); sfxRevSend.gain.value = 0.6; sfxRevSend.connect(sfxVol);
    const sfxRev2 = ctx.createGain(); sfxRev2.gain.value = 0.5; sfxVol.connect(sfxRev2); sfxRev2.connect(convolver);
    // tempo-free slapback delay for leads
    delayIn = ctx.createGain();
    const dl = ctx.createDelay(1.0); dl.delayTime.value = 0.27;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const dlf = ctx.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2400;
    delayIn.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(duckFilter);
    vols.music = Settings.musicVol ?? vols.music; vols.sfx = Settings.sfxVol ?? vols.sfx; vols.voice = Settings.voiceVol ?? vols.voice;
    applyVolumes();
    schedTimer = setInterval(tick, 25);
    if (ctx.state === 'suspended') ctx.resume();
    if (pendingTrack) { const p = pendingTrack; pendingTrack = null; music(p, { fade: 0.3 }); }
  }
  function duck(on) {
    if (!ctx) return;
    const t = now();
    duckFilter.frequency.setTargetAtTime(on ? 650 : 20000, t, 0.12);
    duckGain.gain.setTargetAtTime(on ? 0.5 : 1, t, 0.12);
  }

  return {
    init, setVolumes, play, loop, music, stinger, voice, duck,
    get ready() { return !!ctx; },
    get context() { return ctx; },
    get track() { return current ? current.id : 'none'; },
    songs: SONGS, sfxNames: Object.keys(SFX),
  };
})();
