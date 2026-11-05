// 41-voice: the gibberish voice synth (Animalese / Simlish style). The text splits into syllables; vowels drive a
// sawtooth or square source through two band-pass formant filters, consonants add short filtered noise by class
// (plosive clicks, fricative hiss, nasal hum, liquid glides); pitch follows the speaker, the sentence contour (falling
// at '.', rising at '?', louder and higher in CAPS or '!'), with a per-letter jitter seeded by the text, so a line
// always sounds the same. Per-speaker effects: radio (band-limited with crackle), boom (low, with a short echo),
// gravel (amplitude-modulated). Headless it schedules nothing and returns the line's duration.
// Reads: game.audio (its context and the effects bus: engine patch 3), speakers (40).

const FORM = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 1900] };
const Voice = {
  active: [], barks: 0,
  syllables(text) { const out = []; const re = /([^aeiouy\s.,!?…—-]*)([aeiouy]+)/gi; let m; while ((m = re.exec(text))) out.push({ c: m[1].toLowerCase(), v: m[2][0].toLowerCase(), caps: m[0] === m[0].toUpperCase() && /[A-Z]/.test(m[0]), at: m.index }); return out; },
  duration(text, spk) { const v = spk && spk.voice || { rate: 10 }; const syl = this.syllables(text).length, pauses = (text.match(/[,…—]/g) || []).length * .12 + (text.match(/[.!?]/g) || []).length * .25; return syl / (v.rate || 10) + pauses; },
  say(game, text, speakerId, o = {}) {
    const spk = has('speaker', speakerId) ? get('speaker', speakerId) : null, V = spk ? spk.voice : { base: 160, wave: 'square', rate: 10 };
    const dur = this.duration(text, spk);
    const A = game && game.audio, ctx = A && A.ctx; if (!ctx || A.muted) return dur;
    if (o.bark) { if (this.barks >= 4) return dur; } else { this.active = this.active.filter(x => x.end > ctx.currentTime); if (this.active.length >= 2) this.active.shift().stop(); }
    const bus = A.bus ? A.bus('sfx') : null; if (!bus) return dur;
    const out = ctx.createGain(); out.gain.value = (o.vol || 1) * .55;
    // the per-speaker effect chain
    let head = out;
    if (V.fx === 'radio') { const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; const sh = ctx.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.2); } sh.curve = curve; out.connect(hp); hp.connect(lp); lp.connect(sh); head = sh; }
    else if (V.fx === 'boom') { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; const dl = ctx.createDelay(); dl.delayTime.value = .09; const fb = ctx.createGain(); fb.gain.value = .32; out.connect(lp); lp.connect(dl); dl.connect(fb); fb.connect(dl); const mix = ctx.createGain(); lp.connect(mix); dl.connect(mix); head = mix; }
    else if (V.fx === 'gravel') { const am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 40; lg.gain.value = .35; lfo.connect(lg); lg.connect(am.gain); am.gain.value = .75; out.connect(am); lfo.start(); lfo.stop(ctx.currentTime + dur + .5); head = am; }
    head.connect(bus);
    const R = mkRng(hashStr(text + speakerId)), syl = this.syllables(text), t0 = ctx.currentTime + .03, sl = 1 / (V.rate || 10);
    let t = t0; const end = text.trim().slice(-1), shout = /!/.test(text) || (text === text.toUpperCase() && /[A-Z]{3}/.test(text));
    syl.forEach((s, i) => {
      const u = i / Math.max(1, syl.length - 1), contour = end === '?' ? 1 + u * .25 : 1 - u * .12, f0 = V.base * contour * (shout || s.caps ? 1.25 : 1) * (1 + (R() - .5) * .12);
      const d = sl * (.75 + R() * .5), [f1, f2] = FORM[s.v] || FORM.a;
      // the vowel: a source through two formants
      const osc = ctx.createOscillator(); osc.type = V.wave || 'sawtooth'; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (1 + (R() - .5) * .08), t + d);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((shout ? .5 : .36), t + .012); g.gain.setValueAtTime((shout ? .45 : .32), t + d * .7); g.gain.linearRampToValueAtTime(0, t + d);
      for (const [f, q, k] of [[f1, 7, 1], [f2, 9, .6]]) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * (V.base > 190 ? 1.12 : 1); bp.Q.value = q; const gk = ctx.createGain(); gk.gain.value = k * 2.2; osc.connect(bp); bp.connect(gk); gk.connect(g); }
      g.connect(out); osc.start(t); osc.stop(t + d + .02);
      // the consonant
      const c = s.c.slice(-1);
      if (c) {
        const n = ctx.createBufferSource(); n.buffer = A._noise; const nf = ctx.createBiquadFilter(), ng = ctx.createGain();
        let cd = .012, freq = 2500, type = 'bandpass', vol = .25;
        if ('ptkbdgqc'.includes(c)) { cd = .014; freq = 'pt'.includes(c) ? 3200 : 1400; vol = .35; }
        else if ('sfhzxj'.includes(c)) { cd = .04; freq = c === 's' || c === 'z' ? 6000 : 3500; type = 'highpass'; vol = .18; }
        else if ('mn'.includes(c)) { cd = .03; freq = 300; type = 'lowpass'; vol = .3; }
        else if ('lrw'.includes(c)) { cd = .02; freq = 900; vol = .12; }
        nf.type = type; nf.frequency.value = freq; ng.gain.setValueAtTime(vol, t); ng.gain.exponentialRampToValueAtTime(.001, t + cd);
        n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t, R() * .5); n.stop(t + cd + .01);
      }
      t += d;
      const after = text.slice(s.at, (syl[i + 1] || { at: text.length }).at);
      if (/[,…—]/.test(after)) t += .12; if (/[.!?]/.test(after)) t += .25;
    });
    const h = { end: t, stop() { try { out.gain.setValueAtTime(0, ctx.currentTime); } catch (e) { /* already ended */ } } };
    if (o.bark) { this.barks++; setTimeout(() => this.barks--, (t - t0) * 1000 + 50); } else this.active.push(h);
    return dur;
  },
  bark(game, kind, base = 130) {
    const pools = { hurt: ['Ugh!', 'Hnn!', 'Agh!'], die: ['Aaagh!', 'Nooo!', 'Uwaa!'], spot: ['Hraa!', 'There!', 'Fire!'], reload: ['Reloading!'], cheer: ['Yeah!', 'Hah!'] };
    const list = pools[kind] || pools.hurt, R = fxRand, line = list[(R() * list.length) | 0];
    return this.say(game, line, null, { bark: true, vol: .7, base });
  },
  stopAll() { for (const h of this.active) h.stop(); this.active = []; }
};
TC.Voice = Voice;
