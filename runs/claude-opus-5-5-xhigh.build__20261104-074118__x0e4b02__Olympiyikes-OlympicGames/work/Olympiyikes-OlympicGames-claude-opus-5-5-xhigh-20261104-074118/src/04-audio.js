// Audio, all in code: sound effects (audio.define), the game's original songs (E.songs), stings, O.Voice (Animalese /
// Simlish gibberish through the voice bus), O.CrowdAudio (a living stadium) and O.Anthem (a procedural anthem per nation).
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, A = game.audio, { clamp } = E;

// ---------------------------------------------------------------------------------------------------------------
// sound effects
// ---------------------------------------------------------------------------------------------------------------
const D = (n, v) => A.define(n, v);
D('gun', [{ wave: 'noise', freq: 1800, to: 200, dur: .14, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 40, dur: .3, vol: .5 }]);
D('beep', { wave: 'sine', freq: 880, dur: .15, vol: .3, hold: true });
D('beepHi', { wave: 'sine', freq: 1320, dur: .3, vol: .32, hold: true });
D('thunk', [{ wave: 'noise', freq: 600, to: 200, dur: .12, vol: .35, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 60, dur: .18, vol: .4 }]);
D('boing', { wave: 'triangle', freq: 300, to: 620, dur: .35, vol: .3, vib: [12, .08] });
D('twang', { wave: 'pulse', freq: 220, to: 180, dur: .25, vol: .25, vib: [30, .05] });
D('thwack', [{ wave: 'noise', freq: 3000, to: 800, dur: .05, vol: .35 }, { wave: 'sine', freq: 180, dur: .08, vol: .3 }]);
D('clank', [{ wave: 'square', freq: 800, dur: .12, vol: .14, arp: [0, 7, 12], step: .02 }, { wave: 'noise', freq: 4000, dur: .08, vol: .2, filter: 'highpass' }]);
D('slam', [{ wave: 'noise', freq: 400, to: 60, dur: .45, vol: .55, filter: 'lowpass' }, { wave: 'sine', freq: 70, to: 30, dur: .5, vol: .6 }, { wave: 'square', freq: 900, dur: .1, vol: .08, arp: [0, 5, 0, 5], step: .025, loop: true }]);
D('splash', [{ wave: 'noise', freq: 2000, to: 300, dur: .55, vol: .45 }, { wave: 'noise', freq: 5000, to: 1500, dur: .25, vol: .15, filter: 'highpass' }]);
D('slap', [{ wave: 'noise', freq: 4000, to: 900, dur: .09, vol: .5 }, { wave: 'sine', freq: 110, to: 40, dur: .3, vol: .45 }]);
D('bubbles', { wave: 'sine', freq: 700, dur: .25, vol: .14, arp: [0, 7, 3, 10, 5, 12], step: .04 });
D('swish', { wave: 'noise', freq: 3200, to: 2000, dur: .22, vol: .22, filter: 'highpass' });
D('crunch', { wave: 'noise', freq: 900, to: 400, dur: .12, vol: .3 });
D('scrape', [{ wave: 'noise', freq: 4500, dur: .16, vol: .2, filter: 'highpass' }, { wave: 'square', freq: 70, dur: .16, vol: .06 }]);
D('clack', [{ wave: 'noise', freq: 1500, dur: .05, vol: .45 }, { wave: 'square', freq: 400, to: 300, dur: .06, vol: .15 }]);
D('brush', { wave: 'noise', freq: 2600, to: 1800, dur: .09, vol: .16, filter: 'bandpass' });
D('puck', { wave: 'square', freq: 2000, dur: .03, vol: .2 });
D('check', [{ wave: 'noise', freq: 600, to: 100, dur: .25, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 45, dur: .25, vol: .45 }]);
D('glass', [{ wave: 'noise', freq: 5000, dur: .2, vol: .25, filter: 'highpass' }, { wave: 'triangle', freq: 1200, dur: .3, vol: .12, vib: [25, .03] }]);
D('horn', [{ wave: 'saw', freq: 220, dur: 1.2, vol: .16, hold: true }, { wave: 'saw', freq: 277, dur: 1.2, vol: .12, hold: true }, { wave: 'saw', freq: 330, dur: 1.2, vol: .12, hold: true }]);
D('buzzer', { wave: 'square', freq: 180, dur: .8, vol: .2, hold: true });
D('whistle', { wave: 'sine', freq: 2400, dur: .45, vol: .22, vib: [28, .04], hold: true });
D('cowbell', [{ wave: 'square', freq: 560, dur: .25, vol: .12 }, { wave: 'square', freq: 840, dur: .22, vol: .1 }]);
D('camera', [{ wave: 'noise', freq: 6000, dur: .03, vol: .2, filter: 'highpass' }, { wave: 'square', freq: 1400, dur: .02, vol: .08 }]);
D('firework', [{ wave: 'noise', freq: 900, to: 120, dur: .5, vol: .45, filter: 'lowpass' }, { wave: 'noise', freq: 6000, dur: .4, vol: .12, filter: 'highpass', delay: .12 }]);
D('launch', { wave: 'noise', freq: 400, to: 3000, dur: .5, vol: .16, filter: 'bandpass' });
D('medal', [{ wave: 'triangle', freq: 'C6', dur: .25, vol: .25 }, { wave: 'triangle', freq: 'E6', dur: .25, vol: .22, delay: .09 }, { wave: 'triangle', freq: 'G6', dur: .45, vol: .22, delay: .18 }]);
D('cough', [{ wave: 'noise', freq: 700, to: 300, dur: .12, vol: .35 }, { wave: 'noise', freq: 600, to: 250, dur: .1, vol: .3, delay: .18 }]);
D('alarm', { wave: 'square', freq: 880, dur: 1.2, vol: .12, arp: [0, -5], step: .12, loop: true });
D('pop', [{ wave: 'noise', freq: 3000, to: 100, dur: .3, vol: .5 }, { wave: 'sine', freq: 300, to: 60, dur: .2, vol: .3 }]);
D('gasp', { wave: 'noise', freq: 1800, to: 900, dur: .4, vol: .2 });
D('rumble', { wave: 'noise', freq: 160, dur: .3, vol: .25, filter: 'lowpass' });
D('tick', { wave: 'square', freq: 1600, dur: .02, vol: .1 });
D('judge', { wave: 'triangle', freq: 'A5', dur: .12, vol: .2 });
D('stringpull', { wave: 'saw', freq: 180, to: 260, dur: .5, vol: .06 });
D('ski', { wave: 'noise', freq: 2200, dur: .5, vol: .08, filter: 'highpass' });
D('jet', { wave: 'noise', freq: 800, to: 1600, dur: .6, vol: .22 });
D('crowdOoh', [{ wave: 'triangle', freq: 'G3', to: 'D3', dur: .9, vol: .12, vib: [5, .02] }, { wave: 'triangle', freq: 'B3', to: 'F#3', dur: .9, vol: .1 }]);
D('stepFast', { wave: 'noise', freq: 400, dur: .03, vol: .12, filter: 'lowpass' });
D('blip', { wave: 'square', freq: 'E6', dur: .04, vol: .08 });
D('fire', { wave: 'noise', freq: 500, to: 1600, dur: .35, vol: .25 });

// ---------------------------------------------------------------------------------------------------------------
// a tiny score language: 'C5:4 E5:2 .:2' -> 'C5 - - - E5 - . .'; chords and arpeggios over a progression
// ---------------------------------------------------------------------------------------------------------------
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const midi = n => { const m = /^([A-G][b#]?)(-?\d)$/.exec(n); return m ? NOTE[m[1]] + 12 * (+m[2] + 1) : null; };
const name = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const tr = (n, s) => { const m = midi(n); return m === null ? n : name(m + s); };
const L = str => str.trim().split(/\s+/).flatMap(tok => { if (tok === '|') return []; const [n, l] = tok.split(':'), len = +(l || 1); return [n].concat(Array(len - 1).fill(n === '.' ? '.' : '-')); }).join(' ');
const rep = (s, n) => Array(n).fill(s).join(' | ');
const CH = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus: [0, 5, 7], dim: [0, 3, 6], 6: [0, 4, 7, 9] };
const chord = (sym, oct = 4) => { const m = /^([A-G][b#]?)(.*)$/.exec(sym); const root = NOTE[m[1]] + 12 * (oct + 1); return (CH[m[2]] || CH['']).map(i => name(root + i)); };
/** arpeggio over a progression: each chord `len` steps, pattern of chord indexes (or '.') per step */
const arp = (prog, len, pat, oct = 4) => prog.map(c => { const notes = chord(c, oct), out = []; for (let i = 0; i < len; i++) { const p = pat[i % pat.length]; if (p === '.' || p === '-') out.push(p); else { const d = +p, n = notes[d % notes.length]; out.push(d >= notes.length ? tr(n, 12) : n); } } return out.join(' '); }).join(' | ');
const bass = (prog, len, pat, oct = 2) => prog.map(c => { const r = chord(c, oct)[0], f = chord(c, oct)[2]; const out = []; for (let i = 0; i < len; i++) { const p = pat[i % pat.length]; out.push(p === 'r' ? r : p === 'f' ? f : p === 'o' ? tr(r, 12) : p); } return out.join(' '); }).join(' | ');
O.music = { L, rep, arp, bass, chord, tr, midi, name };

// ---------------------------------------------------------------------------------------------------------------
// the songs (all original); every event song has a 'hype' layer the YIKES TURBO fades in
// ---------------------------------------------------------------------------------------------------------------
const S = E.songs;
S.oly_title = { bpm: 120, steps: 4, tracks: [
  { wave: 'saw', vol: .1, notes: L('G4:4 C5:4 E5:4 G5:4 | C6:8 B5:2 A5:2 G5:4 | A5:4 F5:4 D5:4 G5:4 | E5:4 D#5:4 D5:4 C#5:4 | C5:4 .:2 G4:2 C5:2 E5:2 G5:4 | C6:12 .:4') },
  { wave: 'square', vol: .05, notes: L('E4:4 G4:4 C5:4 E5:4 | E5:8 D5:4 B4:4 | F4:4 A4:4 B4:4 B4:4 | C5:4 B4:4 Bb4:4 A4:4 | A4:4 .:4 C5:4 E5:4 | E5:12 .:4') },
  { wave: 'triangle', vol: .22, notes: L('C3:4 C3:4 G2:4 G2:4 | A2:4 A2:4 E2:4 E2:4 | F2:4 F2:4 G2:4 G2:4 | C3:4 B2:4 Bb2:4 A2:4 | F2:4 G2:4 C3:8 | C3:16') },
  { wave: 'drums', notes: rep('k . . . s . . . k . k . s . . .', 5) + ' | s s s s s s s s s s s s k . . .' }] };
S.oly_menu = { bpm: 112, steps: 4, tracks: [
  { wave: 'pulse', vol: .08, notes: L('E5:2 .:1 E5:1 G5:2 E5:2 D5:2 C5:2 D5:4 | E5:2 .:1 E5:1 G5:2 A5:2 G5:4 .:4 | C6:2 .:1 B5:1 A5:2 G5:2 E5:2 D5:2 C5:4 | D5:2 E5:2 C5:4 .:8') },
  { wave: 'square', vol: .045, notes: arp(['C', 'Am', 'F', 'G'], 16, '0.2.1.2.0.2.1.2.', 4) },
  { wave: 'triangle', vol: .2, notes: bass(['C', 'Am', 'F', 'G'], 16, 'r.r.o.r.r.r.o.r.') },
  { wave: 'drums', notes: rep('k . h . s . h k . k h . s . h .', 4) }] };
S.oly_parade = { bpm: 116, steps: 4, tracks: [
  { wave: 'saw', vol: .09, notes: L('C5:3 C5:1 C5:4 G4:4 E4:4 | F4:2 G4:2 A4:4 G4:8 | C5:3 C5:1 E5:4 D5:4 C5:4 | B4:2 C5:2 D5:4 G4:8 | E5:3 E5:1 E5:4 D5:4 C5:4 | A4:2 B4:2 C5:4 F5:8 | E5:4 C5:4 D5:4 B4:4 | C5:12 .:4') },
  { wave: 'square', vol: .04, notes: arp(['C', 'F', 'C', 'G', 'C', 'F', 'G', 'C'], 16, '0...2...1...2...', 4) },
  { wave: 'triangle', vol: .2, notes: bass(['C', 'F', 'C', 'G', 'C', 'F', 'G', 'C'], 16, 'r...f...r...f...') },
  { wave: 'drums', notes: rep('k . s s k . s . k . s s k s s s', 8) }] };
S.oly_sprint = { bpm: 172, steps: 4, tracks: [
  { wave: 'pulse', vol: .08, notes: L('A4:2 C5:2 E5:2 A5:2 G5:4 E5:4 | F5:2 E5:2 D5:2 C5:2 D5:4 E5:4 | A4:2 C5:2 E5:2 A5:2 B5:4 C6:4 | B5:2 A5:2 G5:2 E5:2 A5:8') },
  { wave: 'saw', vol: .06, notes: bass(['Am', 'F', 'Am', 'G'], 16, 'r.ro.r.rr.ro.rro', 2) },
  { wave: 'drums', notes: rep('k . h k s . h . k k h . s . h h', 4) },
  { name: 'hype', on: false, wave: 'drums', notes: rep('h h h h h h h h h h h h h h h h', 4) },
  { name: 'hype2', on: false, wave: 'square', vol: .04, notes: arp(['Am', 'F', 'Am', 'G'], 16, '0123012301230123', 5) }] };
S.oly_javelin = { bpm: 104, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: L('D5:2 .:2 F5:2 D5:1 F5:1 G5:4 .:4 | A5:2 G5:2 F5:2 D5:2 C5:4 D5:4 | D5:2 .:2 F5:2 D5:1 F5:1 G5:4 A5:4 | C6:2 A5:2 G5:2 F5:2 D5:8') },
  { wave: 'saw', vol: .07, notes: bass(['Dm', 'Dm', 'G', 'Dm'], 16, 'r..r.o.r..r.f.o.', 2) },
  { wave: 'drums', notes: rep('k . h k s . h . . k h . s . h .', 4) },
  { name: 'hype', on: false, wave: 'pulse', vol: .05, notes: arp(['Dm', 'Bb', 'G', 'A'], 16, '0.1.2.3.2.1.0.1.', 5) }] };
S.oly_swim = { bpm: 128, steps: 4, tracks: [
  { wave: 'triangle', vol: .14, notes: L('E5:2 G5:2 B5:2 G5:2 E5:4 D5:4 | C5:2 E5:2 G5:2 E5:2 C5:4 B4:4 | A4:2 C5:2 E5:2 G5:2 F#5:4 E5:4 | D5:2 F#5:2 A5:2 F#5:2 D5:8') },
  { wave: 'pulse', vol: .05, notes: arp(['Em', 'C', 'Am', 'D'], 16, '0120312001203120', 5) },
  { wave: 'triangle', vol: .2, notes: bass(['Em', 'C', 'Am', 'D'], 16, 'r...r.o.r...f...') },
  { wave: 'drums', notes: rep('k . h . s . h . k . h k s . h .', 4) },
  { name: 'hype', on: false, wave: 'drums', notes: rep('k h h h s h h h k h k h s h h h', 4) }] };
S.oly_diving = { bpm: 90, steps: 4, tracks: [
  { wave: 'sine', vol: .14, notes: L('A4:8 E5:8 | D5:8 C5:4 B4:4 | A4:8 E5:4 G5:4 | F5:8 E5:8') },
  { wave: 'triangle', vol: .18, notes: bass(['Am', 'F', 'Am', 'E'], 16, 'r.......f.......') },
  { wave: 'drums', notes: rep('k . . . . . . . o . . . . . c .', 4) },
  { name: 'hype', on: false, wave: 'square', vol: .04, notes: arp(['Am', 'F', 'Am', 'E'], 16, '0.1.2.1.0.1.2.1.', 5) }] };
S.oly_archery = { bpm: 80, steps: 4, tracks: [
  { wave: 'sine', vol: .12, notes: L('E5:6 D5:2 C5:8 | B4:6 C5:2 D5:8 | E5:6 G5:2 F5:4 E5:4 | D5:16') },
  { wave: 'triangle', vol: .2, notes: bass(['Am', 'F', 'C', 'G'], 16, 'r.......r.......') },
  { wave: 'drums', notes: rep('k . . . k . . . . . . . . . . .', 4) },
  { name: 'hype', on: false, wave: 'drums', notes: rep('k . k . k . k . k . k . k . k .', 4) }] };
S.oly_iron = { bpm: 96, steps: 4, tracks: [
  { wave: 'saw', vol: .09, notes: L('E3:2 E3:1 .:1 G3:2 E3:2 A3:2 G3:2 E3:4 | E3:2 E3:1 .:1 G3:2 E3:2 Bb3:2 A3:2 G3:4 | E3:2 E3:1 .:1 G3:2 E3:2 A3:2 G3:2 E3:2 D3:2 | E3:16') },
  { wave: 'square', vol: .05, notes: L('B4:8 .:8 | B4:8 D5:8 | B4:8 .:4 A4:4 | B4:16') },
  { wave: 'drums', notes: rep('k . . . s . . k k . . . s . . .', 4) },
  { name: 'hype', on: false, wave: 'saw', vol: .05, notes: L('E5:2 G5:2 A5:2 B5:2 E5:2 G5:2 A5:2 B5:2 | ' + 'D6:4 B5:4 A5:4 G5:4') }] };
S.oly_alpine = { bpm: 124, steps: 4, tracks: [
  { wave: 'pulse', vol: .07, notes: L('G5:4 D5:2 G5:2 B5:4 A5:4 | G5:2 F#5:2 E5:2 D5:2 E5:8 | C5:4 E5:2 G5:2 C6:4 B5:4 | A5:2 G5:2 F#5:2 A5:2 G5:8') },
  { wave: 'triangle', vol: .2, notes: bass(['G', 'Em', 'C', 'D'], 16, 'r...f...r...f...') },
  { wave: 'square', vol: .035, notes: arp(['G', 'Em', 'C', 'D'], 16, '0.2.1.2.0.2.1.2.', 4) },
  { wave: 'drums', notes: rep('k . h . s . h . k k h . s . h c', 4) },
  { name: 'hype', on: false, wave: 'drums', notes: rep('k h k h s h k h k h k h s h s s', 4) }] };
S.oly_yikesface = { bpm: 150, steps: 4, tracks: [
  { wave: 'saw', vol: .08, notes: L('E5:2 E5:2 D5:2 E5:4 G5:2 E5:4 | D5:2 D5:2 C5:2 D5:4 B4:2 A4:4 | E5:2 E5:2 D5:2 E5:4 G5:2 A5:4 | B5:4 A5:4 G5:4 E5:4') },
  { wave: 'saw', vol: .06, notes: bass(['Em', 'D', 'C', 'B'], 16, 'rrrrrrrrrrrrrrrr', 2) },
  { wave: 'drums', notes: rep('k . s . k k s . k . s . k k s s', 4) },
  { name: 'hype', on: false, wave: 'pulse', vol: .05, notes: arp(['Em', 'D', 'C', 'B'], 16, '0123321001233210', 5) }] };
S.oly_icesurf = { bpm: 160, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: L('A4:1 A4:1 A4:1 A4:1 C5:2 A4:2 D5:2 C5:2 A4:4 | G4:1 G4:1 G4:1 G4:1 Bb4:2 G4:2 C5:2 Bb4:2 G4:4 | A4:1 A4:1 A4:1 A4:1 C5:2 A4:2 E5:2 D5:2 C5:4 | E5:2 D5:2 C5:2 B4:2 A4:8') },
  { wave: 'triangle', vol: .2, notes: bass(['Am', 'G', 'Am', 'E'], 16, 'r.rof.r.r.rof.r.') },
  { wave: 'drums', notes: rep('k . s . k . s k k . s . k . s .', 4) },
  { name: 'hype', on: false, wave: 'drums', notes: rep('h h h h h h h h h h h h h h h h', 4) }] };
// the waltz: 3/4, a bar of 12 steps (four 16ths a beat); 24 bars ~ 62 s at 138 bpm
const W3 = (m, h) => L(m) + ' | ' + L(h);
S.oly_waltz = { bpm: 138, steps: 4, tracks: [
  { wave: 'triangle', vol: .16, notes: [
    'C5:8 E5:4', 'G5:8 E5:4', 'F5:8 D5:4', 'B4:12', 'C5:4 E5:4 G5:4', 'C6:8 B5:4', 'A5:4 G5:4 F5:4', 'G5:12',
    'A5:8 F5:4', 'E5:8 C5:4', 'D5:4 E5:4 F5:4', 'G5:12', 'E5:4 F5:4 G5:4', 'A5:8 G5:4', 'F5:4 E5:4 D5:4', 'C5:12'].map(L).join(' | ') + ' | ' + [
    'G5:4 A5:4 B5:4', 'C6:8 G5:4', 'A5:4 G5:4 F5:4', 'E5:12', 'F5:4 G5:4 A5:4', 'B5:8 D6:4', 'C6:8 B5:4', 'C6:12'].map(L).join(' | ') },
  { wave: 'square', vol: .04, notes: ['C', 'C', 'G', 'G', 'C', 'Am', 'F', 'G', 'F', 'C', 'G', 'G', 'C', 'F', 'G', 'C', 'G', 'C', 'F', 'C', 'F', 'G', 'G', 'C'].map(c => { const n = chord(c, 4); return ['.', '.', '.', '.', n[1], '-', n[2], '-', n[1], '-', n[2], '-'].join(' '); }).join(' | ') },
  { wave: 'triangle', vol: .22, notes: ['C', 'C', 'G', 'G', 'C', 'Am', 'F', 'G', 'F', 'C', 'G', 'G', 'C', 'F', 'G', 'C', 'G', 'C', 'F', 'C', 'F', 'G', 'G', 'C'].map(c => chord(c, 2)[0] + ' - - - . . . . . . . .').join(' | ') },
  { wave: 'drums', notes: rep('k . . . h . . . h . . .', 24) },
  { name: 'hype', on: false, wave: 'pulse', vol: .05, notes: ['C', 'C', 'G', 'G', 'C', 'Am', 'F', 'G', 'F', 'C', 'G', 'G', 'C', 'F', 'G', 'C', 'G', 'C', 'F', 'C', 'F', 'G', 'G', 'C'].map(c => { const n = chord(c, 5); return [n[0], n[1], n[2], n[1], n[0], n[1], n[2], n[1], n[0], n[1], n[2], n[1]].join(' '); }).join(' | ') }], loop: false };
S.oly_lounge = { bpm: 92, steps: 4, tracks: [
  { wave: 'triangle', vol: .14, notes: L('E5:3 D5:1 C5:4 A4:6 .:2 | D5:3 C5:1 B4:4 G4:6 .:2 | C5:3 B4:1 A4:4 F#4:4 A4:4 | B4:12 .:4') },
  { wave: 'square', vol: .035, notes: arp(['Am7', 'Dm7', 'G7', 'Cmaj7'], 16, '..0.12....0.12..', 4) },
  { wave: 'triangle', vol: .2, notes: bass(['Am7', 'Dm7', 'G7', 'Cmaj7'], 16, 'r...f...r...f...') },
  { wave: 'drums', notes: rep('c . . h c . . h c . . h c . h h', 4) },
  { name: 'hype', on: false, wave: 'pulse', vol: .05, notes: arp(['Am7', 'Dm7', 'G7', 'Cmaj7'], 16, '0123012301230123', 5) }] };
S.oly_organ = { bpm: 132, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: L('C5:2 D5:2 E5:2 G5:2 E5:2 G5:2 C6:4 | B5:2 A5:2 G5:2 E5:2 D5:4 G5:4 | C5:2 D5:2 E5:2 G5:2 A5:2 G5:2 E5:4 | D5:2 E5:2 D5:2 B4:2 C5:8') },
  { wave: 'square', vol: .04, notes: arp(['C', 'G', 'F', 'G'], 16, '0.2.0.2.1.2.1.2.', 4) },
  { wave: 'triangle', vol: .2, notes: bass(['C', 'G', 'F', 'G'], 16, 'r...r...r...f...') },
  { wave: 'drums', notes: rep('k . . . s . . . k . k . s . . .', 4) },
  { name: 'hype', on: false, wave: 'drums', notes: rep('k . s . k . s . k k s . k . s s', 4) }] };
S.oly_table = { bpm: 100, steps: 4, tracks: [
  { wave: 'triangle', vol: .14, notes: L('G4:4 C5:4 E5:6 D5:2 | C5:4 A4:4 G4:8 | F4:4 A4:4 C5:6 B4:2 | C5:16') },
  { wave: 'square', vol: .035, notes: arp(['C', 'F', 'F', 'C'], 16, '0...1...2...1...', 4) },
  { wave: 'triangle', vol: .2, notes: bass(['C', 'F', 'F', 'C'], 16, 'r.......f.......') },
  { wave: 'drums', notes: rep('k . . . h . . . s . . . h . . .', 4) }] };
S.oly_closing = { bpm: 112, steps: 4, tracks: [
  { wave: 'saw', vol: .09, notes: L('C5:4 E5:4 G5:6 F5:2 | E5:4 D5:4 C5:8 | A4:4 C5:4 F5:6 E5:2 | D5:4 B4:4 G4:8 | C5:4 E5:4 G5:4 C6:4 | B5:4 A5:4 G5:8 | F5:4 E5:4 D5:4 G5:4 | C6:16') },
  { wave: 'square', vol: .04, notes: arp(['C', 'G', 'F', 'G', 'C', 'Em', 'F', 'C'], 16, '0.2.1.2.0.2.1.2.', 4) },
  { wave: 'triangle', vol: .2, notes: bass(['C', 'G', 'F', 'G', 'C', 'Em', 'F', 'C'], 16, 'r...o...r...f...') },
  { wave: 'drums', notes: rep('k . h . s . h . k k h . s . h .', 8) }] };
// stings (played once over the music)
S.oly_wr = { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .12, notes: L('C5:1 E5:1 G5:1 C6:3 G5:1 C6:6') }, { wave: 'square', vol: .06, notes: L('E5:1 G5:1 C6:1 E6:3 C6:1 E6:6') }, { wave: 'drums', notes: 's s s k . . . k . . . .' }] };
S.oly_yikes = { bpm: 90, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .13, notes: L('G4:3 .:1 F#4:3 .:1 F4:3 .:1 E4:10') }, { wave: 'triangle', vol: .14, notes: L('G2:3 .:1 F#2:3 .:1 F2:3 .:1 E2:10') }] };
S.oly_laurel = { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .16, notes: L('G5:1 C6:1 E6:1 G6:5') }, { wave: 'pulse', vol: .06, notes: L('E5:1 G5:1 C6:1 E6:5') }] };
S.oly_fail = { bpm: 100, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: L('E4:2 Eb4:2 D4:2 Db4:6') }, { wave: 'triangle', vol: .16, notes: L('C3:2 B2:2 Bb2:2 A2:6') }] };
S.oly_gameover = { bpm: 80, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .1, notes: L('C5:4 G4:4 E4:4 A4:3 B4:3 A4:3 Ab4:6 Bb4:6 Ab4:6 G4:12') }, { wave: 'triangle', vol: .16, notes: L('C3:12 F2:9 Db3:18 C3:12') }] };
S.oly_victory = { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .12, notes: L('G4:2 C5:2 E5:2 G5:4 E5:2 G5:8') }, { wave: 'square', vol: .05, notes: L('E4:2 G4:2 C5:2 E5:4 C5:2 E5:8') }, { wave: 'triangle', vol: .2, notes: L('C3:6 G2:4 C3:10') }, { wave: 'drums', notes: 'k . k . k . s . . . k . . . . . . . . .' }] };
S.oly_horn = { bpm: 120, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .16, notes: L('C4:12') }, { wave: 'saw', vol: .12, notes: L('E4:12') }, { wave: 'saw', vol: .12, notes: L('G4:12') }] };
S.oly_tease = { bpm: 92, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .1, notes: L('C5:6 C5:2 D5:4 E5:4 | G5:8 E5:8') }, { wave: 'triangle', vol: .2, notes: L('C3:8 G2:8 | C3:16') }] };

O.Music = {
  current: null,
  play(id, o = {}) { const s = S['oly_' + id]; if (!s) return; O.Music.current = id; A.music(s, Object.assign({ fade: .4 }, o)); },
  stop(fade = .5) { O.Music.current = null; A.music(null, { fade }); },
  sting(id) { const s = S['oly_' + id]; if (s) A.sting(s); },
  hype(on) { const C = A.song; if (!C || !C.tracks) return; for (const n of ['hype', 'hype2']) if (C.tracks.some(t => t.name === n)) A.layer(n, on ? 1 : 0, .3); }
};

// ---------------------------------------------------------------------------------------------------------------
// O.Voice: gibberish speech. Syllables -> formant-filtered oscillators through the voice bus; deterministic pitch
// ---------------------------------------------------------------------------------------------------------------
const FORM = { a: [730, 1090], e: [530, 1840], i: [270, 2290], o: [570, 840], u: [300, 870], y: [300, 2000] };
O.VOICES = {
  chip: { base: 140, speed: 1.15, wave: 'sawtooth', formant: 1 }, vera: { base: 210, speed: .95, wave: 'triangle', formant: 1.15 },
  pa: { base: 120, speed: .8, wave: 'square', formant: 1, echo: true }, max: { base: 150, speed: 1.25, wave: 'pulse', formant: 1 },
  yikesy: { base: 420, speed: 1.4, wave: 'triangle', formant: 1.5 }, coach: { base: 170, speed: 1.1, wave: 'square', formant: 1.05 }
};
O.Voice = {
  syllables(text) { return String(text).match(/[^aeiouy\s.,!?]*[aeiouy]+[^aeiouy\s.,!?]*|[.,!?]/gi) || []; },
  duration(text, v) { v = typeof v === 'string' ? O.VOICES[v] || O.VOICES.chip : v || O.VOICES.chip; let t = 0; for (const s of O.Voice.syllables(text)) t += s === ',' ? .12 : s === '.' || s === '?' || s === '!' ? .22 : (.075 + .012 * s.length) / v.speed + .02; return Math.min(6, t); },
  speak(text, v) {
    v = typeof v === 'string' ? O.VOICES[v] || O.VOICES.chip : v || O.VOICES.chip;
    const dur = O.Voice.duration(text, v);
    const c = A.ctx; if (!c || !A.ready || A.muted || !A._voiceBus || game.settings.commentary !== 'both') return dur;
    const syl = O.Voice.syllables(text); let t = c.currentTime + .03;
    const out = c.createGain(); out.gain.value = .5; out.connect(A._voiceBus);
    if (v.echo) { const d = c.createDelay(); d.delayTime.value = .18; const fb = c.createGain(); fb.gain.value = .3; out.connect(d); d.connect(fb); fb.connect(d); d.connect(A._voiceBus); }
    const excl = /!/.test(text), ques = /\?\s*$/.test(text);
    syl.forEach((s, i) => {
      if (s === ',' ) { t += .12; return; } if (s === '.' || s === '?' || s === '!') { t += .22; return; }
      const vow = (s.match(/[aeiouy]/i) || ['a'])[0].toLowerCase(), F = FORM[vow] || FORM.a, h = O.hash(s.toLowerCase()) % 7 - 3;
      const last = i >= syl.length - 2, contour = last && ques ? 4 : last ? -2 : 0, f0 = v.base * Math.pow(2, (h + contour + (excl ? 4 : 0)) / 12);
      const d = (.075 + .012 * s.length) / (v.speed * (excl ? 1.15 : 1));
      const osc = c.createOscillator();
      if (v.wave === 'pulse') osc.setPeriodicWave(A._pulse(.2)); else osc.type = v.wave;
      osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * Math.pow(2, -1 / 12), t + d);
      const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 6; vg.gain.value = f0 * .015; vib.connect(vg); vg.connect(osc.frequency);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .005); g.gain.setValueAtTime(.5, t + d - .025); g.gain.linearRampToValueAtTime(0, t + d);
      for (const [f, q] of [[F[0] * v.formant, 6], [F[1] * v.formant, 9]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; osc.connect(bp); bp.connect(g); }
      g.connect(out);
      if (/^[^aeiouy]/i.test(s) && A._noise) { const n = c.createBufferSource(); n.buffer = A._noise; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const ng = c.createGain(); ng.gain.setValueAtTime(.12, t); ng.gain.linearRampToValueAtTime(0, t + .012); n.connect(hp); hp.connect(ng); ng.connect(out); n.start(t); n.stop(t + .02); }
      osc.start(t); osc.stop(t + d + .02); vib.start(t); vib.stop(t + d + .02);
      t += d + .02;
    });
    return dur;
  },
  /** a crowd chant: six detuned voices on the same words */
  chant(text = 'O-LY-YI-KES!') { for (let i = 0; i < 6; i++) O.Voice.speak(text, { base: 120 + i * 23, speed: .9, wave: i % 2 ? 'square' : 'sawtooth', formant: 1 + i * .06 }); }
};

// ---------------------------------------------------------------------------------------------------------------
// O.CrowdAudio: a looping noise bed whose level follows O.Crowd.level; cheers, gasps and applause on cue
// ---------------------------------------------------------------------------------------------------------------
O.CrowdAudio = {
  node: null, level: .3, target: .3, on: false,
  ensure() {
    const c = A.ctx; if (this.node || !c || !A.ready || !A._noise) return !!this.node;
    const src = c.createBufferSource(); src.buffer = A._noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .7;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const g = c.createGain(); g.gain.value = 0; src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(A._sfxBus); src.start();
    this.node = { src, bp, lp, g }; return true;
  },
  set(on) { this.on = on; },
  update(rdt) {
    const C = O.Crowd ? O.Crowd.level : .3, want = this.on && !game.paused ? (game.settings.crowd === undefined ? .7 : game.settings.crowd) * (.04 + .16 * C) : 0;
    if (!this.ensure()) return;
    const n = this.node, t = A.ctx.currentTime; n.g.gain.setTargetAtTime(want, t, .25); n.bp.frequency.setTargetAtTime(700 + 900 * C, t, .3);
    void rdt;
  },
  cheer() { if (O.Crowd) O.Crowd.bump(.9); A.sfx({ wave: 'noise', freq: 1400, to: 900, dur: 1.4, vol: .25 * (game.settings.crowd === undefined ? .7 : game.settings.crowd) }); },
  gasp() { if (O.Crowd) O.Crowd.bump(.4); A.sfx('gasp', { vol: game.settings.crowd }); A.sfx('crowdOoh', { vol: game.settings.crowd }); },
  applause() { const v = game.settings.crowd === undefined ? .7 : game.settings.crowd; for (let i = 0; i < 6; i++) A.sfx({ wave: 'noise', freq: 2500 + i * 300, dur: .05, vol: .12 * v, delay: i * .07 + (O.hash('ap' + i) % 10) / 300 }, { vary: 0 }); }
};
O.updaters.push(rdt => O.CrowdAudio.update(rdt));

// ---------------------------------------------------------------------------------------------------------------
// O.Anthem: a deterministic anthem per nation (key, tempo, melody on chord tones over I-IV-V-I-vi-IV-V-I)
// ---------------------------------------------------------------------------------------------------------------
const KEYS = ['C', 'D', 'Eb', 'F', 'G', 'Bb'];
O.Anthem = {
  cache: {},
  song(nation) {
    const id = nation.id || nation; if (this.cache[id]) return this.cache[id];
    const rnd = E.rng(O.hash('anthem:' + id)), key = KEYS[Math.floor(rnd() * KEYS.length)], bpm = 84 + Math.floor(rnd() * 13);
    const root = midi(key + '4'), deg = [0, 2, 4, 5, 7, 9, 11], prog = [0, 3, 4, 0, 5, 3, 4, 0];
    const tri = d => [deg[d % 7] + 12 * Math.floor(d / 7), deg[(d + 2) % 7] + 12 * Math.floor((d + 2) / 7), deg[(d + 4) % 7] + 12 * Math.floor((d + 4) / 7)];
    const cells = [[8, 4, 4], [6, 2, 8], [4, 4, 4, 4], [4, 4, 8], [12, 4]];
    const mel = [], harm = [], bs = [], dr = [];
    let prev = 4;
    prog.forEach((c, bar) => {
      const ch = tri(c), cell = bar === 7 ? [16] : cells[Math.floor(rnd() * cells.length)];
      cell.forEach((len, k) => {
        let n;
        if (k === 0 || bar === 7) { const opts = ch.map(x => x + 12); n = opts.reduce((a, b) => Math.abs(b - prev) < Math.abs(a - prev) ? b : a); if (bar === 7) n = 12; }
        else { const step = rnd() < .5 ? 1 : -1; const pos = deg.indexOf(((prev % 12) + 12) % 12); n = pos >= 0 ? deg[(pos + step + 7) % 7] + 12 * Math.floor(prev / 12) + (pos + step >= 7 ? 12 : pos + step < 0 ? -12 : 0) : prev; }
        prev = n; mel.push(name(root + n) + (len > 1 ? ' -'.repeat(len - 1) : ''));
      });
      harm.push([name(root + ch[1]), '-', '-', '-', '-', '-', '-', '-', name(root + ch[2]), '-', '-', '-', '-', '-', '-', '-'].join(' '));
      bs.push([name(root - 24 + ch[0]), '-', '-', '-', '-', '-', '-', '-', name(root - 24 + ch[2] - (ch[2] > 7 ? 12 : 0)), '-', '-', '-', '-', '-', '-', '-'].join(' '));
      dr.push(bar === 6 ? 'k . . . k . . . s s s s s s s s' : 'k . . . . . . . k . . . . . . .');
    });
    const s = { bpm, steps: 4, loop: false, key, melody: mel.join(' '), tracks: [
      { wave: 'saw', vol: .11, notes: mel.join(' | ') }, { wave: 'square', vol: .035, notes: harm.join(' | ') },
      { wave: 'triangle', vol: .2, notes: bs.join(' | ') }, { wave: 'drums', notes: dr.join(' | ') }] };
    return (this.cache[id] = s);
  },
  play(nation) { A.music(O.Anthem.song(nation), { loop: false, fade: .3 }); O.Music.current = 'anthem'; }
};
})();
