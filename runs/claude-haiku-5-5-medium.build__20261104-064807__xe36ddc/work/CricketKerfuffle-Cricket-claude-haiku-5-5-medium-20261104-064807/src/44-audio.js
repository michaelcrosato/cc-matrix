/* ---- AUDIO: every sound is written in code. The effects are the engine's chip voices; the commentary and the players'
 * shouts are Animalese-style gibberish (formant syllables on the engine's audio context); the crowd is noise through
 * band-pass filters. Nothing loads from a file. ---- */
G.defineSounds = () => {
  const A = G.game.audio;
  const defs = {
    bat: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35, filter: 'bandpass' }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .4 }, { wave: 'triangle', freq: 1240, dur: .05, vol: .15 }],
    batHigh: [{ wave: 'noise', freq: 2000, to: 800, dur: .05, vol: .3, filter: 'bandpass' }, { wave: 'sine', freq: 520, to: 340, dur: .11, vol: .35 }, { wave: 'triangle', freq: 980, dur: .06, vol: .12 }],
    ring: { wave: 'sine', freq: 880, to: 1320, dur: .12, vol: .2 },
    pitch: { wave: 'sine', freq: 140, to: 80, dur: .06, vol: .3 },
    edge: [{ wave: 'noise', freq: 5200, dur: .02, vol: .25, filter: 'highpass' }, { wave: 'triangle', freq: 1800, dur: .02, vol: .15 }],
    stumps: [{ wave: 'triangle', freq: 700, dur: .05, vol: .3 }, { wave: 'triangle', freq: 540, dur: .05, vol: .3 }, { wave: 'noise', freq: 900, dur: .06, vol: .2 }],
    catch: { wave: 'triangle', freq: 900, to: 600, dur: .08, vol: .25 },
    gloves: { wave: 'noise', freq: 300, dur: .05, vol: .2, filter: 'lowpass' },
    throw: { wave: 'noise', freq: 1200, to: 300, dur: .25, vol: .15 },
    run: { wave: 'triangle', freq: 300, dur: .03, vol: .08 },
    select: { wave: 'square', freq: 660, dur: .03, vol: .08 },
    four: [{ wave: 'triangle', freq: 523, dur: .1, vol: .25 }, { wave: 'triangle', freq: 659, dur: .1, vol: .25 }, { wave: 'triangle', freq: 784, dur: .18, vol: .25 }],
    six: [{ wave: 'square', freq: 523, dur: .1, vol: .18 }, { wave: 'square', freq: 784, dur: .1, vol: .18 }, { wave: 'square', freq: 1047, dur: .3, vol: .2 }],
    hype: { wave: 'square', freq: 440, to: 880, dur: .3, vol: .18 },
    fire: { wave: 'saw', freq: 220, to: 660, dur: .5, vol: .15, vib: [6, .05] },
    special: { wave: 'square', freq: 330, to: 990, dur: .4, vol: .2, vib: [10, .04] },
    glass: { wave: 'noise', freq: 4000, dur: .25, vol: .25, filter: 'highpass' },
    coin: { wave: 'square', freq: 988, to: 1976, dur: .12, vol: .15 },
    rain: { wave: 'noise', freq: 2200, dur: .6, vol: .12, filter: 'highpass' }
  };
  for (const [k, v] of Object.entries(defs)) A.define(k, v);
};
// the songs: the match's bouncy cricket theme, and the title's brass march (the engine's note notation)
G.SONG_TITLE = { bpm: 120, steps: 4, tracks: [
  { wave: 'square', vol: .08, notes: 'Bb4 . D5 F5 . D5 Bb4 . | G4 . Bb4 D5 . Bb4 G4 . | F4 . A4 C5 . A4 F4 . | G4 . F4 - - . . .' },
  { wave: 'triangle', vol: .25, notes: 'Bb2 . F2 . Bb2 . F2 . | Eb2 . Bb2 . Eb2 . Bb2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 .' },
  { wave: 'drums', vol: .12, notes: 'k . s . k . s s | k . s . k s s .' }] };
G.SONG_MATCH = { bpm: 140, steps: 4, tracks: [
  { wave: 'square', vol: .06, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' },
  { wave: 'triangle', vol: .28, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' },
  { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };
G.SONG_TEA = { bpm: 96, steps: 3, tracks: [
  { wave: 'pulse12', vol: .07, notes: 'G5 - E5 . C5 - . | A4 - F4 . D4 - . | G4 - C5 . E5 - .' },
  { wave: 'triangle', vol: .2, notes: 'C3 . . G2 . . | F2 . . C3 . . | G2 . . D3 . .' }] };

/* the voice: formant syllables. Each syllable is a saw through two band-pass filters set to its vowel, with a short
 * attack and release. Pitch falls across a phrase, rises for a question and jumps for shouts. */
G.VOICES = {
  aubrey: { base: 105, speed: 1.25, vib: 5, glide: 0 },
  dazza: { base: 135, speed: 0.85, vib: 0, glide: 0 },
  priya: { base: 210, speed: 0.9, vib: 0, glide: 0 },
  edie: { base: 240, speed: 0.9, vib: 0, glide: 0 },
  basil: { base: 120, speed: 1, vib: 7, glide: 0 },
  mrs: { base: 220, speed: 1, vib: 0, glide: 0 },
  thrumpton: { base: 160, speed: 1, vib: 0, glide: .2 },
  players: { base: 170, speed: 1, vib: 0, glide: 0 }
};
G.FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700] };
G.voice = {
  ctx: null,
  bus: null,
  busyUntil: 0,
  open() {
    const a = G.game.audio;
    if (!a || !a.ctx) return null;
    if (!this.bus) {
      this.bus = a.ctx.createGain();
      this.bus.gain.value = 0.35;
      const comp = a.ctx.createDynamicsCompressor ? a.ctx.createDynamicsCompressor() : null;
      if (comp) { this.bus.connect(comp); comp.connect(a.ctx.destination); } else this.bus.connect(a.ctx.destination);
    }
    return a.ctx;
  },
  // the syllables of a text: vowel groups, each with its consonant onset
  syllables(text) {
    const s = String(text).toLowerCase().replace(/[^a-z!?.,' ]/g, ' ');
    const out = [];
    const re = /([bcdfghjklmnpqrstvwxyz]*)([aeiouy]+)/g;
    let m, last = 0;
    while ((m = re.exec(s))) {
      const gap = s.slice(last, m.index);
      out.push({ onset: (m[1] || '').replace(/^\s+/, ''), vowel: m[2][0] === 'y' ? 'i' : m[2][0], pause: /[.,!?]/.test(gap) ? 'long' : /\s/.test(gap) ? 'space' : '' });
      last = m.index + m[0].length;
    }
    if (!out.length) out.push({ onset: '', vowel: 'a', pause: '' });
    const end = s.slice(last);
    out[out.length - 1].tail = /!/.test(end) ? '!' : /\?/.test(end) ? '?' : '';
    if (/!/.test(s)) out[out.length - 1].tail = '!';
    if (/\?/.test(s)) out[out.length - 1].tail = '?';
    return out;
  },
  say(text, who) {
    if (G.setting('voices') === 'Off') return;
    const ctx = this.open();
    if (!ctx) return;
    const P = G.VOICES[who] || G.VOICES.players;
    const now = ctx.currentTime;
    const start = Math.max(now + 0.02, this.busyUntil);
    if (start > now + 2.5) return;          // at most a couple of seconds queued: the rest are skipped
    const syl = this.syllables(text);
    let t = start, n = syl.length;
    syl.forEach((sy, i) => {
      const dur = (0.075 + Math.random() * 0.03) / P.speed;
      const decl = 1 - 0.12 * (i / Math.max(1, n - 1));
      let pitch = P.base * decl * (1 + (Math.random() - 0.5) * 0.08);
      if (sy.tail === '?' && i === n - 1) pitch *= 1.25;
      if (sy.tail === '!') pitch *= 1.3;
      if (sy.tail === '!' && i === n - 1) pitch *= 1.1;
      if (sy.pause === 'long') t += 0.12; else if (sy.pause === 'space') t += 0.03;
      this.syllable(ctx, t, dur, pitch, sy, P, sy.tail === '!' ? 0.9 : 0.7);
      t += dur * 1.05;
    });
    this.busyUntil = t;
  },
  syllable(ctx, t, dur, pitch, sy, P, vol) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, t);
    if (P.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = P.vib; lg.gain.value = pitch * 0.03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const [f1, f2] = G.FORMANTS[sy.vowel] || G.FORMANTS.a;
    const b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter();
    b1.type = 'bandpass'; b1.frequency.value = f1; b1.Q.value = 6;
    b2.type = 'bandpass'; b2.frequency.value = f2; b2.Q.value = 6;
    const sum = ctx.createGain(); sum.gain.value = 0.6;
    osc.connect(b1); osc.connect(b2); b1.connect(sum); b2.connect(sum);
    sum.connect(g); g.connect(this.bus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.008);
    g.gain.setValueAtTime(vol * 0.5, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    osc.start(t); osc.stop(t + dur + 0.05);
    if (sy.onset && /^[ptkcbdgfsxhz]/.test(sy.onset)) {
      // a short burst for a plosive or a fricative onset
      const nz = ctx.createBufferSource(), buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      nz.buffer = buf; const ng = ctx.createGain(); ng.gain.value = 0.12; nz.connect(ng); ng.connect(this.bus); nz.start(t);
    }
  }
};
// the crowd: a roar is a noise through three band-pass filters that rises and falls; the bed murmurs under play
G.roar = (level = 1, seconds = 1.6) => {
  const ctx = G.voice.open();
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); const t = ctx.currentTime;
  const k = clamp(level, 0, 1) * 0.12;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(k, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  for (const f of [400, 900, 1800]) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 2; src.connect(b); b.connect(g); }
  g.connect(G.voice.bus);
  src.start(t); src.stop(t + seconds);
};
G.crowdRoarFor = n => G.roar(clamp(n / 6, 0.2, 1), 1.2 + n * 0.1);
