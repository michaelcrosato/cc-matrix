// The soundtrack (§3.10): six original electronic songs written as code (chord progressions, bass and drum patterns,
// motifs) for the engine's tracker with our synth extensions (filter envelopes, unison, pan, accents, claps, sub booms,
// sidechain). Each has A and B sections and a breakdown over 16+ bars, and named layers the music director brings in
(() => {
const SN = globalThis.SN, E = My3D2dge;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nn = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
/** a degree (0-based, may exceed 6) of a scale from a root midi note */
const deg = (root, sc, d) => root + SCALES[sc][((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
/**
 * build a song: o = { bpm, root, scale, prog: [chord degree per bar], sect(bar) -> { kick, hats, clap, snare, bass, arp, lead, pad } (booleans: which
 * play in that bar), kick/hats/clap/snare: 16-char patterns ('x' hit, '!' open hat), bass: 16-char pattern ('r' root, 'o' octave, 'f' fifth, '-' hold,
 * '.' rest, 'R' accented root), arp: pattern of chord tones '0'..'3', lead: { seed, octave, density }, voices: per-track synth settings }
 */
function build(o) {
  const bars = o.prog.length, rnd = E.rng(o.seed || 7), tr = {}, add = (name, s) => { tr[name] = (tr[name] || '') + s + ' | '; };
  const chord = b => { const d = o.prog[b]; return [deg(o.root, o.scale, d), deg(o.root, o.scale, d + 2), deg(o.root, o.scale, d + 4), deg(o.root, o.scale, d + 7)]; };
  // a lead motif per 2 bars, repeated A A B A with variation
  const motifs = [0, 1].map(() => { const m = []; let d = 4; for (let k = 0; k < 32; k++) { if (rnd() < (o.lead && o.lead.density || .45) && k % 2 === 0) { d += Math.floor(rnd() * 5) - 2; d = Math.max(0, Math.min(9, d)); m.push(d); } else m.push(k % 2 ? '-' : rnd() < .5 ? '.' : '-'); } return m; });
  for (let b = 0; b < bars; b++) {
    const S = o.sect(b), ch = chord(b), steps = k => Array.from({ length: 16 }, (_, i) => k(i)).join(' ');
    const pat = (p, tok, on) => steps(i => on && p[i] !== '.' ? (p[i] === '!' ? 'o' : tok) : '.');
    add('kick', pat(o.kick, 'k', S.kick));
    add('hats', steps(i => S.hats && o.hats[i] !== '.' ? (o.hats[i] === '!' ? 'o' : 'h') : '.'));
    add('clap', pat(o.clap || '................', 'p', S.clap));
    add('snare', pat(o.snare || '................', 's', S.snare));
    add('boom', steps(i => S.boom && i === 0 ? 'b' : '.'));
    const bassRoot = ch[0] - 12 * (o.bassDown ?? 2);
    add('bass', steps(i => { if (!S.bass) return '.'; const c = o.bass[i]; return c === 'r' ? nn(bassRoot) : c === 'R' ? nn(bassRoot) + '!' : c === 'o' ? nn(bassRoot + 12) : c === 'O' ? nn(bassRoot + 12) + '!' : c === 'f' ? nn(bassRoot + 7) : c === '-' ? '-' : '.'; }));
    add('pad1', steps(i => S.pad ? (i === 0 ? nn(ch[0]) : '-') : '.'));
    add('pad2', steps(i => S.pad ? (i === 0 ? nn(ch[1]) : '-') : '.'));
    add('pad3', steps(i => S.pad ? (i === 0 ? nn(ch[2]) : '-') : '.'));
    add('arp', steps(i => { if (!S.arp) return '.'; const c = o.arp[i % o.arp.length]; return c === '.' ? '.' : nn(ch[+c] + 12 * (o.arpUp ?? 1)); }));
    const m = motifs[(Math.floor(b / 2) % 4 === 2) ? 1 : 0];
    add('lead', steps(i => { if (!S.lead) return '.'; const t = m[(b % 2) * 16 + i]; return t === '.' || t === '-' ? t : nn(deg(o.root, o.scale, t + (o.prog[b] % 2)) + 12 * ((o.lead && o.lead.octave) ?? 1)); }));
  }
  const V = Object.assign({
    kick: { wave: 'drums', vol: .24, duck: o.duck || 0 }, hats: { wave: 'drums', vol: .09 }, clap: { wave: 'drums', vol: .14 }, snare: { wave: 'drums', vol: .14 }, boom: { wave: 'drums', vol: .18 },
    bass: { wave: 'saw', vol: .15, lp: { f: 280, q: 8, env: 1600, dec: .12 } },
    pad1: { wave: 'saw', vol: .035, uni: 3, det: 14, lp: { f: 1300, q: 1 }, pan: -.3 }, pad2: { wave: 'saw', vol: .03, uni: 3, det: 14, lp: { f: 1300, q: 1 } }, pad3: { wave: 'saw', vol: .03, uni: 3, det: 14, lp: { f: 1300, q: 1 }, pan: .3 },
    arp: { wave: 'pulse', vol: .05, lp: { f: 1800, q: 4, env: 2400, dec: .08 }, pan: .25, gate: .5 },
    lead: { wave: 'saw', vol: .055, uni: 2, det: 8, lp: { f: 2600, q: 2, env: 1200, dec: .2 }, pan: -.1 }
  }, o.voices || {});
  const on = o.on || { kick: false, hats: false, clap: false, snare: false, boom: false, arp: false, lead: false };
  return { bpm: o.bpm, steps: 4, title: o.title, artist: o.artist, tracks: Object.keys(tr).filter(k => /[A-Gkhopsb]/.test(tr[k].replace(/[.\-| ]/g, ''))).map(k => Object.assign({ name: k, notes: tr[k], on: on[k] !== false }, V[k])) };
}
const full = { kick: 1, hats: 1, clap: 1, snare: 1, bass: 1, pad: 1, arp: 1, lead: 1, boom: 0 };
const arrange = (b, n) => b < 2 ? { pad: 1, bass: 1, arp: 1 } : b >= n - 4 && b < n - 2 ? { pad: 1, arp: 1, boom: b === n - 4 } : Object.assign({}, full, { boom: b % 8 === 2 });
SN.SONGS = {
  zero: build({ title: 'ZERO CROSSING', artist: 'HALCYON DRIFT', bpm: 112, root: 62, scale: 'minor', seed: 3, prog: [0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 4, 6, 6],
    sect: b => ({ pad: 1, bass: b >= 2, arp: 1, kick: b >= 4 && b < 14, hats: b >= 4, snare: b >= 6 && b < 14, lead: b >= 8 && b < 14 }), kick: 'x.......x.x.....', hats: '..x...x...x...x!', snare: '....x.......x...', bass: 'r.......r.r.....', arp: '0123210.0123232.', on: {} ,
    voices: { bass: { wave: 'triangle', vol: .16 }, arp: { wave: 'triangle', vol: .05, pan: .3 }, lead: { wave: 'sine', vol: .07, pan: -.2 } } }),
  solenne: build({ title: 'RIVIERA BURN', artist: 'SOLSTICE 9', bpm: 128, root: 57, scale: 'minor', seed: 9, duck: .3, prog: [0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 3, 4, 4, 5, 5, 3, 3],
    sect: b => arrange(b, 20), kick: 'x...x...x...x...', hats: '..!...!...!...!x', clap: '....x.......x...', bass: 'r.o.r.o.rRo.r.O.', arp: '0.1.2.1.0.2.3.2.' }),
  karakum: build({ title: 'SANDGLASS', artist: 'DUNE//CODE', bpm: 140, root: 52, scale: 'phrygian', seed: 21, prog: [0, 0, 1, 0, 0, 0, 6, 1, 0, 0, 1, 0, 3, 3, 1, 1, 0, 1, 0, 6],
    sect: b => arrange(b, 20), kick: 'x.....x..x......', hats: 'x.x.x.x.x.x.x.!.', snare: '....x.......x..x', clap: '............x...', bass: 'R..r.rR.r..R.r.o', arp: '0..2..1..3..2...',
    voices: { bass: { wave: 'saw', vol: .15, lp: { f: 220, q: 14, env: 2600, dec: .09 } }, lead: { wave: 'square', vol: .045, lp: { f: 2000, q: 3, env: 1500, dec: .15 } } } }),
  meridian: build({ title: 'STACKLINE', artist: 'NULLPOINT', bpm: 172, root: 53, scale: 'minor', seed: 33, bassDown: 3, prog: [0, 0, 0, 0, 5, 5, 6, 6, 0, 0, 0, 0, 3, 3, 4, 4, 5, 5, 6, 6],
    sect: b => arrange(b, 20), kick: 'x.........x.....', snare: '....x.......x...', hats: 'x.xxx.x.x.xxx.x!', bass: 'r-------r-----o-', arp: '0...2...1...3...',
    voices: { bass: { wave: 'saw', vol: .14, uni: 3, det: 18, lp: { f: 420, q: 4 } }, arp: { wave: 'pulse', vol: .045, gate: .25, lp: { f: 3000, q: 6, env: 3000, dec: .05 } } } }),
  borealis: build({ title: 'POLAR VECTOR', artist: 'AURORA SYSTEMS', bpm: 136, root: 59, scale: 'minor', seed: 47, duck: .35, prog: [0, 0, 5, 5, 2, 2, 6, 6, 0, 0, 5, 5, 2, 2, 6, 6, 3, 3, 4, 4],
    sect: b => arrange(b, 20), kick: 'x...x...x...x...', hats: '..!...!...!...!.', clap: '....x.......x...', bass: '.rrr.rrr.rrr.rrr', arp: '0120312013201230',
    voices: { lead: { wave: 'saw', vol: .05, uni: 5, det: 20, lp: { f: 3400, q: 1 } }, arp: { wave: 'saw', vol: .035, uni: 2, det: 10, gate: .4, lp: { f: 2200, q: 4, env: 2000, dec: .08 } } } }),
  overclock: build({ title: 'CLOCK SKEW', artist: 'THE AUTHORITY', bpm: 120, root: 50, scale: 'phrygian', seed: 58, prog: [0, 0, 0, 1, 0, 0, 6, 1, 0, 0, 0, 1, 3, 1, 0, 1],
    sect: b => full, kick: 'x...x...x...x...', hats: '..x...x...x...xx', clap: '....x.......x...', snare: '..........x....x', bass: 'r.r.rRr.r.r.rR.o', arp: '0.0.2.0.1.0.3.0.',
    on: { hats: false, clap: false, snare: false, arp: false, lead: false, boom: false, kick: true },
    voices: { pad1: { wave: 'sine', vol: .03 }, pad2: { wave: 'sine', vol: .02 }, pad3: { wave: 'sine', vol: .02 } } })
};
SN.SONG_OF = { solenne: 'solenne', karakum: 'karakum', meridian: 'meridian', borealis: 'borealis' };
/* ---- stings: short motifs over the music ---- */
const sting = (bpm, notes, wave = 'square', vol = .1) => ({ bpm, steps: 4, loop: false, tracks: [{ wave, vol, notes, lp: { f: 3000, q: 1 } }, { wave: 'triangle', vol: vol * 1.2, notes: notes.replace(/([A-G]#?)(\d)/g, (m, a, o) => a + (o - 1)) }] });
SN.STINGS = {
  lap: sting(160, 'E5 G#5 B5 E6 - - - -'), final: sting(150, 'A4 C5 E5 A5 C6 E6 A6 - - -', 'saw', .08), win: sting(140, 'C5 E5 G5 C6 - G5 C6 - E6 - - - - - - -', 'square', .1),
  podium: sting(140, 'G4 B4 D5 G5 - - - -'), eliminated: sting(110, 'E4 D#4 D4 C#4 - - - -', 'saw', .1), unlock: sting(150, 'C5 G5 C6 G6 C7 - - -', 'pulse', .09), medal: sting(140, 'E5 B5 E6 - G#6 - - -', 'square', .09)
};
})();
