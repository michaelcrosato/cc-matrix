// ---------------------------------------------------------------- Babble: Animalese/Simlish gibberish voices and the crowd
// A small formant synth on the engine's audio context, routed through its effects bus (engine patch P4) so volume and mute apply.
MT.babble = (() => {
  const VOICES = {
    lance: { f0: 135, speed: 13, wave: 'sawtooth', formant: 1.0, swoop: 1.5 },
    penny: { f0: 300, speed: 12, wave: 'pulse', formant: 1.18, trill: true },
    annc: { f0: 85, speed: 7, wave: 'sawtooth', formant: .85, echo: true },
    network: { f0: 70, speed: 8, wave: 'square', formant: .8, robot: true },
    mashy: { f0: 110, speed: 9, wave: 'triangle', formant: .9, bounce: true },
    sponsor: { f0: 220, speed: 10, wave: 'square', formant: 1.1, sing: true },
    goon: { f0: 95, speed: 10, wave: 'sawtooth', formant: .9 },
    contestant1: { f0: 170, speed: 12, wave: 'pulse', formant: 1.05 },
    contestant2: { f0: 230, speed: 12, wave: 'pulse', formant: 1.1 },
    contestant3: { f0: 160, speed: 12, wave: 'pulse', formant: 1.0 },
    contestant4: { f0: 240, speed: 12, wave: 'pulse', formant: 1.12 }
  };
  const FORMANTS = { a: [800, 1200], e: [400, 2300], i: [300, 2800], o: [450, 800], u: [325, 700], y: [300, 2600] };
  const PLOS = 'bdgkpqtc', FRIC = 'fhjsvxz', NAS = 'mnlrw';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  let noiseBuf = null, pulseWave = null, crusher = null, echoNode = null;
  const ctxOK = () => { const a = MT.game && MT.game.audio; return a && !MT.game.headless && a.ctx && !a.muted && a.ready !== false ? a : null; };
  function nodes(a) {
    const c = a.ctx;
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (!pulseWave) { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * .3); pulseWave = c.createPeriodicWave(re, im); }
    if (!crusher) { crusher = c.createWaveShaper(); const cv = new Float32Array(256); for (let i = 0; i < 256; i++) cv[i] = Math.round(((i / 128) - 1) * 4) / 4; crusher.curve = cv; crusher.connect(a.bus); }
    if (!echoNode) { const d = c.createDelay(1), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = .16; fb.gain.value = .35; wet.gain.value = .5; d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(a.bus); echoNode = d; }
  }
  // split text into words and syllables; return the plan with timings (used headless for durations too)
  function plan(text, v) {
    const words = String(text).split(/(\s+|[,.!?]+|\.\.\.)/).filter(w => w && w.trim() !== '' || /[,.!?]/.test(w));
    const out = []; let t = 0; const syl = 1 / v.speed;
    const ending = /\?\s*$/.test(text) ? 'q' : /!\s*$/.test(text) ? 'x' : 'd';
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      if (/^\.\.\.$/.test(w) || /\.\.\./.test(w)) { t += .3; continue; }
      if (/^[,]+$/.test(w)) { t += .08; continue; }
      if (/^[.!?]+$/.test(w)) { t += .16; continue; }
      const lw = w.toLowerCase().replace(/[^a-z0-9']/g, ''); if (!lw) continue;
      const groups = lw.match(/[^aeiouy]*[aeiouy]+/g) || [lw]; const n = Math.min(4, groups.length);
      const h = hash(lw), caps = w === w.toUpperCase() && /[A-Z]/.test(w) && w.length > 1;
      for (let k = 0; k < n; k++) {
        const gpart = groups[k], on = gpart.replace(/[aeiouy]+$/, ''), vow = (gpart.match(/[aeiouy]/) || ['a'])[0];
        const cls = !on ? null : PLOS.includes(on[0]) ? 'p' : FRIC.includes(on[0]) ? 'f' : NAS.includes(on[0]) ? 'n' : 'p';
        const jitter = 1 + (((h >> (k * 3)) & 15) / 15 - .5) * .08;
        const prog = (wi + k / n) / Math.max(1, words.length);
        let contour = 1 + Math.sin(prog * Math.PI) * .08;
        if (ending === 'q') contour *= 1 + prog * .25; else contour *= 1 - prog * .12;
        if (ending === 'x' && wi >= words.length - 3) contour *= 1.2;
        if (caps && k === 0 && ((h & 3) === 0)) contour *= 1.1;
        const len = syl * (.85 + ((h >> (k * 5)) & 7) / 20);
        out.push({ t, len, cls, vow, mul: contour * jitter });
        t += len;
      }
      t += syl * .25;
    }
    return { syll: out, dur: t + .1 };
  }
  function syllable(a, v, s, t0, vol, dest) {
    const c = a.ctx, t = t0 + s.t, f = v.f0 * s.mul * (v.bounce ? (1 + .15 * Math.sin(s.t * 20)) : 1);
    if (s.cls) {
      const src = c.createBufferSource(); src.buffer = noiseBuf; const bf = c.createBiquadFilter(), g = c.createGain();
      const d = s.cls === 'p' ? .015 : s.cls === 'f' ? .05 : .04;
      if (s.cls === 'n') { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * .9; const gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol * .5, t + .005); gn.gain.linearRampToValueAtTime(0, t + d); o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + d + .02); }
      else {
        bf.type = s.cls === 'p' ? 'bandpass' : 'highpass'; bf.frequency.value = s.cls === 'p' ? 3000 : 4000; bf.Q.value = 1;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * .6, t + .003); g.gain.linearRampToValueAtTime(0, t + d);
        src.connect(bf); bf.connect(g); g.connect(dest); src.start(t, Math.random() * .5); src.stop(t + d + .02);
      }
    }
    const vs = t + (s.cls ? .012 : 0), ve = vs + s.len * .82;
    const o = c.createOscillator();
    if (v.wave === 'pulse') o.setPeriodicWave(pulseWave); else o.type = v.wave;
    o.frequency.setValueAtTime(f, vs);
    if (v.swoop) o.frequency.linearRampToValueAtTime(f * (1 + (s.mul - 1) * v.swoop + .06), ve);
    else if (!v.robot) o.frequency.linearRampToValueAtTime(f * .97, ve);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = f * (v.robot ? 0 : .02); lfo.connect(lg); lg.connect(o.frequency); lfo.start(vs); lfo.stop(ve + .05);
    const g = c.createGain(); g.gain.setValueAtTime(0, vs); g.gain.linearRampToValueAtTime(vol, vs + .005); g.gain.setValueAtTime(vol, Math.max(vs + .006, ve - .03)); g.gain.linearRampToValueAtTime(0, ve);
    const fm = FORMANTS[s.vow] || FORMANTS.a;
    for (const fr of fm) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr * v.formant; bp.Q.value = 8; o.connect(bp); bp.connect(g); }
    const dry = c.createGain(); dry.gain.value = .25; o.connect(dry); dry.connect(g);
    g.connect(dest); o.start(vs); o.stop(ve + .05);
  }
  const api = {
    VOICES,
    duration(text, voice = 'lance') { return plan(text, VOICES[voice] || VOICES.lance).dur; },
    say(text, voice = 'lance', o = {}) {
      const v = Object.assign({}, VOICES[voice] || VOICES.lance); if (o.speed) v.speed *= o.speed;
      const p = plan(text, v), a = ctxOK();
      if (!a) return p.dur;
      try {
        nodes(a); const dest = v.robot ? crusher : a.bus, t0 = a.ctx.currentTime + .02, vol = (o.vol || .22);
        for (const s of p.syll) syllable(a, v, s, t0, vol, dest);
        if (v.echo) for (const s of p.syll) syllable(a, v, s, t0, vol * .5, echoNode);
        if (v.trill) { const last = p.syll[p.syll.length - 1]; if (last) for (let k = 0; k < 3; k++) syllable(a, v, { t: last.t + last.len + k * .05, len: .05, cls: null, vow: 'i', mul: 1.3 + k * .1 }, t0, vol * .6, dest); }
      } catch (e) { /* sound is best-effort */ }
      return p.dur;
    },
    // the crowd: cheer, ooh, laugh, applause, boo; intensity 0..1 scales voices and volume
    crowd(kind, intensity = .6) {
      const a = ctxOK(); if (!a) return; nodes(a);
      const c = a.ctx, t0 = c.currentTime + .01, n = Math.round(3 + intensity * 7), vol = .03 + intensity * .05, bus = a.bus;
      try {
        if (kind === 'applause') {
          const cnt = Math.round((8 + Math.random() * 6) * 1.5 * (.5 + intensity));
          for (let i = 0; i < cnt; i++) { const t = t0 + Math.random() * 1.5, src = c.createBufferSource(); src.buffer = noiseBuf; const bf = c.createBiquadFilter(), g = c.createGain(); bf.type = 'bandpass'; bf.frequency.value = 1200 + Math.random() * 1800; bf.Q.value = 1.4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 1.6, t + .002); g.gain.exponentialRampToValueAtTime(.0005, t + .05); src.connect(bf); bf.connect(g); g.connect(bus); src.start(t, Math.random() * .5); src.stop(t + .07); }
          return;
        }
        const shape = { cheer: ['o', 'a', 1.0, 1.25, .6], ooh: ['u', 'u', 1.1, .75, .7], laugh: ['a', 'a', 1, 1, .12], boo: ['u', 'o', .6, .9, .7], murmur: ['e', 'o', .9, .95, .2] }[kind] || ['a', 'a', 1, 1, .4];
        for (let i = 0; i < n; i++) {
          const v = { f0: 120 + Math.random() * 200, speed: 10, wave: Math.random() < .5 ? 'sawtooth' : 'triangle', formant: .9 + Math.random() * .3 };
          if (kind === 'laugh') { for (let k = 0; k < 5; k++) syllable(a, v, { t: Math.random() * .1 + k * .2, len: .1, cls: 'f', vow: 'a', mul: 1 - k * .04 }, t0, vol * .6, bus); }
          else syllable(a, v, { t: Math.random() * .2, len: shape[4] + Math.random() * .3, cls: null, vow: Math.random() < .5 ? shape[0] : shape[1], mul: shape[2] }, t0, vol * .7, bus);
        }
        if (kind === 'cheer') api.crowd('applause', intensity * .7);
      } catch (e) { /* best-effort */ }
    },
    _amb: 0,
    ambience(dt, level) {   // a quiet murmur under play: random soft syllables
      this._amb -= dt; if (this._amb > 0) return; this._amb = .45 + Math.random() * .6;
      if (level > 0) api.crowd('murmur', .1 + level * .2);
    }
  };
  return api;
})();
