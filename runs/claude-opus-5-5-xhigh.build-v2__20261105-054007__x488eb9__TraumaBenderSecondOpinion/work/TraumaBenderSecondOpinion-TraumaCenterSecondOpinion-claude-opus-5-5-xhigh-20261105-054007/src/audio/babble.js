// Animalese-style babble: no real speech, all on the voice bus. One syllable every 2 letters, a 40 ms gap at spaces (section 18).
(() => {
const G = (window.GAME ||= {});
const FORMANTS = { a: [730, 1090], e: [530, 1840], i: [270, 2290], o: [570, 840], u: [300, 870] };
const VOWELS = 'aeiou';
const Babble = G.Babble = {
  game: null, last: {}, init(game) { Babble.game = game; },
  /** a voice for anyone: the cast's table, or hashed from the name for patients */
  voiceOf(who) { const c = G.CAST[who]; if (c && c.voice) return c.voice; let h = 7; for (const ch of String(who)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return { base: 110 + h % 240, syl: .06 + (h >> 4) % 5 * .01, wave: ['triangle', 'sawtooth', 'sine'][h % 3] }; },
  /** one syllable at time t: the letter picks the pitch offset and, if a vowel, the formant pair */
  syllable(ctx, bus, t, ch, v, st) {
    const code = ch.charCodeAt(0), lc = ch.toLowerCase(), isV = VOWELS.includes(lc); if (isV) st.vowel = lc;
    const fm = FORMANTS[st.vowel || 'a'], f0 = v.base * (1 + (((code * 37) % 12) - 6) / 48) * (st.bend || 1), dur = v.syl, vol = .16 * (st.loud || 1) * (v.still ? .7 : 1);
    const o = ctx.createOscillator(); o.type = v.wave === 'square' ? 'square' : v.wave; o.frequency.setValueAtTime(f0, t);
    if (v.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = v.vib; lg.gain.value = f0 * .025; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .03); }
    if (v.shaky) o.frequency.linearRampToValueAtTime(f0 * (1 + Math.sin(code) * .06), t + dur);
    const b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(), g = ctx.createGain(), mix = ctx.createGain(); b1.type = b2.type = 'bandpass'; b1.frequency.value = fm[0]; b2.frequency.value = fm[1]; b1.Q.value = v.nasal ? 9 : 6; b2.Q.value = v.nasal ? 12 : 7;
    let src = o; if (v.lp) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = v.lp; o.connect(lp); src = lp; }
    src.connect(b1); src.connect(b2); b1.connect(mix); b2.connect(mix); mix.gain.value = 2.4; mix.connect(g);
    if ((v.trem && lc === 'r') || (v.trem && st.r)) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = v.trem; lg.gain.value = vol * .8; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t + dur + .03); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.setValueAtTime(vol, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur * .6 + .02);
    g.connect(bus); o.start(t); o.stop(t + dur + .04);
    if (!isV && Sfx().noiseBuf) { const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = Sfx().noiseBuf; hp.type = 'highpass'; hp.frequency.value = 2600; ng.gain.setValueAtTime(vol * .55, t); ng.gain.linearRampToValueAtTime(0, t + .012); n.connect(hp); hp.connect(ng); ng.connect(bus); n.start(t, (code * .013) % .9); n.stop(t + .02); }
    if (v.breath && Sfx().noiseBuf) { const n = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = Sfx().noiseBuf; lp.type = 'bandpass'; lp.frequency.value = 1400; ng.gain.value = vol * .25; n.connect(lp); lp.connect(ng); ng.connect(bus); n.start(t, (code * .07) % .9); n.stop(t + dur * .7); }
  },
  /** per letter, for a typed line: E.Dialog's voice option */
  letter(who, ch, i, full) {
    const a = Babble.game && Babble.game.audio, bus = a && a.bus('voice'), ctx = a && a.ctx; if (!bus || !ctx) return; Sfx().ready();
    if (ch === undefined || ch === ' ') return;
    if (i % 2 === 1) return;
    const v = Babble.voiceOf(who), st = Babble.last[who] || (Babble.last[who] = {}), s = full || '', left = s.length - i;
    st.bend = 1; st.loud = 1; const end = s[s.length - 1]; if (left < 8) { if (end === '?') st.bend = 1 + (8 - left) / 8 * .2; else if (end === '.') st.bend = 1 - (8 - left) / 8 * .15; } if (end === '!') st.loud = 1.3;
    Babble.syllable(ctx, bus, ctx.currentTime + .001, ch, v, st);
  },
  /** a whole bark at once: returns its length in seconds */
  say(who, text) {
    const a = Babble.game && Babble.game.audio, bus = a && a.bus('voice'), ctx = a && a.ctx, v = Babble.voiceOf(who), n = text.length, per = v.syl; let t = 0;
    if (!bus || !ctx) return n * per / 2; Sfx().ready();
    const st = { loud: text.endsWith('!') ? 1.3 : 1 }, t0 = ctx.currentTime + .02;
    for (let i = 0; i < n; i += 2) { const ch = text[i]; if (ch === ' ' || text[i + 1] === ' ') t += .04; if (ch === ' ') continue; const left = n - i; st.bend = 1; if (left < 8) { if (text.endsWith('?')) st.bend = 1 + (8 - left) / 8 * .2; else if (text.endsWith('.')) st.bend = 1 - (8 - left) / 8 * .15; } Babble.syllable(ctx, bus, t0 + t, ch, v, st); t += per; }
    return t;
  },
  /** a bark played backward: Second Look's reversed Quill */
  reversed(who, text) { return Babble.say(who, text.split('').reverse().join('')); },
};
const Sfx = () => G.Sfx;
})();
