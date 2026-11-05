/* LAUGHTER (§10.3) and VOICES (§10.4): WebAudio on the engine's context, into its effects bus (so the volume, effects
 * and mute settings hold), times the voices setting. Laughs are formant "ha" syllables in four styles, panned and
 * lowpassed by line of sight, at most eight at once. Voices are Animalese-style gibberish: a syllable for every other
 * typed letter, vowels setting the formants, consonants a click or a hiss, a pitch and a tic per speaker. Headless (no
 * AudioContext) every call is a no-op. */
const FORMANTS = { a: [800, 1200], e: [400, 2300], i: [300, 2700], o: [450, 800], u: [325, 700], y: [300, 2500] };
class S7Voice {
  constructor(game) { this.game = game; this.live = []; this.lastShown = -1; this.lastLine = null; this.lastT = 0; this.q = []; }
  ctx() { const A = this.game.audio; return A && A.ctx && A._sfxBus && A.ready !== false ? A.ctx : null; }
  bus() {
    const c = this.ctx(); if (!c) return null;
    if (!this._bus || this._bus.context !== c) { this._bus = c.createGain(); this._bus.connect(this.game.audio._sfxBus); }
    const v = this.game.settings.voices; this._bus.gain.value = typeof v === 'number' ? v : .8;
    return this._bus;
  }
  /** a laugh at world point `at` heard from the camera pose (style: giggle | cackle | chuckle | wheeze) */
  laugh(style, pitchSt, at, pose, occluded) {
    const c = this.ctx(), out = this.bus(); if (!c || !out || !pose) return;
    const now = c.currentTime;
    this.live = this.live.filter(l => l > now);
    if (this.live.length >= 8) return;
    const d = Math.hypot(at[0] - pose.x, at[1] - pose.y), gain = clamp(1 - d / (60 * M), 0, 1) * .5; if (gain < .02) return;
    const ang = Math.atan2(at[1] - pose.y, at[0] - pose.x) - pose.yaw, pan = clamp(Math.sin(ang), -1, 1);
    const P = c.createStereoPanner ? c.createStereoPanner() : null; if (P) { P.pan.value = pan; P.connect(out); }
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = occluded ? 900 : 9000; lp.connect(P || out);
    const base = 220 * Math.pow(2, (pitchSt || 0) / 12) * (style === 'chuckle' ? .7 : style === 'giggle' ? 1.5 : 1);
    const n = style === 'giggle' ? 6 + Math.floor(Math.random() * 4) : style === 'cackle' ? 4 + Math.floor(Math.random() * 2) : style === 'chuckle' ? 3 + Math.floor(Math.random() * 1.9) : 4;
    const syl = style === 'giggle' ? .09 : style === 'cackle' ? .13 : style === 'chuckle' ? .16 : .14;
    let t = now + .02;
    for (let i = 0; i < n; i++) {
      const f = base * (style === 'giggle' ? 1 + i * .05 : style === 'cackle' ? 1.2 - i * .06 : 1 - i * .03);
      // a breath before each syllable
      this.noise(c, lp, t, .03, 2200, gain * .25);
      if (style !== 'wheeze') {
        const o = c.createOscillator(); o.type = style === 'cackle' ? 'square' : 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (style === 'giggle' ? 1.08 : .92), t + syl);
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * (style === 'chuckle' ? .6 : 1), t + .012); g.gain.exponentialRampToValueAtTime(.001, t + syl * .95);
        const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 750; f2.frequency.value = 1200; f1.Q.value = 5; f2.Q.value = 6;
        o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp); o.start(t); o.stop(t + syl + .02);
      } else this.noise(c, lp, t, syl * .9, 1100, gain * .9, 'bandpass');
      t += syl * (1.05 + Math.random() * .2);
    }
    this.live.push(t);
  }
  noise(c, dest, t, dur, f, vol, type = 'highpass') {
    const s = c.createBufferSource(); s.buffer = S7.noiseBuffer(c); const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  /** the syllables a line makes: deterministic for a text (tests read it) */
  static schedule(text, V0) {
    const out = []; let n = 0, prevCons = null;
    const rate = V0.rate || 1, words = text.length;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i].toLowerCase();
      if (ch === ',' ) { out.push({ pause: .12 }); continue; }
      if (ch === '.' || ch === '!' || ch === '?') { out.push({ pause: ch === '.' ? .25 : .15, mark: ch }); continue; }
      if (!/[a-zäöüéèà]/.test(ch)) { prevCons = null; continue; }
      const v = 'aeiouyäöüéèà'.includes(ch);
      if (!v) { prevCons = ch; continue; }
      n++;
      if (n % 2 === 0 && !V0.every) { prevCons = null; continue; }
      const vk = { 'ä': 'e', 'ö': 'o', 'ü': 'u', 'é': 'e', 'è': 'e', 'à': 'a' }[ch] || ch;
      const drift = -2 * (i / Math.max(1, words));
      out.push({ v: vk, cons: prevCons, st: drift + ((ch.charCodeAt(0) * 7 + i * 3) % (2 * (V0.range || 2) + 1)) - (V0.range || 2), dur: (.055 + ((i * 13) % 5) * .006) / rate, idx: i });
      prevCons = null;
    }
    return out;
  }
  /** each frame during a talk: voice the letters typed since the last frame */
  talkTick(talk) {
    if (!talk) { this.lastLine = null; return; }
    const l = talk.lines[talk.i]; if (!l || l.card || !l.who) return;
    const key = talk.i + ':' + l.text;
    if (this.lastLine !== key) { this.lastLine = key; this.lastShown = 0; this.sched = S7Voice.schedule(l.text || '', this.voiceOf(l.who)); this.si = 0; }
    const shown = Math.floor(talk.shown);
    if (shown <= this.lastShown) return;
    const V0 = this.voiceOf(l.who);
    while (this.si < this.sched.length && (this.sched[this.si].idx === undefined || this.sched[this.si].idx < shown)) {
      const sy = this.sched[this.si++];
      if (sy.pause) continue;
      const last = this.sched.slice(this.si).findIndex(x => x.mark) ;
      const q = last >= 0 && last < 3 && this.sched[this.si + last].mark === '?';
      this.syllable(V0, sy, q, (l.text || '').includes('!'));
    }
    this.lastShown = shown;
  }
  voiceOf(who) { const P = S7.PEOPLE[who] || S7.PERSONAS[who], id = P && P.voice ? P.voice : who; return S7.VOICES[id] || S7.VOICES.whiteout; }
  syllable(V0, sy, question, excl) {
    const c = this.ctx(), out = this.bus(); if (!c || !out || !V0) return;
    const t = c.currentTime + .005, dur = sy.dur;
    let f = V0.pitch * Math.pow(2, (sy.st + (question ? 3 : 0) + (excl ? 2 : 0)) / 12);
    if (V0.yodel && sy.idx % 5 === 0) f *= 2;
    if (V0.ding && sy.idx % 5 === 0) this.game.audio.sfx({ wave: 'sine', freq: 'C6', dur: .3, vol: .06 });
    let dest = out;
    if (V0.band) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = 1200; b.Q.value = .6; b.connect(out); dest = b; }
    if (V0.lowpass) { const b = c.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = V0.lowpass; b.connect(dest); dest = b; }
    if (V0.echo) { const dl = c.createDelay(); dl.delayTime.value = .18; const fb = c.createGain(); fb.gain.value = .35; dl.connect(fb); fb.connect(dl); dl.connect(dest); const mix = c.createGain(); mix.connect(dest); mix.connect(dl); dest = mix; }
    if (sy.cons) { const sib = 'szfxch'.includes(sy.cons); this.noise(c, dest, t, .012 + (sib ? .02 : 0), sib ? 4000 : 1500, .12 * (V0.vol || 1)); }
    if (V0.crackle && Math.random() < .3) this.noise(c, dest, t, .01, 6000, .05);
    const o = c.createOscillator(); o.type = V0.wave || 'square';
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (V0.glide ? 1.08 : .97), t + dur);
    if (V0.vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = V0.vib; lg.gain.value = f * .03; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + .02); }
    const F = FORMANTS[sy.v] || FORMANTS.a, f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0]; f2.frequency.value = F[1]; f1.Q.value = 4; f2.Q.value = 5;
    const g = c.createGain(), vol = (V0.vol || 1) * .35 * (excl ? 1.25 : 1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g);
    if (V0.breath) this.noise(c, g, t, dur, 1800, .06);
    if (V0.gravel) this.noise(c, g, t, dur, 300, .1, 'lowpass');
    g.connect(dest); o.start(t); o.stop(t + dur + .02);
  }
}
S7.Voice = S7Voice;
