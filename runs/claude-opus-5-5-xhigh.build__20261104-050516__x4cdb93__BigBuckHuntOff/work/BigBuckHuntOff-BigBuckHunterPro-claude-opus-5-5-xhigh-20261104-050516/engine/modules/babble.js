/*!
my-3D2dge module BABBLE v0.85.2-bbho: gibberish voices (Animalese / Simlish style): a line of text spoken as pitched, formant-filtered blips
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine. Needs: no other module.

Every character talks in a voice of their own that no one can understand and everyone gets: each pair of letters becomes
a blip 40-70 ms long, its pitch stepped by its vowel, through a band-pass "mouth" tuned to that vowel; commas and full
stops pause; an exclamation rises and gets louder, a question rises at its end; a line in capitals is shouted (faster,
louder). Voices: { pitch (Hz), wave, speed (syllables a second), spread (semitones between vowels), warble (vibrato
depth), grit (noise mixed in, 0..1), formant (scales the mouth), vol, echo (seconds; 0 none) }.
- const bab = new E.Babble(game); bab.define('emcee', { pitch: 140, wave: 'square', speed: 15, echo: .18 });
- bab.say(text, 'emcee', { vol, rate }) -> seconds the line takes (also headless, where it is silent); bab.stop().
Rules: it plays through the game's effects bus (audio.bus('sfx')), so the volume settings and mute reach it; nothing
here draws from the page's random numbers: each line's wobble is seeded from its text.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module BABBLE: load engine/my-3d2dge.js first');
const VOW = { a: [0, 800, 1200], e: [4, 500, 1800], i: [7, 320, 2300], o: [-3, 520, 900], u: [-5, 360, 800], y: [5, 400, 2000] };
class Babble {
  constructor(game) { this.game = game; this.voices = {}; this._nodes = []; this._echo = new Map(); }
  define(id, v) { this.voices[id] = Object.assign({ pitch: 160, wave: 'square', speed: 13, spread: 1, warble: 0, grit: 0, formant: 1, vol: .16, echo: 0 }, v); return this; }
  /** the syllables of a line: [{ step (semitones), f1, f2, len (s), gap (s), loud }] */
  syllables(text, v, o = {}) {
    const caps = text.length > 3 && text === text.toUpperCase() && /[A-Z]/.test(text), rate = (o.rate || 1) * (caps ? 1.22 : 1), out = [];
    let seed = 0; for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) | 0;
    const R = E.rng(seed), clean = text.toLowerCase();
    let buf = '';
    const flush = (pause) => {
      if (buf) {
        const vw = [...buf].find(c => VOW[c]), V = VOW[vw || 'e'], step = V[0] * v.spread + (R() - .5) * 2;
        out.push({ step, f1: V[1] * v.formant, f2: V[2] * v.formant, len: (.045 + R() * .025) / rate * (13 / v.speed), gap: (.022 + R() * .02) / rate * (13 / v.speed), loud: caps });
        buf = '';
      }
      if (pause && out.length) out[out.length - 1].gap += pause / rate;
    };
    for (const ch of clean) {
      if (/[a-z0-9']/.test(ch)) { buf += ch; if (buf.length >= 2) flush(0); }
      else if (ch === ' ') flush(.015);
      else if (ch === ',' || ch === ';' || ch === ':') flush(.12);
      else if (ch === '.' || ch === '!' || ch === '?') flush(.22);
      else flush(0);
    }
    flush(0);
    const end = text.trim().slice(-1);
    if (out.length && (end === '!' || end === '?')) { const n = Math.min(3, out.length); for (let i = 0; i < n; i++) out[out.length - 1 - i].step += (end === '?' ? 5 : 3) * (n - i) / n; if (end === '!') out[out.length - 1].loud = true; }
    return out;
  }
  /** speak a line: returns the seconds it takes */
  say(text, id, o = {}) {
    const v = this.voices[id] || this.voices.default || this.define('default', {}).voices.default, syl = this.syllables(text, v, o);
    let dur = 0; for (const s of syl) dur += s.len + s.gap;
    const A = this.game.audio, ctx = A && A.ctx, bus = A && A.bus && !this.game.headless ? A.bus('sfx') : null;
    if (!ctx || !bus || A.muted || ctx.state !== 'running') return dur;
    this.stop();
    let t = ctx.currentTime + .02;
    const out = v.echo ? this._echoNode(ctx, bus, v.echo) : bus, vol = v.vol * (o.vol === undefined ? 1 : o.vol);
    for (const s of syl) {
      const f0 = v.pitch * Math.pow(2, s.step / 12), osc = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter(), bp2 = ctx.createBiquadFilter();
      osc.type = v.wave === 'saw' ? 'sawtooth' : v.wave; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (1 + (s.step > 0 ? .04 : -.03)), t + s.len);
      if (v.warble) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 11; lg.gain.value = f0 * v.warble; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + s.len + .02); }
      bp.type = 'bandpass'; bp.frequency.value = s.f1; bp.Q.value = 2.2; bp2.type = 'bandpass'; bp2.frequency.value = s.f2; bp2.Q.value = 3;
      const mixA = ctx.createGain(), mixB = ctx.createGain(); mixA.gain.value = 1; mixB.gain.value = .55;
      osc.connect(bp); osc.connect(bp2); bp.connect(mixA); bp2.connect(mixB); mixA.connect(g); mixB.connect(g);
      const pk = vol * (s.loud ? 1.45 : 1) * 2.4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + .008); g.gain.setValueAtTime(pk, t + s.len * .6); g.gain.linearRampToValueAtTime(0, t + s.len);
      g.connect(out); osc.start(t); osc.stop(t + s.len + .03); this._nodes.push(osc);
      if (v.grit && A._noise) { const n = ctx.createBufferSource(), ng = ctx.createGain(), nf = ctx.createBiquadFilter(); n.buffer = A._noise; nf.type = 'bandpass'; nf.frequency.value = s.f2; nf.Q.value = 1.2; ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(pk * v.grit * .7, t + .006); ng.gain.linearRampToValueAtTime(0, t + s.len * .8); n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t, (s.step + 10) * .01 % .5); n.stop(t + s.len); this._nodes.push(n); }
      t += s.len + s.gap;
    }
    if (this._nodes.length > 400) this._nodes.splice(0, this._nodes.length - 400);
    return dur;
  }
  _echoNode(ctx, bus, d) {
    let e = this._echo.get(d); if (e) return e.input;
    const input = ctx.createGain(), dl = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
    dl.delayTime.value = d; fb.gain.value = .32; wet.gain.value = .4; lp.type = 'lowpass'; lp.frequency.value = 1800;
    input.connect(bus); input.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(bus);
    this._echo.set(d, { input }); return input;
  }
  /** stop the line speaking now */
  stop() { const c = this.game.audio && this.game.audio.ctx; for (const n of this._nodes) { try { n.stop(c ? c.currentTime + .01 : 0); } catch (e) { /* already stopped */ } } this._nodes.length = 0; }
}
E.Babble = Babble;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
