/* OutBloom — music, all composed in code. Each song is a compact score: tempo, key, chord progressions per section
 * (two bars a chord), a form, drum and bass patterns, a comping rhythm and a hook (scale degrees). OB.buildSong expands
 * it into the engine's step tracks with named layers (drums, perc, bass, keys, lead, pad, and a 'sparkle' layer that
 * Full Bloom brings in). Melodies are diatonic, chord tones on strong beats, the lead resting at least a quarter of
 * the time; the bass plays roots or fifths on beat one. Original compositions in the styles the series is known for. */
(() => {
'use strict';
const OB = window.OB;
const NOTES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const QUAL = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], sus4: [0, 5, 7, 10], '7sus4': [0, 5, 7, 10], m9: [0, 3, 7, 10, 14], '6': [0, 4, 7, 9], m: [0, 3, 7], '': [0, 4, 7], '9': [0, 4, 7, 10, 14], m6: [0, 3, 7, 9], add9: [0, 4, 7, 14], dim: [0, 3, 6, 9] };
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const nn = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);   // midi -> name
OB.chord = sym => { const m = /^([A-G][#b]?)(.*)$/.exec(sym); const root = NOTES[m[1]], q = QUAL[m[2]] !== undefined ? QUAL[m[2]] : QUAL['']; return { root, tones: q }; };
const rng = s => { let x = s >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
/** expand a score into an engine song */
OB.buildSong = (sc) => {
  const steps = sc.steps || 4, perBar = steps * 4, r = rng(OB.hashStr ? OB.hashStr(sc.title) : 7);
  const keyRoot = NOTES[sc.key[0]] + (sc.key[1] === '#' ? 1 : sc.key[1] === 'b' ? -1 : 0), scale = SCALES[sc.mode || 'major'];
  const bars = []; for (const part of sc.form) { const [sec, n] = part.split(':'); const prog = sc.prog[sec] || sc.prog.A; for (let b = 0; b < +n; b++) bars.push({ sec, chord: OB.chord(prog[Math.floor(b / 2) % prog.length]), b }); }
  const T = { drums: [], perc: [], bass: [], keys: [], lead: [], pad: [], sparkle: [] };
  const inScale = m => scale.includes(((m - keyRoot) % 12 + 12) % 12);
  let lastLead = 60 + keyRoot + 12;
  bars.forEach((bar, bi) => {
    const ch = bar.chord, root = ch.root, sec = bar.sec, intro = sec === 'I', tail = sec === 'T';
    // drums and percussion: the section's one-bar pattern (fills on the last bar before a chorus)
    const dp = (sc.drums[sec] || sc.drums.A).split(' '), fill = sc.drums.fill && bars[bi + 1] && bars[bi + 1].sec === 'C' && bars[bi].sec !== 'C' ? sc.drums.fill.split(' ') : null;
    for (let s = 0; s < perBar; s++) T.drums.push(intro && bar.b < 2 && sc.introDrums === false ? '.' : (fill || dp)[s % (fill || dp).length]);
    const pp = sc.perc ? (sc.perc[sec] || sc.perc.A).split(' ') : null; for (let s = 0; s < perBar; s++) T.perc.push(pp ? pp[s % pp.length] : '.');
    // bass: the pattern's degrees (R root, F fifth, O octave, 3 third, 7 seventh, - hold, . rest)
    const bp = (sc.bass[sec] || sc.bass.A).split(' '), bo = sc.bassOct || 2;
    for (let s = 0; s < perBar; s++) { const k = bp[s % bp.length]; const base = 12 * (bo + 1) + root; const map = { R: 0, F: 7, O: 12, '3': ch.tones[1], '7': ch.tones[3] !== undefined ? ch.tones[3] : 10, f: -5, '5': 7 };
      T.bass.push(k === '.' || k === '-' ? k : map[k] !== undefined ? nn(base + map[k]) + (s === 0 ? '!' : '') : '.'); }
    // keys: chord stabs on the comping rhythm (x hit, - hold, . rest), a close voicing around middle C
    const cp = (sc.comp[sec] || sc.comp.A).split(' ');
    const voice = ch.tones.slice(0, 4).map(iv => { let m = 48 + root + iv; while (m < 55) m += 12; while (m > 67) m -= 12; return m; }).sort((a, b) => a - b);
    const chordTok = voice.map(nn).join('+');
    for (let s = 0; s < perBar; s++) { const k = cp[s % cp.length]; T.keys.push(k === 'x' ? chordTok : k === 'X' ? chordTok + '!' : k); }
    // pad: the chord held for the bar, an octave under the keys
    T.pad.push(voice.slice(0, 3).map(m => nn(m - 12 + 12)).join('+')); for (let s = 1; s < perBar; s++) T.pad.push('-');
    // sparkle: chord-tone arpeggios high up (the Full Bloom layer)
    for (let s = 0; s < perBar; s++) T.sparkle.push(s % 2 === 0 ? nn(84 + root + ch.tones[(s / 2) % ch.tones.length] - (root > 5 ? 12 : 0)) : '.');
    // lead: rests in the intro and tail; the hook in choruses; a generated diatonic line elsewhere
    if (intro || tail) { for (let s = 0; s < perBar; s++) T.lead.push('.'); return; }
    const rhythm = (sc.leadRhythm[sec] || sc.leadRhythm.A)[bar.b % (sc.leadRhythm[sec] || sc.leadRhythm.A).length].split(' ');
    const hook = sec === 'C' ? sc.hook : null; let hi = 0;
    for (let s = 0; s < perBar; s++) {
      const k = rhythm[s % rhythm.length];
      if (k !== 'x' && k !== 'X') { T.lead.push(k === '-' ? '-' : '.'); continue; }
      let m;
      if (hook) { const deg = hook[(bar.b * 4 + hi++) % hook.length]; m = 12 * 5 + keyRoot + scale[((deg - 1) % 7 + 7) % 7] + Math.floor((deg - 1) / 7) * 12 + 12; if (bar.b % 2 && sc.hookLift) m += sc.hookLift; }
      else {
        const strong = s % (steps * 2) === 0, cands = [];
        for (let d = -7; d <= 7; d++) { const c = lastLead + d; if (c < 62 + keyRoot - 2 || c > 86) continue; const pc = ((c - root) % 12 + 12) % 12; const ct = ch.tones.some(t => t % 12 === pc); if (strong ? ct : inScale(c)) cands.push(c); }
        m = cands.length ? cands[Math.floor(r() * cands.length)] : lastLead;
        if (Math.abs(m - lastLead) > 5 && r() < .6) m = cands.sort((a, b) => Math.abs(a - lastLead) - Math.abs(b - lastLead))[0] || m;
      }
      lastLead = m; T.lead.push(nn(m) + (k === 'X' ? '!' : ''));
    }
  });
  const tr = (name, inst, vol, notes, o = {}) => Object.assign({ name, inst, vol, notes: notes.join(' '), wave: inst === 'drums' ? 'drums' : 'square' }, o);
  const I = sc.insts;
  return { title: sc.title, bpm: sc.bpm, steps, delayBeats: sc.delayBeats || .75, tracks: [
    tr('drums', 'drums', sc.vols && sc.vols.drums || .2, T.drums, { wave: 'drums' }),
    tr('perc', 'drums', sc.vols && sc.vols.perc || .13, T.perc, { wave: 'drums' }),
    tr('bass', I.bass, sc.vols && sc.vols.bass || .2, T.bass, { gate: .8 }),
    tr('keys', I.keys, sc.vols && sc.vols.keys || .09, T.keys, { gate: .7, send: { delay: .18, reverb: .3 } }),
    tr('pad', I.pad || 'pad', sc.vols && sc.vols.pad || .05, T.pad, { send: { reverb: .5 } }),
    tr('lead', I.lead, sc.vols && sc.vols.lead || .11, T.lead, { gate: .86, send: { delay: .28, reverb: .35 } }),
    tr('sparkle', 'bell', .045, T.sparkle, { on: false, gate: .5, send: { delay: .35, reverb: .5 } })
  ].map(t => { if (t.inst === 'drums') { delete t.inst; } return t; }), bars: bars.length };
};
/* ---- the scores ---- */
const FORM = ['I:4', 'A:8', 'B:8', 'C:8', 'A:8', 'D:8', 'C:8', 'C:8', 'T:4'];
const LR = { // lead rhythms, one bar each (16 steps), cycled per bar
  bright: { A: ['x . . x . . x . x . . . x . . .', 'x . x . . . x - - - . . . . . .'], B: ['. . x . x . x . . . x . x - - .', 'x - - . x . x . x - - - . . . .'], C: ['x . x . x . x . x - - - . . x .', 'x - - . x . . . x . x . x - - -'], D: ['x - - - . . x . x - - - . . . .', '. . . . x - x - x - - - . . . .'] },
  laid: { A: ['x - - . . . x . x - . . . . . .', '. . x - x - . . x - - - . . . .'], B: ['x - . . x - . . x - x - . . . .', '. . . . x - - - x - . . x - . .'], C: ['x - - - x - . . x - x - x - - -', 'x - . . x - . . x - - - - - . .'], D: ['x - - - - - - - . . . . x - - -', '. . . . . . . . x - - - x - - -'] },
  swing: { A: ['x . . x . . x - - . . . x . . .', '. . . x . x . . x - - . . . . .'], B: ['x . x . . x . . x . x - - . . .', 'x - - . . . x . x . . x . . . .'], C: ['x . x . x . x - - . . . x . x .', 'x - - - x . . x x - - - . . . .'], D: ['x - - - . . x - x - . . . . . .', '. . . . x - x - - - x - - . . .'] },
  euro: { A: ['x . x . x . x . x . . . x . x .', 'x . x . x . . . x - - - . . . .'], B: ['x x . x x . x . x x . x x . . .', 'x - - - x . x . x - - - . . . .'], C: ['X . x . X . x . X . x . X - - -', 'x . x . x . x . x - - - x . x .'], D: ['x - - - x - - - x - - - . . . .', 'x - - - x - - - . . . . . . . .'] }
};
const S = OB.SCORES = {
  sunburst: { title: 'Sunburst Samba', bpm: 128, key: 'D', prog: { I: ['Dmaj7', 'Bm7'], A: ['Dmaj7', 'Bm7', 'Em7', 'A7sus4'], B: ['Gmaj7', 'F#m7', 'Em7', 'A7'], C: ['Dmaj7', 'Bm7', 'Gmaj7', 'A7'], D: ['Bm7', 'Gmaj7', 'Em7', 'A7sus4'], T: ['Gmaj7', 'A7'] }, form: FORM,
    drums: { A: 'k . h . s . h k . . h . s . h .', C: 'k . h k s . h k k . h . s k h .', I: 'k . h . . . h . k . h . . . h .', fill: 'm m . m m . m . T T . T k k k k' }, perc: { A: 'g . G g . g G . g . G g . g G .', C: 'g G G g b g G . g G G g b g G g' },
    bass: { A: 'R . . R . . F . O . . F . . R .', C: 'R . R . F . O . R . . F . R F .' }, comp: { A: '. . x . . x . . x . . x . . x .', C: 'x . . x . . x . . x . . x . x .' }, leadRhythm: LR.bright, hook: [1, 3, 6, 8, 7, 6, 5, 3, 2, 3, 1, 1], hookLift: 0,
    insts: { bass: 'slapbass', keys: 'epiano', lead: 'steeldrum', pad: 'pad' } },
  coastline: { title: 'Coastline Crush', bpm: 116, key: 'F', prog: { I: ['Fmaj7', 'Em7'], A: ['Fmaj7', 'Em7', 'Dm7', 'Gm7'], B: ['Bbmaj7', 'Am7', 'Gm7', 'C9'], C: ['Fmaj7', 'Em7', 'Dm7', 'C9'], D: ['Dm7', 'Bbmaj7', 'Gm7', 'C9'], T: ['Bbmaj7', 'C9'] }, form: FORM,
    drums: { A: 'k . h . k p h . k . h . k p h .', C: 'k . o . k p o . k . o . k p o .', fill: 'k . s s k s s . T T T . s s s s' }, perc: { A: 'z . z z z . z z z . z z z . z z' },
    bass: { A: 'R . . R . R . . F . . F . F . R', C: 'R . R R . R . F . F F . F . O .' }, comp: { A: '. . x . . . x . . . x . . . x .', C: '. x . x . x . x . x . x . x . x' }, leadRhythm: LR.laid, hook: [5, 6, 8, 8, 9, 8, 6, 5], hookLift: 0,
    insts: { bass: 'fingerbass', keys: 'chorusgtr', lead: 'lead', pad: 'pad' } },
  shuffle: { title: 'Shuffle on the Shore', bpm: 110, steps: 3, key: 'Bb', prog: { I: ['Bb6', 'G7'], A: ['Bb6', 'G7', 'Cm7', 'F7'], B: ['Eb6', 'Edim', 'Bb6', 'G7'], C: ['Bb6', 'G7', 'Cm7', 'F7'], D: ['Cm7', 'F7', 'Bb6', 'G7'], T: ['Cm7', 'F7'] }, form: FORM,
    drums: { A: 'k . h s . h k . h s . h', C: 'k . h s . h k k h s . h', fill: 'T . T s . s T T . k k k' }, perc: { A: 'y . y y . y y . y y . y' },
    bass: { A: 'R . 3 F . O F . 3 R . F', C: 'R . 3 F . 7 O . F 3 . R' }, comp: { A: '. . x . . x . . x . . x', C: 'x . . x . x x . . x . x' }, leadRhythm: { A: ['x . . x . x . . . x - -', '. . x x . . x - - . . .'], B: ['x - - . . x x . x . . .', '. . . x . x x - - . . .'], C: ['x . x x . . x . x x - -', 'x - - x . x . . . . . .'], D: ['x - - . . . x - - . . .', '. . . x - - x - - . . .'] }, hook: [5, 3, 5, 6, 5, 3, 1, 2],
    insts: { bass: 'fingerbass', keys: 'organ', lead: 'sax', pad: 'pad' } },
  vespa: { title: 'Vespa Vendetta', bpm: 152, key: 'A', mode: 'minor', prog: { I: ['Am', 'F'], A: ['Am', 'F', 'G', 'E7'], B: ['F', 'G', 'Em', 'Am'], C: ['Am', 'F', 'G', 'E7'], D: ['F', 'G', 'Am', 'E7'], T: ['F', 'E7'] }, form: FORM,
    drums: { A: 'k . h . k . h . k . h . k . h .', C: 'k . o . k p o . k . o . k p o .', fill: 's s s s s s s s T T T T k k k k' }, perc: { A: '. . h . . . h . . . h . . . h .' },
    bass: { A: 'R O R O R O R O R O R O R O R O', C: 'R O R O R O R O F O F O R O R O' }, bassOct: 1, comp: { A: '. . x . . . x . . . x . . x . .', C: 'x . . x . . x . x . . x . . x .' }, leadRhythm: LR.euro, hook: [1, 3, 5, 8, 7, 5, 6, 5], hookLift: 12,
    insts: { bass: 'sawbass', keys: 'stab', lead: 'lead', pad: 'pad' } },
  pastel: { title: 'Pastel Highway', bpm: 104, key: 'Eb', prog: { I: ['Abmaj7', 'Gm7'], A: ['Abmaj7', 'Gm7', 'Fm7', 'Bb7sus4'], B: ['Cm7', 'Abmaj7', 'Fm7', 'Bb7'], C: ['Abmaj7', 'Gm7', 'Fm7', 'Bb7sus4'], D: ['Fm7', 'Gm7', 'Abmaj7', 'Bb7'], T: ['Fm7', 'Bb7'] }, form: FORM,
    drums: { A: 'k . h . p . h k . . h . p . h .', C: 'k . h k p . h . k k h . p . h k', fill: 'k . p . p p . p T T . T p p p p' }, perc: { A: 'z z z z z z z z z z z z z z z z' },
    bass: { A: 'R . . R . . O . . R . F . . R .', C: 'R . R . . O . R . . F . O . R .' }, comp: { A: '. . . x - . . . . . x - . . x .', C: '. x - . . x - . . x - . . x - .' }, leadRhythm: LR.laid, hook: [3, 5, 6, 5, 3, 2, 3, 1], hookLift: 0,
    insts: { bass: 'slapbass', keys: 'epiano', lead: 'sax', pad: 'pad' } },
  lemon: { title: 'Lemon Drop Rush', bpm: 140, key: 'G', prog: { I: ['G7', 'C7'], A: ['G7', 'C7', 'G7', 'D7'], B: ['C7', 'C7', 'G7', 'E7'], C: ['G7', 'C7', 'D7', 'C7'], D: ['Am', 'D7', 'G7', 'D7'], T: ['D7', 'C7'] }, form: FORM,
    drums: { A: 'k . h k s . h . . k h . s . h k', C: 'k . o k s . h k . k o . s . h s', fill: 's . s s . s s . T . T T k k k k' }, perc: { A: '. . b . . . b . . . b . . b . .' },
    bass: { A: 'R . R O . R . F . F O . R . 7 .', C: 'R O . R . O F . R O . R F . O .' }, comp: { A: '. . x . . . . x . . x . . . . .', C: 'x . . . x . . . x . . . x . x .' }, leadRhythm: LR.swing.A ? { A: LR.bright.A, B: LR.bright.B, C: LR.bright.C, D: LR.bright.D } : LR.bright, hook: [1, 4, 5, 4, 1, 4, 5, 8],
    insts: { bass: 'acid', keys: 'organ', lead: 'organlead', pad: 'pad' } },
  moonflower: { title: 'Moonflower', bpm: 92, key: 'C#', mode: 'minor', prog: { I: ['C#m9', 'Amaj7'], A: ['C#m9', 'Amaj7', 'E', 'B'], B: ['Amaj7', 'B', 'G#m', 'C#m9'], C: ['C#m9', 'Amaj7', 'E', 'B'], D: ['F#m', 'G#m', 'Amaj7', 'B'], T: ['Amaj7', 'B'] }, form: FORM,
    drums: { A: 'k . . . . . h . k . . . s . h .', C: 'k . . . s . h . k . k . s . h .', fill: 'k . . . s . s . s . s s s s s s' }, perc: { A: 'z . . . z . . . z . . . z . . .' },
    bass: { A: 'R - - - - - - - F - - - - - - -', C: 'R - - - . . R . F - - - . . F .' }, comp: { A: 'x . x . x . x . x . x . x . x .', C: 'x x x x x x x x x x x x x x x x' }, leadRhythm: LR.laid, hook: [5, 4, 3, 5, 8, 7, 5, 3],
    insts: { bass: 'fingerbass', keys: 'marimba', lead: 'softlead', pad: 'pad' } },
  // themes
  titleTheme: { title: 'OutBloom!', bpm: 120, key: 'C', prog: { I: ['C', 'G'], A: ['Cmaj7', 'Am7', 'Fmaj7', 'G7'], B: ['Fmaj7', 'Em7', 'Dm7', 'G7'], C: ['C', 'Am7', 'F', 'G7'], D: ['Am7', 'Fmaj7', 'Dm7', 'G7'], T: ['F', 'G7'] }, form: ['I:4', 'C:8', 'A:8', 'C:8', 'B:8', 'C:8', 'T:4'],
    drums: { A: 'k . h . s . h k . . h . s . h .', C: 'k . h k s . h . k k h . s . h k', I: 'c . . . . . . . s s . s s s s s', fill: 'm m . m T T . T s s s s k k k k' }, perc: { A: 'g . G g . g G . g . G g . g G .' },
    bass: { A: 'R . . R . . F . O . . F . . R .', C: 'R . R . F . O . R . . F . R F .' }, comp: { A: 'x . . x . . x . . x . . x . . .', C: 'X . . x . . x . X . . x . . x .' }, leadRhythm: LR.bright, hook: [5, 5, 6, 5, 8, 7, 6, 5, 3, 5, 1, 1],
    insts: { bass: 'slapbass', keys: 'brass', lead: 'brass', pad: 'pad' } },
  garden: { title: 'Garden Party', bpm: 100, key: 'F', prog: { I: ['Fmaj7', 'Gm7'], A: ['Fmaj7', 'Gm7', 'Am7', 'Gm7'], B: ['Bbmaj7', 'Bbm6', 'Am7', 'D7'], C: ['Gm7', 'C9', 'Fmaj7', 'D7'], D: ['Bbmaj7', 'Am7', 'Gm7', 'C9'], T: ['Gm7', 'C9'] }, form: ['I:4', 'A:8', 'B:8', 'C:8', 'A:8', 'D:8', 'C:8', 'T:4'],
    drums: { A: 'r . . r . . r . . r . . r . r .' }, perc: { A: 'z . z z z . z z z . z z z . z z' },
    bass: { A: 'R . . F . . R . R . . F . . F .' }, comp: { A: 'x . . x . . x . . x . . x . . .' }, leadRhythm: LR.laid, hook: [3, 5, 6, 8, 6, 5, 3, 2],
    insts: { bass: 'fingerbass', keys: 'pluck', lead: 'epiano', pad: 'pad' } },
  petalcount: { title: 'Petal Count', bpm: 112, key: 'D', prog: { I: ['Dm7', 'G7'], A: ['Dm7', 'G7', 'Dm7', 'G7'], B: ['Bbmaj7', 'A7', 'Dm7', 'G7'], C: ['Dm7', 'G7', 'Em7', 'A7'], D: ['Gm7', 'A7', 'Dm7', 'A7'], T: ['Em7', 'A7'] }, form: ['I:4', 'A:8', 'C:8', 'B:8', 'C:8', 'T:4'],
    drums: { A: 'k . h . s . h k . k h . s . h .' }, perc: { A: '. . p . . . p . . . p . . . p .' },
    bass: { A: 'R . R . . O . R . . F . O . R .' }, comp: { A: '. x . x . x . x . x . x . x . x' }, leadRhythm: LR.bright, hook: [1, 3, 4, 5, 4, 3, 1, 2],
    insts: { bass: 'slapbass', keys: 'chorusgtr', lead: 'lead', pad: 'pad' } },
  lullaby: { title: 'Last Light Lullaby', bpm: 84, key: 'G', prog: { I: ['Gmaj7', 'Em7'], A: ['Gmaj7', 'Em7', 'Cmaj7', 'D'], B: ['Am7', 'Bm7', 'Cmaj7', 'D'], C: ['Gmaj7', 'Bm7', 'Cmaj7', 'D'], D: ['Em7', 'Cmaj7', 'Am7', 'D'], T: ['Cmaj7', 'D'] }, form: ['I:4', 'A:8', 'C:8', 'B:8', 'C:8', 'T:4'],
    drums: { A: 'k . . . . . . . s . . . . . . .' }, perc: { A: 'z . . . z . . . z . . . z . . .' },
    bass: { A: 'R - - - - - - - F - - - - - - -' }, comp: { A: 'x . x . x . x . x . x . x . x .' }, leadRhythm: LR.laid, hook: [5, 6, 5, 3, 2, 3, 5, 1],
    insts: { bass: 'fingerbass', keys: 'marimba', lead: 'softlead', pad: 'pad' } }
};
/* ---- the songs (built at load) and the radio ---- */
OB.SONGS = [S.sunburst, S.coastline, S.shuffle, S.vespa, S.pastel, S.lemon, S.moonflower].map(OB.buildSong);
OB.THEMES = { title: OB.buildSong(S.titleTheme), menu: OB.buildSong(S.garden), results: OB.buildSong(S.petalcount), credits: OB.buildSong(S.lullaby) };
OB.STATIONS = [
  { freq: '88.6', name: 'PETAL FM', song: 0 }, { freq: '91.2', name: 'SUN FM', song: 1 }, { freq: '94.8', name: 'SHORE FM', song: 2 }, { freq: '99.1', name: 'VESPA FM', song: 3 },
  { freq: '103.5', name: 'PASTEL FM', song: 4 }, { freq: '106.3', name: 'ZEST FM', song: 5 }, { freq: '108.8', name: 'MOON FM', song: 6 }
];
/* ---- jingles (stings): short songs played once over the music ---- */
const J = (bpm, tracks) => ({ bpm, steps: 4, loop: false, tracks });
OB.JINGLES = {
  start: J(132, [{ name: 'lead', inst: 'brass', vol: .14, notes: 'C5 . E5 . G5 . C6 - - - G5 . C6 - - -' }, { name: 'bass', inst: 'slapbass', vol: .2, notes: 'C3 . . . G2 . . . C3 - - - . . . .' }, { wave: 'drums', vol: .2, notes: 'k . s . k . s . k k s s c . . .' }]),
  checkpoint: J(160, [{ name: 'lead', inst: 'brass', vol: .14, notes: 'G5 . B5 . D6 - - . G6 - - - . . . .' }, { name: 'keys', inst: 'epiano', vol: .09, notes: 'G4+B4+D5 . . . G4+C5+E5 - - - . . . . . . . .' }]),
  request: J(180, [{ name: 'lead', inst: 'bell', vol: .1, notes: 'C6 E6 G6 C7 - - . . . . . .' }]),
  success: J(170, [{ name: 'lead', inst: 'bell', vol: .1, notes: 'C6 . E6 . G6 . C7 - - - . .' }, { name: 'keys', inst: 'epiano', vol: .08, notes: 'C5+E5+G5 - - - - - - - . . . .' }]),
  fail: J(90, [{ name: 'lead', inst: 'trombone', vol: .14, notes: 'G4 - F#4 - F4 - E4~ - - - - .' }]),
  forktick: J(200, [{ name: 'lead', inst: 'marimba', vol: .12, notes: 'E6 . E6 . . . . .' }]),
  fullbloom: J(180, [{ name: 'lead', inst: 'bell', vol: .1, notes: 'C6 D6 E6 G6 A6 C7 D7 E7 G7 - - -' }]),
  goal: J(140, [{ name: 'lead', inst: 'brass', vol: .15, notes: 'C5 . C5 . E5 . G5 - - . E5 . G5 - - - | A5 . G5 . E5 . F5 . G5 - - - C6 - - -' }, { name: 'bass', inst: 'slapbass', vol: .2, notes: 'C3 . . C3 . . G2 . C3 . . . G2 . . . | F2 . . F2 . . G2 . C3 - - - . . . .' }, { wave: 'drums', vol: .2, notes: 'k . s . k k s . k . s . k k s s | k . s . k k s . c . . . . . . .' }]),
  record: J(160, [{ name: 'lead', inst: 'bell', vol: .1, notes: 'G5 C6 E6 G6 E6 C7 - - - . . .' }]),
  unlock: J(150, [{ name: 'lead', inst: 'marimba', vol: .12, notes: 'C6 E6 G6 C7 . G6 C7 - - - . .' }]),
  gameover: J(72, [{ name: 'lead', inst: 'sax', vol: .12, notes: 'G4 - Bb4 - C5 - Eb5 - D5 - - - C5 - - - | Bb4 - G4 - F4 - G4 - - - - - . . . .' }, { name: 'bass', inst: 'fingerbass', vol: .18, notes: 'C3 - - - G2 - - - F2 - - - G2 - - - | C3 - - - - - - - . . . . . . . .' }])
};
})();
