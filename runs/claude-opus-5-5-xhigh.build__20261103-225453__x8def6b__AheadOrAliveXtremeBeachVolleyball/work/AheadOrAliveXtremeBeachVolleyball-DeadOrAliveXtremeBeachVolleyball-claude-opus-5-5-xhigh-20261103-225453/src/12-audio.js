/* 12-audio: every sound is made in code. Sound effects (audio.define), the music control (songs in 06-data-music.js),
 * ambience loops (waves, wind, crowd, pool, casino, crickets) and the Animalese voices: letter by letter on the voice bus,
 * driven by the dialog's per-letter hook (engine patch 3) or by voice.say() for barks. */
G.SFX = {
  // ball
  bump: [{ wave: 'sine', freq: 160, to: 90, dur: .1, vol: .42 }, { wave: 'noise', freq: 900, to: 300, dur: .05, vol: .16, filter: 'lowpass' }],
  set: [{ wave: 'sine', freq: 400, to: 320, dur: .06, vol: .3 }, { wave: 'noise', freq: 2400, dur: .03, vol: .08 }],
  spike: [{ wave: 'noise', freq: 3200, to: 900, dur: .09, vol: .4, filter: 'bandpass', q: .7 }, { wave: 'sine', freq: 120, to: 40, dur: .16, vol: .48 }],
  block: [{ wave: 'noise', freq: 1600, to: 500, dur: .07, vol: .36 }, { wave: 'noise', freq: 1300, to: 400, dur: .07, vol: .3, delay: .035 }, { wave: 'sine', freq: 180, to: 80, dur: .1, vol: .3 }],
  serveToss: { wave: 'noise', freq: 500, to: 1500, dur: .25, vol: .12, filter: 'bandpass', q: 2 },
  serveHit: [{ wave: 'noise', freq: 2200, to: 700, dur: .08, vol: .34 }, { wave: 'sine', freq: 200, to: 70, dur: .12, vol: .36 }],
  sand: { wave: 'noise', freq: 600, to: 150, dur: .22, vol: .3, filter: 'lowpass' },
  net: [{ wave: 'noise', freq: 2600, dur: .03, vol: .22 }, { wave: 'noise', freq: 2400, dur: .03, vol: .18, delay: .05 }, { wave: 'noise', freq: 2200, dur: .04, vol: .14, delay: .1 }],
  tape: [{ wave: 'triangle', freq: 1300, to: 900, dur: .12, vol: .2, vib: [24, .06] }, { wave: 'noise', freq: 3000, dur: .02, vol: .16 }],
  whistle: { wave: 'square', freq: 2200, dur: .34, vol: .1, vib: [32, .04] },
  // crowd and court
  crowdCheer: [{ wave: 'noise', freq: 700, to: 1400, dur: 1.4, vol: .2, filter: 'bandpass', q: .5, attack: .2 }, { wave: 'noise', freq: 2400, to: 3200, dur: 1.1, vol: .07, attack: .15 }],
  crowdGroan: { wave: 'noise', freq: 900, to: 300, dur: .9, vol: .16, filter: 'bandpass', q: .8, attack: .12 },
  ooh: [{ wave: 'triangle', freq: 330, to: 260, dur: .6, vol: .1, attack: .1 }, { wave: 'noise', freq: 600, to: 400, dur: .6, vol: .1, filter: 'bandpass', attack: .1 }],
  step_sand: { wave: 'noise', freq: 400, to: 200, dur: .05, vol: .05, filter: 'lowpass' },
  dive: [{ wave: 'noise', freq: 800, to: 200, dur: .35, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 50, dur: .15, vol: .3, delay: .1 }],
  high_five: [{ wave: 'noise', freq: 2400, to: 1200, dur: .05, vol: .35 }, { wave: 'sine', freq: 300, to: 200, dur: .05, vol: .2 }],
  glare: [{ wave: 'sine', freq: 1760, dur: .5, vol: .12, arp: [0, 7, 12, 19], step: .06 }, { wave: 'triangle', freq: 2637, dur: .4, vol: .08, delay: .1 }],
  seagull: [{ wave: 'sine', freq: 1800, to: 1300, dur: .18, vol: .05 }, { wave: 'sine', freq: 1900, to: 1200, dur: .22, vol: .05, delay: .22 }],
  // pool
  splash: [{ wave: 'noise', freq: 1800, to: 400, dur: .45, vol: .34, filter: 'bandpass', q: .6 }, { wave: 'sine', freq: 300, to: 90, dur: .2, vol: .2 }],
  hopLand: [{ wave: 'sine', freq: 520, to: 260, dur: .08, vol: .3 }, { wave: 'noise', freq: 1200, to: 500, dur: .06, vol: .12 }],
  // ui
  ui_tick: { wave: 'triangle', freq: 1400, dur: .03, vol: .09 },
  ui_select: [{ wave: 'square', freq: 880, dur: .05, vol: .08 }, { wave: 'square', freq: 1320, dur: .07, vol: .07, delay: .045 }],
  ui_back: { wave: 'triangle', freq: 700, to: 420, dur: .08, vol: .12 },
  ui_error: [{ wave: 'square', freq: 220, dur: .08, vol: .1 }, { wave: 'square', freq: 180, dur: .1, vol: .1, delay: .08 }],
  ui_tab: { wave: 'triangle', freq: 1100, to: 1500, dur: .05, vol: .1 },
  // casino
  cash: { wave: 'square', freq: 1320, dur: .3, vol: .08, arp: [0, 4, 7, 12, 16], step: .05 },
  chip: [{ wave: 'noise', freq: 4000, dur: .02, vol: .2 }, { wave: 'triangle', freq: 2800, dur: .03, vol: .08 }],
  card_deal: { wave: 'noise', freq: 3000, to: 1500, dur: .07, vol: .16, filter: 'highpass' },
  card_flip: [{ wave: 'noise', freq: 2400, dur: .03, vol: .16 }, { wave: 'noise', freq: 1600, dur: .03, vol: .1, delay: .04 }],
  reel_spin: { wave: 'square', freq: 660, dur: .025, vol: .05 },
  reel_stop: [{ wave: 'sine', freq: 140, to: 70, dur: .1, vol: .34 }, { wave: 'noise', freq: 900, dur: .04, vol: .14 }],
  wheel_spin: { wave: 'noise', freq: 1800, dur: .04, vol: .07 },
  ball_rattle: [{ wave: 'triangle', freq: 2600, dur: .02, vol: .1 }, { wave: 'triangle', freq: 2900, dur: .02, vol: .08, delay: .05 }, { wave: 'triangle', freq: 2400, dur: .02, vol: .06, delay: .11 }],
  // story and misc
  gift_unwrap: [{ wave: 'noise', freq: 3000, to: 1200, dur: .3, vol: .16 }, { wave: 'sine', freq: 1568, dur: .3, vol: .1, delay: .25, arp: [0, 4, 7], step: .07 }],
  heart_up: { wave: 'triangle', freq: 880, dur: .3, vol: .12, arp: [0, 4, 7, 12], step: .06 },
  heart_down: { wave: 'triangle', freq: 660, dur: .3, vol: .12, arp: [0, -3, -7], step: .08 },
  shutter: [{ wave: 'noise', freq: 4000, dur: .03, vol: .3 }, { wave: 'noise', freq: 2000, dur: .05, vol: .2, delay: .06 }],
  flash: { wave: 'sine', freq: 3000, to: 5000, dur: .15, vol: .05 },
  firework: [{ wave: 'noise', freq: 300, to: 60, dur: .6, vol: .4, filter: 'lowpass' }, { wave: 'noise', freq: 5000, to: 2000, dur: .7, vol: .08, delay: .1 }],
  door: [{ wave: 'noise', freq: 500, to: 300, dur: .2, vol: .14, filter: 'lowpass' }, { wave: 'sine', freq: 180, to: 140, dur: .1, vol: .14, delay: .15 }],
  coin: { wave: 'square', freq: 1760, dur: .12, vol: .07, arp: [0, 7], step: .05 },
  wave: { wave: 'noise', freq: 400, to: 900, dur: 3.2, vol: .07, filter: 'lowpass', q: .5, attack: 1.4 },
  wind: { wave: 'noise', freq: 300, to: 500, dur: 2.5, vol: .03, filter: 'bandpass', q: 1.5, attack: 1 },
  murmur: { wave: 'noise', freq: 500, to: 650, dur: 1.6, vol: .045, filter: 'bandpass', q: .6, attack: .5 },
  lap: { wave: 'noise', freq: 1000, to: 500, dur: .5, vol: .05, filter: 'bandpass', q: 1.2, attack: .1 },
  cricket: [{ wave: 'pulse12', freq: 4200, dur: .03, vol: .025 }, { wave: 'pulse12', freq: 4200, dur: .03, vol: .025, delay: .06 }, { wave: 'pulse12', freq: 4200, dur: .03, vol: .022, delay: .12 }],
  jingle: { wave: 'triangle', freq: 1568, dur: .25, vol: .03, arp: [0, 4, 7, 12], step: .04 },
  count: { wave: 'square', freq: 1046, dur: .03, vol: .05 },
  whoosh: { wave: 'noise', freq: 600, to: 2400, dur: .2, vol: .1, filter: 'bandpass', q: 1.5 },
  pop: { wave: 'sine', freq: 600, to: 1200, dur: .05, vol: .12 }
};
G.defineSounds = () => { const A = G.game.audio; for (const k in G.SFX) A.define(k, G.SFX[k]); };
G.sfx = (name, o) => { if (G.game && G.game.audio && !G.endedQuiet) G.game.audio.sfx(name, o); };

/* ---- music ---- */
G.musicNow = null;
G.music = (id, o = {}) => {
  if (!G.game || G.endedQuiet) return;
  if (id === G.musicNow && !o.restart) return;
  G.musicNow = id;
  const A = G.game.audio;
  if (!id) { A.music(null); return; }
  const song = G.SONGS[id]; if (!song) return;
  A.music(song, Object.assign({ fade: o.fade === undefined ? .6 : o.fade }, o.sync ? { sync: true } : {}));
};
G.sting = id => { if (!G.game || G.endedQuiet) return; const s = G.JINGLES[id]; if (s) G.game.audio.sting(s); };

/* ---- ambience loops: sounds fired on the cosmetic stream while a place is shown ---- */
G.amb = { kind: null, t: {} };
G.ambience = kind => { G.amb.kind = kind; G.amb.t = {}; };
const AMB = {
  beach: [['wave', 5.5, 7], ['wind', 7, 11], ['seagull', 9, 18]],
  court: [['wave', 5.5, 7], ['murmur', 1.3, 1.8], ['seagull', 10, 20]],
  pool: [['lap', 1.4, 2.6], ['wind', 8, 12], ['seagull', 12, 22]],
  promenade: [['wave', 6, 8], ['wind', 8, 12], ['murmur', 2.5, 4]],
  villa: [['wave', 7, 10]],
  night: [['cricket', .5, 1.4], ['wave', 6, 9]],
  casino: [['murmur', 1.2, 1.8], ['jingle', 2.5, 6]],
  map: [['wave', 6, 9], ['wind', 6, 10]]
};
G.tickAmbience = dt => {
  const L = AMB[G.amb.kind]; if (!L || !G.game.audio.ready) return;
  for (const [snd, a, b] of L) {
    const t = G.amb.t; t[snd] = (t[snd] === undefined ? G.rand('cosmetic', 0, a) : t[snd]) - dt;
    if (t[snd] <= 0) { G.sfx(snd, { vary: .12 }); t[snd] = G.rand('cosmetic', a, b); }
  }
};

/* ---- Animalese voices ----
 * profile: { base Hz, range semitones, rate letters/s, formant shift, wave, breath 0..1, vib Hz }
 * vowels a 70 ms voiced tone through two bandpass formants; plosives a noise burst then a schwa; fricatives high-passed
 * noise; nasals and liquids a soft triangle; the pitch walks gently, seeded by the line, so a line always sounds the same */
const FORM = { a: [800, 1200], e: [450, 1900], i: [300, 2300], o: [500, 900], u: [350, 750], y: [300, 2300], schwa: [500, 1500] };
const PLOS = 'bdgkpt', FRIC = 'fhszcxq', NAS = 'lmnrwjv';
G.voice = {
  _st: null,
  /** the voice of one letter (from the dialog's per-letter hook): ch, its index in the page text, the text */
  letter(who, ch, i, text, mood) {
    const A = G.game.audio, bus = A.bus && A.bus('voice'); if (!bus || !A.ready || A.muted) return;
    const P = G.voiceOf(who); if (!P) return;
    const st = this._st && this._st.text === text && this._st.who === who && i >= this._st.i ? this._st : (this._st = { text, who, i: 0, n: 0, r: E.rng(G.hashStr(text + who)) });
    while (st.i < i) { st.n = clamp(st.n + (st.r() - .5) * .9, -1, 1); st.i++; }
    st.n = clamp(st.n + (st.r() - .5) * .9, -1, 1); st.i = i + 1;
    let semi = P.range * st.n;
    const end = text.slice(i).match(/^[^.!?]*([.!?])/), last4 = end && end[0].length <= 5;
    const m = mood || (/!/.test(text) ? 'excited' : null);
    if (end && end[1] === '?' && last4) semi += 4 - end[0].length;      // questions rise at the end
    if (m === 'excited' || m === 'happy') semi += m === 'happy' ? 2 : 3;
    if (m === 'sad') semi -= 2; if (m === 'angry') semi -= 1;
    this._sound(P, ch.toLowerCase(), P.base * Math.pow(2, semi / 12), A.ctx.currentTime + .005, bus, m);
  },
  _sound(P, c, f, t, bus, mood) {
    const A = G.game.audio, ctx = A.ctx;
    const out = ctx.createGain(); out.connect(bus);
    const wave = mood === 'angry' ? 'pulse' : P.wave;
    const osc = (freq, dur, vol, type) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      if (type === 'pulse') o.setPeriodicWave(A._pulse(.25)); else o.type = type === 'saw' ? 'sawtooth' : type || 'triangle';
      o.frequency.setValueAtTime(f, t); if (P.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = P.vib; lg.gain.value = f * .03; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .02); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.setValueAtTime(vol, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g); o.start(t); o.stop(t + dur + .02); return g;
    };
    const noise = (dur, vol, type, freq, at = t) => {
      const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = A._noise; fl.type = type; fl.frequency.value = freq; fl.Q.value = .8;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .004); g.gain.linearRampToValueAtTime(0, at + dur);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(at, G.rand('cosmetic', 0, .5)); s.stop(at + dur + .02);
    };
    const formant = (src, [f1, f2]) => {
      for (const [ff, gain] of [[f1, 1], [f2, .55]]) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff * P.formant; b.Q.value = 6; const g = ctx.createGain(); g.gain.value = gain * 2.6; src.connect(b); b.connect(g); g.connect(out); }
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; const g2 = ctx.createGain(); g2.gain.value = .35; src.connect(lp); lp.connect(g2); g2.connect(out);
    };
    if (FORM[c]) formant(osc(f, .07, .22, wave), FORM[c]);
    else if (PLOS.includes(c)) { noise(.012, .12, 'bandpass', 2500); const s = osc(f, .04, .18, wave); formant(s, FORM.schwa); }
    else if (FRIC.includes(c)) noise(.045, .07, 'highpass', 3500);
    else if (NAS.includes(c)) { const s = osc(f, .05, .16, 'triangle'), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; s.connect(lp); lp.connect(out); }
    if (P.breath && FORM[c]) noise(.05, .025 * P.breath, 'highpass', 5000);
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, 600);
  },
  /** a bark with no box: "MINE!", cheers, laughs, gasps; letters at the speaker's rate */
  say(text, who, mood) {
    const A = G.game.audio, bus = A.bus && A.bus('voice'); if (!bus || !A.ready || A.muted) return;
    const P = G.voiceOf(who); if (!P) return;
    let t = A.ctx.currentTime + .01; const r = E.rng(G.hashStr(text + who)); let n = 0;
    const rate = P.rate * (/!/.test(text) ? 1.15 : 1) * (mood === 'angry' ? 1.2 : mood === 'sad' ? .8 : 1);
    for (let i = 0; i < text.length && i < 40; i++) {
      const c = text[i].toLowerCase();
      if (c === ',') { t += .12; continue; } if (c === '.' || c === '!' || c === '?') { t += .1; continue; } if (!/[a-z]/.test(c)) { t += .03; continue; }
      n = clamp(n + (r() - .5) * .9, -1, 1);
      let semi = P.range * n + (/!/.test(text) ? 3 : 0) + (mood === 'happy' ? 2 : mood === 'sad' ? -2 : 0);
      if (/^ha/i.test(text)) semi += i * .8;   // a laugh rises
      this._sound(P, c, P.base * Math.pow(2, semi / 12), t, bus, mood);
      t += 1 / rate;
    }
  }
};
/** a dialog voice function for a speaker (the engine calls it for every letter typed) */
G.voiceFn = (who, mood) => (ch, i, text) => { if (/[a-z]/i.test(ch)) G.voice.letter(who, ch, i, text, mood); };
