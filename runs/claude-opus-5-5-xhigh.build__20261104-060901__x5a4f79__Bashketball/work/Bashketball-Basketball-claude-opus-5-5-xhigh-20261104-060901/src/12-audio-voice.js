/* 12-audio-voice: Animalese/Simlish-style gibberish (PLAN 12.3). Text becomes syllables (a consonant cluster and a
 * vowel); each syllable is an oscillator at the speaker's pitch through two band-pass filters at the vowel's formants,
 * with a short noise burst for its consonant. Pitch drifts down a line, rises at "?", jumps at "!", and steps by a hash
 * of the text, so a line always sounds the same. Robots ring-modulate and quantize; the gorilla growls. The announcer
 * picks lines from the banks (05-data-lines) and shows them as lower-third captions while the voice speaks them; the
 * crowd is a looping noise bed whose level follows the game's excitement. */
const VOICE_PROFILES = {
  vinnie: { hz: 110, wave: 'sawtooth', rate: 14, fs: .92, punch: 1.2 }, deedee: { hz: 232, wave: 'square', rate: 15, fs: 1.18 },
  gigawatt: { hz: 140, wave: 'sawtooth', rate: 9, fs: 1.3, nasal: true, slide: true }, roscoe: { hz: 125, wave: 'square', rate: 12, fs: 1 },
  intern1: { hz: 160, wave: 'square', rate: 13, fs: 1.05 }, intern2: { hz: 210, wave: 'square', rate: 13, fs: 1.12 },
  volt: { hz: 220, wave: 'square', rate: 16, fs: 1.1 }, bigrumble: { hz: 85, wave: 'sawtooth', rate: 9, fs: .8 }, pixel: { hz: 270, wave: 'square', rate: 17, fs: 1.25 },
  riptide: { hz: 170, wave: 'sawtooth', rate: 10, fs: .95, slide: true }, shellshock: { hz: 200, wave: 'square', rate: 13, fs: 1.1, sing: true }, longboard: { hz: 120, wave: 'sawtooth', rate: 9, fs: .9 },
  torque: { hz: 95, wave: 'sawtooth', rate: 11, fs: .85, growl: .25 }, sparkplug: { hz: 300, wave: 'square', rate: 18, fs: 1.3 }, hubcap: { hz: 130, wave: 'sawtooth', rate: 10, fs: .95 },
  obsidian: { hz: 78, wave: 'sawtooth', rate: 8, fs: .78 }, ember: { hz: 230, wave: 'square', rate: 14, fs: 1.15 }, pumice: { hz: 190, wave: 'square', rate: 15, fs: 1.05, sing: true },
  dunkatron: { hz: 95, wave: 'square', rate: 10, fs: .9, robot: true }, swatbot: { hz: 120, wave: 'square', rate: 10, fs: .95, robot: true }, spareparts: { hz: 150, wave: 'square', rate: 12, fs: 1, robot: true, glitch: true },
  blammo: { hz: 66, wave: 'sawtooth', rate: 7, fs: .7, growl: .6 }, crowd: { hz: 180, wave: 'sawtooth', rate: 6, fs: 1, copies: 6 }
};
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [500, 900], u: [350, 700], y: [300, 2200] };
const isVowel = ch => 'AEIOUY'.includes(ch);
/** the syllables of a line for a profile: [{ t, dur, f, v, c, loud }] (computed headless too: tests read it) */
function planSyllables(text, prof) {
  const P = typeof prof === 'string' ? VOICE_PROFILES[prof] || VOICE_PROFILES.vinnie : prof;
  const up = String(text).toUpperCase(), out = []; let h = 2166136261; for (let i = 0; i < up.length; i++) h = Math.imul(h ^ up.charCodeAt(i), 16777619);
  const rnd = E.rng(h >>> 0), per = 1 / P.rate;
  // sentence chunks keep their ending mark for the contour
  const chunks = up.match(/[^.!?]+[.!?]*/g) || [up];
  let t = 0, total = 0; for (const ch of up) if (isVowel(ch)) total++;
  let n = 0;
  for (const chunk of chunks) {
    const mark = /!/.test(chunk) ? '!' : /\?/.test(chunk) ? '?' : '.', sylls = [];
    let cons = '';
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (/[A-Z]/.test(ch)) { if (isVowel(ch)) { if (!(i > 0 && isVowel(chunk[i - 1]))) sylls.push({ c: cons, v: ch.toLowerCase(), gap: 0 }); cons = ''; } else cons += ch; }
      else if (ch === ' ') { if (sylls.length) sylls[sylls.length - 1].gap = Math.max(sylls[sylls.length - 1].gap, .045); cons = ''; }
      else if (/[,.;:!?\-]/.test(ch)) { if (sylls.length) sylls[sylls.length - 1].gap = .14; cons = ''; }
    }
    sylls.forEach((s, k) => {
      const prog = total ? n / total : 0, last = k >= sylls.length - 2;
      let st = -2.2 * prog + (rnd() - .5) * 4 + (mark === '!' ? 4 : 0) + (mark === '?' && last ? 3 + k - sylls.length + 2 : 0) + (P.sing ? Math.sin(n * 1.3) * 3 : 0);
      if (P.robot) st = Math.round(st / 2) * 2;
      const dur = clamp(per * (.75 + rnd() * .4) * (last && mark !== '.' ? 1.3 : 1), .055, .2);
      out.push({ t, dur, f: P.hz * Math.pow(2, st / 12), v: s.v, c: s.c.slice(-2), loud: mark === '!' ? 1.25 : 1 });
      t += dur + s.gap * (P.robot ? 1.5 : 1); n++;
    });
  }
  return out;
}
const Voice = {
  bus: null, noise: null, speaking: 0,
  _ctx() { const c = A.ctx; if (!c || c.state !== 'running' || !A.sfxBus) return null; if (!this.bus) { this.bus = c.createGain(); this.bus.connect(A.sfxBus); const L = c.sampleRate, b = c.createBuffer(1, L, L), d = b.getChannelData(0); for (let i = 0; i < L; i++) d[i] = Math.random() * 2 - 1; this.noise = b; } this.bus.gain.value = game.settings.voiceVol === undefined ? .8 : game.settings.voiceVol; return c; },
  /** one syllable at time t0 (seconds of the audio clock) */
  _syl(c, s, P, t0, vol = .2) {
    if (P.robot) vol *= 1.7;   // (ring modulation halves a robot's level)
    const fm = FORMANTS[s.v] || FORMANTS.a, fs = P.fs || 1, end = t0 + s.dur;
    const osc = c.createOscillator(); osc.type = P.wave || 'square'; osc.frequency.setValueAtTime(s.f, t0); if (P.slide) osc.frequency.linearRampToValueAtTime(s.f * .88, end);
    const env = c.createGain(); env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(vol * s.loud, t0 + .012); env.gain.setValueAtTime(vol * s.loud, end - .025); env.gain.linearRampToValueAtTime(0, end);
    let src = osc;
    if (P.robot) { const rm = c.createGain(), lfo = c.createOscillator(); rm.gain.value = 0; lfo.frequency.value = P.glitch ? 30 + Math.random() * 60 : 50; lfo.connect(rm.gain); osc.connect(rm); src = rm; lfo.start(t0); lfo.stop(end + .02); }
    for (const [k, F] of [[0, fm[0]], [1, fm[1]]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F * fs * (P.nasal && k ? 1.25 : 1); bp.Q.value = P.nasal ? 12 : 6 + k * 2; src.connect(bp); bp.connect(env); }
    const dry = c.createGain(); dry.gain.value = .12; src.connect(dry); dry.connect(env);
    env.connect(this.bus); osc.start(t0); osc.stop(end + .02);
    if (P.growl) { const ns = c.createBufferSource(); ns.buffer = this.noise; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; const g = c.createGain(); g.gain.setValueAtTime(vol * P.growl, t0); g.gain.linearRampToValueAtTime(0, end); ns.connect(lp); lp.connect(g); g.connect(this.bus); ns.start(t0, Math.random() * .5); ns.stop(end + .02); }
    const ch = s.c[s.c.length - 1];
    if (ch) {   // the consonant: a short burst before the vowel
      const ns = c.createBufferSource(); ns.buffer = this.noise; const f = c.createBiquadFilter(), g = c.createGain(), hiss = 'SFZCXJ'.includes(ch), thump = 'BDGMNVW'.includes(ch);
      f.type = hiss ? 'highpass' : thump ? 'lowpass' : 'bandpass'; f.frequency.value = hiss ? 4200 : thump ? 320 : 2600; g.gain.setValueAtTime(vol * (hiss ? .5 : .7), t0); g.gain.exponentialRampToValueAtTime(.001, t0 + (hiss ? .03 : .022));
      ns.connect(f); f.connect(g); g.connect(this.bus); ns.start(t0, Math.random() * .5); ns.stop(t0 + .04);
    }
  },
  /** speak a line; returns its length in seconds (the plan is made even without sound) */
  say(text, prof, o = {}) {
    const P = typeof prof === 'string' ? VOICE_PROFILES[prof] || VOICE_PROFILES.vinnie : prof, plan = planSyllables(text, P), len = plan.length ? plan[plan.length - 1].t + plan[plan.length - 1].dur : .3;
    this.last = { text, plan, len };
    const c = this._ctx();
    if (c) {
      const t0 = c.currentTime + .02, copies = P.copies || 1;
      for (let k = 0; k < copies; k++) for (const s of plan) this._syl(c, copies > 1 ? Object.assign({}, s, { f: s.f * (1 + (k - copies / 2) * .03) }) : s, P, t0 + s.t + k * .012, (o.vol || .32) / Math.sqrt(copies));
      this.speaking = Math.max(this.speaking, len); dipMusic(len);
    }
    if (o.onEnd) game.after(len + .1, o.onEnd);
    return len;
  },
  /** a Dialog's voice: a syllable for each vowel group as it types */
  letter(ch, i, page, prof) {
    if (!isVowel(String(ch).toUpperCase()) || (i > 0 && isVowel(String(page[i - 1]).toUpperCase()))) return;
    const P = typeof prof === 'string' ? VOICE_PROFILES[prof] || VOICE_PROFILES.vinnie : prof, c = this._ctx(); if (!c) return;
    const k = page.length ? i / page.length : 0, bang = /!/.test(page), q = /\?/.test(page.slice(Math.max(0, i - 4), i + 6));
    let st = -2 * k + ((i * 7919) % 5 - 2) + (bang ? 3 : 0) + (q ? 3 : 0); if (P.robot) st = Math.round(st / 2) * 2;
    this._syl(c, { f: P.hz * Math.pow(2, st / 12), v: String(ch).toLowerCase(), c: String(page[i - 1] || '').toUpperCase(), dur: clamp(1 / P.rate, .06, .14), loud: bang ? 1.15 : 1 }, P, c.currentTime + .005, .3);
    dipMusic(.15);
  }
};
let dipUntil = 0;
function dipMusic(len) { const c = A.ctx; if (!c || !A.musicBus) return; dipUntil = Math.max(dipUntil, c.currentTime + len); A.musicBus.gain.setTargetAtTime(A.musicVolume * .75 * (A.ducked ? .35 : 1), c.currentTime, .05); }
function voiceTick() { const c = A.ctx; if (c && A.musicBus && dipUntil && c.currentTime > dipUntil) { dipUntil = 0; A.applyVolume(); } }

/* ---- the announcer: lines by event, alternating VINNIE and DEE DEE, as lower-third captions ---- */
const ANN = { cap: null, queue: [], recent: [], cool: {}, turn: 0, possN: 0, poss: -1 };
/** say a line from a bank: vars { NAME, VICTIM, TEAM }; o { speaker, force } */
function announce(bank, vars = {}, o = {}) {
  const mode = game.settings.commentary || 'full', rank = LINE_RANK[bank] || 1;
  if (mode === 'off' && !o.force) return null;
  if (mode === 'big' && rank < 4 && !o.force) return null;
  const now = game.real; if (ANN.cool[bank] > now && !o.force) return null;
  const M = S.match; if (M && M.poss !== ANN.poss) { ANN.poss = M.poss; ANN.possN = 0; }
  if (ANN.possN >= 2 && rank < 4 && !o.force) return null;
  if (ANN.cap && ANN.cap.until > now && ANN.cap.rank > rank && !o.force) return null;   // a bigger play is still on
  const bankLines = LINES[bank]; if (!bankLines) return null;
  const fresh = bankLines.filter(l => !ANN.recent.includes(l)), line = pickF(fresh.length ? fresh : bankLines);
  ANN.recent.push(line); if (ANN.recent.length > 8) ANN.recent.shift();
  ANN.cool[bank] = now + (rank >= 4 ? 1 : 4); ANN.possN++;
  const speaker = o.speaker || (ANN.turn++ % 2 ? 'deedee' : 'vinnie'), text = fill(line, vars);
  return caption(speaker, text, rank);
}
/** a caption with its voice (non-modal; shoot and pass never skip it) */
function caption(speaker, text, rank = 1, o = {}) {
  const len = Voice.say(text, CAST[speaker] ? CAST[speaker].voice : (get('player', speaker) ? get('player', speaker).voice : speaker));
  ANN.cap = { speaker, text, rank, at: game.real, until: game.real + Math.max(2.2, len + 1.2), name: o.name || (CAST[speaker] ? CAST[speaker].name : get('player', speaker) ? get('player', speaker).name : speaker.toUpperCase()) };
  return ANN.cap;
}
/** a player's bark over its head, in its own voice */
const BARKS = [];
function bark(p, text) { if (!p || !text) return; Voice.say(text, p.def.voice, { vol: .16 }); BARKS.push({ p, text, t: 1.6 }); if (BARKS.length > 3) BARKS.shift(); }

/* ---- the crowd's ambience: a looping noise bed through a band-pass, its level and brightness by excitement ---- */
const CROWD = { src: null, gain: null, bp: null, ex: .3, target: .3 };
function crowdStart() {
  const c = A.ctx; if (!c || c.state !== 'running' || !A.sfxBus || CROWD.src) return;
  const L = c.sampleRate * 2, buf = c.createBuffer(1, L, c.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < L; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * .1848) * .18; }
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = .7; const g = c.createGain(); g.gain.value = 0;
  src.connect(bp); bp.connect(g); g.connect(A.sfxBus); src.start(); Object.assign(CROWD, { src, gain: g, bp });
}
function crowdStop() { if (CROWD.src) { try { CROWD.src.stop(); } catch (e) { /* already stopped */ } CROWD.src = null; } }
function crowdTick(dt, on) {
  voiceTick();
  if (!on) { if (CROWD.gain) CROWD.gain.gain.value = approach(CROWD.gain.gain.value, 0, dt); return; }
  if (!CROWD.src) crowdStart(); if (!CROWD.gain) return;
  const M = S.match; let ex = .25;
  if (M) { const close = Math.abs(M.score[0] - M.score[1]) <= 6; if (M.quarter >= M.quarters) ex += .2; if (close) ex += .1; if (S.players.some(p => p.isNova())) ex += .2; }
  ex += ARENA.cheer * .4; CROWD.ex = approach(CROWD.ex, clamp(ex, 0, 1.2), dt * .8);
  // the home crowd chants DE-FENSE in the last minute of a close game while its team defends
  if (M && M.phase === 'live' && M.quarter >= M.quarters && M.clock < 60 && Math.abs(M.score[0] - M.score[1]) <= 8 && M.poss === 1 && game.real > (CROWD.chantAt || 0)) { CROWD.chantAt = game.real + 6; Voice.say('DE-FENSE! DE-FENSE!', 'crowd', { vol: .1 }); }
  const t = game.real; CROWD.gain.gain.value = (.12 + CROWD.ex * .22) * (1 + .1 * Math.sin(t * .7));
  CROWD.bp.frequency.value = 450 + CROWD.ex * 700;
}
