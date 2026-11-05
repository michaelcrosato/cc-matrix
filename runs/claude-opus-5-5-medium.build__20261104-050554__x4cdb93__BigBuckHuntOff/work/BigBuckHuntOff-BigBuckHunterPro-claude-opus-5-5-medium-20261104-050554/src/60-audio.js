// Sound, all in code: bluegrass chiptune songs on the engine synth (banjo-roll pulses, a square fiddle, triangle bass,
// washboard drums), stings, layered sound effects (a rifle crack with a thump, a tail and two valley echoes), animal
// calls, ambience beds, and Animalese-style gibberish voices (E.Babble-style blips through formant filters). Then the
// feedback: events from play become barks, banners, shakes, rumble, hit-stop and sounds.
(() => {
const B = BB, E = B.E;
const bars = (...b) => b.join(' | ');
const G = 'G4 B4 D5 G5 B4 D5 G5 D5 G4 B4 D5 G5 B4 D5 G5 D5', Cc = 'C5 E5 G5 C5 E5 G5 C6 G5 C5 E5 G5 C5 E5 G5 C6 G5', D = 'D5 F#5 A5 D5 F#5 A5 D6 A5 D5 F#5 A5 D5 F#5 A5 D6 A5', Em = 'E5 G5 B5 E5 G5 B5 E6 B5 E5 G5 B5 E5 G5 B5 E6 B5';
const bassG = 'G2 . . . D3 . . . G2 . . . D3 . . .', bassC = 'C3 . . . G2 . . . C3 . . . G2 . . .', bassD = 'D3 . . . A2 . . . D3 . . . A2 . . .', bassE = 'E3 . . . B2 . . . E3 . . . B2 . . .';
const wash = 'k . h h s . h h k . h h s . h h';
B.SONGS = {
  hoedown: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: .07, notes: bars(G, Cc, G, D, G, Cc, Em, D) },
    { wave: 'square', vol: .09, notes: bars('G5 - - - A5 - B5 - D6 - - - B5 - G5 -', 'E5 - G5 - E5 - C5 - E5 - - - G5 - - -', 'D5 - G5 - B5 - G5 - A5 - G5 - E5 - D5 -', 'F#5 - A5 - D6 - - - C6 - A5 - F#5 - D5 -', 'G5 - B5 - D6 - B5 - G5 - - - A5 - B5 -', 'C6 - - - B5 - A5 - G5 - E5 - G5 - - -', 'E5 - G5 - B5 - - - A5 - G5 - E5 - D5 -', 'A5 - - - F#5 - D5 - G5 - - - - - - -') },
    { wave: 'triangle', vol: .2, notes: bars(bassG, bassC, bassG, bassD, bassG, bassC, bassE, bassD) },
    { wave: 'drums', vol: .12, notes: bars(wash, wash, wash, wash, wash, wash, wash, 'k . h h s . h h k k s . s s s .') }] },
  lodgefire: { bpm: 84, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: bars('B4 - - - D5 - - - G4 - - - - - - -', 'C5 - - - E5 - D5 - C5 - - - A4 - - -', 'B4 - - - G4 - - - D5 - - - B4 - - -', 'A4 - - - F#4 - - - G4 - - - - - - -') },
    { wave: 'triangle', vol: .16, notes: bars('G2 - - - D3 - - - G2 - - - D3 - - -', 'C3 - - - G2 - - - A2 - - - E3 - - -', 'G2 - - - B2 - - - D3 - - - G2 - - -', 'D3 - - - A2 - - - G2 - - - D3 - - -') },
    { wave: 'pulse12', vol: .04, notes: bars('G4 . D5 . B4 . D5 . G4 . D5 . B4 . D5 .', 'C5 . E5 . G5 . E5 . A4 . C5 . E5 . C5 .', 'G4 . D5 . B4 . D5 . G4 . D5 . B4 . D5 .', 'D5 . F#5 . A5 . F#5 . G4 . B4 . D5 . B4 .') },
    { wave: 'drums', vol: .05, notes: bars('k . . . h . . . s . . . h . . .', 'k . . . h . . . s . . . h . h .') }] },
  stalk: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: bars('E2 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -', 'D2 - - - - - - - - - - - - - - -', 'B1 - - - - - - - D2 - - - - - - -') },
    { wave: 'pulse12', vol: .035, notes: bars('E4 . B4 . G4 . B4 . E4 . B4 . G4 . B4 .', 'C4 . G4 . E4 . G4 . C4 . G4 . E4 . G4 .', 'D4 . A4 . F#4 . A4 . D4 . A4 . F#4 . A4 .', 'B3 . F#4 . D4 . F#4 . D4 . A4 . F#4 . A4 .') },
    { wave: 'drums', vol: .08, name: 'drums', on: false, notes: 'k . . h s . h . k . k h s . h .' },
    { wave: 'drums', vol: .12, name: 'tension', on: false, notes: 'k . . . k . . . . . . . . . . .' },
    { wave: 'square', vol: .04, name: 'tension2', on: false, notes: bars('E5 F5 E5 F5 E5 F5 E5 F5 E5 F5 E5 F5 E5 F5 E5 F5', 'E5 F5 E5 F5 E5 F5 E5 F5 D5 Eb5 D5 Eb5 D5 Eb5 D5 Eb5') }] },
  jamboree: { bpm: 168, steps: 4, tracks: [
    { wave: 'pulse', vol: .07, notes: bars(G, D, G, D, Cc, G, D, G) },
    { wave: 'square', vol: .09, notes: bars('B5 A5 G5 A5 B5 - B5 - D6 - B5 - G5 - - -', 'A5 G5 F#5 G5 A5 - A5 - C6 - A5 - F#5 - - -', 'B5 A5 G5 A5 B5 - B5 - D6 - B5 - G5 - - -', 'A5 - F#5 - D5 - F#5 - A5 - - - - - - -', 'E5 - G5 - C6 - G5 - E5 - G5 - C6 - - -', 'D6 - B5 - G5 - B5 - D6 - - - B5 - - -', 'A5 - F#5 - D5 - F#5 - A5 - C6 - B5 - A5 -', 'G5 - - - D5 - - - G5 - - - - - - -') },
    { wave: 'triangle', vol: .2, notes: bars(bassG, bassD, bassG, bassD, bassC, bassG, bassD, bassG) },
    { wave: 'drums', vol: .13, notes: 'k h s h k h s h k h s h k k s h' }] },
  results: { bpm: 110, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: bars('G4 - B4 - D5 - - - E5 - D5 - B4 - - -', 'C5 - E5 - G5 - - - A5 - G5 - E5 - - -', 'D5 - F#5 - A5 - - - B5 - A5 - F#5 - - -', 'G5 - - - D5 - - - G4 - - - - - - -') },
    { wave: 'triangle', vol: .18, notes: bars('G2 . G3 . G2 . G3 .', 'C3 . C4 . C3 . C4 .', 'D3 . D4 . D3 . D4 .', 'G2 . G3 . D3 . G2 .') },
    { wave: 'drums', vol: .09, notes: 'k . s . k k s .' }] },
  fanfare: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .12, notes: 'G4 . G4 . G4 . D5 - - - B4 . D5 . G5 - - - - - - -' }, { wave: 'pulse', vol: .08, notes: 'D4 . D4 . D4 . B4 - - - G4 . B4 . D5 - - - - - - -' }, { wave: 'triangle', vol: .18, notes: 'G2 . G2 . G2 . G2 - - - D3 . D3 . G2 - - - - - - -' }] },
  siteclear: { bpm: 160, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'G5 B5 D6 G6 - - - -' }, { wave: 'triangle', vol: .16, notes: 'G3 - D4 - G4 - - -' }] },
  doe: { bpm: 70, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .1, notes: 'E4 - Eb4 - D4 - Db4 - - - - -' }, { wave: 'triangle', vol: .14, notes: 'E3 - Eb3 - D3 - Db3 - - - - -' }] },
  escaped: { bpm: 120, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .07, notes: 'D5 - A4 - - -' }] },
  newrecord: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'C5 E5 G5 C6 E6 G6 C7 - - -' }, { wave: 'pulse', vol: .07, notes: 'E4 G4 C5 E5 G5 C6 E6 - - -' }] }
};

// ---- sound effects ----
const SFX = {
  rifle: [{ wave: 'noise', freq: 2400, filter: 'highpass', dur: .07, vol: .55 }, { wave: 'sine', freq: 90, to: 38, dur: .2, vol: .7 }, { wave: 'noise', freq: 500, filter: 'lowpass', dur: .55, vol: .3 },
    { wave: 'noise', freq: 700, filter: 'lowpass', dur: .45, vol: .13, delay: .36 }, { wave: 'noise', freq: 450, filter: 'lowpass', dur: .5, vol: .07, delay: .82 }],
  dry: { wave: 'noise', freq: 3200, filter: 'bandpass', q: 4, dur: .03, vol: .35 },
  pump: [{ wave: 'noise', freq: 1800, filter: 'bandpass', q: 3, dur: .05, vol: .4 }, { wave: 'noise', freq: 900, filter: 'bandpass', q: 2, dur: .08, vol: .25, delay: .05 }, { wave: 'noise', freq: 2400, filter: 'bandpass', q: 3, dur: .05, vol: .4, delay: .12 }],
  shell: { wave: 'noise', freq: 2600, filter: 'bandpass', q: 5, dur: .04, vol: .3 },
  scope: { wave: 'noise', freq: 800, to: 1400, filter: 'bandpass', dur: .14, vol: .12 },
  breathIn: { wave: 'noise', freq: 900, to: 1500, filter: 'bandpass', dur: .35, vol: .08, attack: .15 },
  breathOut: { wave: 'noise', freq: 1200, to: 600, filter: 'bandpass', dur: .5, vol: .1 },
  grunt: [{ wave: 'saw', freq: 95, to: 80, dur: .35, vol: .25, vib: [18, .06] }, { wave: 'saw', freq: 90, to: 75, dur: .3, vol: .2, delay: .45, vib: [18, .06] }],
  bugle: [{ wave: 'sine', freq: 480, to: 1750, dur: .8, vol: .18, vib: [6, .02] }, { wave: 'sine', freq: 1750, to: 1500, dur: .9, vol: .16, delay: .8, vib: [7, .02] }, { wave: 'noise', freq: 1800, filter: 'bandpass', q: 6, dur: .9, vol: .07, delay: .8 }, { wave: 'saw', freq: 220, to: 160, dur: .25, vol: .1, delay: 1.7 }],
  moose: [{ wave: 'saw', freq: 80, to: 55, dur: .6, vol: .28, vib: [10, .08] }, { wave: 'noise', freq: 300, filter: 'lowpass', dur: .5, vol: .1 }],
  fur: [{ wave: 'noise', freq: 300, filter: 'lowpass', dur: .12, vol: .45 }, { wave: 'sine', freq: 120, to: 60, dur: .1, vol: .4 }],
  wood: [{ wave: 'square', freq: 420, to: 260, dur: .06, vol: .2 }, { wave: 'noise', freq: 1500, filter: 'bandpass', dur: .08, vol: .25 }],
  ricochet: [{ wave: 'sine', freq: 3200, to: 1100, dur: .35, vol: .12 }, { wave: 'noise', freq: 4000, filter: 'highpass', dur: .04, vol: .3 }],
  dirt: [{ wave: 'noise', freq: 400, filter: 'lowpass', dur: .15, vol: .35 }],
  splash: [{ wave: 'noise', freq: 2400, to: 700, filter: 'bandpass', dur: .35, vol: .3 }, { wave: 'noise', freq: 600, filter: 'lowpass', dur: .25, vol: .2, delay: .08 }],
  clay: [{ wave: 'noise', freq: 3000, filter: 'highpass', dur: .12, vol: .35 }, { wave: 'square', freq: 1800, to: 900, dur: .05, vol: .1 }],
  crow: [{ wave: 'saw', freq: 700, to: 500, dur: .18, vol: .12 }, { wave: 'saw', freq: 680, to: 480, dur: .18, vol: .1, delay: .25 }],
  feather: { wave: 'noise', freq: 2000, filter: 'bandpass', dur: .2, vol: .2 },
  snort: { wave: 'noise', freq: 900, to: 300, filter: 'bandpass', dur: .25, vol: .2 },
  squeak: { wave: 'square', freq: 1400, to: 1900, dur: .08, vol: .1, arp: [0, 5, 0], step: .03 },
  gobble: { wave: 'square', freq: 500, dur: .45, vol: .1, arp: [0, 3, 0, 5, 0, 3, 0], step: .05, loop: true },
  moo: { wave: 'saw', freq: 130, to: 110, dur: .9, vol: .2, vib: [5, .03] },
  quack: { wave: 'saw', freq: 600, to: 400, dur: .12, vol: .15 },
  loon: { wave: 'sine', freq: 700, to: 1050, dur: 1.2, vol: .12, vib: [5, .04] },
  howl: { wave: 'sine', freq: 420, to: 760, dur: 1.4, vol: .12, vib: [4, .03] },
  marmot: { wave: 'sine', freq: 2600, to: 2300, dur: .3, vol: .12 },
  slap: { wave: 'noise', freq: 800, filter: 'lowpass', dur: .1, vol: .4 },
  trap: [{ wave: 'noise', freq: 1200, filter: 'bandpass', dur: .08, vol: .3 }, { wave: 'square', freq: 220, to: 120, dur: .1, vol: .1 }],
  bonk: [{ wave: 'square', freq: 300, to: 200, dur: .08, vol: .2 }, { wave: 'noise', freq: 900, filter: 'bandpass', dur: .12, vol: .2 }],
  splat: [{ wave: 'noise', freq: 900, filter: 'lowpass', dur: .2, vol: .45 }],
  stink: [{ wave: 'noise', freq: 400, to: 200, filter: 'lowpass', dur: .5, vol: .2 }, { wave: 'saw', freq: 110, dur: .6, vol: .08, arp: [0, 1, 6], step: .2 }],
  whoosh: { wave: 'noise', freq: 600, to: 2400, filter: 'bandpass', dur: .25, vol: .1 },
  rockfall: [{ wave: 'noise', freq: 500, filter: 'lowpass', dur: 1.4, vol: .25 }, { wave: 'noise', freq: 1500, filter: 'bandpass', dur: .2, vol: .2, delay: .3 }, { wave: 'noise', freq: 1300, filter: 'bandpass', dur: .2, vol: .2, delay: .7 }],
  crash: [{ wave: 'noise', freq: 300, filter: 'lowpass', dur: 1, vol: .5 }, { wave: 'square', freq: 120, to: 40, dur: .5, vol: .3 }, { wave: 'noise', freq: 2000, filter: 'bandpass', dur: .4, vol: .3, delay: .15 }],
  slowmo: { wave: 'sine', freq: 220, to: 70, dur: 1, vol: .15 },
  tick: { wave: 'square', freq: 1800, dur: .02, vol: .06 },
  focus: { wave: 'square', freq: 900, dur: .03, vol: .05 },
  confirm: [{ wave: 'square', freq: 660, dur: .05, vol: .08 }, { wave: 'square', freq: 990, dur: .08, vol: .08, delay: .05 }],
  back: [{ wave: 'square', freq: 660, dur: .05, vol: .07 }, { wave: 'square', freq: 440, dur: .08, vol: .07, delay: .05 }],
  chirp: [{ wave: 'sine', freq: 3200, to: 4200, dur: .07, vol: .04 }, { wave: 'sine', freq: 3600, to: 2800, dur: .08, vol: .035, delay: .1 }],
  chirp2: { wave: 'pulse12', freq: 2600, dur: .2, vol: .025, arp: [0, 4, 7, 4], step: .05 },
  wind: { wave: 'noise', freq: 400, to: 700, filter: 'lowpass', dur: 4, vol: .05, attack: 1.5, hold: true },
  lap: { wave: 'noise', freq: 900, to: 500, filter: 'bandpass', dur: .6, vol: .04, attack: .2 },
  creak: { wave: 'saw', freq: 60, to: 45, dur: .8, vol: .05 },
  caw: [{ wave: 'saw', freq: 620, to: 470, dur: .2, vol: .04 }]
};
B.SFX = SFX;
B.initAudio = game => { for (const k in SFX) game.audio.define('bb_' + k, SFX[k]); };
B.sfx = (id, o) => { const g = E.current; if (g && g.audio && !B.muteFx) g.audio.sfx('bb_' + id, o); };
B.music = (id, o = {}) => { const g = E.current; if (!g || !g.audio) return; if (!id) { g.audio.music(null); B.curSong = null; return; } if (B.curSong === id && !o.restart) return; B.curSong = id; g.audio.music(B.SONGS[id], Object.assign({ fade: .6 }, o)); };
B.sting = id => { const g = E.current; if (g && g.audio && g.audio.sting) g.audio.sting(B.SONGS[id], { at: 'now', duck: .35 }); };
B.layer = (name, v) => { const g = E.current; if (g && g.audio && g.audio.song === B.SONGS.stalk) g.audio.layer(name, v, .8); };

// ---- gibberish voices ----
const VOICES = B.VOICES = {
  emcee: { base: 140, wave: 'square', rate: 15, spread: 5, warble: .02, vol: .07 },
  dub: { base: 105, wave: 'sawtooth', rate: 11, spread: 4, warble: .03, vol: .06, grit: true },
  granny: { base: 262, wave: 'sine', rate: 14, spread: 6, warble: .06, vol: .09 },
  dwayne: { base: 185, wave: 'square', rate: 16, spread: 5, warble: .02, vol: .05 },
  loretta: { base: 225, wave: 'triangle', rate: 15, spread: 6, warble: .02, vol: .1 },
  earl: { base: 95, wave: 'square', rate: 10, spread: 3, warble: .02, vol: .06 }
};
const FORMANT = { a: 800, e: 500, i: 300, o: 450, u: 330, y: 400 };
B.babble = (who, line) => {
  const g = E.current, A = g && g.audio; if (!A || B.muteFx) return;
  const bus = A.bus && A.bus('sfx'); if (!bus || !A.ctx || A.ctx.state !== 'running') return;
  const V = VOICES[who] || VOICES.emcee, c = A.ctx, caps = line === line.toUpperCase() && /[A-Z]/.test(line);
  const letters = line.toLowerCase().replace(/[^a-z]/g, ''), n = Math.min(18, Math.ceil(letters.length / 2));
  const rate = V.rate * (caps ? 1.25 : 1), up = /[!?]\s*$/.test(line);
  let t = c.currentTime + .02;
  for (let k = 0; k < n; k++) {
    const pair = letters.substr(k * 2, 2), vow = (pair.match(/[aeiouy]/) || ['a'])[0], step = 'aeiouy'.indexOf(vow) - 2;
    const f = V.base * Math.pow(2, (step * V.spread / 6 + (up && k > n - 4 ? (k - n + 4) * 1.5 : 0)) / 12) * (1 + (B.fx() - .5) * V.warble * 2);
    const o = c.createOscillator(), gn = c.createGain(), bp = c.createBiquadFilter();
    o.type = V.wave; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (1 + V.warble), t + .05);
    bp.type = 'bandpass'; bp.frequency.value = FORMANT[vow] * 2; bp.Q.value = 1.4;
    const d = .04 + B.fx() * .03, vol = V.vol * (caps ? 1.4 : 1);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + .008); gn.gain.exponentialRampToValueAtTime(.0005, t + d);
    o.connect(bp); bp.connect(gn); gn.connect(bus); o.start(t); o.stop(t + d + .02);
    t += 1 / rate;
  }
};

// ---- ambience beds ----
B.ambience = (dt, huntId) => {
  const S = B._amb || (B._amb = { t: 0, next: 1, wind: 0 }); S.t += dt; S.wind -= dt;
  if (S.wind <= 0) { B.sfx('wind', { vary: .2 }); S.wind = 3.6; }
  if (S.t < S.next) return;
  S.next = S.t + 1.5 + B.fx() * 3;
  const r = B.fx();
  if (huntId === 'hollow') { if (r < .55) B.sfx(r < .3 ? 'chirp' : 'chirp2', { vary: .2 }); else if (r < .7) B.sfx('caw', { vary: .15 }); else B.sfx('lap'); }
  else if (huntId === 'bugle') { if (r < .4) B.sfx('chirp2', { vary: .3, vol: .7 }); else if (r < .55) B.sfx('bugle', { vol: .25, vary: .1 }); else if (r < .7) B.sfx('marmot', { vol: .3 }); }
  else if (huntId === 'muskeg') { if (r < .25) B.sfx('loon', { vol: .5 }); else if (r < .45) B.sfx('creak'); else if (r < .7) B.sfx('lap'); }
  else if (r < .6) B.sfx('chirp', { vary: .25 });
};

// ---- barks (the emcee unless noted), no repeats of the last two ----
const BARKS = B.BARKS = {
  start: ['BUCKS ONLY!', 'HERE THEY COME!', 'EYES SHARP, HUNTERS!', '{n} BUCKS ON THE MOVE!'],
  kill: ['NICE SHOT!', "BAGGED 'EM!", 'WHAT A SHOT!', 'DOWN HE GOES!'],
  gut: ['GUT SHOT... FINISH HIM!', 'HE\'S HIT! FINISH HIM!'],
  long: ['LONG SHOT! CALL THE PAPER!'], running: ['RUNNING SHOT!'], quick: ['QUICK DRAW!'],
  double: ['DOUBLE!'], triple: ['TRIPLE! THE CROWD GOES MILD!'],
  miss: ['MISSED HIM CLEAN!', "THAT'S A LOT OF DIRT YOU KILLED!", "BARK'S DEAD, BUCK AIN'T!"],
  pump: ['PUMP IT!', 'RELOAD, HOSS!'],
  doe: ["DOE! YOU'RE OUT!", "THAT'S A DOE! HOLSTER UP!", 'AW, NOT MAMA!'], fawn: ['A FAWN?! GO SIT IN THE TRUCK!'],
  escape: ["HE'S GETTIN' AWAY!", 'GONE LIKE A RUMOR!'], lost: ['WOUNDED AND LOST...'],
  clear: ['SITE CLEAR!', 'CLEAN SWEEP!'], time: ['TIME!'],
  critter: ['CRITTER BONUS!'], tips: ['Wait for him to clear that tree.', 'Hold your breath. Steady as a church pew.', 'Give him a grunt.']
};
const lastBark = {};
B.barkLine = (cat, vars = {}) => {
  const list = BARKS[cat]; if (!list) return null;
  const used = lastBark[cat] || []; let pool = list.filter(l => !used.includes(l)); if (!pool.length) pool = list;
  const l = pool[Math.floor(B.fx() * pool.length)]; lastBark[cat] = used.concat(l).slice(-2);
  return l.replace('{n}', ['NO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][vars.n] || vars.n);
};
let barkGap = 0;
B.bark = (cat, vars = {}, pri = 1) => {
  if (barkGap > 0 && pri < 3) return;
  const line = B.barkLine(cat, vars); if (!line) return;
  barkGap = 1.2; B.bus.emit('caption', { who: vars.who || 'emcee', line });
};
B.stepBarks = dt => { barkGap = Math.max(0, barkGap - dt); };

// ---- feedback: events from play ----
const on = B.bus.on;
B.feel = { dryBarks: 0 };
const game = () => E.current;
const shake = n => { const g = game(); if (g && !g.reduceMotion && g.shake) g.shake(n * (g.settings && g.settings.shake !== undefined ? g.settings.shake : 1)); };
const rumble = (p, s, d) => { if (p && p.input && p.input.rumble && !p.bot) p.input.rumble(s, d); };
on('shot', e => {
  if (e.p.ghost) return;
  B.sfx('rifle', { vary: .05 }); shake(1.5); rumble(e.p, .35, .08);
  const r = e.res; B.sfx({ animal: 'fur', critter: 'fur', occluder: r.occ && r.occ.type === 'cyl' ? 'wood' : 'ricochet', ground: 'dirt', water: 'splash', target: r.actor && /clay/.test(r.actor.kind) ? 'clay' : 'fur', sky: null }[r.kind] || 'dirt', { vol: .8 });
  if (r.kind === 'ground' && B.fx() < .25 && B.site && !B.site.def.bonus) B.bark('miss');
});
on('pump', e => { if (!e.p.ghost) B.sfx('pump'); });
on('reload', e => { if (e.p.ghost) return; for (let k = 0; k < 5; k++) setTimeoutSafe(() => B.sfx('shell'), k * 220); });
const setTimeoutSafe = (f, ms) => { const g = game(); if (g && g.after) g.after(ms / 1000, f); };
on('dry', e => { B.sfx('dry'); if (B.feel.dryBarks < 2) { B.feel.dryBarks++; B.bark('pump', {}, 2); } });
on('call', e => {});
on('kill', e => {
  const g = game(); if (g && g.freeze) g.freeze(.04); rumble(e.p, .7, .15); shake(2);
  const Z = B.ZONE[e.zone];
  if (e.a.trophy) { B.bus.emit('banner', { text: 'TROPHY BAGGED!', color: '#f0c030', pri: 3, life: 1.6 }); B.sting('fanfare'); return; }
  if (Z.lethal) B.bus.emit('banner', { text: Z.call, color: e.zone === 'heart' ? '#ff5040' : '#ffd040' });
  if (e.extra.includes('TRIPLE!')) B.bark('triple', {}, 3); else if (e.extra.includes('DOUBLE!')) B.bark('double', {}, 2);
  else if (e.dist >= 150) B.bark('long', {}, 2); else if (e.running) B.bark('running'); else if (e.extra.includes('QUICK DRAW')) B.bark('quick'); else B.bark('kill');
});
on('wound', e => { B.bark('gut', {}, 2); });
on('antler', e => { B.bus.emit('banner', { text: 'ANTLER PING!', color: '#fff0c0', life: .8 }); });
on('doe', e => {
  if (e.a.paper) return;
  const g = game(); if (g && g.flash) g.flash('#ff2010', .25, .6); rumble(e.p, 1, .3);
  B.sting('doe'); B.bark(e.a.kind === 'fawn' || e.a.kind === 'calf' ? 'fawn' : 'doe', {}, 3);
  B.bus.emit('banner', { text: e.benched ? "YOU'RE OUT!" : 'DOE! -300', color: '#ff4030', pri: 3, life: 1.4, sub: e.benched ? (e.p.name + ' IS BENCHED FOR THE SITE') : null });
});
on('protected', e => { if (e.a.crit && e.a.crit.bark) B.bus.emit('caption', { who: 'emcee', line: e.a.crit.bark }); if (e.a.kind === 'skunk') B.sfx('stink'); if (e.a.kind === 'hank') B.sfx('bonk'); if (e.a.kind === 'cow') B.sfx('moo'); });
on('critter', e => { const c = e.a.crit; if (c && c.bark) B.bus.emit('caption', { who: 'emcee', line: c.bark }); else if (B.fx() < .5) B.bark('critter'); B.sfx(e.a.flyer ? 'feather' : 'squeak'); });
on('target', e => { if (e.a.kind === 'snowball') B.sfx('splat', { vol: .6 }); });
on('escape', e => { if (!e.a.trophy) { B.bark('escape'); B.sting('escaped'); } });
on('lost', e => B.bark('lost', {}, 2));
on('trophySpotted', e => { B.bus.emit('banner', { text: 'TROPHY SPOTTED!', color: '#f0c030', pri: 3, life: 1.5 }); B.bus.emit('caption', { who: 'emcee', line: { 'iron-rack': "THAT'S OLD IRON RACK!", duke: 'THE DUKE!', 'big-mo': 'HERE COMES BIG MO!' }[e.a.trophy] }); B.layer('tension', 1); B.layer('tension2', 1); });
on('flattened', e => { B.bus.emit('banner', { text: 'BIG MO SAYS NO!', color: '#ff6030', pri: 3, life: 2 }); B.sfx('crash'); shake(8); });
on('rockfall', e => { B.sfx('rockfall'); if (e.site) { const [x, y] = e.at; e.site.herd.noise(x, y, 1.5, 200); } });
on('sound', e => { if (e.id) B.sfx(e.id, e.far ? { vol: .45 } : undefined); });
on('voice', e => B.babble(e.who, e.line));
on('ui', e => B.sfx(e.id));
on('splat', () => { B.sfx('splat'); if (B.play && B.play.splats.length < 2) B.play.splats.push({ t: 0, x: .2 + B.fx() * .6, y: .2 + B.fx() * .5, r: .07 + B.fx() * .05 }); });
on('siteEnd', e => { const r = e.reason; if (e.site.def.bonus || e.site.def.range) return; if (r === 'clear') { B.bus.emit('banner', { text: 'SITE CLEAR!', color: '#80ff80', pri: 2, life: 1.5 }); B.sting('siteclear'); } else if (r === 'time') B.bus.emit('banner', { text: 'TIME!', color: '#ffffff', pri: 2, life: 1.5 }); B.layer('drums', 0); B.layer('tension', 0); B.layer('tension2', 0); });
on('siteStart', e => { B.feel.dryBarks = Math.min(B.feel.dryBarks, 2); });
})();
