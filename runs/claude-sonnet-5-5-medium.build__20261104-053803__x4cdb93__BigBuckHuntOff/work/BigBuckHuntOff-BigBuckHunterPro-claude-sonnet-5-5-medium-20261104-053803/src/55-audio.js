/* Audio: everything synthesised in code. Sound effects, songs, Animalese-style voices. */
(() => {
const BB = globalThis.BB, E = BB.E;
BB.defineAudio = (audio) => {
  const D = (n, v) => audio.define(n, v);
  D('gun', [{ wave: 'noise', freq: 2400, dur: .22, vol: .55, filter: 3000 }, { wave: 'sine', freq: 150, to: 38, dur: .3, vol: .6 }, { wave: 'saw', freq: 90, to: 30, dur: .12, vol: .22 }]);
  D('echo', [{ wave: 'noise', freq: 900, dur: .35, vol: .18, filter: 700 }, { wave: 'sine', freq: 70, to: 30, dur: .4, vol: .22 }]);
  D('pump', [{ wave: 'noise', freq: 3000, dur: .04, vol: .25 }, { wave: 'square', freq: 220, to: 140, dur: .05, vol: .12, delay: .0 }, { wave: 'noise', freq: 2400, dur: .05, vol: .25, delay: .11 }, { wave: 'square', freq: 300, to: 200, dur: .05, vol: .1, delay: .11 }]);
  D('pumpIn', [{ wave: 'noise', freq: 2400, dur: .05, vol: .3 }, { wave: 'square', freq: 380, to: 240, dur: .06, vol: .14 }]);
  D('reload', [{ wave: 'square', freq: 300, to: 200, dur: .05, vol: .15 }, { wave: 'square', freq: 320, to: 200, dur: .05, vol: .15, delay: .22 }, { wave: 'square', freq: 340, to: 210, dur: .05, vol: .15, delay: .44 }, { wave: 'square', freq: 360, to: 220, dur: .05, vol: .15, delay: .66 }, { wave: 'square', freq: 380, to: 230, dur: .05, vol: .15, delay: .88 }, { wave: 'noise', freq: 2400, dur: .06, vol: .3, delay: 1.1 }]);
  D('click', { wave: 'square', freq: 1400, to: 900, dur: .03, vol: .15 });
  D('thud', [{ wave: 'noise', freq: 600, dur: .14, vol: .35, filter: 500 }, { wave: 'sine', freq: 90, to: 50, dur: .15, vol: .4 }]);
  D('hit', [{ wave: 'noise', freq: 800, dur: .1, vol: .35, filter: 900 }, { wave: 'sine', freq: 130, to: 60, dur: .12, vol: .45 }]);
  D('knock', [{ wave: 'square', freq: 200, to: 120, dur: .07, vol: .3 }, { wave: 'noise', freq: 1000, dur: .06, vol: .2 }]);
  D('ricochet', [{ wave: 'noise', freq: 4000, dur: .05, vol: .25 }, { wave: 'sine', freq: 2400, to: 900, dur: .4, vol: .14 }]);
  D('ping', [{ wave: 'sine', freq: 2200, to: 2000, dur: .3, vol: .18 }, { wave: 'sine', freq: 3300, dur: .2, vol: .08 }]);
  D('kill', { wave: 'square', freq: 'C5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .16 });
  D('doe', { wave: 'saw', freq: 'G3', to: 'C3', dur: .6, vol: .22, vib: [8, .05] });
  D('whistle', { wave: 'sine', freq: 1800, to: 1500, dur: .5, vol: .15, vib: [14, .08] });
  D('boom', [{ wave: 'noise', freq: 400, dur: .6, vol: .5, filter: 300 }, { wave: 'sine', freq: 80, to: 25, dur: .7, vol: .6 }]);
  D('chime', { wave: 'triangle', freq: 'E5', arp: [0, 7, 12], step: .07, dur: .3, vol: .2 });
  D('stink', { wave: 'saw', freq: 'C2', to: 'F1', dur: .8, vol: .18, vib: [20, .15] });
  D('whoosh', { wave: 'noise', freq: 1200, dur: .3, vol: .18, filter: 1500 });
  D('trapRelease', [{ wave: 'noise', freq: 1500, dur: .1, vol: .3 }, { wave: 'square', freq: 700, to: 300, dur: .12, vol: .14 }]);
  D('splat', [{ wave: 'noise', freq: 700, dur: .25, vol: .4, filter: 600 }, { wave: 'sine', freq: 180, to: 60, dur: .2, vol: .3 }]);
  D('rumble', { wave: 'saw', freq: 'C1', to: 'D1', dur: 1.4, vol: .3, vib: [16, .2] });
  D('crash', [{ wave: 'noise', freq: 800, dur: .9, vol: .6, filter: 700 }, { wave: 'saw', freq: 60, to: 20, dur: .8, vol: .4 }]);
  D('cawhit', [{ wave: 'noise', freq: 1600, dur: .08, vol: .3 }, { wave: 'square', freq: 700, to: 300, dur: .2, vol: .14 }]);
  D('cowcall', { wave: 'saw', freq: 'A3', to: 'E3', dur: .5, vol: .2, vib: [9, .08] });
  D('call_whitetail', [{ wave: 'saw', freq: 'D3', to: 'C3', dur: .22, vol: .26, vib: [20, .1] }, { wave: 'saw', freq: 'D3', to: 'C3', dur: .22, vol: .24, delay: .28, vib: [20, .1] }]);
  D('call_elk', [{ wave: 'saw', freq: 'C4', to: 'G4', dur: .5, vol: .24, vib: [7, .06] }, { wave: 'saw', freq: 'G4', to: 'E5', dur: .5, vol: .22, delay: .45, vib: [12, .1] }, { wave: 'square', freq: 'C3', to: 'A2', dur: .2, vol: .16, delay: .95 }]);
  D('call_moose', { wave: 'saw', freq: 'F2', to: 'A2', dur: .9, vol: .3, vib: [6, .08] });
  D('bugle', [{ wave: 'saw', freq: 'D4', to: 'A4', dur: .5, vol: .22, vib: [7, .05] }, { wave: 'saw', freq: 'A4', to: 'F5', dur: .6, vol: .2, delay: .45, vib: [10, .1] }]);
  D('bugleFar', [{ wave: 'saw', freq: 'D4', to: 'A4', dur: .5, vol: .1, vib: [7, .05] }, { wave: 'saw', freq: 'A4', to: 'F5', dur: .6, vol: .08, delay: .45, vib: [10, .1] }]);
  D('footstep', { wave: 'noise', freq: 500, dur: .06, vol: .18, filter: 500 });
  D('tick', { wave: 'square', freq: 'A5', dur: .03, vol: .1 });
  D('babble', { wave: 'square', freq: 300, dur: .045, vol: .12 });
  D('uiMove', { wave: 'square', freq: 'E5', dur: .03, vol: .08 });
  D('uiOk', { wave: 'square', freq: 'A5', arp: [0, 5], step: .04, dur: .12, vol: .12 });
  D('uiBack', { wave: 'square', freq: 'A4', to: 'E4', dur: .1, vol: .1 });
  D('fanfare', { wave: 'square', freq: 'C5', arp: [0, 4, 7, 12, 7, 12, 16], step: .08, dur: .8, vol: .16 });
  D('sad', { wave: 'triangle', freq: 'E4', arp: [0, -2, -4, -7], step: .18, dur: .8, vol: .2 });
};
/* ---------- music: bluegrass-flavoured chiptune ---------- */
const roll = (c, n) => { const t = []; for (let i = 0; i < n; i++) t.push(c[i % c.length]); return t.join(' '); };
BB.SONGS = {
  title: { bpm: 132, steps: 4, tracks: [
    { wave: 'pulse', vol: .13, notes: 'G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 | C5 E5 G5 E5 C5 E5 G5 E5 D5 F#5 A5 F#5 D5 F#5 A5 F#5' },
    { wave: 'square', vol: .08, notes: 'D5 - - B4 - - G4 - D5 - E5 - D5 - - - | E5 - - C5 - - E5 - G5 - - - F#5 - A5 -' },
    { wave: 'triangle', vol: .2, notes: 'G2 - D3 - G2 - D3 - G2 - D3 - G2 - D3 - | C3 - G3 - C3 - G3 - D3 - A3 - D3 - A3 -' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h h | k . h . s . h . k . h . s . h h' }] },
  hollow: { bpm: 108, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'E4 G4 B4 G4 E4 G4 B4 G4 A4 C5 E5 C5 A4 C5 E5 C5 | D4 F#4 A4 F#4 D4 F#4 A4 F#4 E4 G4 B4 G4 E4 G4 B4 G4' },
    { wave: 'triangle', vol: .18, notes: 'E2 - - - B2 - - - A2 - - - E3 - - - | D2 - - - A2 - - - E2 - - - B2 - - -' },
    { wave: 'drums', vol: .06, notes: 'k . . . h . . . k . . . h . h . | k . . . h . . . k . h . h . . .' }] },
  bugle: { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'A3 C4 E4 C4 A3 C4 E4 C4 G3 B3 D4 B3 G3 B3 D4 B3 | F3 A3 C4 A3 F3 A3 C4 A3 E3 G#3 B3 G#3 E3 G#3 B3 G#3' },
    { wave: 'square', vol: .07, notes: 'E5 - - - - - D5 - C5 - - - - - - - | A4 - - - - - C5 - B4 - - - - - - -' },
    { wave: 'triangle', vol: .2, notes: 'A2 - - - - - - - G2 - - - - - - - | F2 - - - - - - - E2 - - - - - - -' }] },
  muskeg: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'D4 - F4 - A4 - F4 - D4 - F4 - A4 - F4 - | Bb3 - D4 - F4 - D4 - A3 - C#4 - E4 - C#4 -' },
    { wave: 'sine', vol: .12, notes: 'D3 - - - - - - - A2 - - - - - - - | Bb2 - - - - - - - A2 - - - - - - -' },
    { wave: 'noise', vol: .02, notes: '. . . . . . h . . . . . . . . . | . . . . . . . . . . . . h . . .' }] },
  trophy: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'E3 E3 . E3 G3 . E3 . E3 E3 . E3 A3 . G3 . | E3 E3 . E3 G3 . E3 . F3 F3 . F3 B3 . A3 .' },
    { wave: 'triangle', vol: .2, notes: 'E2 - - - E2 - - - E2 - - - E2 - - - | F2 - - - F2 - - - F2 - - - F2 - - -' },
    { wave: 'drums', vol: .1, notes: 'k . . . k . h . k . . . k . h h | k . . . k . h . k . k . k . h h' }] },
  bonus: { bpm: 156, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: 'C5 E5 G5 E5 C5 E5 G5 E5 F5 A5 C6 A5 F5 A5 C6 A5 | G5 B5 D6 B5 G5 B5 D6 B5 C5 E5 G5 E5 C6 - - -' },
    { wave: 'triangle', vol: .2, notes: 'C3 - G3 - C3 - G3 - F3 - C4 - F3 - C4 - | G3 - D4 - G3 - D4 - C3 - G3 - C3 - - -' },
    { wave: 'drums', vol: .1, notes: 'k h s h k h s h k h s h k s s s' }] },
  results: { bpm: 100, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: 'C5 - E5 - G5 - E5 - C5 - E5 - G5 - C6 - | F5 - A5 - C6 - A5 - G5 - B5 - D6 - - -' },
    { wave: 'triangle', vol: .2, notes: 'C3 - - - G2 - - - F2 - - - G2 - - - | F2 - - - C3 - - - G2 - - - C3 - - -' }] },
  lodge: { bpm: 78, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'G3 - B3 - D4 - B3 - E3 - G3 - B3 - G3 - | C3 - E3 - G3 - E3 - D3 - F#3 - A3 - F#3 -' },
    { wave: 'sine', vol: .12, notes: 'G2 - - - - - - - E2 - - - - - - - | C2 - - - - - - - D2 - - - - - - -' }] }
};
BB.music = name => { const a = BB.game && BB.game.audio; if (!a || BB.muteMusic) return; try { if (BB.curSong === name) return; BB.curSong = name; if (!name) a.music(null); else a.music(BB.SONGS[name], { fade: .6 }); } catch (e) { /* audio blocked */ } };

/* ---------- Animalese-style gibberish voices ---------- */
BB.babbleFor = id => {
  const c = BB.CAST[id] || BB.CAST.emcee; const a = BB.game.audio, r = BB.RNG.fx();
  const f = c.pitch[0] + r() * (c.pitch[1] - c.pitch[0]);
  a.define('babble', { wave: c.wave === 'pulse' || c.wave === 'saw' ? c.wave : c.wave, freq: f, to: f * (.85 + r() * .35), dur: .05, vol: .1 });
};
})();
