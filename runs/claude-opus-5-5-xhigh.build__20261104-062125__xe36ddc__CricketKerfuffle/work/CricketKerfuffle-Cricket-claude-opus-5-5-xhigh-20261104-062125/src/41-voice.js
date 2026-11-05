/* ---- GIBBERISH VOICES (Animalese / Simlish style). voice.say(text, profile) turns text into syllables (vowel groups
 * with consonant onsets); each syllable is one source (a saw for the voiced part, a noise burst for plosive and
 * fricative onsets) through two bandpass formant filters set to its vowel (a 800/1200, e 500/1900, i 300/2300, o
 * 500/900, u 350/700 Hz), with a short gain envelope. Pitch: the speaker's base, a little jitter, falling across the
 * phrase, rising at '?', louder and higher for '!' and CAPS. Routed through audio.bus('voice') (engine change 3), at
 * most two voices at once, behind a compressor. ---- */
const VOICES = {
  aubrey: { base: 105, speed: 1.25, vib: 5 }, dazza: { base: 135, speed: .85 }, priya: { base: 210, speed: .9 }, edie: { base: 240, speed: .9 }, basil: { base: 120, trem: 7 },
  dev: { base: 170 }, pip: { base: 290, speed: .75 }, crumb: { base: 220, q: 3 }, hollis: { base: 150 }, thrumpton: { base: 160, fmul: 1.2 }, ghost: { base: 180, whisper: true },
  machine: { base: 90, ring: 30 }, spinaldo: { base: 160, vib: 4 }, shazza: { base: 230, speed: .85 }, gaz: { base: 140 }, peregrine: { base: 180 }, fortescue: { base: 110, speed: 1.2 }, araminta: { base: 250 }, zsazsa: { base: 260 }, crowd: { base: 200 }
};
const FORMANT = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700], y: [300, 2300] };
const Voice = {
  active: 0, comp: null,
  /** text -> syllables: { v (vowel), plosive, caps, end ('?' | '!' | '.' | null), gap } (tests read this) */
  syllables(text) {
    const out = [], words = String(text).replace(/\{[^}]*\}/g, '').split(/(\s+)/);
    for (const w of words) {
      if (!w.trim()) continue;
      const caps = w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w), end = /[?]$/.test(w) ? '?' : /!$/.test(w) ? '!' : /[.,;:]$/.test(w) ? '.' : null;
      const groups = w.toLowerCase().match(/[^aeiouy]*[aeiouy]+/g) || [w.toLowerCase()];
      groups.forEach((gp, i) => { const v = (gp.match(/[aeiouy]/) || ['a'])[0], c = gp[0]; out.push({ v, plosive: /[pbtdkgcq]/.test(c), fric: /[sfzxh]/.test(c), caps, end: i === groups.length - 1 ? end : null, gap: i === groups.length - 1 }); });
    }
    return out;
  },
  /** pitches for a phrase (tests check the rise at '?' and the fall across it) */
  pitches(syl, prof) {
    const base = (prof && prof.base) || 160, n = syl.length;
    return syl.map((s, i) => { let p = base * (1 - .12 * i / Math.max(1, n - 1)); if (s.caps || s.end === '!') p *= 1.3; if (s.end === '?') p *= 1.25; return p; });
  },
  say(text, who, o = {}) {
    if (!K.game || !K.settings('voices')) return 0;
    const A = K.game.audio, bus = A.bus && A.bus('voice'), c = A.ctx; if (!bus || !c || this.active >= 2) return 0;
    const prof = VOICES[who] || VOICES.crowd, syl = this.syllables(text).slice(0, 40), P = this.pitches(syl, prof), sp = (prof.speed || 1);
    try {
      if (!this.comp) { this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -18; this.comp.ratio.value = 6; this.comp.connect(bus); }
      let t = c.currentTime + .02; this.active++;
      syl.forEach((s, i) => {
        const len = (.055 + RNG.cosmetic() * .055) * sp, jit = 1 + (RNG.cosmetic() - .5) * .08, f = P[i] * jit, fm = prof.fmul || 1, vol = (s.caps || s.end === '!' ? .5 : .32) * (o.vol || 1);
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.setValueAtTime(vol, t + len); g.gain.linearRampToValueAtTime(0, t + len + .03);
        const F = FORMANT[s.v] || FORMANT.a, b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.frequency.value = F[0] * fm; b2.frequency.value = F[1] * fm; b1.Q.value = b2.Q.value = prof.q || 6;
        const src = prof.whisper ? (() => { const n = c.createBufferSource(); n.buffer = K.game.audio._noise; return n; })() : c.createOscillator();
        if (!prof.whisper) { src.type = 'sawtooth'; src.frequency.setValueAtTime(f, t); src.frequency.linearRampToValueAtTime(f * (s.end === '?' ? 1.2 : .96), t + len); if (prof.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = prof.vib; lg.gain.value = f * .03; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + len + .05); } }
        src.connect(b1); src.connect(b2); b1.connect(g); b2.connect(g);
        if (prof.ring) { const rm = c.createGain(), ro = c.createOscillator(); ro.frequency.value = prof.ring; ro.connect(rm.gain); g.connect(rm); rm.connect(this.comp); ro.start(t); ro.stop(t + len + .05); } else g.connect(this.comp);
        src.start(t); src.stop(t + len + .05);
        if (s.plosive || s.fric) { const n = c.createBufferSource(), ng = c.createGain(), nf = c.createBiquadFilter(); n.buffer = K.game.audio._noise; nf.type = s.fric ? 'highpass' : 'bandpass'; nf.frequency.value = s.fric ? 3000 : 1500; ng.gain.setValueAtTime(vol * .4, t); ng.gain.linearRampToValueAtTime(0, t + .02); n.connect(nf); nf.connect(ng); ng.connect(this.comp); n.start(t); n.stop(t + .03); }
        if (o.onSyllable) o.onSyllable(i, t);
        t += len + (s.gap ? .04 : .01) + (s.end ? .15 : 0);
      });
      const dur = t - c.currentTime; setTimeout(() => { this.active = Math.max(0, this.active - 1); }, dur * 1000);
      return dur;
    } catch (e) { this.active = Math.max(0, this.active - 1); return 0; }
  },
  /** a short shout (YES! NO! HOWZAT!) with an exaggerated pitch */
  shout(text, who) { return this.say(text.toUpperCase() + '!', who, { vol: 1.2 }); }
};
K.Voice = Voice; K.VOICES = VOICES;
