// audio: songs (generated from seeded progressions), sfx specs, Animalese babble, balance tone. No audio files.
(() => {
const E = My3D2dge, G = window.G;
const NM = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], nn = m => NM[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const SCALES = { maj: [0, 2, 4, 7, 9], lyd: [0, 2, 4, 6, 7, 9, 11], min: [0, 3, 5, 7, 10], dor: [0, 2, 3, 5, 7, 9, 10] };
// gen: a gentle tune from a seed. chords: root offsets in semitones, one per bar
function gen(seed, o) {
  o = Object.assign({ bpm: 90, root: 60, scale: 'maj', chords: [0, 5, 7, 5], reps: 2, density: .5, wave: 'triangle', pad: 'sine', bass: true, drums: null, melVol: .12, vib: 0, swing: 0 }, o);
  const R = E.rng(seed), sc = SCALES[o.scale], bars = o.chords.length * o.reps, pad = [], bass = [], mel = [], dr = [], arp = [];
  let last = 4;
  for (let b = 0; b < bars; b++) {
    const ch = o.chords[b % o.chords.length], r = o.root + ch;
    pad.push(nn(r - 12) + ' ' + nn(r - 12 + 7).replace(/^/, '') + (' -'.repeat(0)), ...Array(15).fill('-'));
    for (let s = 0; s < 16; s++) {
      bass.push(o.bass && (s % 8 === 0) ? nn(r - 24) : (o.bass && s % 8 === 6 && R() < .4 ? nn(r - 24 + 7) : (o.bass ? '-' : '.')));
      let tok = '.';
      if (s % 2 === 0 && R() < o.density + (s % 4 === 0 ? .25 : 0)) { last = G.clamp(last + Math.round((R() - .5) * 4), 0, sc.length * 2 - 1); const deg = sc[last % sc.length] + 12 * Math.floor(last / sc.length); tok = nn(r + deg); }
      else if (s % 2 === 0) tok = '-';
      mel.push(tok);
      if (o.drums) dr.push(o.drums[(b * 16 + s) % o.drums.length]);
    }
  }
  // pad token fix: one note per bar
  const padTrack = []; for (let b = 0; b < bars; b++) { const r = o.root + o.chords[b % o.chords.length]; padTrack.push(nn(r - 12)); for (let i = 1; i < 16; i++) padTrack.push('-'); }
  const tracks = [{ wave: o.pad, vol: .1, notes: padTrack.join(' '), name: 'pad' }, { wave: o.wave, vol: o.melVol, notes: mel.join(' '), name: 'mel', vib: o.vib ? [5, o.vib] : undefined }];
  if (o.bass) tracks.push({ wave: 'triangle', vol: .12, notes: bass.join(' '), name: 'bass' });
  if (o.drums) tracks.push({ wave: 'drums', vol: .09, notes: dr.join(' '), name: 'drums' });
  return { bpm: o.bpm, steps: 4, loop: o.loop !== false, len: o.len, tracks, name: o.name || 'song' };
}
G.gen = gen;
const HK = 'k . . . s . . . k . k . s . . .'.split(' '), SOFT = 'h . . . . . h . h . . . . . h .'.split(' '), STEP = 'k . . . s . . . k . . . s . . .'.split(' ');
G.SONGS = {
  studio: gen(11, { bpm: 84, root: 60, chords: [0, 5, 7, 4], density: .45, name: 'studio' }),
  islandAM: gen(21, { bpm: 96, root: 62, scale: 'lyd', chords: [0, 7, 9, 5], density: .5, wave: 'sine', name: 'islandAM' }),
  islandPM: gen(31, { bpm: 78, root: 57, scale: 'dor', chords: [0, 3, 5, 3], density: .35, wave: 'sine', name: 'islandPM' }),
  yoga: gen(41, { bpm: 62, root: 55, scale: 'maj', chords: [0, 4, 5, 0], density: .22, wave: 'sine', pad: 'triangle', bass: false, vib: .02, name: 'yoga' }),
  iron: gen(51, { bpm: 108, root: 57, scale: 'min', chords: [0, 0, 5, 7], density: .5, wave: 'pulse', melVol: .07, drums: HK, name: 'iron' }),
  stepA: gen(61, { bpm: 100, root: 60, scale: 'maj', chords: [0, 5, 7, 0], reps: 6, density: .5, wave: 'triangle', drums: STEP, loop: false, len: 384, name: 'stepA' }),
  stepB: gen(71, { bpm: 120, root: 62, scale: 'lyd', chords: [0, 7, 5, 9], reps: 8, density: .6, wave: 'triangle', drums: STEP, loop: false, len: 512, name: 'stepB' }),
  jog: gen(81, { bpm: 126, root: 64, scale: 'maj', chords: [0, 7, 9, 5], density: .55, wave: 'triangle', drums: SOFT, name: 'jog' }),
  ski: gen(91, { bpm: 138, root: 59, scale: 'lyd', chords: [0, 2, 7, 5], density: .6, wave: 'square', melVol: .06, drums: HK, name: 'ski' }),
  tray: gen(101, { bpm: 88, root: 58, scale: 'dor', chords: [0, 5, 3, 7], density: .4, wave: 'sine', drums: SOFT, name: 'tray' }),
  laundry: gen(111, { bpm: 112, root: 65, scale: 'maj', chords: [0, 7, 5, 7], density: .55, wave: 'triangle', pad: 'sine', name: 'laundry' }),
  festival: gen(121, { bpm: 116, root: 62, scale: 'maj', chords: [0, 5, 7, 0, 9, 5, 7, 7], reps: 1, density: .6, wave: 'triangle', drums: HK, name: 'festival' }),
  ending: gen(131, { bpm: 72, root: 60, scale: 'maj', chords: [0, 7, 9, 5, 0, 7, 5, 0], reps: 1, density: .35, wave: 'sine', pad: 'triangle', vib: .02, name: 'ending' }),
  candle: gen(141, { bpm: 54, root: 52, scale: 'maj', chords: [0, 7], reps: 4, density: .12, wave: 'sine', pad: 'sine', bass: false, name: 'candle' }),
  duel: gen(151, { bpm: 68, root: 57, scale: 'min', chords: [0, 5, 3, 7], density: .3, wave: 'sine', pad: 'triangle', name: 'duel' })
};
G.song = (name, o) => { const a = G.game && G.game.audio; if (!a || !G.SONGS[name]) return; G.curSong = name; try { a.music(G.SONGS[name], Object.assign({ fade: 1, sync: true }, o || {})); } catch (e) {} };
G.JINGLES = { star1: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .3, notes: 'C5 . E5 . G5 - - -' }] }, star2: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .3, notes: 'C5 . E5 . G5 . C6 - - -' }] }, star3: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .3, notes: 'C5 E5 G5 C6 . E6 - G6 - - - -' }, { wave: 'sine', vol: .2, notes: 'C4 - - - E4 - - - G4 - - - -' }] }, unlock: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'sine', vol: .3, notes: 'G5 . C6 . E6 . G6 - - -' }] }, dayDone: { bpm: 90, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .25, notes: 'E5 - - . C5 - - . G4 - - - C5 - - - -' }] } };
G.jingle = name => { const a = G.game && G.game.audio; if (a && G.JINGLES[name]) try { a.sting(G.JINGLES[name]); } catch (e) {} };

// sfx: specs for audio.sfx({...}); G.snd(name, { pitch, vol, pan })
G.SFX = {
  tick: { wave: 'triangle', freq: 'C6', dur: .04, vol: .12 }, ok: { wave: 'triangle', freq: 'E5', to: 'A5', dur: .1, vol: .18 }, back: { wave: 'triangle', freq: 'A5', to: 'E5', dur: .08, vol: .14 },
  boop: { wave: 'sine', freq: 'E5', to: 'E5', dur: .09, vol: .26, arp: [0, 5], step: .09 }, creak: { wave: 'saw', freq: 90, to: 70, dur: .25, vol: .06, vib: [14, .04] },
  chime: { wave: 'sine', freq: 'C6', dur: .22, vol: .12 }, stumble: { wave: 'triangle', freq: 220, to: 70, dur: .3, vol: .22 }, clink: { wave: 'sine', freq: 'A6', to: 'E7', dur: .12, vol: .18, arp: [0, 7], step: .05 },
  gull: { wave: 'saw', freq: 700, to: 420, dur: .22, vol: .05, vib: [18, .08] }, pigeon: { wave: 'noise', dur: .18, vol: .08 }, flame: { wave: 'noise', dur: .12, vol: .07 }, whirr: { wave: 'saw', freq: 140, dur: .07, vol: .035 },
  carve: { wave: 'noise', dur: .08, vol: .035 }, trayclink: { wave: 'sine', freq: 'G6', to: 'D6', dur: .08, vol: .1 }, plop: { wave: 'sine', freq: 600, to: 200, dur: .12, vol: .25 }, rope: { wave: 'saw', freq: 120, to: 100, dur: .2, vol: .04, vib: [12, .05] },
  stamp: { wave: 'triangle', freq: 120, to: 50, dur: .18, vol: .35 }, click: { wave: 'square', freq: 1800, dur: .02, vol: .09 }, clickHi: { wave: 'square', freq: 2400, dur: .02, vol: .11 },
  perfect: { wave: 'sine', freq: 'G6', dur: .1, vol: .12 }, good: { wave: 'sine', freq: 'D6', dur: .08, vol: .1 }, miss: { wave: 'triangle', freq: 'F3', to: 'D3', dur: .14, vol: .12 },
  cheer: { wave: 'noise', dur: .5, vol: .06 }, pop: { wave: 'sine', freq: 400, to: 900, dur: .06, vol: .15 }, whoosh: { wave: 'noise', dur: .2, vol: .06 }, firework: { wave: 'noise', dur: .4, vol: .08 }, bell: { wave: 'sine', freq: 'A5', dur: .6, vol: .2, arp: [0, 12], step: .08 }, step: { wave: 'triangle', freq: 150, to: 90, dur: .06, vol: .15 }
};
G.snd = (name, o) => { const a = G.game && G.game.audio; if (!a) return null; const s = Object.assign({}, G.SFX[name] || G.SFX.tick, o || {}); if (o && o.pitch) { if (typeof s.freq === 'number') s.freq *= o.pitch; if (typeof s.to === 'number') s.to *= o.pitch; } try { return a.sfx(s); } catch (e) { return null; } };

// Animalese: a sound per letter on the voice bus
const VOW = { a: 1.0, e: 1.18, i: 1.45, o: .86, u: .74, y: 1.3 };
G.babble = (who, ch, mult) => {
  const a = G.game && G.game.audio; if (!a || !a.ctx || !/[a-z0-9]/i.test(ch)) return;
  const c = G.CAST[(who && Object.keys(G.CAST).find(k => G.CAST[k].name === who)) || 'tare'] || G.CAST.tare, bus = a.bus('voice'); if (!bus) return;
  const l = ch.toLowerCase(), vowel = l in VOW, code = l.charCodeAt(0), f0 = c.pitch * (vowel ? VOW[l] : .7 + ((code * 7) % 11) / 18) * (mult || 1), dur = (vowel ? .09 : .05) / c.speed * (.9 + (code % 3) * .1);
  const t = a.ctx.currentTime, o = a.ctx.createOscillator(), f = a.ctx.createBiquadFilter(), g = a.ctx.createGain();
  o.type = c.wave || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (1 + ((code % 5) - 2) * .04), t + dur);
  if (c.vib) { const lf = a.ctx.createOscillator(), lg = a.ctx.createGain(); lf.frequency.value = c.vib; lg.gain.value = f0 * .04; lf.connect(lg); lg.connect(o.frequency); lf.start(t); lf.stop(t + dur + .02); }
  f.type = 'bandpass'; f.frequency.value = f0 * (vowel ? 2.2 : 3.4); f.Q.value = vowel ? 3 : 1.5;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.34, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .02);
};
G.voice = (ch, i, talk) => { if (i % 2 === 0 || /[aeiouy]/i.test(ch)) G.babble(talk && talk.name, ch); };
// exercise grunts: same babble, few letters
G.grunt = (who, s) => { let i = 0; for (const ch of (s || 'hup')) { const k = i++; setTimeout(() => G.babble(who, ch, 1.05), k * 70); } };

// stork tier 2: a stereo tone for the balance (pan = x, pitch = y)
class BalTone {
  constructor() { this.o = null; }
  start() { const a = G.game && G.game.audio; if (this.o || !a || !a.ctx) return; const bus = a.bus('sfx'); if (!bus) return; const c = a.ctx; this.o = c.createOscillator(); this.g = c.createGain(); this.pn = c.createStereoPanner ? c.createStereoPanner() : null; this.o.type = 'sine'; this.g.gain.value = .0; this.o.connect(this.g); if (this.pn) { this.g.connect(this.pn); this.pn.connect(bus); } else this.g.connect(bus); this.o.start(); }
  set(x, y, loud) { if (!this.o) return; const t = G.game.audio.ctx.currentTime; this.o.frequency.setTargetAtTime(330 * Math.pow(2, y * .8), t, .03); if (this.pn) this.pn.pan.setTargetAtTime(G.clamp(x, -1, 1), t, .03); this.g.gain.setTargetAtTime(loud, t, .05); }
  stop() { if (!this.o) return; try { this.o.stop(); } catch (e) {} this.o = null; }
}
G.BalTone = BalTone;
})();
