/* MASH TV — 03-audio: every sound, song and voice is made in code. Sound effects are voices defined on the engine's
 * chip synth; music is engine notation; the voices ("babble") are Animalese-style formant syllables on the effects bus. */

MT.SFX = {   // name: a voice for audio.define (wave, freq, to, dur, vol, arp, vib; wave 'noise' for hiss)
  pew: { wave: 'square', freq: 880, to: 420, dur: .08, vol: .18 }, spread: { wave: 'saw', freq: 620, to: 300, dur: .12, vol: .16, arp: [0, 4, 7] },
  rocket: { wave: 'noise', freq: 220, to: 120, dur: .35, vol: .22 }, boom: { wave: 'noise', freq: 140, to: 40, dur: .45, vol: .42 },
  pop: { wave: 'square', freq: 1200, to: 300, dur: .05, vol: .2 }, popcorn: { wave: 'pulse', freq: 900, to: 1500, dur: .07, vol: .16 },
  laser: { wave: 'saw', freq: 180, to: 190, dur: .12, vol: .1, vib: [30, .2] }, records: { wave: 'triangle', freq: 330, to: 660, dur: .16, vol: .14, vib: [14, .05] },
  shield: { wave: 'sine', freq: 520, to: 560, dur: .25, vol: .12, vib: [6, .08] }, speed: { wave: 'pulse', freq: 300, to: 900, dur: .2, vol: .14 },
  slide: { wave: 'noise', freq: 900, to: 300, dur: .22, vol: .18 }, showboat: { wave: 'triangle', freq: 523, to: 1046, dur: .3, vol: .24, arp: [0, 4, 7, 12] },
  flash: { wave: 'noise', freq: 4000, to: 800, dur: .12, vol: .5 }, cash: { wave: 'square', freq: 1046, to: 1568, dur: .12, vol: .18, arp: [0, 7] },
  prize: { wave: 'triangle', freq: 523, to: 1046, dur: .45, vol: .28, arp: [0, 4, 7, 12, 16] }, key: { wave: 'sine', freq: 1318, to: 1760, dur: .4, vol: .3, arp: [0, 7, 12] },
  powerup: { wave: 'pulse', freq: 330, to: 990, dur: .3, vol: .18, arp: [0, 4, 7, 12] }, pwrexp: { wave: 'square', freq: 660, to: 220, dur: .09, vol: .14 },
  oneup: { wave: 'triangle', freq: 660, to: 1320, dur: .45, vol: .26, arp: [0, 4, 7, 12, 16, 19] }, death: { wave: 'saw', freq: 360, to: 90, dur: .6, vol: .3 },
  respawn: { wave: 'sine', freq: 1400, to: 300, dur: .35, vol: .14 }, land: { wave: 'noise', freq: 300, to: 90, dur: .15, vol: .3 },
  buzz: { wave: 'square', freq: 150, to: 110, dur: .3, vol: .3 }, hit: { wave: 'noise', freq: 600, to: 200, dur: .1, vol: .3 },
  goon: { wave: 'saw', freq: 150, to: 95, dur: .14, vol: .14 }, bash: { wave: 'noise', freq: 1800, to: 600, dur: .08, vol: .18 },
  clap: { wave: 'noise', freq: 2400, to: 1800, dur: .06, vol: .2 }, hop: { wave: 'square', freq: 420, to: 760, dur: .09, vol: .12 },
  fuse: { wave: 'noise', freq: 3000, to: 2000, dur: .6, vol: .1 }, mime: { wave: 'sine', freq: 880, to: 880, dur: .1, vol: .14 },
  pfft: { wave: 'noise', freq: 800, to: 400, dur: .3, vol: .2 }, disco: { wave: 'triangle', freq: 1700, to: 2300, dur: .22, vol: .12, vib: [24, .1] },
  beam: { wave: 'saw', freq: 1400, to: 300, dur: .18, vol: .12 }, boo: { wave: 'saw', freq: 220, to: 150, dur: .5, vol: .2, vib: [5, .04] },
  splat: { wave: 'noise', freq: 500, to: 200, dur: .2, vol: .26 }, tank: { wave: 'saw', freq: 90, to: 60, dur: .35, vol: .3 },
  shell: { wave: 'noise', freq: 260, to: 80, dur: .3, vol: .3 }, snake: { wave: 'noise', freq: 2200, to: 1500, dur: .3, vol: .14 },
  snap: { wave: 'square', freq: 1500, to: 200, dur: .06, vol: .2 }, roar: { wave: 'saw', freq: 110, to: 70, dur: .8, vol: .32, vib: [9, .05] },
  stomp: { wave: 'noise', freq: 120, to: 50, dur: .25, vol: .4 }, crash: { wave: 'noise', freq: 900, to: 120, dur: .4, vol: .35 },
  confetti: { wave: 'noise', freq: 6000, to: 2000, dur: .2, vol: .18 }, klaxon: { wave: 'square', freq: 440, to: 330, dur: .5, vol: .18, vib: [8, .1] },
  door: { wave: 'noise', freq: 200, to: 120, dur: .4, vol: .25 }, beacon: { wave: 'square', freq: 1800, to: 1800, dur: .03, vol: .06 },
  vent: { wave: 'noise', freq: 700, to: 2000, dur: .55, vol: .26 }, cheer: { wave: 'triangle', freq: 500, to: 800, dur: .6, vol: .2, vib: [7, .04] },
  applause: { wave: 'noise', freq: 3000, to: 3000, dur: 1.2, vol: .18 }, laugh: { wave: 'square', freq: 500, to: 380, dur: .12, vol: .14, arp: [0, -2, 0, -4] },
  ooh: { wave: 'triangle', freq: 600, to: 330, dur: .4, vol: .16, vib: [5, .04] }, drum: { wave: 'noise', freq: 180, to: 180, dur: .05, vol: .32 },
  click: { wave: 'square', freq: 1800, to: 1800, dur: .02, vol: .12 }, static: { wave: 'noise', freq: 5000, to: 4000, dur: .4, vol: .22 },
  flip: { wave: 'square', freq: 220, to: 880, dur: .14, vol: .16 }, shutter: { wave: 'noise', freq: 2400, to: 900, dur: .09, vol: .3 },
  tick: { wave: 'square', freq: 1000, to: 1000, dur: .03, vol: .12 }, bell: { wave: 'sine', freq: 1046, to: 1046, dur: .6, vol: .24 },
  lose: { wave: 'triangle', freq: 392, to: 196, dur: 1.2, vol: .3, arp: [0, -3, -6, -12] }, blip: { wave: 'square', freq: 1300, to: 1300, dur: .03, vol: .1 },
  countdown: { wave: 'square', freq: 660, to: 660, dur: .12, vol: .2 }, wheel: { wave: 'square', freq: 1700, to: 1700, dur: .02, vol: .15 },
  drumroll: { wave: 'noise', freq: 300, to: 300, dur: .9, vol: .16 }, bankrupt: { wave: 'saw', freq: 300, to: 110, dur: .9, vol: .3, arp: [0, -5, -10] },
  sting: { wave: 'square', freq: 523, to: 784, dur: .25, vol: .2, arp: [0, 4, 7, 12] }, banner: { wave: 'pulse', freq: 440, to: 880, dur: .18, vol: .2 },
  zap: { wave: 'saw', freq: 1500, to: 200, dur: .12, vol: .16 }, thud: { wave: 'sine', freq: 120, to: 60, dur: .18, vol: .4 }
};
// the babble voices (§10.3): base pitch, syllables a second, wave, formant factor, and the character's gibberish mood
MT.VOICES = {
  lance: { f0: 135, speed: 13, wave: 'sawtooth', formant: 1.0, bright: 1.2 }, penny: { f0: 300, speed: 12, wave: 'square', formant: 1.18, bright: 1.1 },
  annc: { f0: 85, speed: 7, wave: 'sawtooth', formant: .85, bright: .8, echo: true }, network: { f0: 70, speed: 8, wave: 'square', formant: .8, bright: .9 },
  mashy: { f0: 110, speed: 9, wave: 'triangle', formant: .9, bright: 1 }, contestant1: { f0: 200, speed: 12, wave: 'square', formant: 1.05, bright: 1 },
  contestant2: { f0: 240, speed: 12, wave: 'square', formant: 1.05, bright: 1 }, contestant3: { f0: 180, speed: 12, wave: 'square', formant: 1.05, bright: 1 },
  contestant4: { f0: 160, speed: 12, wave: 'square', formant: 1.05, bright: 1 }, goon: { f0: 95, speed: 10, wave: 'sawtooth', formant: .9, bright: .9 }
};
const VOWEL = { a: [800, 1200], e: [400, 2300], i: [300, 2800], o: [450, 800], u: [325, 700] };
MT.babble = {
  seedOf: s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; },
  // says a line on the voice's syllables; returns the line's duration in seconds (headless: the duration only)
  say(text, voiceId, o = {}) {
    const V = MT.VOICES[voiceId] || MT.VOICES.lance, speed = (o.speed || 1) * V.speed;
    const words = String(text).toUpperCase().replace(/[^A-Z0-9 ,.!?'…-]/g, ' ').split(/\s+/).filter(Boolean);
    const sylls = [];
    for (const w of words) {
      const groups = w.toLowerCase().match(/[aeiouy]+|[^aeiouy]+/g) || [w];
      const n = Math.min(4, Math.max(1, groups.filter(s => /[aeiouy]/.test(s)).length));
      for (let i = 0; i < n; i++) sylls.push({ word: w, i, n, emph: /!/.test(text) || w === w.toUpperCase() && w.length > 2 });
    }
    const dur = sylls.length / speed + (String(text).match(/[.!?]/g) || []).length * .16 + (String(text).match(/,/g) || []).length * .08;
    const G = MT.G, ctx = G && G.audio && G.audio.ctx;
    if (!ctx || !G.audio.bus) return dur;
    const t0 = ctx.currentTime + .03, bus = G.audio.bus, seed = this.seedOf(String(text));
    let t = t0; const rnd = E.rng(seed);
    sylls.forEach((s, k) => {
      const step = 1 / speed, base = V.f0 * (1 + (rnd() * .08 - .04)) * (s.emph ? 1.2 : 1);
      const vowel = (s.word.toLowerCase().match(/[aeiou]/) || ['a'])[0], [f1, f2] = VOWEL[vowel] || VOWEL.a;
      const osc = ctx.createOscillator(), g = ctx.createGain(), b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter();
      osc.type = V.wave; osc.frequency.setValueAtTime(base, t); osc.frequency.linearRampToValueAtTime(base * (k === sylls.length - 1 ? .8 : 1.1), t + step * .8);
      b1.type = 'bandpass'; b1.frequency.value = f1 * V.formant; b1.Q.value = 8; b2.type = 'bandpass'; b2.frequency.value = f2 * V.formant; b2.Q.value = 8;
      osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); g.connect(bus);
      const len = Math.min(.12, step * .85);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .005); g.gain.setValueAtTime(.12, t + len - .03); g.gain.linearRampToValueAtTime(0, t + len);
      osc.start(t); osc.stop(t + len + .02); t += step * (rnd() * .1 + .95);
    });
    return dur;
  },
  // the crowd: cheers, oohs, laughs, applause and boos (intensity 0..1 scales the voices and their level)
  crowd(kind, intensity = .6) {
    const G = MT.G; if (!G || !G.audio) return;
    const n = Math.round(4 + 6 * intensity);
    const key = { cheer: 'cheer', ooh: 'ooh', laugh: 'laugh', applause: 'applause', boo: 'boo' }[kind];
    if (key === 'applause') { for (let i = 0; i < Math.round(8 + 6 * intensity); i++) G.audio.sfx('clap', { vol: .3 * intensity, pitch: .8 + Math.random() * .6 }); return; }
    if (key) G.audio.sfx(key, { vol: .4 + .4 * intensity, pitch: .9 + Math.random() * .2 });
    if (n) MT.babble.say(kind === 'cheer' ? 'WOO! YAY!' : kind === 'ooh' ? 'OOOH' : kind === 'laugh' ? 'HA HA HA' : 'BOO', 'contestant2', { speed: 1.3 });
  }
};

/* ---------- songs (engine notation: a note, '-' holds, '.' rests, drums k s h o c t; 16 steps is one bar) ---------- */
const bar = s => s.replace(/\|/g, ' ').trim().split(/\s+/);
const rep = (s, n) => Array(n).fill(s).join(' ');
MT.SONGS = {
  theme: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .16, notes: rep('G4 . C5 . E5 . G5 - - . E5 . G5 . A5 -', 2) + ' G5 - - - E5 - C5 - D5 - - - . . . . ' + rep('A4 . C5 . F5 . A5 - - . F5 . A5 . C6 -', 2) + ' A5 - - - F5 - D5 - C5 - - - . . . .' },
    { wave: 'triangle', vol: .18, notes: rep('C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 .', 2) + ' ' + rep('F2 . F2 . C3 . C3 . G2 . G2 . C3 . C3 .', 1) },
    { wave: 'drums', vol: .4, notes: rep('k . h . s . h o k k h . s . h o', 4) }] },
  studioBattle: { bpm: 150, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('E2 E2 . E2 . G2 . E2 . A2 . A2 . G2 . E2 .', 4) },
    { name: 'lead', wave: 'square', vol: .1, notes: rep('E4 . G4 . B4 . E5 . D5 . B4 . G4 . E4 .', 4) },
    { name: 'prime', wave: 'saw', vol: .09, on: false, notes: rep('C5 - - - E5 - - - G5 - - - C6 - - -', 4) },
    { name: 'drums', wave: 'drums', vol: .4, notes: rep('k . h . s . h . k . h . s h s .', 4) },
    { name: 'intense', wave: 'drums', vol: .25, on: false, notes: rep('k k s k k s k s', 8) }] },
  warehouseFunk: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('D2 . D2 D2 . F2 . D2 . C2 . C2 . G2 .', 4) },
    { name: 'lead', wave: 'pulse', vol: .08, notes: rep('D4 . F4 . A4 . C5 . B4 . A4 . F4 . D4 .', 4) },
    { name: 'prime', wave: 'saw', vol: .09, on: false, notes: rep('D5 - - - F5 - - - A5 - - - D6 - - -', 4) },
    { name: 'drums', wave: 'drums', vol: .4, notes: rep('k . h . s . h . k . k . s . h .', 4) },
    { name: 'intense', wave: 'drums', vol: .22, on: false, notes: rep('k h k h s h k h', 8) }] },
  finaleOverture: { bpm: 160, steps: 4, tracks: [
    { name: 'strings', wave: 'saw', vol: .07, notes: rep('A3 - - - C4 - - - E4 - - - A4 - - -', 4) + ' ' + rep('F3 - - - A3 - - - C4 - - - F4 - - -', 4) },
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('A2 . A2 . E2 . E2 . F2 . F2 . G2 . G2 .', 4) },
    { name: 'lead', wave: 'square', vol: .09, notes: rep('A4 . C5 . E5 . A5 . G5 . E5 . C5 . A4 .', 4) },
    { name: 'prime', wave: 'saw', vol: .09, on: false, notes: rep('A5 - - - C6 - - - E6 - - - A6 - - -', 4) },
    { name: 'drums', wave: 'drums', vol: .4, notes: rep('k . . . s . . . k . . k s . . .', 4) },
    { name: 'intense', wave: 'drums', vol: .25, on: false, notes: rep('k k s k k k s k', 8) }] },
  bossShowdown: { bpm: 170, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .15, notes: rep('E2 E2 E2 E2 D2 D2 D2 D2 C2 C2 C2 C2 B1 B1 B1 B1', 4) },
    { name: 'lead', wave: 'square', vol: .08, notes: rep('E4 . E4 G4 B4 . A4 . G4 . E4 . B3 - - -', 4) },
    { name: 'phase2', wave: 'drums', vol: .4, on: false, notes: rep('k k s k k k s s', 8) },
    { name: 'drums', wave: 'drums', vol: .4, notes: rep('k . s . k . s . k k s . k . s s', 4) }] },
  commercial: { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .14, notes: rep('C5 E5 G5 C6 . G5 E5 C5 D5 F5 A5 D6 . A5 F5 D5', 2) + ' ' + rep('E5 G5 B5 E6 . B5 G5 E5 F5 A5 C6 F6 . C6 A5 F5', 2) },
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('C3 . C3 . G2 . G2 . F2 . F2 . G2 . G2 .', 4) },
    { name: 'drums', wave: 'drums', vol: .35, notes: rep('k . h . s . h . k . h . s h s .', 4) }] },
  recap: { bpm: 100, steps: 4, tracks: [
    { name: 'keys', wave: 'sine', vol: .14, notes: rep('D4 F4 A4 C5 . . . . E4 G4 B4 D5 . . . .', 4) },
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('D2 . . . G2 . . . C2 . . . A2 . . .', 4) },
    { name: 'drums', wave: 'drums', vol: .25, notes: rep('h . . h . h . . h . . h . h . .', 4) }] },
  ending: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .18, notes: rep('G4 - - - C5 - - - E5 - - - G5 - - -', 2) + ' ' + rep('A4 - - - C5 - - - F5 - - - A5 - - -', 2) },
    { wave: 'sine', vol: .18, notes: rep('C3 - - - G2 - - - A2 - - - F2 - - -', 2) }] }
};
MT.LAYERS = { prime: 'prime', intense: 'intense', phase2: 'phase2' };
MT.music = (id, o = {}) => { const G = MT.G; if (!G) return; if (id === null) return G.audio.music(null); return G.audio.music(MT.SONGS[id], { fade: o.fade === undefined ? .6 : o.fade }); };
MT.sting = (id) => { const G = MT.G; if (G && MT.SONGS[id]) G.audio.sting(MT.SONGS[id], { at: 'bar' }); };
MT.layer = (name, vol, fade) => { const G = MT.G; if (!G || !G.audio || !G.audio.song || !G.audio.song.tracks || !G.audio.song.tracks.some(t => t.name === name)) return; G.audio.layer(name, vol, fade); };
MT.sfx = (name, o) => { const G = MT.G; if (G && G.audio) G.audio.sfx(name, o); };
MT.duck = (on) => { const G = MT.G; if (G && G.audio) G.audio.duck(on); };
