// All sound is code: effects, Animalese-style voices, the HUSH choir, music. Presentation only: the sim never reads it.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const A = G.Audio = { game: null, loops: {}, choir: null };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
A.init = game => {
  A.game = game; const au = game.audio;
  const D = (n, v) => au.define(n, v);
  D('clack', { wave: 'square', freq: 'C5', to: 'C4', dur: .06, vol: .3 }); D('slap', { wave: 'noise', freq: 900, dur: .05, vol: .28 }); D('tick', { wave: 'pulse', freq: 'A5', dur: .03, vol: .22 });
  D('clink', { wave: 'triangle', freq: 'E6', to: 'G6', dur: .12, vol: .3, arp: [0, 7], step: .05 }); D('rip', { wave: 'noise', freq: 600, to: 150, dur: .22, vol: .5 }); D('thud', { wave: 'sine', freq: 90, to: 40, dur: .18, vol: .6 });
  D('chime', { wave: 'triangle', freq: 'E5', dur: .3, vol: .3, arp: [0, 7, 12], step: .07 }); D('chime2', { wave: 'sine', freq: 'C6', dur: .25, vol: .3, arp: [0, 4], step: .08 });
  D('twang', { wave: 'saw', freq: 'G4', to: 'D4', dur: .14, vol: .2 }); D('plunger', { wave: 'noise', freq: 2400, to: 800, dur: .24, vol: .25 }); D('pop', { wave: 'sine', freq: 400, to: 800, dur: .06, vol: .3 });
  D('beep', { wave: 'sine', freq: 'A5', dur: .08, vol: .14 }); D('alarm', { wave: 'square', freq: 'E6', dur: .1, vol: .12, arp: [0, 0], step: .14 });
  D('whine', { wave: 'saw', freq: 200, to: 2400, dur: .9, vol: .2 }); D('bang', { wave: 'noise', freq: 1400, to: 60, dur: .4, vol: .8 }); D('choirSwell', { wave: 'saw', freq: 'C3', to: 'C4', dur: 1.2, vol: .2, vib: [6, .02] });
  D('found', { wave: 'sine', freq: 'A5', dur: .1, vol: .25, arp: [0, 5], step: .06 }); D('stamp', { wave: 'noise', freq: 300, to: 60, dur: .22, vol: .8 }); D('gulp', { wave: 'sine', freq: 200, to: 80, dur: .1, vol: .4 });
  D('rewind', { wave: 'saw', freq: 1800, to: 120, dur: 1.1, vol: .18, vib: [30, .1] }); D('lb', { wave: 'sine', freq: 'A3', to: 'A2', dur: .8, vol: .4 }); D('lbOff', { wave: 'sine', freq: 'A2', to: 'A4', dur: .5, vol: .3 });
  D('sed', { wave: 'sine', freq: 'C5', to: 'C4', dur: .3, vol: .3 }); D('burn', { wave: 'noise', freq: 3200, dur: .1, vol: .3 }); D('dose', { wave: 'sine', freq: 'G5', dur: .12, vol: .3 }); D('select', { wave: 'square', freq: 'A4', dur: .04, vol: .12 });
  au.instrument('pluck', (ctx, bus, time, freq, dur, vol) => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, time); f.frequency.exponentialRampToValueAtTime(freq * 1.2, time + dur); g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(vol, time + .005); g.gain.exponentialRampToValueAtTime(.001, time + dur); o.connect(f); f.connect(g); g.connect(bus); o.start(time); o.stop(time + dur + .02); });
};
A.sfx = (n, o) => { try { return A.game.audio.sfx(n, o); } catch (e) { return null; } };
A.ctx = () => A.game && A.game.audio.ctx;
const noiseBuf = () => { const au = A.game.audio; return au._noise; };
// ---- loops: suction gurgle, cautery sizzle, scalpel hiss, sonar ping, heartbeat drone, rain
A.loop = (name, mk) => { const c = A.ctx(); if (!c) return null; if (!A.loops[name]) A.loops[name] = mk(c); return A.loops[name]; };
const noiseLoop = (c, type, freq, q) => { const src = c.createBufferSource(); src.buffer = noiseBuf(); src.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1; const g = c.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(A.game.audio.bus('sfx')); src.start(); return { src, f, g, on: false }; };
A.hold = (name, on, p = {}) => { // p: vol, freq
  const L = A.loop(name, c => name === 'suction' ? noiseLoop(c, 'bandpass', 500, 4) : name === 'cautery' ? noiseLoop(c, 'highpass', 4000, 1) : name === 'scalpel' ? noiseLoop(c, 'bandpass', 3000, 3) : name === 'rain' ? noiseLoop(c, 'lowpass', 1800, .5) : noiseLoop(c, 'bandpass', 1200, 2)); if (!L) return;
  const t = A.ctx().currentTime; L.g.gain.setTargetAtTime(on ? (p.vol ?? .25) : 0, t, .03); if (p.freq) L.f.frequency.setTargetAtTime(p.freq, t, .05);
};
A.ping = (rate) => { const t = A.game.real; if (!(A._pingT > t)) { A._pingT = t + clamp(1.2 - rate, .12, 1.2); A.sfx('found', { vol: .3 + rate * .5, pitch: .8 + rate }); } };
A.silence = () => { for (const k in A.loops) A.hold(k, false); if (A.choir) A.choir.set(0); };
// ---- Animalese: one syllable every two letters
const FORM = { a: [730, 1090], e: [530, 1840], i: [270, 2290], o: [570, 840], u: [300, 870] };
const VOICES = { vale: [340, .055, 'triangle', 0], quill: [105, .095, 'sawtooth', 1400], oyelaran: [170, .09, 'triangle', 0], sokolova: [150, .08, 'sawtooth', 0], percy: [210, .07, 'square', 0], odalys: [300, .05, 'triangle', 0], hale: [125, .11, 'sine', 0], clementine: [390, .09, 'sine', 0] };
A.voiceFor = name => { const k = (name || '').toLowerCase(); for (const id in VOICES) if (k.includes(id) || (id === 'vale' && k.includes('immy')) || (id === 'sokolova' && k.includes('zhenya'))) return id; let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 'p' + (h % 7); };
A.syl = (voice, code, o = {}) => { const au = A.game && A.game.audio, c = A.ctx(); if (!c || c.state !== 'running') return; let v = VOICES[voice]; if (!v) { const n = +voice.slice(1) || 0; v = [160 + n * 28, .06 + (n % 3) * .01, n % 2 ? 'triangle' : 'sawtooth', 0]; }
  const [base, dur0, wave, lp] = v, dur = (o.dur || dur0), t = c.currentTime + (o.delay || 0), f0 = base * (1 + (((code * 37) % 12) - 6) / 48) * (o.pitch || 1) * (o.q ? 1.2 : 1) * (o.ex ? 1 : 1);
  const vow = 'aeiou'[code % 5], [f1, f2] = FORM[vow], osc = c.createOscillator(), g = c.createGain(), b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(); osc.type = wave; osc.frequency.setValueAtTime(f0, t); if (o.slope) osc.frequency.linearRampToValueAtTime(f0 * (1 + o.slope), t + dur);
  b1.type = b2.type = 'bandpass'; b1.frequency.value = f1; b2.frequency.value = f2; b1.Q.value = b2.Q.value = 5; const out = c.createGain(); out.gain.value = (o.ex ? 1.3 : 1) * (o.vol || .5);
  osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); let node = g; if (lp) { const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; g.connect(l); node = l; } node.connect(out); const bus = au.bus('voice'); if (o.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = o.pan; out.connect(pn); pn.connect(bus); } else out.connect(bus);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .006); g.gain.setValueAtTime(1, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur * .6 + .02); osc.start(t); osc.stop(t + dur + .05);
  if (/[^aeiou]/.test(String.fromCharCode(code)) && !o.noTick) { const n = c.createBufferSource(); n.buffer = au._noise; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const ng = c.createGain(); ng.gain.setValueAtTime(.25, t); ng.gain.linearRampToValueAtTime(0, t + .012); n.connect(hp); hp.connect(ng); ng.connect(bus); n.start(t); n.stop(t + .02); } };
// speak a whole line (for barks): returns approximate seconds
A.speak = (name, text, o = {}) => { const v = A.voiceFor(name), dur = (VOICES[v] || [0, .07])[1] || .07; let t = 0; const last = text.trim().slice(-1); for (let i = 0; i < text.length; i += 2) { const ch = text[i], code = ch.toLowerCase().charCodeAt(0); if (ch === ' ') { t += .04; continue; } const frac = i / text.length; const slope = last === '?' && frac > .7 ? .2 : last === '.' ? -.15 * frac : 0; A.syl(v, code, { delay: t, dur, ex: last === '!', slope, pan: o.pan }); t += dur * .8; if (t > 2.6) break; } return t; };
A.dialogVoice = (ch, i, talk) => { if (i % 2 || ch === ' ' || !talk) return; const nm = talk.speaker || (talk.cur && talk.cur.name) || (talk.line && talk.line.name) || ''; A.syl(A.voiceFor(nm), ch.toLowerCase().charCodeAt(0) || 97, {}); };
// ---- the choir: HUSH's song. one voice with a figure; effects bus, so the player can hunt by ear
A.choirStart = () => { if (A.choir) return A.choir; const c = A.ctx(); if (!c) return null; const out = c.createGain(); out.gain.value = 0; const pan = c.createStereoPanner ? c.createStereoPanner() : null; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4; f.frequency.value = 700; const oscs = [0, -9, 8].map(d => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 196; o.detune.value = d; o.connect(f); o.start(); return o; });
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5; lg.gain.value = 3; lfo.connect(lg); oscs.forEach(o => lg.connect(o.detune)); lfo.start(); const sh = c.createGain(); sh.gain.value = 1; f.connect(sh); sh.connect(out);
  const dl = c.createDelay(1); dl.delayTime.value = .31; const fb = c.createGain(); fb.gain.value = .35; out.connect(dl); dl.connect(fb); fb.connect(dl); const wet = c.createGain(); wet.gain.value = .5; dl.connect(wet); const bus = A.game.audio.bus('sfx'); if (pan) { out.connect(pan); wet.connect(pan); pan.connect(bus); } else { out.connect(bus); wet.connect(bus); }
  A.choir = { out, pan, f, oscs, sh, lfo, set(v, o = {}) { const t = c.currentTime; out.gain.setTargetAtTime(v * .3, t, .1); if (o.pan != null && pan) pan.pan.setTargetAtTime(clamp(o.pan, -1, 1), t, .1); if (o.freq) oscs.forEach(x => x.frequency.setTargetAtTime(o.freq, t, .15)); if (o.form) f.frequency.setTargetAtTime(o.form, t, .2); lfo.frequency.setTargetAtTime(o.vib || 5, t, .1); }, shake(on) { sh.gain.setTargetAtTime(1, c.currentTime, .02); } }; return A.choir; };
// per-step choir update from the sim state: nearest strain pans it, Sonar swells it, each strain has its own figure
A.choirUpdate = (S, W) => {
  const ch = A.choirStart(); if (!ch) return; const c = A.ctx(); if (!S || S.hushCut) { ch.set(0); return; }
  let best = null, bd = 1e9; const pl = S.pl[0]; for (const o of S.objs) if (o.strain && !o.done) { const d = Math.hypot(o.x - pl.x, o.y - pl.y); if (d < bd) { bd = d; best = o; } }
  if (!best) { ch.set(0); return; }
  const fig = { bead: [330, 3, .5], nest: [330, 3, .5], legato: [196, 5, .4], tremolo: [247, 9, .6], reed: [247, 9, .5], lobe: [262, 5, .5], dacapo: [262, 5, .5], fermata: [220, 5, .4], cantor: [165, 6, .7], mouth: [165, 6, .6], voicebox: [147, 4, .7], tendril: [196, 5, .4] }[best.type] || [220, 5, .4];
  let gain = fig[2] * (S.pl.some(p => p.son) ? 1.6 : .7) * clamp(1.2 - bd / 320, .25, 1); if (best.type === 'bead' || best.type === 'nest') gain *= (Math.floor(S.rt * 4 / (G.T('staccatoBeat') * 2)) % 2 ? 0.2 : 1);
  if (best.type === 'tremolo') gain *= .7 + .3 * Math.sin(S.rt * 56);
  ch.set(gain, { pan: (best.x - 213) / 213, freq: fig[0], vib: fig[1], form: 500 + 500 * Math.sin(S.rt * .5) });
};
A.heartbeat = (vitals) => { A.sfx('thud', { vol: .5, pitch: 1.1 }); setTimeout(() => A.sfx('thud', { vol: .3, pitch: 1.4 }), 140); };
})();
