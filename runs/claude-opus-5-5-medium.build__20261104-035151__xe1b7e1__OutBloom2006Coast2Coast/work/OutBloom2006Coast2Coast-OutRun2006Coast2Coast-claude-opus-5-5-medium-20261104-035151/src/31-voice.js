/* Voices (PLAN §7.16): Animalese / Simlish-style babble. The text is split into syllables (a consonant onset and a
 * vowel); each is synthesised as a buzzy source through two formant filters set by its vowel, at a pitch that follows
 * the line's intonation (statements fall, questions rise, "!" lifts), coloured by the character and the mood.
 * plan(text, who, mood) is pure (tests run it headless); say() schedules it on Web Audio. Subtitles always show. */
(() => {
'use strict';
const OB = window.OB, E = OB.E;
const VOWELS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2300] };
const PLOSIVE = 'pbtdkgcq', FRIC = 'szfvhxj', NASAL = 'mnlrw';
const MOODS = { happy: { st: 3, rate: 1, spread: 1.3 }, excited: { st: 5, rate: 1.2, spread: 1.2 }, angry: { st: -2, rate: 1, spread: .8, loud: 1.3 }, sad: { st: -4, rate: .8, spread: .7, breath: .3 }, scared: { st: 6, rate: 1.1, spread: 1, trem: 1 } };
OB.Voice = {
  /** the plan: { syllables: [{ t, dur, f0, F1, F2, onset, vol }], duration } */
  plan(text, who = 'marisol', mood = 'happy') {
    const v = (OB.CAST[who] && OB.CAST[who].voice) || { f0: 200, fmt: 1, rate: 12 }, md = MOODS[mood] || MOODS.happy;
    const rng = OB.rand.stream('voice:' + text, 5), out = [];
    const words = String(text).split(/(\s+|[,.!?...]+)/).filter(s => s && s.trim().length);
    const question = /\?\s*$/.test(text), exclaim = /!/.test(text);
    let t = 0;
    const sylls = [];
    for (const w of words) {
      if (/^[,.!?...]+$/.test(w)) { sylls.push({ pause: w.includes('...') || w.includes('...') ? .3 : w.includes(',') ? .08 : .16 }); continue; }
      const caps = w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w), lw = w.toLowerCase().replace(/[^a-z']/g, '');
      const re = /([^aeiouy]*)([aeiouy]+)/g; let m, n = 0;
      while ((m = re.exec(lw))) { sylls.push({ onset: m[1].slice(-1) || '', vowel: m[2][0], shout: caps }); n++; }
      if (!n && lw) sylls.push({ onset: lw[0], vowel: 'u', shout: caps });
    }
    const N = sylls.filter(s => !s.pause).length; let k = 0;
    const rate = v.rate * md.rate, base = v.f0 * Math.pow(2, md.st / 12);
    for (const s of sylls) {
      if (s.pause) { t += s.pause / md.rate; continue; }
      const u = N > 1 ? k / (N - 1) : 0;
      let contour = question ? -.1 + u * .5 : (exclaim ? .25 : .1) - u * .35;
      if (exclaim && k === 0) contour += .2;
      const f0 = base * Math.pow(2, (contour * md.spread * 4 + (rng() - .5) * 1.6 + (s.shout ? 2 : 0)) / 12);
      const [F1, F2] = VOWELS[s.vowel] || VOWELS.a, fmt = v.fmt || 1;
      const dur = (1 / rate) * (.8 + rng() * .4) * (v.swoop && s.vowel === 'a' ? 1.5 : 1);
      out.push({ t: +t.toFixed(3), dur: +dur.toFixed(3), f0: Math.round(f0), F1: Math.round(F1 * fmt), F2: Math.round(F2 * fmt), onset: PLOSIVE.includes(s.onset) ? 'plosive' : FRIC.includes(s.onset) ? 'fric' : NASAL.includes(s.onset) ? 'nasal' : '', vol: (md.loud || 1) * (s.shout ? 1.4 : 1) });
      t += dur * .92; k++;
    }
    return { syllables: out, duration: +t.toFixed(3) };
  },
  /** speak a line: returns its length in seconds (also headless, from the plan) */
  say(text, who, mood, o = {}) {
    const p = this.plan(text, who, mood), a = OB.game && OB.game.audio;
    if (o.silent || OB.env.headless || !a || !a._init || !a._init() || a.muted || a.ctx.state !== 'running') return p.duration;
    const c = a.ctx, now = c.currentTime + .02, v = (OB.CAST[who] && OB.CAST[who].voice) || {}, md = MOODS[mood] || MOODS.happy;
    if (!this.bus) { this.bus = c.createGain(); this.bus.connect(a._sfxBus); }
    this.bus.gain.value = (OB.game.settings.voices !== undefined ? OB.game.settings.voices : .8) * .9;
    OB.Radio && OB.Radio.duck(p.duration + .3);
    try {
      for (const s of p.syllables) {
        const t0 = now + s.t, t1 = t0 + s.dur, osc = c.createOscillator(), g = c.createGain();
        if (v.wave === 'pulse') osc.setPeriodicWave(a._pulse(.25)); else osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(s.f0 * (s.onset === 'nasal' ? .92 : 1), t0); osc.frequency.linearRampToValueAtTime(s.f0, t0 + .03); osc.frequency.linearRampToValueAtTime(s.f0 * .97, t1);
        if (md.trem) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 22; lg.gain.value = s.f0 * .04; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t1 + .02); }
        for (const [F, q, amt] of [[s.F1, 6, 1], [s.F2, 9, .6]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F; bp.Q.value = q; const bg = c.createGain(); bg.gain.value = amt; osc.connect(bp); bp.connect(bg); bg.connect(g); }
        const vol = .5 * s.vol;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .012); g.gain.setValueAtTime(vol, t1 - .025); g.gain.linearRampToValueAtTime(0, t1);
        g.connect(this.bus); osc.start(t0); osc.stop(t1 + .02);
        if (s.onset === 'plosive' || s.onset === 'fric' || v.rasp || md.breath) {
          const n = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain(), long = s.onset === 'fric' ? .04 : .012;
          n.buffer = a._noise; f.type = 'bandpass'; f.frequency.value = s.onset === 'fric' ? 5000 : 3000; f.Q.value = 1.2;
          ng.gain.setValueAtTime(.25 * s.vol, t0); ng.gain.linearRampToValueAtTime(0, t0 + (v.rasp || md.breath ? s.dur : long));
          n.connect(f); f.connect(ng); ng.connect(this.bus); n.start(t0); n.stop(t0 + s.dur + .02);
        }
      }
    } catch (e) { /* sound unavailable */ }
    return p.duration;
  }
};
})();
