/* ---------- audio: all of it synthesized in code. Effects and music on the chip synth, voices on our own formant synth ---------- */
const NOTEORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/* "C5:2 E5:2 G5:4 .:4" -> step tokens for the engine's notation: a note, then '-' for each held step */
function seq(str) {
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const [n, d] = tok.split(':'), len = +d || 1;
    out.push(n === '.' ? '.' : n); for (let i = 1; i < len; i++) out.push(n === '.' ? '.' : '-');
  }
  return out.join(' ');
}
const SONGS = {
  title: {
    bpm: 104, steps: 4,
    tracks: [
      { wave: 'square', vol: .13, notes: seq('C5:2 E5:2 G5:2 E5:2 C5:2 E5:2 G5:4 A5:2 G5:2 F5:2 E5:2 D5:4 G4:4 E5:2 G5:2 C6:2 G5:2 E5:2 G5:2 C6:4 B5:2 A5:2 G5:2 F5:2 E5:4 C5:4') },
      { wave: 'triangle', vol: .2, notes: seq('C3:4 G3:4 C3:4 G3:4 F3:4 C3:4 G3:4 G2:4 C3:4 G3:4 C3:4 G3:4 G3:4 D3:4 G3:4 C3:4') },
      { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h h' },
    ],
  },
  match: {
    bpm: 128, steps: 4,
    tracks: [
      { wave: 'pulse', vol: .1, notes: seq('G5:2 E5:2 G5:2 A5:2 G5:4 E5:4 F5:2 D5:2 F5:2 G5:2 F5:4 D5:4 E5:2 C5:2 E5:2 G5:2 C6:4 G5:4 A5:2 G5:2 F5:2 D5:2 C5:8') },
      { wave: 'triangle', vol: .2, notes: seq('C3:2 .:2 G3:2 .:2 C3:2 .:2 G3:2 .:2 F3:2 .:2 C3:2 .:2 G3:2 .:2 D3:2 .:2') },
      { wave: 'drums', vol: .1, notes: 'k . . h s . h . k . h . s . h .' },
    ],
  },
  night: {
    bpm: 144, steps: 4,
    tracks: [
      { wave: 'saw', vol: .09, notes: seq('A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 E5:2 F4:2 A4:2 C5:2 F5:2 E5:2 C5:2 A4:2 C5:2') },
      { wave: 'square', vol: .12, notes: seq('A2:2 A2:2 A2:2 A2:2 A2:2 A2:2 G2:2 G2:2 F2:2 F2:2 F2:2 F2:2 E2:2 E2:2 E2:2 E2:2') },
      { wave: 'drums', vol: .13, notes: 'k . h h s . h k k . h h s . o h' },
    ],
  },
  story: {
    bpm: 84, steps: 4,
    tracks: [
      { wave: 'triangle', vol: .17, notes: seq('E5:4 D5:2 C5:2 D5:4 G4:4 A4:4 C5:2 D5:2 E5:8 G5:4 E5:2 D5:2 C5:4 A4:4 D5:4 B4:4 C5:8') },
      { wave: 'sine', vol: .14, notes: seq('C3:8 G3:8 A3:8 E3:8 F3:8 C3:8 G3:8 C3:8') },
    ],
  },
  fire: {
    bpm: 168, steps: 4,
    tracks: [
      { wave: 'saw', vol: .1, notes: seq('E5:1 G5:1 B5:1 E6:1 B5:1 G5:1 E5:1 G5:1 D5:1 F5:1 A5:1 D6:1 A5:1 F5:1 D5:1 F5:1') },
      { wave: 'square', vol: .12, notes: seq('E2:2 E2:2 E2:2 E2:2 D2:2 D2:2 D2:2 D2:2') },
      { wave: 'drums', vol: .15, notes: 'k h s h k k s h' },
    ],
  },
};
let curSong = null;
function playMusic(name, fade = .6) {
  if (curSong === name) return; curSong = name;
  try { game.audio.music(name ? SONGS[name] : null, { fade }); } catch (e) { /* no sound */ }
}
const SFXDEF = {
  crack:   [{ wave: 'noise', freq: 2600, to: 700, dur: .09, vol: .5, q: 1.4 }, { wave: 'square', freq: 260, to: 90, dur: .1, vol: .25 }],
  crackP:  [{ wave: 'noise', freq: 3200, to: 600, dur: .14, vol: .6, q: 1.2 }, { wave: 'square', freq: 330, to: 70, dur: .16, vol: .3 }, { wave: 'sine', freq: 880, to: 1760, dur: .35, vol: .2, delay: .03 }],
  swish:   [{ wave: 'noise', freq: 500, to: 2200, dur: .16, vol: .22, q: .9 }],
  thud:    [{ wave: 'triangle', freq: 140, to: 50, dur: .12, vol: .4 }, { wave: 'noise', freq: 400, to: 150, dur: .08, vol: .2 }],
  stumps:  [{ wave: 'noise', freq: 1400, to: 300, dur: .25, vol: .5, q: .8 }, { wave: 'square', freq: 440, to: 110, dur: .2, vol: .2 }, { wave: 'triangle', freq: 90, dur: .3, vol: .3 }],
  pop:     [{ wave: 'noise', freq: 900, to: 400, dur: .06, vol: .4 }, { wave: 'sine', freq: 300, to: 200, dur: .07, vol: .25 }],
  bounce:  [{ wave: 'triangle', freq: 200, to: 120, dur: .05, vol: .18 }],
  cheer:   [{ wave: 'noise', freq: 800, to: 1500, dur: 1.4, vol: .22, filter: 'bandpass', q: .5 }],
  groan:   [{ wave: 'triangle', freq: 280, to: 130, dur: .7, vol: .25, vib: [6, .04] }],
  glass:   [{ wave: 'noise', freq: 6000, to: 3000, dur: .4, vol: .35, filter: 'highpass' }, { wave: 'sine', freq: 2400, to: 1800, dur: .3, vol: .12, arp: [0, 5, 9, 12], step: .04 }],
  moo:     [{ wave: 'saw', freq: 130, to: 95, dur: .8, vol: .3, vib: [5, .05] }],
  fireup:  [{ wave: 'noise', freq: 300, to: 3000, dur: .8, vol: .3, q: .6 }, { wave: 'saw', freq: 110, to: 440, dur: .8, vol: .25 }],
  appeal:  [{ wave: 'square', freq: 660, dur: .09, vol: .3 }, { wave: 'square', freq: 660, dur: .09, vol: .3, delay: .12 }, { wave: 'square', freq: 990, dur: .25, vol: .3, delay: .24 }],
  dropped: [{ wave: 'triangle', freq: 500, to: 160, dur: .5, vol: .3, vib: [9, .03] }],
  ding:    [{ wave: 'sine', freq: 1568, dur: .3, vol: .25 }, { wave: 'sine', freq: 2093, dur: .5, vol: .2, delay: .08 }],
  tick:    [{ wave: 'square', freq: 1200, dur: .02, vol: .12 }],
  release: [{ wave: 'noise', freq: 800, to: 300, dur: .12, vol: .2 }],
  noball:  [{ wave: 'saw', freq: 200, dur: .35, vol: .3 }, { wave: 'saw', freq: 150, dur: .4, vol: .3, delay: .2 }],
  run:     [{ wave: 'square', freq: 520, dur: .04, vol: .1 }],
  golden:  [{ wave: 'sine', freq: 1046, dur: .15, vol: .25, arp: [0, 4, 7, 12], step: .06 }],
};
function defineSfx() {
  for (const k in SFXDEF) {
    const parts = SFXDEF[k];
    game.audio.define(k, parts.length === 1 ? parts[0] : parts);
  }
}
const sfx = (n, o) => { try { game.audio.sfx(n, o); } catch (e) { /* sound is optional */ } };

/* ----- voices: Animalese-style gibberish, a blip per syllable on a formant filter pair ----- */
const VOICES = {
  jeremy:   { f0: 118, spd: 1.0, bright: .9, name: 'The Hon. Jeremy Thwaite' },
  dot:      { f0: 230, spd: 1.1, bright: 1.1, name: 'Dot Pemberley' },
  vicar:    { f0: 150, spd: .85, bright: .8,  name: 'Vicar' },
  announcer:{ f0: 95,  spd: 1.3, bright: 1.2, name: 'Announcer' },
  coach:    { f0: 170, spd: .95, bright: 1,   name: 'Coach' },
  you:      { f0: 200, spd: 1.2, bright: 1,   name: 'You' },
};
const FORM = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [500, 900], u: [350, 700] };
let voiceEnd = 0;
function speak(text, voiceId) {
  const v = VOICES[voiceId] || VOICES.jeremy, a = game.audio;
  if (!a || !a.ctx || a.ctx.state !== 'running' || a.muted) return 0;
  const ctx = a.ctx, bus = a.bus('voice'); if (!bus) return 0;
  const t0 = ctx.currentTime + .02; let t = t0, n = 0;
  const letters = text.toLowerCase().replace(/[^a-z ]/g, '');
  for (let i = 0; i < letters.length && n < 90; i++) {
    const ch = letters[i];
    if (ch === ' ') { t += .07 / v.spd; continue; }
    if (i % 2 && 'aeiou'.indexOf(ch) < 0) continue;   // about a syllable per two letters
    const code = ch.charCodeAt(0) - 96, vow = 'aeiou'.indexOf(ch) >= 0 ? ch : 'aeiou'[code % 5];
    const f = v.f0 * Math.pow(2, ((code * 7) % 12 - 5) / 12) * (1 + (/[.!?]/.test(text[i]) ? .1 : 0));
    const o = ctx.createOscillator(), g = ctx.createGain(), b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (code % 3 === 0 ? 1.12 : .94), t + .06);
    b1.type = b2.type = 'bandpass'; b1.frequency.value = FORM[vow][0] * v.bright; b2.frequency.value = FORM[vow][1] * v.bright; b1.Q.value = b2.Q.value = 6;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .075 / v.spd);
    o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.connect(bus);
    o.start(t); o.stop(t + .09 / v.spd); t += .085 / v.spd; n++;
  }
  voiceEnd = t; return t - t0;
}

/* ----- the commentary box ----- */
const COMM = { line: null, t: 0, who: 0, lock: 0, queue: [] };
function say(kind, prio = 1, force = false) {
  const arr = LINES[kind]; if (!arr) return;
  if (COMM.lock > 0 && prio < COMM.prio && !force) return;
  const text = rpick(arr, RNG.cos), idx = COMM.who = 1 - COMM.who;
  COMM.line = { name: COMM_NAMES[idx], text, vid: idx ? 'dot' : 'jeremy' };
  COMM.t = 4.5; COMM.lock = 2.4; COMM.prio = prio;
  speak(text, COMM.line.vid);
}
function commentUpdate(dt) { if (COMM.t > 0) COMM.t -= dt; if (COMM.lock > 0) COMM.lock -= dt; }
