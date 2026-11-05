// MASH TV: music, sound effects, Babble voices and the crowd: all synthesized in code, no audio files.
const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const mname = m => NN[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const SCALES = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], mix: [0, 2, 4, 5, 7, 9, 10] };
const RHY = ['x.x.x.x-x.x.x---', 'x--x--x-x-x-x...', 'x.xx.xx.x.xx.x--', 'x---x---x-x-x---', 'x.x.xx.-x.x.xx.-', 'x-x-x-x-x-x-x-x-', 'x..x..x.x..x.x--', 'xx.xx.xx.xx.x---'];
function lead(seed, root, scale, chords, rhy, oct) {
  const rnd = E.rng(seed), sc = SCALES[scale]; const out = []; let deg = 4;
  for (let b = 0; b < chords.length; b++) {
    const pat = RHY[rhy[b % rhy.length]], cr = chords[b]; let bar = [];
    for (const ch of pat) {
      if (ch === 'x') { const step = [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(rnd() * 8)]; deg = Math.max(0, Math.min(12, deg + step)); if (rnd() < .3) { const tones = [0, 2, 4]; deg = Math.round(deg / 7) * 7 + tones[Math.floor(rnd() * 3)] + (chords[b] - root >= 5 ? 0 : 0); deg = Math.max(0, Math.min(13, deg)); } const m = root + (oct || 12) + sc[deg % 7] + 12 * Math.floor(deg / 7) - 12; bar.push(mname(m)); }
      else bar.push(ch === '-' ? '-' : '.');
    }
    out.push(bar.join(' '));
  }
  return out.join(' ');
}
function bassLine(roots, pat, rootMidi) { return roots.map(r => pat.map(c => c === 'x' ? mname(r) : c === 'o' ? mname(r + 12) : c === '5' ? mname(r + 7) : '.').join(' ')).join(' '); }
const rep = (s, n) => Array(n).fill(s).join(' ');
function makeSongs() {
  const S = {};
  // THEME: brassy fanfare, C major, 132 bpm (a developed original motif)
  const L1 = 'G4 . C5 . E5 . G5 - - . E5 . G5 . A5 - G5 - - - E5 - C5 - D5 - - - . . . . A4 . D5 . F5 . A5 - - . F5 . A5 . B5 - A5 - - - F5 - D5 - E5 - - - . . . . C5 . E5 . G5 . C6 - - . G5 . E5 . G5 - F5 - - - A5 - C6 - B5 - A5 - G5 - - - E5 . G5 . C6 . E6 - D6 - C6 - A5 - G5 - C6 - - - - - - - . . . . . . . . ';
  const L2 = 'E5 . G5 . C6 . E6 - - . C6 . E6 . F6 - E6 - - - C6 - G5 - A5 - - - . . . . F5 . A5 . C6 . F6 - - . D6 . F6 . G6 - F6 - - - D6 - B5 - C6 - - - . . . . E6 . D6 . C6 . B5 - A5 . G5 . E5 . G5 - A5 . B5 . C6 . D6 - E6 - D6 - C6 - G5 - - - C6 - - - - - - - . . . . . . . . ';
  S.theme = { bpm: 132, steps: 4, tracks: [{ wave: 'square', vol: .12, notes: L1 + L2 }, { wave: 'pulse', vol: .06, notes: L1.split(' ').map((n, i) => i % 2 ? '.' : n === '-' ? '.' : n).join(' ') + ' ' + L2 }, { wave: 'triangle', vol: .2, notes: [48, 55, 57, 53, 48, 53, 55, 48, 52, 53, 57, 55, 48, 53, 55, 48].map(r => ['x', '.', 'x', '.', 'o', '.', 'x', '.', 'x', '.', 'x', '.', 'o', '.', 'x', '.'].map(c => c === 'x' ? mname(r) : c === 'o' ? mname(r + 12) : '.').join(' ')).join(' ') }, { wave: 'drums', vol: .22, notes: rep('k . h . s . h . k k h . s . h o', 16) }] };
  const bat = (name, o) => {
    const bars = o.chords.length; const lt = lead(o.seed, o.root, o.scale, o.chords.map(c => c), o.rhy, 12), lt2 = lead(o.seed + 7, o.root, o.scale, o.chords, o.rhy.slice().reverse(), 24);
    S[name] = { bpm: o.bpm, steps: 4, tracks: [{ name: 'lead', wave: o.leadWave, vol: .1, notes: lt }, { name: 'bass', wave: 'triangle', vol: .24, notes: bassLine(o.chords, o.bass) }, { name: 'drums', wave: 'drums', vol: .22, notes: rep(o.drums, bars) },
      { name: 'prime', wave: 'saw', vol: .1, on: false, notes: o.chords.map(c => ['x', '.', '.', 'x', '.', '.', 'x', '.', 'x', '.', '.', 'x', '.', '.', 'x', '.'].map(q => q === 'x' ? mname(c + 24) : '.').join(' ')).join(' ') },
      { name: 'intense', wave: 'drums', vol: .16, on: false, notes: rep('h h h h h h h h h h h h h h h h', bars).replace(/h/g, (m, i) => (i % 4 === 2 ? 't' : 'h')) },
      { name: 'arp', wave: 'pulse', vol: .05, notes: lt2 }] };
  };
  bat('studioBattle', { bpm: 150, root: 57, scale: 'min', chords: [45, 45, 53, 52, 45, 48, 50, 52], seed: 11, rhy: [0, 2, 4, 6], leadWave: 'square', bass: 'x.xo.x.5x.xo.x.x'.split(''), drums: 'k . h . s . h . k k h . s . h o' });
  bat('warehouseFunk', { bpm: 128, root: 55, scale: 'dor', chords: [43, 43, 48, 46, 43, 43, 50, 48], seed: 23, rhy: [1, 3, 0, 5], leadWave: 'pulse', bass: 'x..xo.x.x..xo.5.'.split(''), drums: 'k . h o k . h . k . h o k . h c' });
  bat('finaleOverture', { bpm: 160, root: 52, scale: 'min', chords: [40, 40, 36, 38, 40, 43, 41, 38], seed: 37, rhy: [6, 4, 7, 2], leadWave: 'saw', bass: 'x.x.x.x.xxx.x.o.'.split(''), drums: 'k . . k . . s . k . k . s . t t' });
  S.bossShowdown = { bpm: 170, steps: 4, tracks: [{ name: 'lead', wave: 'saw', vol: .1, notes: lead(51, 50, 'min', [38, 38, 41, 43, 38, 36, 41, 43], [7, 2, 4, 6], 12) }, { name: 'bass', wave: 'triangle', vol: .26, notes: bassLine([38, 38, 41, 43, 38, 36, 41, 43], 'xxoxxoxxxxoxxoxx'.split('')) }, { name: 'drums', wave: 'drums', vol: .24, notes: rep('k . k . s . k k k . k . s . t s', 8) }, { name: 'phase2', wave: 'square', vol: .08, on: false, notes: lead(77, 50, 'min', [38, 38, 41, 43, 38, 36, 41, 43], [0, 5, 7, 1], 24) }] };
  S.commercial = { bpm: 112, steps: 4, tracks: [{ wave: 'square', vol: .12, notes: 'C5 . E5 . G5 . E5 . C5 . G4 . C5 - - - D5 . F5 . A5 . F5 . D5 . A4 . D5 - - - E5 . G5 . B5 . G5 . E5 . B4 . E5 - - - C5 - E5 - G5 - C6 - - - - - . . . .' }, { wave: 'triangle', vol: .2, notes: 'C3 . G3 . C3 . G3 . D3 . A3 . D3 . A3 . E3 . B3 . E3 . B3 . C3 . G3 . C4 - - -' }, { wave: 'drums', vol: .14, notes: rep('k . h . s . h . k . h . s . h h', 4) }] };
  S.recap = { bpm: 100, steps: 4, tracks: [{ wave: 'sine', vol: .16, notes: 'E5 . . G5 . . B5 - - - . . A5 . . G5 . . D5 - - - . . . . E5 . . G5 . . C6 - - - . . B5 . . A5 . . G5 - - - . . . .' }, { wave: 'triangle', vol: .18, notes: 'C3 . . . G3 . . . E3 . . . G3 . . . F3 . . . C4 . . . A3 . . . C4 . . . D3 . . . A3 . . . F3 . . . A3 . . . G3 . . . D4 . . . B3 . . .' }, { wave: 'drums', vol: .1, notes: rep('. . h . s . h . . . h . s . h h', 4) }] };
  S.ending = { bpm: 96, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'C5 . E5 . G5 - - - E5 . G5 . A5 - - - G5 - - - E5 - C5 - D5 - - - - - - - F5 . A5 . C6 - - - A5 . C6 . D6 - - - C6 - - - A5 - F5 - G5 - - - - - - -' }, { wave: 'triangle', vol: .2, notes: 'C3 - - - G2 - - - A2 - - - F2 - - - F3 - - - C3 - - - D3 - - - G2 - - -' }, { wave: 'sine', vol: .08, notes: 'E4 - - - D4 - - - C4 - - - C4 - - - A4 - - - G4 - - - F4 - - - D4 - - -' }, { wave: 'drums', vol: .1, notes: rep('k . . . . . h . s . . . . . h .', 4) }] };
  return S;
}
MT.SONGS = makeSongs();
// ---- music director ----
MT.music = {
  cur: null,
  play(id, o = {}) { const g = MT.game; if (!g || !g.audio) return; if (MT.music.cur === id && !o.restart) return; MT.music.cur = id; const s = MT.SONGS[id]; if (!s) return; try { g.audio.music(s, { fade: o.fade === undefined ? .6 : o.fade }); } catch (e) { /* no audio */ } },
  stop(f) { const g = MT.game; MT.music.cur = null; try { g.audio.music(null, { fade: f || .4 }); } catch (e) { /* */ } },
  layer(name, v, fade) { const s = MT.SONGS[MT.music.cur]; if (!s || !s.tracks.some(t => t.name === name)) return; try { MT.game.audio.layer(name, v, fade === undefined ? .3 : fade); } catch (e) { /* */ } },
  intense(on) { if (MT.music._i !== on) { MT.music._i = on; MT.music.layer('intense', on ? 1 : 0, .6); } }
};
// ---- sound effects ----
const V = (wave, freq, to, dur, vol, o) => Object.assign({ wave, freq, to, dur, vol: vol === undefined ? .25 : vol }, o);
const seq = (notes, step, wave, dur, vol, o) => notes.map((n, i) => Object.assign({ wave, freq: n, dur: dur || step * 1.4, vol: vol || .22, delay: i * step }, o));
const noise = (f0, f1, dur, vol, o) => Object.assign({ wave: 'noise', freq: f0, to: f1, dur, vol, filter: 'bandpass', q: 1.2 }, o);
MT.SFX = {
  shot_blaster: V('square', 880, 330, .09, .13), shot_spread: [V('square', 760, 300, .09, .1), V('pulse', 900, 400, .1, .08, { delay: .02 }), V('square', 1000, 450, .09, .06, { delay: .04 })],
  shot_rockets: [noise(900, 200, .35, .2, { filter: 'lowpass' }), V('saw', 220, 90, .3, .12)], shot_popcorn: [V('triangle', 300, 180, .12, .22), V('sine', 150, 90, .15, .2)],
  laser: [V('saw', 120, 130, .15, .08, { vib: [30, .03] }), V('sine', 800, 790, .15, .06)], pop: [noise(1800, 300, .08, .16), V('square', 600, 200, .06, .1)],
  hitE: V('square', 300, 150, .05, .08), boom: [noise(300, 40, .5, .4, { filter: 'lowpass' }), V('sine', 120, 35, .5, .35)], rocketBoom: [noise(400, 50, .6, .45, { filter: 'lowpass' }), V('sine', 110, 30, .6, .4)],
  popcorn: [noise(2000, 900, .06, .18), V('triangle', 500, 700, .08, .14)], baton: noise(800, 300, .08, .1), clap: [noise(2400, 1800, .04, .14), noise(2400, 1800, .04, .1, { delay: .06 })],
  popperPop: [noise(3000, 400, .2, .3), V('square', 900, 120, .15, .14)], fuse: noise(3500, 3000, .5, .08, { filter: 'highpass' }), beep: V('square', 1800, 1800, .07, .1),
  mimeBlast: [noise(500, 80, .3, .3, { filter: 'lowpass' }), V('sine', 200, 60, .3, .3)], pfft: noise(2200, 600, .12, .12), beam: V('saw', 1400, 500, .12, .1), boo: V('saw', 220, 160, .3, .1, { vib: [8, .05] }),
  splat: [noise(500, 150, .15, .22), V('sine', 200, 80, .12, .15)], lens: [V('sine', 2000, 4000, .25, .08), V('triangle', 1200, 2400, .25, .06)], shell: [V('saw', 140, 50, .25, .22), noise(900, 120, .2, .22)],
  roar: [V('saw', 90, 70, .7, .26, { vib: [14, .08] }), noise(400, 200, .7, .12)], stomp: [V('sine', 90, 40, .25, .35), noise(200, 60, .2, .2, { filter: 'lowpass' })], crash: [noise(400, 60, .4, .35, { filter: 'lowpass' }), V('sine', 80, 30, .35, .3)],
  tink: [V('triangle', 2400, 2000, .05, .1), V('square', 3200, 2800, .04, .05)], bossHit: V('square', 220, 90, .08, .14), doorOpen: [V('saw', 200, 400, .35, .12), noise(600, 1200, .35, .1)], doorSlam: [noise(300, 60, .2, .35, { filter: 'lowpass' }), V('sine', 100, 40, .2, .3)],
  pyro: [noise(300, 900, .6, .25), V('saw', 80, 120, .6, .1)], alarm: seq([880, 660, 880, 660], .12, 'square', .1, .14), wheelClick: V('square', 1500, 1200, .025, .12), zip: V('saw', 1200, 300, .4, .1), land: [noise(400, 100, .1, .25, { filter: 'lowpass' }), V('sine', 100, 50, .1, .25)],
  slide: noise(2200, 500, .22, .16), flourish: seq(['C5', 'E5', 'G5', 'C6', 'E6'], .05, 'square', .09, .13), bomb: [noise(4000, 3000, .06, .3, { filter: 'highpass' }), noise(300, 40, .6, .4, { filter: 'lowpass' }), V('sine', 130, 30, .6, .36, { delay: .04 })],
  cash: [V('square', 1568, 1568, .06, .14), V('square', 2093, 2093, .16, .14, { delay: .06 })], coin: V('square', 1300, 1700, .05, .06), buzzer: [V('saw', 130, 120, .22, .22), V('square', 97, 90, .22, .14)],
  death: [V('saw', 400, 70, .8, .22, { vib: [9, .06] })], oneup: seq(['E5', 'G5', 'E6', 'C6', 'D6', 'G6'], .07, 'square', .1, .16), powerup: seq(['C5', 'E5', 'G5', 'C6', 'E6'], .045, 'square', .08, .13), expire: V('square', 500, 300, .06, .1),
  prizeFanfare: seq(['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6', 'G6'], .06, 'square', .12, .15), keyChime: seq(['E6', 'B6', 'E7'], .08, 'sine', .3, .15), primeSting: seq(['C5', 'C5', 'G5', 'C6', 'E6', 'G6', 'C7'], .07, 'saw', .18, .16),
  fanfare: seq(['G5', 'C6', 'E6', 'G6'], .08, 'square', .16, .15), tada: seq(['C5', 'E5', 'G5', 'C6'], .1, 'square', .2, .16).concat(seq(['E6', 'G6'], .1, 'square', .45, .14).map(v => Object.assign(v, { delay: v.delay + .4 }))),
  bossFanfare: seq(['C5', 'G5', 'C6', 'E6', 'G6', 'C7', 'G6', 'C7'], .1, 'saw', .22, .17), bankrupt: seq(['G4', 'F4', 'E4', 'D4', 'C4'], .16, 'saw', .26, .16, { vib: [6, .04] }), jingle: seq(['C5', 'E5', 'G5', 'E5', 'C5', 'G5', 'C6'], .09, 'square', .1, .14),
  glitch: [noise(2000, 200, .5, .2), V('square', 600, 90, .45, .12, { vib: [40, .2] })], channelFlip: noise(3000, 800, .1, .14), partDown: [noise(500, 80, .4, .3, { filter: 'lowpass' }), V('triangle', 300, 60, .3, .2)],
  bossDead: seq(['C4', 'C5', 'G4', 'C5', 'E5', 'G5', 'C6'], .12, 'saw', .24, .18), slam: [noise(300, 40, .4, .4, { filter: 'lowpass' }), V('sine', 100, 28, .4, .4)], hatch: V('triangle', 300, 600, .2, .16),
  mashStart: [V('square', 330, 330, .08, .15), V('square', 440, 440, .08, .15, { delay: .09 }), V('saw', 660, 880, .25, .17, { delay: .18 })], beacon: seq(['E5', 'G5'], .1, 'sine', .12, .12), drumHit: [noise(200, 80, .15, .3, { filter: 'lowpass' }), V('sine', 140, 60, .2, .3)],
  blip: V('square', 700, 700, .035, .08), confirm: [V('sine', 880, 880, .12, .16), V('sine', 1320, 1320, .18, .12, { delay: .05 })], back: V('square', 500, 300, .07, .1), tick: V('square', 1000, 1000, .03, .07), type: V('square', 500, 540, .02, .04),
  cheerSt: seq(['C6', 'E6', 'G6'], .04, 'square', .06, .06)
};
MT.sfxFrame = { n: {}, f: -1 };
MT.sfx = function (name, o) {
  const g = MT.game; if (!g || !g.audio || g.headless) return; const fr = MT.sfxFrame, f = Math.floor(g.real * 60);
  if (fr.f !== f) { fr.f = f; fr.n = {}; } if ((fr.n[name] = (fr.n[name] || 0) + 1) > 3) return;
  if (!g.audio.presets[name] && MT.SFX[name]) g.audio.define(name, MT.SFX[name]);
  try { g.audio.sfx(name, o); } catch (e) { /* no audio */ }
};
MT.audioDuck = function (secs) { const g = MT.game; if (!g || !g.audio || g.headless) return; try { g.audio.duck(true); MT._duckUntil = g.real + secs; } catch (e) { /* */ } };
MT.audioTick = function () { const g = MT.game; if (MT._duckUntil && g.real > MT._duckUntil) { MT._duckUntil = 0; try { g.audio.duck(false); } catch (e) { /* */ } } };
// ---- Babble: formant-synth gibberish voices ----
const VOW = { a: [800, 1200], e: [400, 2300], i: [300, 2800], o: [450, 800], u: [325, 700] };
const VOICES = {
  lance: { f0: 135, sp: 13, wave: 'sawtooth', fm: 1.0, swoop: 1.3 }, penny: { f0: 300, sp: 12, wave: 'square', fm: 1.18, giggle: 1 }, annc: { f0: 85, sp: 7, wave: 'sawtooth', fm: .85, echo: 1 },
  network: { f0: 70, sp: 8, wave: 'square', fm: .8, crush: 1, mono: 1 }, mashy: { f0: 110, sp: 9, wave: 'triangle', fm: .9, bounce: 1 }, goon: { f0: 95, sp: 10, wave: 'sawtooth', fm: .9 },
  c0: { f0: 160, sp: 12, wave: 'square', fm: 1.05 }, c1: { f0: 190, sp: 12, wave: 'square', fm: 1.05 }, c2: { f0: 215, sp: 12, wave: 'square', fm: 1.05 }, c3: { f0: 240, sp: 12, wave: 'square', fm: 1.05 }
};
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function syllables(word) { const m = word.toLowerCase().match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+$)?|[^aeiouy]+$/g) || [word]; return m.slice(0, 4); }
function plan(text, vid, o) {
  const v = VOICES[vid] || VOICES.lance, sp = (o && o.speed) || v.sp, out = []; let t = 0; const words = text.split(/\s+/).filter(Boolean);
  const q = text.trim().endsWith('?'), ex = /!/.test(text);
  words.forEach((wd, wi) => {
    const sy = syllables(wd.replace(/[^A-Za-z']/g, '') || 'a'), h = hashStr(wd.toLowerCase());
    sy.forEach((s, si) => {
      const vm = s.toLowerCase().match(/[aeiouy]/), ch = vm ? vm[0] === 'y' ? 'i' : vm[0] : 'a', on = s.toLowerCase()[0], cls = /[bdgkpqtc]/.test(on) ? 'p' : /[fshvzxj]/.test(on) ? 'f' : /[mn]/.test(on) ? 'n' : 'x';
      const dur = (1 / sp) * (.75 + ((h >> (si * 3)) & 7) / 14); const prog = wi / Math.max(1, words.length - 1);
      let cont = 1 + (q ? prog * .4 : -prog * .25) + ((h >> (si + 2)) & 3) * .03 - .04; if (ex && wd.endsWith('!') && si === sy.length - 1) cont *= 1.2; if (v.mono) cont = 1; if (v.swoop && si === 0) cont *= 1 + (wi % 2) * .12;
      out.push({ t, dur, ch, cls, f0: v.f0 * cont * (1 + (((h >> (si * 5)) & 15) - 8) * .005), v });
      t += dur;
    });
    t += /[,]$/.test(wd) ? .08 : /\.\.\.$/.test(wd) ? .3 : /[.!?]$/.test(wd) ? .16 : .02;
  });
  return { out, dur: t + .05 };
}
let _crush = null;
function voiceSyl(ctx, bus, s, t0, vol) {
  const v = s.v, t = t0 + s.t, f1 = VOW[s.ch][0] * v.fm, f2 = VOW[s.ch][1] * v.fm;
  const osc = ctx.createOscillator(); osc.type = v.wave; osc.frequency.setValueAtTime(s.f0, t); osc.frequency.linearRampToValueAtTime(s.f0 * (v.bounce ? 1.12 : 1.03), t + s.dur);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = s.f0 * .02; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + s.dur + .05);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.setValueAtTime(vol, t + Math.max(.006, s.dur - .03)); g.gain.linearRampToValueAtTime(0, t + s.dur);
  for (const f of [f1, f2]) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 8; const og = ctx.createGain(); og.gain.value = f === f1 ? 1.2 : .8; osc.connect(bp); bp.connect(og); og.connect(g); }
  let out = g;
  if (v.crush) { const ws = ctx.createWaveShaper(); if (!_crush) { _crush = new Float32Array(257); for (let i = 0; i < 257; i++) { const x = i / 128 - 1; _crush[i] = Math.round(x * 4) / 4; } } ws.curve = _crush; g.connect(ws); out = ws; }
  out.connect(bus);
  if (v.echo) { const d = ctx.createDelay(1); d.delayTime.value = .18; const fb = ctx.createGain(); fb.gain.value = .35; out.connect(d); d.connect(fb); fb.connect(d); d.connect(bus); }
  osc.start(t); osc.stop(t + s.dur + .06);
  if (s.cls !== 'x' && MT.game.audio._noise) { const n = ctx.createBufferSource(); n.buffer = MT.game.audio._noise; const f = ctx.createBiquadFilter(); f.type = s.cls === 'p' ? 'bandpass' : s.cls === 'f' ? 'highpass' : 'lowpass'; f.frequency.value = s.cls === 'p' ? 3000 : s.cls === 'f' ? 5000 : 300; const ng = ctx.createGain(); const nd = s.cls === 'p' ? .015 : s.cls === 'f' ? .05 : .04; ng.gain.setValueAtTime(vol * (s.cls === 'n' ? 1.5 : .5), t); ng.gain.exponentialRampToValueAtTime(.0005, t + nd); n.connect(f); f.connect(ng); ng.connect(bus); n.start(t); n.stop(t + nd + .02); }
}
MT.babble = {
  say(text, vid, o) {
    const p = plan(text || ' ', vid, o), g = MT.game;
    if (vid === 'goon') { MT.babble._g = (MT.babble._g || 0); }
    try {
      if (!g || !g.audio || g.headless || g.audio.muted) return p.dur;
      const au = g.audio; if (!au._init() || !au.ctx || au.ctx.state !== 'running') return p.dur;
      const ctx = au.ctx, bus = au.bus || au._sfxBus, t0 = ctx.currentTime + .03;
      for (const s of p.out) voiceSyl(ctx, bus, s, t0, vid === 'goon' ? .09 : .16);
      if (VOICES[vid] && VOICES[vid].giggle) for (let i = 0; i < 4; i++) voiceSyl(ctx, bus, { t: p.dur + i * .06, dur: .05, ch: 'i', cls: 'x', f0: 700 + i * 120, v: VOICES.penny }, t0, .1);
    } catch (e) { /* audio unavailable */ }
    return p.dur;
  },
  grunt(vid) { if (MT.babble._gc > 2) return; MT.babble._gc = (MT.babble._gc || 0) + 1; MT.babble.say('hup', vid || 'goon'); }
};
// ---- crowd ----
MT.crowd = function (kind, k) {
  const g = MT.game; if (!g || !g.audio || g.headless) return; k = Math.max(.1, Math.min(1, k || .5));
  try {
    const au = g.audio; if (!au._init() || !au.ctx || au.ctx.state !== 'running') return; const ctx = au.ctx, bus = au.bus || au._sfxBus, t0 = ctx.currentTime + .02;
    if (kind === 'cheer') { const n = 4 + Math.round(k * 6); for (let i = 0; i < n; i++) voiceSyl(ctx, bus, { t: Math.random() * .12, dur: .5 + Math.random() * .3, ch: i % 2 ? 'o' : 'a', cls: 'x', f0: (220 + Math.random() * 180) * (1 + k * .2), v: { wave: 'sawtooth', fm: 1 + (Math.random() - .5) * .2 } }, t0, .03 + k * .03); MT.sfx('applause'); }
    else if (kind === 'ooh') { for (let i = 0; i < 5; i++) voiceSyl(ctx, bus, { t: Math.random() * .08, dur: .6, ch: 'u', cls: 'x', f0: 300 - i * 6 + Math.random() * 40, v: { wave: 'triangle', fm: 1 } }, t0, .05 * k + .03); }
    else if (kind === 'laugh') { for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++) voiceSyl(ctx, bus, { t: i * .2 + c * .02, dur: .1, ch: 'a', cls: 'f', f0: 250 + c * 30 - i * 10, v: { wave: 'sawtooth', fm: 1 } }, t0, .04); }
    else if (kind === 'gasp') { voiceSyl(ctx, bus, { t: 0, dur: .3, ch: 'a', cls: 'f', f0: 400, v: { wave: 'triangle', fm: 1 } }, t0, .06); }
    else if (kind === 'boo') { for (let i = 0; i < 4; i++) voiceSyl(ctx, bus, { t: Math.random() * .1, dur: .7, ch: 'u', cls: 'x', f0: 110 + Math.random() * 20, v: { wave: 'sawtooth', fm: .8 } }, t0, .05); }
  } catch (e) { /* */ }
};
MT.SFX.applause = Array.from({ length: 14 }, (_, i) => noise(2600 + (i % 4) * 400, 1800, .05, .09, { delay: i * .09 + (i % 3) * .02, q: .8 }));
