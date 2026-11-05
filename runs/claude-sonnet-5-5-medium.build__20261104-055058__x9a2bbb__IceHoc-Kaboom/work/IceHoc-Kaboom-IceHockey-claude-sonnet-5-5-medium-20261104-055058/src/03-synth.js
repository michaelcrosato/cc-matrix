/* ---- SYNTH: every sound, song and voice is written in code ---- */
const Synth = (() => {
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midiOf = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? NOTE[m[1]] + 12 * (+m[2] + 1) : 60; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const nameOf = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const ctx = () => A.ctx;
  // ---- sfx (engine chip voices) ----
  const SFX = {
    tock: { wave: 'noise', freq: 1800, to: 900, dur: .035, vol: .22, filter: 'bandpass', q: 3 }, thwap: { wave: 'noise', freq: 1400, to: 500, dur: .08, vol: .3, filter: 'bandpass', q: 2 },
    snap: [{ wave: 'noise', freq: 2400, to: 700, dur: .06, vol: .34, filter: 'bandpass', q: 1.5 }, { wave: 'triangle', freq: 220, to: 90, dur: .08, vol: .25 }],
    slap: [{ wave: 'noise', freq: 3000, to: 400, dur: .11, vol: .4, filter: 'bandpass', q: 1 }, { wave: 'sine', freq: 300, to: 60, dur: .16, vol: .35 }, { wave: 'noise', freq: 900, to: 200, dur: .3, vol: .12, filter: 'lowpass' }],
    onetimer: [{ wave: 'noise', freq: 3400, to: 300, dur: .13, vol: .45, filter: 'bandpass', q: 1 }, { wave: 'sine', freq: 340, to: 50, dur: .2, vol: .4 }],
    ping: [{ wave: 'triangle', freq: 1850, dur: .9, vol: .32 }, { wave: 'triangle', freq: 1862, dur: .7, vol: .2 }, { wave: 'sine', freq: 3700, dur: .35, vol: .08 }], ping2: [{ wave: 'triangle', freq: 2100, dur: .8, vol: .3 }, { wave: 'triangle', freq: 2115, dur: .6, vol: .16 }],
    boards: [{ wave: 'sine', freq: 140, to: 60, dur: .15, vol: .4 }, { wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .2, filter: 'lowpass' }], glass: [{ wave: 'noise', freq: 4000, to: 2500, dur: .05, vol: .25, filter: 'bandpass', q: 4 }, { wave: 'sine', freq: 1700, to: 1500, dur: .35, vol: .08 }],
    net: { wave: 'noise', freq: 2500, to: 600, dur: .35, vol: .2, filter: 'highpass' }, thump: [{ wave: 'sine', freq: 110, to: 45, dur: .16, vol: .45 }, { wave: 'noise', freq: 700, to: 200, dur: .1, vol: .2, filter: 'lowpass' }],
    bighit: [{ wave: 'sine', freq: 90, to: 28, dur: .34, vol: .6 }, { wave: 'noise', freq: 900, to: 100, dur: .3, vol: .35, filter: 'lowpass' }, { wave: 'noise', freq: 4200, to: 3000, dur: .18, vol: .15, filter: 'bandpass', q: 3 }],
    crack: { wave: 'noise', freq: 5000, to: 3000, dur: .06, vol: .35, filter: 'bandpass', q: 5 },
    shatter: [{ wave: 'noise', freq: 4500, to: 800, dur: .5, vol: .4, filter: 'highpass' }].concat([0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ wave: 'sine', freq: 3200 - i * 260, to: 1200, dur: .35 + i * .04, vol: .05 }))),
    whistle: [{ wave: 'square', freq: 3000, vib: [26, .05], dur: .28, vol: .1 }, { wave: 'square', freq: 3500, vib: [24, .05], dur: .28, vol: .08 }],
    buzzer: { wave: 'square', freq: 220, dur: 1.4, vol: .18 }, punch: [{ wave: 'sine', freq: 130, to: 45, dur: .12, vol: .5 }, { wave: 'noise', freq: 1800, to: 300, dur: .08, vol: .25, filter: 'bandpass', q: 1 }], whiff: { wave: 'noise', freq: 800, to: 2200, dur: .12, vol: .14, filter: 'bandpass', q: 1 },
    twinkle: { wave: 'sine', freq: 1900, to: 2600, dur: .2, vol: .1 }, pickup: { wave: 'square', freq: 'C5', arp: [0, 4, 7, 12], step: .05, dur: .22, vol: .16 }, throw: { wave: 'noise', freq: 400, to: 1800, dur: .35, vol: .18, filter: 'bandpass', q: 1 },
    splort: [{ wave: 'noise', freq: 600, to: 120, dur: .3, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 200, to: 60, dur: .2, vol: .3 }], boomsub: { wave: 'sine', freq: 70, to: 25, dur: .9, vol: .6 },
    ooga: [{ wave: 'square', freq: 330, to: 440, dur: .28, vol: .14 }, { wave: 'square', freq: 250, to: 150, dur: .3, vol: .14 }], mrk: { wave: 'sine', freq: 880, dur: .1, vol: .08 },
    skid: { wave: 'noise', freq: 4200, to: 900, dur: .22, vol: .2, filter: 'bandpass', q: 1.4 }, swish: { wave: 'noise', freq: 2600, to: 1800, dur: .08, vol: .05, filter: 'highpass' },
    mv: { wave: 'triangle', freq: 'A4', dur: .05, vol: .1 }, ok: { wave: 'triangle', freq: 'E5', arp: [0, 7], step: .04, dur: .12, vol: .14 }, back: { wave: 'triangle', freq: 'E4', to: 'A3', dur: .12, vol: .12 },
    fanfare: { wave: 'square', freq: 'G4', arp: [0, 5, 9, 12, 9, 12], step: .09, dur: .6, vol: .12 }, star: { wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12, 16], step: .06, dur: .5, vol: .14 }, drop: { wave: 'sine', freq: 600, to: 80, dur: .4, vol: .2 },
    bonk: { wave: 'square', freq: 200, to: 80, dur: .15, vol: .14 }, slip: { wave: 'saw', freq: 600, to: 120, dur: .35, vol: .1 }, splash: { wave: 'noise', freq: 1500, to: 300, dur: .4, vol: .25, filter: 'lowpass' }
  };
  function init() { for (const k in SFX) A.define(k, SFX[k]); }
  const sfx = (name, o) => { try { A.sfx(name, o); } catch (e) {} };
  // ---- organ ----
  let organWave = null, brassWave = null;
  const getBrass = (c) => { if (brassWave) return brassWave; const re = new Float32Array(10), im = new Float32Array(10); [1, .35, .9, .25, .7, .15, .5, .1, .3].forEach((v, i) => { im[i + 1] = v; }); return (brassWave = c.createPeriodicWave(re, im)); };
  const getOrgan = (c) => { if (organWave) return organWave; const re = new Float32Array(9), im = new Float32Array(9); [1, 2, 3, 4, 6, 8].forEach((h, i) => { im[h] = [1, .8, .55, .4, .2, .15][i]; }); return (organWave = c.createPeriodicWave(re, im)); };
  function tone(c, bus, f, t0, dur, vol, o = {}) {
    const osc = c.createOscillator(), g = c.createGain(); if (o.wave === 'organ') osc.setPeriodicWave(getOrgan(c)); else if (o.wave === 'brass') osc.setPeriodicWave(getBrass(c)); else osc.type = o.wave || 'sawtooth'; osc.frequency.setValueAtTime(f, t0); if (o.to) osc.frequency.linearRampToValueAtTime(o.to, t0 + dur);
    let node = osc; if (o.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = o.q || .7; osc.connect(lp); node = lp; }
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = f * o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + .1); }
    node.connect(g); g.connect(bus); const a = o.attack || .01; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + a); g.gain.setValueAtTime(vol, t0 + Math.max(a, dur - (o.rel || .06))); g.gain.linearRampToValueAtTime(0, t0 + dur);
    osc.start(t0); osc.stop(t0 + dur + .02); return osc;
  }
  /** seq: "G4:1 C5:1 E5:2" (note:beats, '-' rest), tempo bpm */
  function organ(seq, bpm = 140, vol = .16) { const c = ctx(); if (!c || A.muted) return 0; const bus = A.bus('sfx'), spb = 60 / bpm; let t = c.currentTime + .02; for (const tok of seq.split(/\s+/)) { if (!tok) continue; const [n, b] = tok.split(':'), beats = +b || 1; if (n !== '-') tone(c, bus, hz(midiOf(n)), t, beats * spb * .95, vol, { wave: 'organ', vib: [6, .004], attack: .015 }); t += beats * spb; } return t - c.currentTime; }
  const ORGAN = { charge: 'G4:.5 C5:.5 E5:.5 G5:1 E5:.5 G5:2', vamp: 'C4:.5 C#4:.5 D4:.5 D#4:.5 E4:.5 F4:.5 F#4:.5 G4:1.5', clap: 'C5:.5 -:.5 C5:.5 -:.5 C5:.5 G4:.5 -:.5 G4:.5 C5:1', sad: 'G4:1 F#4:1 F4:1 E4:3', fight: 'A3:.5 A3:.5 C4:.5 A3:.5 E4:.5 D#4:.5 D4:1.5', welcome: 'E4:.5 G4:.5 B4:.5 E5:1 B4:.5 E5:1.5' };
  const GOALSONG = { muskrats: 'C5:.5 C5:.5 E5:.5 G5:1 E5:.5 C5:.5 G4:1.5', drillers: 'D4:.5 D4:.5 F4:.5 A4:1 G4:.5 F4:.5 D4:1.5', lumberjacks: 'E4:.5 G4:.5 E4:.5 B4:1 A4:.5 G4:.5 E4:1.5', bruisers: 'A3:.5 A3:.5 C4:.5 E4:.5 A4:1 G4:.5 E4:1.5', marauders: 'C5:.5 E5:.5 G5:.5 C6:1 G5:.5 E5:.5 C5:1.5', grizzlies: 'G4:.5 B4:.5 D5:.5 G5:1.5 D5:.5 G5:1.5' };
  // ---- goal horn ----
  function horn(double) {
    const c = ctx(); if (!c || A.muted) return; const bus = A.bus('sfx'), t0 = c.currentTime + .02;
    for (let k = 0; k < (double ? 2 : 1); k++) { const t = t0 + k * 1.6; [98, 147, 196].forEach((f, i) => { for (const dt of [-3, 3]) { const o = tone(c, bus, f * Math.pow(2, dt / 1200), t, 2.8, .13, { wave: 'brass', lp: 900, attack: .25, rel: .5 }); } });
      const nb = noise(c, 2.6); const g = c.createGain(), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; nb.connect(f); f.connect(g); g.connect(bus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .3); g.gain.linearRampToValueAtTime(0, t + 2.6); nb.start(t); nb.stop(t + 2.7); }
  }
  let nbuf = null;
  function noise(c, dur) { if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = c.createBufferSource(); s.buffer = nbuf; s.loop = true; return s; }
  // ---- babble voices ----
  const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700] };
  const vowelOf = (ch, next) => { const l = ch.toLowerCase(); if ('aeiou'.includes(l)) return l; const n = (next || 'a').toLowerCase(); return 'aeiou'.includes(n) ? n : 'aeiou'[(l.charCodeAt(0) * 7) % 5]; };
  let lastBlip = 0;
  function blip(vk, ch, next, when, o = {}) {
    const c = ctx(); if (!c) return; const v = VOICES[vk] || VOICES.gen, bus = A.bus('voice'), t = when == null ? c.currentTime + .005 : when;
    const vow = vowelOf(ch, next), semis = ((ch.toLowerCase().charCodeAt(0) * 5) % 7) - 3 + (o.lift || 0), f0 = v.base * Math.pow(2, semis / 12), dur = clamp(.9 / v.speed, .055, .085) * (o.long ? 1.6 : 1);
    const osc = c.createOscillator(); osc.type = v.wave === 'saw' ? 'sawtooth' : 'square'; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (o.glide || 1), t + dur);
    if (v.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = v.vib; lg.gain.value = f0 * .04; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + .02); }
    const g = c.createGain(), mix = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .008); g.gain.linearRampToValueAtTime(0, t + dur);
    for (const fm of FORM[vow]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fm * v.fs; bp.Q.value = 6; osc.connect(bp); bp.connect(mix); }
    mix.connect(g); g.connect(bus); osc.start(t); osc.stop(t + dur + .02);
    if (v.gruff > .05 || 'stkp'.includes(ch.toLowerCase())) { const n = noise(c, .1), ng = c.createGain(), nf = c.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2500; n.connect(nf); nf.connect(ng); ng.connect(bus); const lvl = 'stkp'.includes(ch.toLowerCase()) ? .25 : v.gruff * .12; ng.gain.setValueAtTime(lvl, t); ng.gain.linearRampToValueAtTime(0, t + (('stkp'.includes(ch.toLowerCase())) ? .012 : dur)); n.start(t); n.stop(t + dur + .02); }
  }
  /** a whole line, scheduled ahead; returns its length in seconds */
  function babble(text, vk, o = {}) {
    const c = ctx(); if (!c || A.muted) return 0; const v = VOICES[vk] || VOICES.gen, step = 1 / v.speed; let t = c.currentTime + .02; const letters = String(text).replace(/\{[^}]*\}/g, '').split(''); const n = letters.length; let k = 0, syl = 0;
    const endSyl = letters.filter(ch => /[a-z]/i.test(ch)).length;
    for (let i = 0; i < n; i++) { const ch = letters[i]; if (/[a-z]/i.test(ch)) { if (k++ % 2 === 0 || 'aeiou'.includes(ch.toLowerCase())) { const last = endSyl - syl <= 4; blip(vk, ch, letters[i + 1], t, { lift: (o.excl && last ? 4 : 0), glide: o.ask && endSyl - syl <= 1 ? 1.4 : 1 }); t += step; } syl++; } else if (ch === ',') t += .12; else if (ch === '.' || ch === '?' || ch === '!') t += .22; }
    return t - c.currentTime;
  }
  /** E.Dialog's voice hook for a speaker */
  const dialogVoice = (vk) => (i, page) => { const ch = page && page[i]; if (!ch || !/[a-z]/i.test(ch)) return; const now = performance.now(); const v = VOICES[vk] || VOICES.gen; if (now - lastBlip < 700 / v.speed) return; lastBlip = now; blip(vk, ch, page[i + 1]); };
  // ---- crowd ----
  let crowd = null, exc = 0;
  function crowdStart() {
    const c = ctx(); if (!c || crowd) return; const bus = A.bus('crowd'); crowd = [];
    for (const [fq, q] of [[400, .8], [1200, .7]]) { const n = noise(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q; n.connect(f); f.connect(g); g.connect(bus); g.gain.value = 0; n.start(); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = .3 + Math.random() * .2; lg.gain.value = .02; l.connect(lg); lg.connect(g.gain); l.start(); crowd.push(g); }
  }
  function crowdSet(e) { exc = e; if (!crowd) return; const c = ctx(); crowd[0].gain.setTargetAtTime(.03 + e * .22, c.currentTime, .3); crowd[1].gain.setTargetAtTime(.01 + e * .16, c.currentTime, .3); }
  function react(kind) {
    const c = ctx(); if (!c || A.muted) return; const bus = A.bus('crowd'), t = c.currentTime + .01;
    const sweep = (f0, f1, dur, vol, q = 1.2) => { const n = noise(c), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur); n.connect(f); f.connect(g); g.connect(bus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .25); g.gain.linearRampToValueAtTime(0, t + dur); n.start(t); n.stop(t + dur + .05); };
    if (kind === 'ohh') sweep(1100, 380, .9, .4); else if (kind === 'ahh') sweep(500, 900, .8, .3); else if (kind === 'cheer') { sweep(800, 1400, 1.6, .5); for (let i = 0; i < 5; i++) blip('snipes', 'aeiou'[i % 5], 'a', t + i * .09); } else if (kind === 'boo') sweep(300, 180, 1.2, .45, 2); else if (kind === 'roar') sweep(600, 1300, 2.6, .6, .8);
    else if (kind === 'chant') for (let i = 0; i < 8; i++) { const vk = ['marge', 'dunny', 'lou', 'snipes', 'moose', 'chuck'][i % 6]; blip(vk, 'ka'[i % 2], 'o', t + (i >> 1) * .38 + (i % 2) * .02, { long: 1 }); }
  }
  // ---- songs ----
  const bars = (arr) => arr.join(' | ');
  function chord(root, minor) { const r = midiOf(root + '3'); return [r, r + (minor ? 3 : 4), r + 7]; }
  function mkSong(o) {
    const { bpm, prog, minor = true, lead = 'sq', drums = 'rock', leadVol = .09, wave = 'square', bassWave = 'triangle', pad = 'saw', feel = 0 } = o;
    const L = [], B = [], P = [], D = [], ARP = [];
    prog.forEach((root, bi) => { const ch = chord(root, Array.isArray(minor) ? minor[bi] : minor), tn = i => nameOf(ch[i] + 12), tn2 = i => nameOf(ch[i] + 24);
      B.push(bars([0]).length && [nameOf(ch[0] - 12), '.', nameOf(ch[0] - 12), '.', nameOf(ch[0] - 12), '.', nameOf(ch[0]), '.'].join(' '));
      P.push([nameOf(ch[0]), '-', '-', '-', nameOf(ch[2]), '-', '-', '-'].join(' '));
      const pat = [[0, 1, 2, 1, 2, 1, 0, 1], [2, '.', 1, 2, 0, '.', 1, 2], [0, '.', 2, '.', 1, '.', 2, 1], [1, 2, '.', 2, 1, 0, '.', 2]][(bi + feel) % 4];
      L.push(pat.map(x => x === '.' ? '.' : tn2(x)).join(' '));
      ARP.push([0, 2, 1, 2, 0, 2, 1, 2].map(x => tn(x)).join(' '));
      D.push({ rock: 'k . h . s . h h', slow: 'k . . h s . . h', waltz: 'k . h . h . s . h', punk: 'k h s h k h s h', pop: 'k . h . s . h .', march: 'k . s . k . s s', none: '. . . . . . . .' }[drums]);
    });
    const tracks = [{ wave, vol: leadVol, notes: L.join(' | ') }, { wave: bassWave, vol: .3, notes: B.join(' | ') }, { wave: pad === 'saw' ? 'saw' : pad, vol: .03, notes: P.join(' | ') }];
    if (drums !== 'none') tracks.push({ wave: 'drums', vol: .09, notes: D.join(' | ') });
    return { bpm, steps: 4, tracks, _meta: o };
  }
  const SONGS = {
    theme: mkSong({ bpm: 148, prog: ['E', 'E', 'A', 'B'], minor: [true, true, false, false], drums: 'rock', leadVol: .1, feel: 0 }),
    menu: mkSong({ bpm: 100, prog: ['E', 'C', 'A', 'B'], minor: [true, false, true, false], drums: 'slow', leadVol: .06, feel: 1, wave: 'triangle' }),
    locker: mkSong({ bpm: 92, prog: ['A', 'A', 'F', 'G'], minor: [true, true, false, false], drums: 'slow', leadVol: .05, feel: 2, wave: 'triangle', bassWave: 'saw' }),
    pond: mkSong({ bpm: 120, prog: ['D', 'G', 'A', 'D'], minor: false, drums: 'waltz', leadVol: .08, feel: 3, wave: 'pulse' }),
    grind: mkSong({ bpm: 168, prog: ['E', 'G', 'D', 'A'], minor: [true, false, false, true], drums: 'punk', leadVol: .09, feel: 1, wave: 'saw' }),
    mall: mkSong({ bpm: 112, prog: ['C', 'A', 'F', 'G'], minor: [false, true, false, false], drums: 'pop', leadVol: .08, feel: 2, wave: 'square' }),
    final: mkSong({ bpm: 132, prog: ['D', 'B', 'G', 'A'], minor: [true, true, false, false], drums: 'march', leadVol: .1, feel: 3, wave: 'saw' }),
    play: mkSong({ bpm: 126, prog: ['A', 'F', 'C', 'G'], minor: [true, false, false, false], drums: 'rock', leadVol: .035, feel: 0, wave: 'pulse' }),
    flood: mkSong({ bpm: 108, prog: ['G', 'D', 'E', 'D'], minor: [false, false, true, false], drums: 'waltz', leadVol: .08, feel: 2, wave: 'triangle' }),
    victory: mkSong({ bpm: 140, prog: ['C', 'F', 'G', 'C'], minor: false, drums: 'march', leadVol: .11, feel: 1, wave: 'square' }),
    defeat: mkSong({ bpm: 70, prog: ['A', 'F', 'D', 'E'], minor: true, drums: 'none', leadVol: .08, feel: 0, wave: 'triangle' }),
    credits: mkSong({ bpm: 96, prog: ['E', 'C', 'G', 'D'], minor: [true, false, false, false], drums: 'slow', leadVol: .09, feel: 3, wave: 'square' })
  };
  // layers on the play song: drive (3rd period/OT), kaboom, fight
  SONGS.play.tracks.push({ wave: 'saw', name: 'drive', on: false, vol: .05, notes: 'A2 A2 . A2 A2 . A2 A2 | F2 F2 . F2 F2 . F2 F2 | C3 C3 . C3 C3 . C3 C3 | G2 G2 . G2 G2 . G2 G2' });
  SONGS.play.tracks.push({ wave: 'saw', name: 'kaboom', on: false, vol: .12, notes: 'A1 A1 A2 A1 A1 A2 A1 A2 | F1 F1 F2 F1 F1 F2 F1 F2 | C2 C2 C3 C2 C2 C3 C2 C3 | G1 G1 G2 G1 G1 G2 G1 G2' });
  SONGS.play.tracks.push({ wave: 'drums', name: 'kaboomdrums', on: false, vol: .12, notes: 'k k h k s k h k | k k h k s k h s | k k h k s k h k | k s h s k s k s' });
  SONGS.play.tracks.push({ wave: 'saw', name: 'fight', on: false, vol: .08, notes: 'A2 . . A2 C3 . . A2 | A2 . . A2 D#3 . . D3 | A2 . . A2 C3 . . A2 | E3 . . D#3 D3 . . A2' });
  let current = null;
  const music = (name, o) => { try { if (name === current && !(o && o.force)) return; current = name; A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); } catch (e) { game.fail('music', e); } };
  return { init, sfx, organ, ORGAN, GOALSONG, horn, babble, blip, dialogVoice, crowdStart, crowdSet, react, music, SONGS, hz, midiOf, current: () => current, reset() { current = null; } };
})();
