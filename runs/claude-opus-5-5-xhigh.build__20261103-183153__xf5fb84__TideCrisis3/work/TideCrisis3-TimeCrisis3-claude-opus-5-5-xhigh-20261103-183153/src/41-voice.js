/* 41-voice: the gibberish voice synth (Animalese / Simlish style). A line splits into syllables (consonants + a
 * vowel); each vowel drives a sawtooth or pulse source through two band-pass formant filters (a 800/1200, e 400/2000,
 * i 300/2300, o 450/800, u 325/700, y 300/1900 Hz); consonants add a short filtered noise by class (plosives click,
 * fricatives hiss, nasals hum, liquids glide). Pitch follows the speaker's base, the sentence's contour (falling at ".",
 * rising at "?", louder and higher in CAPS or with "!") and a per-letter jitter seeded by the text, so the same line
 * always sounds the same. Speaker effects: radio (a narrow band and crackle), boom (low, wide, a short echo), gravel
 * (amplitude buzz). Headless it schedules nothing and returns the line's length. */
const FORM = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 1900] };
const Voice = {
  active: 0, barks: 0,
  /** speak a line; returns its duration in seconds */
  say(text, who, o = {}) {
    const sp = reg('speaker', who) || {}, V = Object.assign({ base: 150, wave: 'sawtooth', rate: 10 }, sp.voice || {}, o);
    const syl = Voice.syllables(text), dur = syl.reduce((a, s) => a + s.d, 0);
    const A = TC.game && TC.game.audio, c = A && A.ctx, bus = A && A.bus && A.bus('sfx');
    if (!c || !bus || c.state !== 'running' || (TC.game.audio.muted)) return dur;
    if (Voice.active >= 2 && !o.bark) return dur;
    if (o.bark && Voice.barks >= 4) return dur;
    const out = c.createGain(); out.gain.value = (o.vol || .5) * (o.bark ? .7 : 1);
    let chain = out;
    if (V.fx === 'radio') { const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; const sh = c.createWaveShaper(); sh.curve = Voice.curve(2.2); out.connect(hp); hp.connect(lp); lp.connect(sh); chain = sh; }
    else if (V.fx === 'boom') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; const dl = c.createDelay(); dl.delayTime.value = .11; const fb = c.createGain(); fb.gain.value = .32; out.connect(lp); lp.connect(dl); dl.connect(fb); fb.connect(dl); const mix = c.createGain(); lp.connect(mix); dl.connect(mix); chain = mix; }
    else if (V.fx === 'gravel') { const am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 38; lg.gain.value = .35; lfo.connect(lg); lg.connect(am.gain); am.gain.value = .7; out.connect(am); lfo.start(); lfo.stop(c.currentTime + dur + .3); chain = am; }
    let panNode = null; if (c.createStereoPanner && o.pan) { panNode = c.createStereoPanner(); panNode.pan.value = clamp(o.pan, -1, 1); chain.connect(panNode); chain = panNode; }
    chain.connect(bus);
    const R = E.rng(hashStr(text + who)), caps = text === text.toUpperCase() && /[A-Z]{3}/.test(text), excl = /!/.test(text), q = /\?\s*$/.test(text);
    let t = c.currentTime + .02;
    if (V.fx === 'radio') Voice.noise(c, out, t, .06, 2400, .12);
    const n = syl.length;
    syl.forEach((s, i) => {
      if (s.pause) { t += s.d; return; }
      const u = i / Math.max(1, n - 1), contour = q ? 1 + .25 * Math.max(0, u - .6) / .4 : 1 - .18 * u, f0 = V.base * contour * (caps || excl ? 1.25 : 1) * (1 + (R() - .5) * .12);
      if (s.c) Voice.cons(c, out, t, s.c, f0);
      Voice.vowel(c, out, t + (s.c ? .015 : 0), s.d * .82, s.v, f0, V.wave, caps ? 1.3 : 1);
      t += s.d;
    });
    if (V.fx === 'radio') Voice.noise(c, out, t, .05, 2000, .1);
    if (o.bark) { Voice.barks++; setTimeout(() => Voice.barks--, dur * 1000 + 100); } else { Voice.active++; setTimeout(() => Voice.active--, dur * 1000 + 100); }
    return dur;
  },
  /** a short random shout ("Hraa!", "Ugh!") with no subtitle */
  bark(who, kind = 'hurt', o = {}) {
    const pools = { hurt: ['Ugh!', 'Gah!', 'Hnk!', 'Oof!'], die: ['Hraaa...', 'Nooo...', 'Agh...'], alert: ['Hey!', 'There!', 'Hraa!'], reload: ['Reloading!', 'Cover me!'], cheer: ['Yeah!', 'Woo!', 'Ha!'] };
    const p = pools[kind] || pools.hurt, R = TC._barkR || (TC._barkR = E.rng(99));
    return Voice.say(p[R() * p.length | 0], who, Object.assign({ bark: true, vol: .35 }, o));
  },
  syllables(text) {
    const out = [], s = text.toLowerCase();
    let i = 0, rate = 1;
    while (i < s.length) {
      const ch = s[i];
      if (/[,;:]/.test(ch)) { out.push({ pause: true, d: .12 }); i++; continue; }
      if (/[.!?]/.test(ch)) { out.push({ pause: true, d: .22 }); i++; while (/[.!?]/.test(s[i] || '')) i++; continue; }
      if (!/[a-z]/.test(ch)) { i++; continue; }
      let cons = ''; while (i < s.length && /[bcdfghjklmnpqrstvwxz]/.test(s[i])) cons += s[i++];
      let vow = ''; while (i < s.length && /[aeiouy]/.test(s[i])) vow += s[i++];
      if (!vow) { if (cons) out.push({ c: cons[0], v: 'u', d: .05 * rate }); continue; }
      out.push({ c: cons ? cons[cons.length - 1] : '', v: vow[0], d: (.055 + vow.length * .018) * rate });
    }
    return out;
  },
  vowel(c, out, t, d, v, f0, wave, loud) {
    const o = c.createOscillator(), g = c.createGain(), F = FORM[v] || FORM.a;
    o.type = wave === 'square' ? 'square' : wave === 'triangle' ? 'triangle' : 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * .94, t + d);
    const mix = c.createGain(); mix.gain.value = 1;
    for (const [f, q, k] of [[F[0], 6, .9], [F[1], 8, .55]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = c.createGain(); bg.gain.value = k * 2.2; o.connect(b); b.connect(bg); bg.connect(mix); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.42 * loud, t + .012); g.gain.setValueAtTime(.42 * loud, t + d * .7); g.gain.linearRampToValueAtTime(0, t + d);
    mix.connect(g); g.connect(out); o.start(t); o.stop(t + d + .02);
  },
  cons(c, out, t, ch, f0) {
    if ('ptkbdgc'.includes(ch)) Voice.noise(c, out, t, .012, 'pb'.includes(ch) ? 700 : 'td'.includes(ch) ? 2600 : 1600, .35);
    else if ('sfhzxj'.includes(ch)) Voice.noise(c, out, t, .04, ch === 's' || ch === 'z' ? 5200 : ch === 'f' ? 3600 : 2400, .22);
    else if ('mn'.includes(ch)) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f0 * .98; g.gain.setValueAtTime(.2, t); g.gain.linearRampToValueAtTime(0, t + .03); o.connect(g); g.connect(out); o.start(t); o.stop(t + .04); }
  },
  noise(c, out, t, d, f, k) {
    const A = TC.game.audio, src = c.createBufferSource(); src.buffer = A._noise; const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 1.4; const g = c.createGain();
    g.gain.setValueAtTime(k, t); g.gain.exponentialRampToValueAtTime(.001, t + d); src.connect(b); b.connect(g); g.connect(out); src.start(t, (t * 7.3) % .5); src.stop(t + d + .02);
  },
  curve(k) { const n = 256, a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; a[i] = Math.tanh(x * k) / Math.tanh(k); } return a; }
};
TC.Voice = Voice;
