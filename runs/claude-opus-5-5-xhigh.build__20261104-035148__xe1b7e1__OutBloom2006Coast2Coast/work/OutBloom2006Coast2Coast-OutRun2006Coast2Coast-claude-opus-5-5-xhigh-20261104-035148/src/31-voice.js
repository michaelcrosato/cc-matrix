/* OutBloom — voices: Animalese / Simlish-style babble. Text becomes syllables (an onset and a vowel), each a short
 * buzz through two formant filters set by its vowel, with noise bursts for plosives and fricatives, pitch on an
 * intonation contour (statements fall, questions rise, "!" lifts), per-character pitch and formants, moods. The planner
 * is pure (tests run it headless); say() schedules it on the voice bus and returns the plan (its duration paces the
 * speech bubble). Also the radio: stations, preview, switching in a race with a crossfade and a card. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp } = E;
const VOW = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [320, 2200] };
const PLOS = 'pbtdkgcq', FRIC = 'szfvhxj', NAS = 'mnlrw';
const MOODS = { happy: { p: 3, rate: 1, wide: 1.3 }, excited: { p: 5, rate: 1.2, wide: 1.4 }, angry: { p: -2, rate: 1, wide: .8, loud: 1.3 }, sad: { p: -4, rate: .8, wide: .7, breath: .4 }, scared: { p: 6, rate: 1.1, wide: 1.2, trem: 1 }, neutral: { p: 0, rate: 1, wide: 1 } };
const B = OB.Babble = {
  /** the plan: { syllables: [{ t, dur, f0, F1, F2, onset, loud }], duration } (pure: the same text gives the same plan) */
  plan(text, who, mood = 'happy') {
    const V = (OB.CAST[who] && OB.CAST[who].voice) || { f0: 200, fs: 1, rate: 12 }, M = MOODS[mood] || MOODS.happy;
    const rnd = E.rng(OB.hashStr(text + who) || 1), out = [], s = String(text);
    const question = /\?\s*$/.test(s), excl = /!/.test(s), rate = V.rate * M.rate;
    let t = 0, i = 0; const words = []; let shout = false;
    // syllables: consonant onset + vowel nucleus; punctuation pauses
    const low = s.toLowerCase();
    while (i < low.length) {
      const ch = low[i];
      if (ch === ',' || ch === ';') { t += .08; i++; continue; }
      if (ch === '.' || ch === '!' || ch === '?') { if (low.slice(i, i + 3) === '...') { t += .3; i += 3; continue; } t += .16; i++; continue; }
      if (s[i] === '…') { t += .3; i++; continue; }
      if (!/[a-z]/.test(ch)) { if (ch === ' ') t += .02; i++; continue; }
      let onset = ''; while (i < low.length && /[a-z]/.test(low[i]) && !VOW[low[i]]) { onset += low[i]; i++; }
      let vow = ''; while (i < low.length && VOW[low[i]]) { vow += low[i]; i++; }
      if (!vow) { if (onset) { vow = 'u'; } else continue; }
      const caps = s.slice(Math.max(0, i - vow.length - onset.length), i); shout = caps.length > 1 && caps === caps.toUpperCase() && /[A-Z]/.test(caps);
      const dur = clamp(1 / rate * (.75 + rnd() * .5) * (vow.length > 1 ? 1.25 : 1), .06, .2);
      out.push({ t, dur, vow: vow[0], onset: onset.slice(-2), shout });
      t += dur;
    }
    const n = out.length || 1, semis = M.p + (V.quirk === 'swoop' ? 1 : 0);
    out.forEach((q, k) => {
      const u = k / Math.max(1, n - 1);
      let contour = question ? (u > .7 ? (u - .7) * 14 : 0) : (u > .65 ? -(u - .65) * 9 : 0);
      if (excl && k < 2) contour += 3;
      if (V.quirk === 'swoop') contour += Math.sin(u * Math.PI) * 3;
      if (V.quirk === 'waver') contour += Math.sin(k * 2.1) * 1.5;
      const st = semis + contour * M.wide + (q.shout ? 2 : 0) + (rnd() - .5) * 1.6;
      q.f0 = V.f0 * Math.pow(2, st / 12);
      const f = VOW[q.vow], fs = V.fs || 1; q.F1 = f[0] * fs; q.F2 = f[1] * fs;
      q.loud = (M.loud || 1) * (q.shout ? 1.4 : 1); q.kind = PLOS.includes(q.onset.slice(-1)) ? 'p' : FRIC.includes(q.onset.slice(-1)) ? (q.onset.slice(-1) === 's' || q.onset.slice(-1) === 'z' ? 's' : 'f') : NAS.includes(q.onset.slice(-1)) ? 'n' : '';
    });
    return { syllables: out, duration: t, who, mood };
  },
  /** speak: schedule the plan on the voice bus (if sound is on); returns the plan */
  say(text, who, mood) {
    const plan = B.plan(text, who, mood), A = OB.game.audio;
    if (OB.env.headless || !A.ctx || A.ctx.state !== 'running' || OB.setting('voices') <= 0) return plan;
    const c = A.ctx, bus = A.voiceBus, V = (OB.CAST[who] && OB.CAST[who].voice) || {}, M = MOODS[mood] || MOODS.happy, t0 = c.currentTime + .03, wave = V.wave || 'pulse';
    for (const q of plan.syllables) {
      const t = t0 + q.t, end = t + q.dur, g = c.createGain(), vol = .16 * q.loud;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.setTargetAtTime(vol * .7, t + .02, q.dur / 3); g.gain.setTargetAtTime(0, end - .02, .015);
      g.connect(bus);
      const src = c.createOscillator(); if (wave === 'saw') src.type = 'sawtooth'; else src.setPeriodicWave(A._pulse(wave === 'pulse12' ? .125 : .25));
      src.frequency.setValueAtTime(q.f0 * (q.kind === 'n' ? .94 : 1), t); src.frequency.linearRampToValueAtTime(q.f0 * (1 + (M.trem ? .03 : 0)), end);
      if (M.trem) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 9; lg.gain.value = q.f0 * .03; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(end + .05); }
      for (const [F, k] of [[q.F1, 1], [q.F2, .55]]) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = F; f.Q.value = 5; const fg = c.createGain(); fg.gain.value = k * 2.2; src.connect(f); f.connect(fg); fg.connect(g); }
      src.start(t); src.stop(end + .05);
      const breath = (M.breath || 0) + (V.quirk === 'rasp' ? .25 : 0);
      if (q.kind === 'p' || q.kind === 's' || q.kind === 'f' || breath) {
        const n = c.createBufferSource(); n.buffer = A._noise; const nf = c.createBiquadFilter(); nf.type = q.kind === 's' ? 'highpass' : 'bandpass'; nf.frequency.value = q.kind === 's' ? 4500 : q.kind === 'f' ? 1200 : 3000; const ng = c.createGain();
        const nd = q.kind === 'p' ? .012 : q.kind ? .04 : q.dur; ng.gain.setValueAtTime(q.kind ? .12 : breath * .05, t); ng.gain.setTargetAtTime(0, t + nd, .01); n.connect(nf); nf.connect(ng); ng.connect(bus); n.start(t, OB.FX.rnd() * .5); n.stop(t + nd + .05);
      }
    }
    if (V.reverb) A.reverb(.5, .05), setTimeout(() => A.reverb(Audio && Audio.tun ? .6 : .15, .4), plan.duration * 1000 + 300);
    return plan;
  }
};
const Audio = OB.Audio;
/* ---- the radio ---- */
const R = OB.Radio = {
  cur: 0, selected: 0,
  select(i) { R.selected = i; },
  /** play a station in a race (the song from its intro) */
  play(i) { R.cur = i; const s = OB.SONGS[OB.STATIONS[i].song]; OB.game.audio.music(s, { restart: true, fade: .4 }); },
  preview(i, staticBurst) { R.cur = i; if (staticBurst) OB.sfx('static'); const s = OB.SONGS[OB.STATIONS[i].song]; OB.game.audio.music(s, { restart: true, fade: staticBurst ? .3 : .6 }); },
  /** the next open station, crossfading over a second, with a card on the HUD */
  next(card) {
    const open = OB.STATIONS.map((s, i) => OB.Profile.data.unlocked.songs.includes(s.song) ? i : -1).filter(i => i >= 0);
    const k = open.indexOf(R.cur), i = open[(k + 1) % open.length]; R.cur = i; const st = OB.STATIONS[i], song = OB.SONGS[st.song];
    OB.sfx('static'); OB.game.audio.music(song, { fade: 1, restart: true });
    if (card) OB.UI.toast('♪ ' + song.title, st.freq + ' ' + st.name, 2.2);
    OB.bus.emit('radio:tune', { i });
  }
};
})();
