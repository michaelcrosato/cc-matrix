// Tracks are data: bpm, swing, chord per bar, and parts that turn (bar, step) into notes.
const R = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const Q = { maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], '13': [0, 4, 10, 14, 21], '13sus': [0, 5, 10, 14, 21], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '9': [0, 4, 7, 10, 14], '6': [0, 4, 7, 9], sus: [0, 5, 7, 10], '7': [0, 4, 7, 10], lyd: [0, 4, 7, 11, 14, 18], m11: [0, 3, 7, 10, 17] };
export const ch = (root, q, oct = 4) => Q[q].map((i) => 12 * (oct + 1) + R[root] + i);
export const bassOf = (root, oct = 2) => 12 * (oct + 1) + R[root];
const C = (r, q) => ({ r, q });
const LB = [C('Db', 'maj9'), C('Bb', 'm9'), C('Eb', 'm9'), C('Ab', '13'), C('Db', 'maj9'), C('Bb', 'm9'), C('Eb', 'm9'), C('Ab', '13'), C('Gb', 'maj9'), C('F', 'm7'), C('Eb', 'm9'), C('Ab', '13sus')];
const MOTIF = [
  [[0, 77, 3], [3, 75, 1], [4, 73, 2], [6, 68, 4], [12, 70, 2], [14, 72, 2]],
  [[0, 73, 3], [3, 72, 1], [4, 70, 2], [6, 65, 6], [14, 68, 2]],
  [[0, 70, 3], [3, 68, 1], [4, 66, 2], [6, 63, 4], [12, 65, 2], [14, 66, 2]],
  [[0, 68, 3], [3, 70, 1], [4, 72, 2], [6, 75, 6]],
];
const hit = (a, s) => a.includes(s);
export const TRACKS = {
  levelBest: { bpm: 92, swing: 0.12, chords: LB, parts: (b, s, t) => {
    const c = LB[b % LB.length], n = [];
    for (const [st, m, l] of (b % 12 < 4 ? MOTIF[b % 4] : [])) if (st === s) n.push({ i: 'vibes', m: m + 0, l: l / 4, v: 0.7 });
    if (b % 12 >= 4 && b % 12 < 8) { const mo = MOTIF[b % 4]; for (const [st, m, l] of mo) if (st === s) n.push({ i: 'epiano', m: m, l: l / 4, v: 0.6 }); }
    if (hit([0, 6, 10], s)) for (const m of ch(c.r, c.q, 3).slice(1, 4)) n.push({ i: 'epiano', m, l: 0.4, v: 0.3 });
    if (hit([0, 7, 10], s)) n.push({ i: 'bass', m: bassOf(c.r), l: 0.3, v: 0.6 });
    if (hit([0, 4, 8, 12], s)) n.push({ i: 'brush', v: 0.4 }); if (hit([2, 6, 10, 14], s)) n.push({ i: 'brush', v: 0.25 });
    return n; } },
  island: { bpm: 84, swing: 0, chords: [C('F', 'maj7'), C('A', 'm7'), C('Bb', 'maj7'), C('C', '9'), C('F', 'maj7'), C('D', 'm9'), C('G', 'm9'), C('C', '13')], parts: (b, s) => {
    const c = [C('F', 'maj7'), C('A', 'm7'), C('Bb', 'maj7'), C('C', '9'), C('F', 'maj7'), C('D', 'm9'), C('G', 'm9'), C('C', '13')][b % 8], n = [];
    const clave = [0, 3, 6, 10, 12];
    if (hit(clave, s)) for (const m of ch(c.r, c.q, 4).slice(0, 3)) n.push({ i: 'marimba', m: m + (s > 8 ? 0 : 0), l: 0.2, v: 0.4 });
    if (hit([0, 6, 8, 14], s)) n.push({ i: 'bass', m: bassOf(c.r, 2) + (s === 8 || s === 14 ? 7 : 0), l: 0.3, v: 0.5 });
    if (s % 2 === 0) n.push({ i: 'shaker', v: s % 4 === 0 ? 0.5 : 0.3 });
    if (b % 8 >= 4 && hit([0, 4, 7, 10], s)) n.push({ i: 'vibes', m: ch(c.r, c.q, 5)[[0, 2, 1, 3][Math.floor(s / 4) % 4]], l: 0.4, v: 0.45 });
    return n; } },
  stillness: { bpm: 60, swing: 0, chords: [C('D', 'lyd'), C('E', 'maj9')], parts: (b, s) => {
    const c = [C('D', 'lyd'), C('E', 'maj9')][b % 2], n = [];
    if (s === 0) for (const m of ch(c.r, c.q, 3).slice(0, 4)) n.push({ i: 'pad', m, l: 3.8, v: 0.8 });
    if (s === 0 || s === 8) n.push({ i: 'bell', m: ch(c.r, c.q, 6)[(b + s) % 4], l: 1, v: 0.5 });
    if (s === 6 && b % 2 === 0) n.push({ i: 'flute', m: ch(c.r, c.q, 5)[2], l: 1.2, v: 0.6 });
    return n; } },
  strength: { bpm: 100, swing: 0.1, chords: [C('E', 'm9'), C('A', '13')], parts: (b, s) => {
    const c = [C('E', 'm9'), C('A', '13')][b % 2], n = [];
    if (hit([0, 3, 6, 8, 11, 14], s)) n.push({ i: 'bass', m: bassOf(c.r, 2) + ([0, 3, 6, 8, 11, 14].indexOf(s) % 3 === 2 ? 12 : 0), l: 0.2, v: 0.7 });
    if (hit([2, 5, 7, 10, 13, 15], s)) for (const m of ch(c.r, c.q, 4).slice(1, 4)) n.push({ i: 'epiano', m, l: 0.15, v: 0.28 });
    if (hit([0, 8], s)) n.push({ i: 'kick', v: 0.6 }); if (hit([4, 12], s)) n.push({ i: 'snare', v: 0.5 }); if (s % 2 === 0) n.push({ i: 'brush', v: 0.3 });
    if (b % 4 === 3 && hit([12, 14], s)) for (const m of ch(c.r, c.q, 5).slice(0, 2)) n.push({ i: 'brass', m, l: 0.2, v: 0.4 });
    return n; } },
  cardio: { bpm: 116, swing: 0, chords: [C('Db', 'maj7'), C('C', 'm7'), C('Bb', 'm7'), C('Eb', 'sus')], parts: (b, s) => {
    const c = [C('Db', 'maj7'), C('C', 'm7'), C('Bb', 'm7'), C('Eb', 'sus')][b % 4], n = [];
    if (s % 4 === 0) n.push({ i: 'kick', v: 0.55 }); if (s === 4 || s === 12) n.push({ i: 'snare', v: 0.45 });
    if (s % 2 === 1) n.push({ i: 'brush', v: 0.3 });
    if (s % 2 === 0) n.push({ i: 'bass', m: bassOf(c.r, 2) + (s % 4 === 2 ? 12 : 0), l: 0.15, v: 0.5 });
    if (hit([0, 3, 6, 10], s)) for (const m of ch(c.r, c.q, 4).slice(1, 4)) n.push({ i: 'epiano', m, l: 0.2, v: 0.3 });
    if (hit([6, 14], s)) n.push({ i: 'brass', m: ch(c.r, c.q, 5)[1], l: 0.2, v: 0.35 });
    return n; } },
  balance: { bpm: 118, swing: 0.06, chords: [C('C', '6'), C('A', 'm7'), C('D', 'm7'), C('G', '7')], parts: (b, s) => {
    const c = [C('C', '6'), C('A', 'm7'), C('D', 'm7'), C('G', '7')][b % 4], n = [];
    if (hit([0, 4, 8, 12], s)) n.push({ i: 'bass', m: bassOf(c.r, 2) + (s === 8 ? 7 : 0), l: 0.25, v: 0.6 });
    if (hit([2, 6, 10, 14], s)) for (const m of ch(c.r, c.q, 4).slice(0, 3)) n.push({ i: 'pluck', m, l: 0.15, v: 0.35 });
    if (hit([0, 3, 7, 10, 12], s)) n.push({ i: 'marimba', m: ch(c.r, c.q, 5)[(s + b) % 4], l: 0.2, v: 0.5 });
    if (hit([4, 12], s)) n.push({ i: 'wood', v: 0.5, f: 900 }); if (hit([8], s)) n.push({ i: 'wood', v: 0.4, f: 700 });
    return n; } },
  level: { bpm: 76, swing: 0.12, chords: LB, parts: (b, s) => {
    const n = TRACKS.levelBest.parts(b, s); const c = LB[b % LB.length];
    if (b >= 4 && hit([0, 8], s)) for (const m of ch(c.r, c.q, 3).slice(0, 4)) n.push({ i: 'pad', m, l: 1.2, v: 0.8 });
    if (hit([0, 4, 8, 12], s)) n.push({ i: 'kick', v: 0.35 }); if (hit([4, 12], s)) n.push({ i: 'snare', v: 0.3 });
    return n; } },
};
export const TRACK_FOR = { title: 'levelBest', menu: 'levelBest', island: 'island', stillness: 'stillness', strength: 'strength', cardio: 'cardio', balance: 'balance', level: 'level' };
