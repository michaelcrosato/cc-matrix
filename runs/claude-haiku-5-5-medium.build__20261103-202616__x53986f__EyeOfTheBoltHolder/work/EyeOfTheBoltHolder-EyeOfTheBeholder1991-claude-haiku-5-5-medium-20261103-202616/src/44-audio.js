/* ===== 44 audio · every sound and song is written in code (PLAN §6.5): the engine's chip voices and step-sequencer songs ===== */
/** the sound names the sim and the view use, each a voice in the engine's format (defined at boot) */
const SFX = {
  step: { wave: 'noise', freq: 320, to: 120, dur: .07, vol: .1, filter: 'lowpass' }, turn: { wave: 'noise', freq: 900, to: 500, dur: .06, vol: .05 },
  thud: [{ wave: 'square', freq: 90, to: 50, dur: .1, vol: .2 }, { wave: 'noise', freq: 300, dur: .06, vol: .12 }], bump: { wave: 'square', freq: 90, dur: .08, vol: .18 },
  door: { wave: 'noise', freq: 400, to: 200, dur: .25, vol: .12, filter: 'lowpass' }, gate: { wave: 'saw', freq: 70, to: 110, dur: .9, vol: .12, vib: [12, .1], filter: 'lowpass' },
  lever: [{ wave: 'square', freq: 260, to: 140, dur: .08, vol: .2 }, { wave: 'noise', freq: 1200, dur: .05, vol: .12, delay: .09 }], click: { wave: 'square', freq: 1200, dur: .02, vol: .12 },
  plate: { wave: 'square', freq: 140, to: 90, dur: .1, vol: .2 }, grind: { wave: 'saw', freq: 60, to: 90, dur: .8, vol: .1, vib: [9, .1] },
  dart: [{ wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2 }, { wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2, delay: .07 }],
  locked: { wave: 'square', freq: 180, dur: .05, vol: .16 }, unlock: { wave: 'square', freq: 660, arp: [0, 7], step: .06, dur: .14, vol: .18 }, scratch: { wave: 'noise', freq: 2200, dur: .15, vol: .1 },
  alcove: { wave: 'square', freq: 500, to: 700, dur: .08, vol: .1 }, take: { wave: 'square', freq: 440, dur: .05, vol: .1 }, drop: { wave: 'noise', freq: 900, to: 300, dur: .08, vol: .12 },
  equip: { wave: 'square', freq: 300, to: 500, dur: .1, vol: .1 }, whoosh: { wave: 'noise', freq: 2000, to: 400, dur: .25, vol: .14 }, eat: { wave: 'noise', freq: 600, dur: .1, vol: .12 },
  drink: { wave: 'sine', freq: 300, to: 600, dur: .2, vol: .16 }, zap: { wave: 'square', freq: 1400, to: 300, dur: .1, vol: .1 }, cast: { wave: 'triangle', freq: 500, to: 1000, dur: .3, vol: .14 },
  spark: { wave: 'square', freq: 1600, to: 800, dur: .08, vol: .1 }, heal: { wave: 'sine', freq: 500, to: 800, dur: .3, vol: .14 }, mend: { wave: 'sine', freq: 660, to: 880, dur: .3, vol: .12 },
  swing: { wave: 'noise', freq: 2600, to: 800, dur: .1, vol: .12 }, blunt: { wave: 'noise', freq: 300, dur: .12, vol: .16 }, bow: { wave: 'saw', freq: 220, to: 330, dur: .1, vol: .1 }, bolt: [{ wave: 'saw', freq: 220, to: 880, dur: .18, vol: .16 }, { wave: 'noise', freq: 3000, to: 600, dur: .2, vol: .1 }],
  hit: { wave: 'noise', freq: 800, to: 200, dur: .08, vol: .16 }, hurt: { wave: 'square', freq: 220, to: 110, dur: .15, vol: .18 }, die: { wave: 'square', freq: 200, to: 60, dur: .4, vol: .18, vib: [5, .05] },
  bone: { wave: 'noise', freq: 1800, to: 900, dur: .12, vol: .14 }, ooze: { wave: 'sine', freq: 140, to: 60, dur: .16, vol: .25 }, squelch: { wave: 'sine', freq: 140, to: 60, dur: .16, vol: .25 },
  rattle: { wave: 'noise', freq: 2200, arp: [0, 3, 0, 5], step: .04, dur: .2, vol: .1 }, wind: { wave: 'triangle', freq: 300, to: 500, dur: .3, vol: .08 }, snap: { wave: 'noise', freq: 2000, dur: .1, vol: .1 },
  brace: { wave: 'square', freq: 400, dur: .12, vol: .1 }, charge: { wave: 'saw', freq: 110, to: 330, dur: .8, vol: .08 }, gaze: { wave: 'sine', freq: 200, to: 420, dur: .6, vol: .1, vib: [6, .1] },
  hold: { wave: 'square', freq: 120, to: 80, dur: .4, vol: .14 }, slam: { wave: 'square', freq: 70, to: 30, dur: .5, vol: .3 }, shriek: { wave: 'saw', freq: 900, to: 400, dur: .6, vol: .14 },
  lockTurn: [{ wave: 'saw', freq: 90, to: 140, dur: 1.2, vol: .14, vib: [10, .1] }, { wave: 'noise', freq: 700, dur: 1, vol: .06, delay: .2 }], clatter: { wave: 'noise', freq: 1500, dur: .3, vol: .2 },
  levelUp: { wave: 'square', freq: 523, arp: [0, 4, 7, 12], step: .08, dur: .12, vol: .16 }, deed: { wave: 'triangle', freq: 660, arp: [0, 4, 7, 11, 12], step: .09, dur: .14, vol: .18 }, secret: { wave: 'square', freq: 880, arp: [0, 7], step: .07, dur: .12, vol: .14 },
  raise: { wave: 'sine', freq: 300, to: 900, dur: 1, vol: .14 }, gameOver: { wave: 'saw', freq: 220, to: 55, dur: 1.4, vol: .18 }, npcJoin: { wave: 'square', freq: 440, arp: [0, 4, 7], step: .08, dur: .14, vol: .14 },
  chime: { wave: 'triangle', freq: 880, dur: 1.2, vol: .18 }, scribe: { wave: 'noise', freq: 1500, dur: .2, vol: .06 }, rest: { wave: 'sine', freq: 180, to: 140, dur: .8, vol: .08 }, wake: { wave: 'square', freq: 300, to: 600, dur: .3, vol: .14 },
  fall: { wave: 'noise', freq: 600, to: 80, dur: .6, vol: .2 }, shake: { wave: 'noise', freq: 120, dur: .3, vol: .2 }, growl: { wave: 'saw', freq: 90, to: 70, dur: .4, vol: .14, vib: [7, .1] },
  roar: [{ wave: 'saw', freq: 110, to: 55, dur: 1, vol: .2, vib: [7, .12] }, { wave: 'noise', freq: 500, to: 120, dur: .8, vol: .15, filter: 'lowpass' }]
};
/** the songs: each floor's, the title's, the boss's and the cues (the step sequencer's format) */
const SONGS = {
  title: { bpm: 76, steps: 4, tracks: [{ wave: 'triangle', vol: .26, notes: 'D3 - - - F3 - A3 - | G3 - F3 - E3 - D3 -' }, { wave: 'sine', vol: .1, notes: 'D4 - F4 - A4 G4 - F4 | E4 - D4 - C4 - E4 G4' }] },
  drains: { bpm: 60, steps: 4, tracks: [{ wave: 'triangle', vol: .24, notes: 'A1 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -' }, { wave: 'pulse25', vol: .05, notes: 'A3 . C4 . E4 . . . | D4 . C4 . B3 . . . | A3 . C4 . F4 . E4 . | E4 . . . G#3 . . .' }] },
  tumbler: { bpm: 96, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'E2 . B2 E2 . B2 E2 .' }, { wave: 'drums', vol: .1, notes: 'h . h c . h h .' }] },
  gloam: { bpm: 54, steps: 4, tracks: [{ wave: 'sine', vol: .12, notes: 'C3 - - - F#3 - - -' }, { wave: 'sine', vol: .06, notes: 'C5 - - - - - D#5 -' }] },
  vault: { bpm: 138, steps: 4, tracks: [{ wave: 'saw', vol: .08, notes: 'A2 A2 . A2 C3 . A2 . | G2 G2 . G2 Bb2 . G2 .' }, { wave: 'pulse25', vol: .05, notes: 'A4 E5 A5 E5 A4 E5 A5 E5' }, { wave: 'drums', vol: .1, notes: 'k . h k s . h .' }] },
  boss: { bpm: 138, steps: 4, tracks: [{ wave: 'saw', vol: .08, notes: 'A2 A2 . A2 C3 . A2 . | G2 G2 . G2 Bb2 . G2 .' }, { wave: 'drums', vol: .12, notes: 'k k h k s . h h' }] },
  victory: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .14, notes: 'D4 F4 A4 D5 | C5 A4 F4 D4' }] },
  ending: { bpm: 84, steps: 4, tracks: [{ wave: 'triangle', vol: .24, notes: 'D3 - F#3 - A3 - D4 - | G3 - B3 - D4 - F#4 -' }] },
  camp: { bpm: 70, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'D3 - - - F3 - A3 -' }] }
};
/** defines every sound at boot (the engine's audio takes the voices by name) */
function defineSounds(audio) { for (const [k, v] of Object.entries(SFX)) audio.define(k, v); }

/* ---- babble voices (PLAN §6.5): each vowel of the spoken line is a syllable: a formant pair on a pitch from the speaker ---- */
const BABBLE = { n: 0, who: '' };
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700] };
/** the voice's base pitch by speaker (the plan's profiles, by the speaker's name) */
const VOICE = { NARRATOR: 95, STRAKE: 170, LINTEL: 120, TAMSIN: 300, DURGAN: 105, YSOLDE: 220, VEIL: 240, SNICK: 260, BOLT: 70 };
/** speak the newly shown letters of a dialogue line: vowels become syllables; the rest a breath */
function babbleTick(talk) {
  if (!talk || typeof talk.shown !== 'string') return;
  const shown = talk.shown;
  if (shown.length < BABBLE.n) BABBLE.n = 0;
  for (let i = BABBLE.n; i < shown.length; i++) {
    const ch = shown[i].toLowerCase();
    if (FORMANTS[ch]) babbleSyl(ch, VOICE[String(talk.name || 'NARRATOR').toUpperCase().split(' ')[0]] || 120, i);
  }
  BABBLE.n = shown.length;
}
/** one syllable on the game's audio context: a sawtooth through two band-pass filters at the vowel's formants */
function babbleSyl(vowel, base, i) {
  const ctx = game.audio && game.audio.ctx; if (!ctx || !ctx.createOscillator) return;
  const t = ctx.currentTime, [f1, f2] = FORMANTS[vowel], pitch = base * (1 + ((i * 7) % 5) / 12);
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(pitch, t);
  const b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b2.type = 'bandpass'; b1.frequency.value = f1; b2.frequency.value = f2; b1.Q.value = 8; b2.Q.value = 8;
  const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(.12, t + .005); env.gain.linearRampToValueAtTime(0, t + .09);
  osc.connect(b1); osc.connect(b2); b1.connect(env); b2.connect(env); env.connect(ctx.destination);
  osc.start(t); osc.stop(t + .1);
}

/** the sound test's names: every sound defined above, by its name */
B.SFX_NAMES = Object.fromEntries(Object.keys(SFX).map(k => [k, k]));
