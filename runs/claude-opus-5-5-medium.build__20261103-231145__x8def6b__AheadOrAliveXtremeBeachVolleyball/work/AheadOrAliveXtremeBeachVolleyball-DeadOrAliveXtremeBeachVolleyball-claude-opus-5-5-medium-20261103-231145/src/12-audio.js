/* 12-audio: sound effects, music control, ambience and the Animalese voice synth. Everything is made in code. */
G.SFX = {
  // ball
  bump: [{ wave: 'sine', freq: 160, to: 90, dur: .09, vol: .35 }, { wave: 'noise', freq: 700, to: 300, dur: .05, vol: .12, filter: 'lowpass' }],
  set: [{ wave: 'sine', freq: 400, to: 300, dur: .05, vol: .25 }, { wave: 'noise', freq: 2000, dur: .03, vol: .06 }],
  spike: [{ wave: 'noise', freq: 2400, to: 500, dur: .12, vol: .32 }, { wave: 'sine', freq: 120, to: 40, dur: .16, vol: .4 }],
  block: [{ wave: 'noise', freq: 1600, to: 600, dur: .08, vol: .3 }, { wave: 'noise', freq: 1200, to: 500, dur: .08, vol: .25, delay: .04 }, { wave: 'sine', freq: 140, to: 60, dur: .1, vol: .3 }],
  serveToss: { wave: 'noise', freq: 600, to: 1800, dur: .25, vol: .1 },
  serveHit: [{ wave: 'noise', freq: 1800, to: 400, dur: .09, vol: .28 }, { wave: 'sine', freq: 150, to: 60, dur: .12, vol: .35 }],
  sand: { wave: 'noise', freq: 600, to: 150, dur: .22, vol: .3, filter: 'lowpass' },
  net: [{ wave: 'noise', freq: 3000, dur: .03, vol: .15 }, { wave: 'noise', freq: 2600, dur: .03, vol: .12, delay: .05 }, { wave: 'noise', freq: 2200, dur: .04, vol: .1, delay: .1 }],
  tape: [{ wave: 'triangle', freq: 900, to: 700, dur: .08, vol: .2 }, { wave: 'triangle', freq: 700, to: 760, dur: .15, vol: .1, vib: [20, .05], delay: .05 }],
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .35, vol: .12 },
  // crowd and court
  crowdCheer: { wave: 'noise', freq: 700, to: 1100, dur: 1.4, vol: .2, filter: 'lowpass' },
  crowdGroan: { wave: 'noise', freq: 900, to: 300, dur: .9, vol: .14, filter: 'lowpass' },
  ooh: { wave: 'noise', freq: 500, to: 800, dur: .6, vol: .1, filter: 'bandpass', q: 3 },
  step_sand: { wave: 'noise', freq: 400, to: 200, dur: .05, vol: .05, filter: 'lowpass' },
  dive: { wave: 'noise', freq: 500, to: 150, dur: .35, vol: .22, filter: 'lowpass' },
  high_five: [{ wave: 'noise', freq: 2600, to: 1400, dur: .06, vol: .3 }, { wave: 'sine', freq: 300, to: 200, dur: .05, vol: .15 }],
  glare: [{ wave: 'bell', freq: 'E7', dur: .5, vol: .1, decay: .4 }, { wave: 'bell', freq: 'B7', dur: .5, vol: .08, decay: .4, delay: .08 }],
  seagull: [{ wave: 'sine', freq: 1500, to: 2200, dur: .15, vol: .05 }, { wave: 'sine', freq: 2100, to: 1300, dur: .2, vol: .05, delay: .16 }],
  wave_swell: { wave: 'noise', freq: 300, to: 900, dur: 2.6, vol: .08, filter: 'lowpass', attack: 1.2, hold: true },
  cricket: [{ wave: 'pulse', freq: 4200, dur: .03, vol: .02 }, { wave: 'pulse', freq: 4200, dur: .03, vol: .02, delay: .06 }, { wave: 'pulse', freq: 4200, dur: .03, vol: .02, delay: .12 }],
  murmur: { wave: 'noise', freq: 500, to: 650, dur: 2.5, vol: .05, filter: 'bandpass', q: 1.5, attack: 1, hold: true },
  // pool
  splash: [{ wave: 'noise', freq: 1500, to: 300, dur: .4, vol: .3 }, { wave: 'sine', freq: 300, to: 80, dur: .2, vol: .2 }],
  hopLand: { wave: 'sine', freq: 300, to: 140, dur: .08, vol: .3 },
  // ui
  ui_tick: { wave: 'triangle', freq: 1200, dur: .03, vol: .1 },
  ui_select: [{ wave: 'triangle', freq: 880, dur: .05, vol: .14 }, { wave: 'triangle', freq: 1320, dur: .07, vol: .12, delay: .05 }],
  ui_back: { wave: 'triangle', freq: 660, to: 440, dur: .08, vol: .12 },
  ui_error: { wave: 'square', freq: 180, dur: .12, vol: .1 },
  ui_tab: { wave: 'triangle', freq: 990, dur: .04, vol: .1 },
  // casino
  cash: { wave: 'square', freq: 'C6', arp: [0, 4, 7, 12], step: .05, dur: .25, vol: .08 },
  chip: { wave: 'noise', freq: 4000, dur: .03, vol: .15 },
  card_deal: { wave: 'noise', freq: 3000, to: 1500, dur: .07, vol: .12 },
  card_flip: { wave: 'noise', freq: 2000, to: 3500, dur: .05, vol: .12 },
  reel_spin: { wave: 'pulse', freq: 600, dur: .02, vol: .05 },
  reel_stop: [{ wave: 'sine', freq: 200, to: 90, dur: .08, vol: .3 }, { wave: 'noise', freq: 1500, dur: .03, vol: .1 }],
  wheel_spin: { wave: 'noise', freq: 900, dur: .05, vol: .06 },
  ball_rattle: { wave: 'triangle', freq: 2400, to: 1800, dur: .03, vol: .1 },
  // story and misc
  gift_unwrap: [{ wave: 'noise', freq: 3000, to: 1200, dur: .25, vol: .15 }, { wave: 'bell', freq: 'G6', dur: .4, vol: .08, decay: .35, delay: .2 }],
  heart_up: { wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .12 },
  heart_down: { wave: 'triangle', freq: 'C5', arp: [7, 3, 0, -5], step: .07, dur: .3, vol: .1 },
  shutter: [{ wave: 'noise', freq: 4000, dur: .03, vol: .2 }, { wave: 'noise', freq: 3000, dur: .04, vol: .15, delay: .06 }],
  flash: { wave: 'sine', freq: 3000, to: 5000, dur: .15, vol: .05 },
  firework: [{ wave: 'noise', freq: 300, to: 60, dur: .5, vol: .3, filter: 'lowpass' }, { wave: 'noise', freq: 5000, dur: .4, vol: .08, delay: .15 }],
  door: [{ wave: 'noise', freq: 400, to: 200, dur: .15, vol: .15 }, { wave: 'sine', freq: 120, dur: .08, vol: .15, delay: .12 }],
  coin: { wave: 'square', freq: 'B5', arp: [0, 5], step: .07, dur: .15, vol: .08 },
  slip: [{ wave: 'sine', freq: 600, to: 200, dur: .25, vol: .2 }],
  swim: { wave: 'noise', freq: 800, to: 500, dur: .3, vol: .08 }
};
G.initAudio = game => {
  const A = game.audio;
  for (const k in G.INSTRUMENTS) { const ins = G.INSTRUMENTS[k]; ins.real = ins.imag.map(() => 0); }
  A.instruments = G.INSTRUMENTS;
  for (const k in G.SFX) A.define(k, G.SFX[k]);
};
G.sfx = (name, o) => { const g = G.game; if (g && !G.muteAll) g.audio.sfx(name, o); };
G.music = (name, o = {}) => {
  const g = G.game; if (!g || G.muteAll) return;
  const A = g.audio, song = name ? G.SONGS[name] : null;
  if (G.curSong === name && A.song) return;
  G.curSong = name;
  if (!song) { A.music(null); return; }
  A.music(song, Object.assign({ fade: .6 }, o));
};
G.sting = name => { const g = G.game; if (g && !G.muteAll && G.JINGLES[name]) g.audio.sting(G.JINGLES[name], { duck: .4 }); };

/* ---- ambience: loops of shaped noise per place, retriggered as they end ---- */
G.ambience = { kind: null, t: 0, next: 0,
  set(kind) { this.kind = kind; this.next = 0; },
  update(dt) {
    if (!this.kind || G.muteAll) return; this.t += dt; if (this.t < this.next) return;
    const k = this.kind, rnd = () => G.rng('cosmetic');
    if (k === 'beach') { G.sfx('wave_swell', { vol: .9 }); if (rnd() < .3) G.game.after(.8, () => G.sfx('seagull')); this.next = this.t + 5 + rnd() * 2; }
    else if (k === 'pool') { G.sfx('wave_swell', { vol: .5, pitch: 1.6 }); this.next = this.t + 3 + rnd() * 2; }
    else if (k === 'casino') { G.sfx('murmur'); if (rnd() < .4) G.sfx('coin', { vol: .4 }); this.next = this.t + 2.2; }
    else if (k === 'night') { G.sfx('cricket'); if (rnd() < .4) G.sfx('wave_swell', { vol: .4 }); this.next = this.t + 1.2 + rnd() * 1.5; }
    else if (k === 'crowd') { G.sfx('murmur', { vol: 1.4 }); G.sfx('wave_swell', { vol: .5 }); this.next = this.t + 2.3; }
  } };

/* ---- Animalese voices: each letter a short voiced or noisy blip on the voice bus, pitched by a gentle random walk
 * seeded by the line, so a line always sounds the same. Profile: { base Hz, range semitones, rate, formant, wave } ---- */
const FORMANTS = { a: [800, 1200], e: [450, 1900], i: [300, 2300], o: [500, 900], u: [350, 750], y: [300, 2300] };
G.voice = {
  _ctx() { const A = G.game && G.game.audio; if (!A || G.muteAll || A.muted || !A.ctx || A.ctx.state !== 'running') return null; return A; },
  /** one letter at time t (audio clock): returns its length in seconds */
  letter(A, ch, prof, n, t, mood) {
    const c = A.ctx, bus = A.bus('voice'); if (!bus) return 0;
    const l = ch.toLowerCase(), f = prof.formant || 1;
    if (l === ',') return .12; if (l === '.' || l === '!' || l === '?') return .2; if (!/[a-z]/.test(l)) return .03;
    const shift = (mood === 'happy' ? 2 : mood === 'sad' ? -2 : mood === 'angry' ? -1 : 0) + (prof.sing ? Math.sin(n * .7) * 2 : 0);
    const p = prof.base * Math.pow(2, (prof.range * n + shift) / 12);
    const out = c.createGain(); out.connect(bus);
    const env = (dur, vol) => { out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + .008); out.gain.exponentialRampToValueAtTime(.001, t + dur); };
    const osc = (freq, type, dur) => { const o = c.createOscillator(); o.type = type === 'saw' ? 'sawtooth' : type === 'pulse' ? 'square' : type; o.frequency.setValueAtTime(freq, t); o.frequency.linearRampToValueAtTime(freq * (mood === 'sad' ? .94 : 1.03), t + dur); if (prof.vib) { const lf = c.createOscillator(), lg = c.createGain(); lf.frequency.value = prof.vib; lg.gain.value = freq * .03; lf.connect(lg); lg.connect(o.frequency); lf.start(t); lf.stop(t + dur + .02); } o.start(t); o.stop(t + dur + .02); return o; };
    const noise = (dur) => { const s = c.createBufferSource(); s.buffer = A._noise; s.start(t, (n * .137) % .5); s.stop(t + dur + .02); return s; };
    const band = (src, fr) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr * f; b.Q.value = 6; src.connect(b); b.connect(out); };
    if ('aeiouy'.includes(l)) { const o = osc(p, prof.wave, .07); const [f1, f2] = FORMANTS[l]; band(o, f1); band(o, f2); const dry = c.createGain(); dry.gain.value = .25; o.connect(dry); dry.connect(out); env(.08, .5); return .075 / ((prof.rate || 14) / 14); }
    if ('bdgkpt'.includes(l)) { const s = noise(.012); const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 1500; s.connect(h); h.connect(out); const o = osc(p, prof.wave, .045); band(o, 500); band(o, 1500); env(.055, .35); return .055 / ((prof.rate || 14) / 14); }
    if ('fhszcxq'.includes(l)) { const s = noise(.045); const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 3500; s.connect(h); h.connect(out); env(.05, .12); return .045 / ((prof.rate || 14) / 14); }
    { const o = osc(p, 'triangle', .05); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.connect(lp); lp.connect(out); env(.055, .35); return .05 / ((prof.rate || 14) / 14); }
  },
  /** the pitch walk for a line */
  walk(text, prof) { const r = E.rng(G.hash(text)); const out = []; let n = 0; for (let i = 0; i < text.length; i++) { n = clamp(n + (r() - .5) * .5, -1, 1); out.push(n); } const q = text.trim().endsWith('?'), ex = text.trim().endsWith('!'); if (q || prof.rise) for (let i = Math.max(0, out.length - 4); i < out.length; i++) out[i] += (i - out.length + 5) * .35; if (ex) for (let i = 0; i < out.length; i++) out[i] += .3; return out; },
  /** the dialog's per-letter hook (engine patch 3): a voice function for a speaker */
  hook(who, mood) {
    const prof = (G.CAST[who] && G.CAST[who].voice) || { base: 260, range: 4, rate: 14, formant: 1, wave: 'triangle' };
    let line = null, walk = null;
    return (ch, i, text) => {
      const A = this._ctx(); if (!A) return;
      if (line !== text) { line = text; walk = this.walk(text, prof); }
      if (i % 2) return;   // every other letter keeps it from turning into a buzz at typing speed
      try { this.letter(A, ch, prof, walk[i] || 0, A.ctx.currentTime + .005, mood); } catch (e) { /* audio closed */ }
    };
  },
  /** a bark without a box: calls, cheers, laughs */
  say(text, who, mood) {
    const A = this._ctx(); if (!A) return;
    const prof = (G.CAST[who] && G.CAST[who].voice) || { base: 260, range: 4, rate: 14, wave: 'triangle' }, w = this.walk(text, prof);
    let t = A.ctx.currentTime + .01;
    try { for (let i = 0; i < text.length; i += 1) t += this.letter(A, text[i], prof, w[i] || 0, t, mood || (text.endsWith('!') ? 'happy' : null)) * 1.1; } catch (e) { /* audio closed */ }
  }
};
