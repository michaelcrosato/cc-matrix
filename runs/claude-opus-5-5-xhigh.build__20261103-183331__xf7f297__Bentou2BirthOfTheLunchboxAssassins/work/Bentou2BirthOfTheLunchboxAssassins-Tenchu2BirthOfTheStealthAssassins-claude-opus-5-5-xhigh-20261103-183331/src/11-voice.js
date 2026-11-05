/* ---- VOICES: Animalese-style gibberish from the text. Each vowel group becomes a syllable: an oscillator at the
 * speaker's pitch (±3% jitter) through two band-pass formants (F1, F2) and a short envelope; plosives, fricatives and
 * nasals add a burst of noise or a hum before it. Sentences fall in pitch, questions rise, exclamations are louder.
 * Everything plays on the voice bus (patch 8), so the Voices setting sets its volume. Headless: silent ---- */
const FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2100] };
const VOICES = {
  granny: { base: 205, formant: 1.05, rate: 9, wave: 'square', jitter: .06 },
  sojiro: { base: 108, formant: .9, rate: 10, wave: 'sawtooth', jitter: .02 },
  kaede: { base: 265, formant: 1.12, rate: 13, wave: 'pulse', jitter: .03 },
  takanori: { base: 140, formant: .95, rate: 10, wave: 'sawtooth', jitter: .02 },
  kurogane: { base: 82, formant: .85, rate: 8, wave: 'sawtooth', jitter: .02 },
  oni: { base: 70, formant: .8, rate: 7, wave: 'sawtooth', jitter: .04, growl: true },
  gonroku: { base: 72, formant: .8, rate: 7, wave: 'sawtooth', jitter: .03 },
  hotaru: { base: 240, formant: 1.1, rate: 14, wave: 'pulse', jitter: .03 },
  tobei: { base: 175, formant: 1, rate: 15, wave: 'square', jitter: .04 },
  ittetsu: { base: 96, formant: .88, rate: 9, wave: 'sawtooth', jitter: .02 },
  kanemori: { base: 150, formant: .98, rate: 12, wave: 'sawtooth', jitter: .05 },
  sakubei: { base: 130, formant: .95, rate: 11, wave: 'sawtooth', jitter: .03 },
  guard: { base: 120, formant: .92, rate: 11, wave: 'sawtooth', jitter: .03 },
  maid: { base: 260, formant: 1.1, rate: 13, wave: 'square', jitter: .03 },
  disciple: { base: 160, formant: 1, rate: 12, wave: 'sawtooth', jitter: .03 }
};
const Voice = { busy: 0, lastBark: -9, _pulse: null, _noise: null };
const PLOSIVE = 'ptkbdgc', FRIC = 'sfhzjx', NASAL = 'mnr';
/** text -> syllables: [{ v: vowel, c: leading consonant, end: '?' | '!' | '.' | ',' | null }] */
Voice.syllables = text => {
  const out = [], s = String(text).toLowerCase().replace(/\{[^}]*\}/g, '');
  let cons = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ('aeiouy'.includes(ch)) { out.push({ v: ch, c: cons[0] || '', end: null }); cons = ''; while ('aeiouy'.includes(s[i + 1] || '')) i++; }
    else if (/[a-z]/.test(ch)) cons += ch;
    else { cons = ''; if (/[.,!?;:—-]/.test(ch) && out.length) out[out.length - 1].end = ch === ';' || ch === ':' || ch === '-' || ch === '—' ? ',' : ch; }
  }
  return out;
};
Voice._ready = () => { const c = Au.ctx; if (!c || !Au.voiceBus || game.headless) return null; if (!Voice._noise) { const b = c.createBuffer(1, c.sampleRate * .5, c.sampleRate), d = b.getChannelData(0); let s = 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823 - 1; } Voice._noise = b; } return c; };
Voice._pw = c => { if (!Voice._pulse) { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * .25); Voice._pulse = c.createPeriodicWave(re, im); } return Voice._pulse; };
/** one syllable at time t: pitch f0, vowel v, consonant c, gain k, length dur, stereo pan */
Voice._syl = (c, t, f0, v, cons, P, k, dur, pan) => {
  const out = c.createGain(); out.gain.value = 1; let node = out;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); out.connect(p); p.connect(Au.voiceBus); } else out.connect(Au.voiceBus);
  void node;
  const [F1, F2] = (FORMANTS[v] || FORMANTS.a).map(f => f * P.formant);
  let t0 = t;
  const noise = (len, type, freq, gain) => {
    const src = c.createBufferSource(); src.buffer = Voice._noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain * k, t0 + .004); g.gain.exponentialRampToValueAtTime(.0005, t0 + len);
    src.connect(f); f.connect(g); g.connect(out); src.start(t0, crand() * .3); src.stop(t0 + len + .02);
  };
  if (PLOSIVE.includes(cons)) { noise(.015 + crand() * .01, 'bandpass', 1500 + crand() * 2500, .5); t0 += .012; }
  else if (FRIC.includes(cons)) { noise(.04 + crand() * .02, 'highpass', 3500, .28); t0 += .03; }
  else if (NASAL.includes(cons)) { const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.frequency.value = f0; f.type = 'lowpass'; f.frequency.value = 400; g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.35 * k, t0 + .01); g.gain.linearRampToValueAtTime(.0001, t0 + .03); o.connect(f); f.connect(g); g.connect(out); o.start(t0); o.stop(t0 + .04); t0 += .02; }
  const osc = c.createOscillator();
  if (P.wave === 'pulse') osc.setPeriodicWave(Voice._pw(c)); else osc.type = P.wave;
  osc.frequency.setValueAtTime(f0, t0); osc.frequency.linearRampToValueAtTime(f0 * (1 + (crand() - .5) * .04), t0 + dur);
  const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), g2 = c.createGain(), env = c.createGain();
  b1.type = b2.type = 'bandpass'; b1.frequency.value = F1; b2.frequency.value = F2; b1.Q.value = 7; b2.Q.value = 9; g2.gain.value = .6;
  env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(.9 * k, t0 + .008); env.gain.setValueAtTime(.9 * k, t0 + Math.max(.01, dur - .025)); env.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(b1); osc.connect(b2); b1.connect(env); b2.connect(g2); g2.connect(env); env.connect(out);
  if (P.growl) { const o2 = c.createOscillator(), g3 = c.createGain(); o2.type = 'sawtooth'; o2.frequency.value = f0 / 2; g3.gain.setValueAtTime(0, t0); g3.gain.linearRampToValueAtTime(.12 * k, t0 + .01); g3.gain.linearRampToValueAtTime(0, t0 + dur); o2.connect(g3); g3.connect(out); o2.start(t0); o2.stop(t0 + dur + .02); }
  osc.start(t0); osc.stop(t0 + dur + .03);
};
/** speak a line now: profile id or object; o: { vol, pan, delay }. Returns its length in seconds */
Voice.say = (text, prof, o = {}) => {
  const P = typeof prof === 'string' ? VOICES[prof] || VOICES.guard : prof || VOICES.guard, sy = Voice.syllables(text);
  const len = sy.length / P.rate + sy.filter(s => s.end).length * .18;
  const c = Voice._ready(); if (!c || !sy.length) return len;
  let t = c.currentTime + .02 + (o.delay || 0); const n = sy.length, base = P.base * (o.pitch || 1), vol = (o.vol === undefined ? 1 : o.vol) * .5;
  sy.forEach((s, i) => {
    const q = n > 1 ? i / (n - 1) : 0, lastQ = sy.slice(i).find(x => x.end), endc = lastQ ? lastQ.end : '.';
    let f = base * (1 - .15 * q) * (1 + (crand() - .5) * 2 * (P.jitter || .03));
    const fromEnd = sy.slice(i).findIndex(x => x.end);
    if (endc === '?' && fromEnd >= 0 && fromEnd <= 1) f *= 1.25;
    const k = vol * (endc === '!' ? 1.4 : 1); if (endc === '!') f *= 1.2;
    const dur = (1 / P.rate) * (.75 + crand() * .2);
    Voice._syl(c, t, f, s.v, s.c, P, k, dur, o.pan || 0);
    t += 1 / P.rate + (s.end === ',' ? .12 : s.end ? .25 : 0);
  });
  return len;
};
/** follow an E.Dialog as it types: one syllable for each vowel group it reveals (call every update) */
Voice.dialogStep = (talk, prof) => {
  if (!talk.open || !talk.pages || !talk.pages.length) { Voice._dlg = null; return; }
  const page = talk.pages[talk.i], text = Array.isArray(page) ? page.join(' ') : String(page || '');
  const key = talk.i + ':' + text.length;
  if (!Voice._dlg || Voice._dlg.key !== key) Voice._dlg = { key, at: 0 };
  const D = Voice._dlg, shown = Math.min(text.length, Math.floor(talk.shown || 0));
  const c = Voice._ready();
  while (D.at < shown) {
    const ch = text[D.at].toLowerCase(), prev = D.at > 0 ? text[D.at - 1].toLowerCase() : ' ';
    if ('aeiouy'.includes(ch) && !'aeiouy'.includes(prev) && c) {
      const P = typeof prof === 'string' ? VOICES[prof] || VOICES.guard : prof || VOICES.guard, rest = text.slice(D.at);
      const endc = (rest.match(/[.!?]/) || ['.'])[0], q = D.at / Math.max(1, text.length);
      let f = P.base * (1 - .15 * q) * (1 + (crand() - .5) * 2 * (P.jitter || .03)); if (endc === '!') f *= 1.2; if (endc === '?' && rest.replace(/[^a-z]/gi, '').length < 5) f *= 1.25;
      let cons = ''; for (let j = D.at - 1; j >= 0 && /[a-z]/i.test(text[j]) && !'aeiouy'.includes(text[j].toLowerCase()); j--) cons = text[j].toLowerCase();
      Voice._syl(c, c.currentTime + .01, f, ch, cons, P, .5 * (endc === '!' ? 1.4 : 1), (1 / P.rate) * .85, 0);
    }
    D.at++;
  }
};
/** a bark in the world: quieter with distance (silent past 220), panned by where it is on the screen; at most one in 2 s */
Voice.bark = (text, prof, x, y, o = {}) => {
  const h = B.M && B.M.hero; if (!h) return 0;
  const d = Math.hypot(x - h.x, y - h.y); if (d > 220) return 0;
  if (!o.force && game.real - Voice.lastBark < 2) return 0;
  Voice.lastBark = game.real;
  let pan = 0; if (game.r && game.r.w) { try { const p = game.r.w(x, y, 20); pan = clamp((p[0] - game.W / 2) / (game.W / 2), -1, 1) * .8; } catch (e) { pan = 0; } }
  return Voice.say(text, prof, { vol: clamp(1 - d / 220, 0, 1), pan, pitch: o.pitch });
};
B.Voice = Voice; B.VOICES = VOICES;
