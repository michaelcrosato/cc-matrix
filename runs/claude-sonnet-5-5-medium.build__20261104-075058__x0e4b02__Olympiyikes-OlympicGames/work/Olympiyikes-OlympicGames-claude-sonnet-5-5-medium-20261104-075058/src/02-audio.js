// Olympiyikes! audio: every sound, song and voice is written in code. Voices are Animalese-style gibberish.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, A = game.audio;

// ---------------------------------------------------------------- sound effects
const def = (n, v) => A.define(n, v);
def('ol_tick', { wave: 'square', freq: 1200, dur: .03, vol: .15 });
def('ol_step', { wave: 'noise', freq: 900, to: 300, dur: .04, vol: .12 });
def('ol_gun', [{ wave: 'noise', freq: 2400, to: 200, dur: .22, vol: .4 }, { wave: 'square', freq: 220, to: 60, dur: .12, vol: .25 }]);
def('ol_whistle', [{ wave: 'sine', freq: 2600, dur: .35, vol: .22, vib: [30, .04] }, { wave: 'sine', freq: 2750, dur: .35, vol: .12, vib: [26, .05] }]);
def('ol_splash', [{ wave: 'noise', freq: 1500, to: 200, dur: .5, vol: .35 }, { wave: 'sine', freq: 300, to: 80, dur: .3, vol: .2 }]);
def('ol_dive', { wave: 'saw', freq: 900, to: 200, dur: .45, vol: .18 });
def('ol_thunk', [{ wave: 'noise', freq: 600, to: 100, dur: .12, vol: .35 }, { wave: 'triangle', freq: 120, to: 50, dur: .15, vol: .35 }]);
def('ol_arrow', [{ wave: 'noise', freq: 3000, to: 800, dur: .14, vol: .25 }]);
def('ol_clang', [{ wave: 'square', freq: 220, dur: .5, vol: .25 }, { wave: 'square', freq: 330, dur: .5, vol: .18 }, { wave: 'noise', freq: 3000, to: 800, dur: .08, vol: .2 }]);
def('ol_grunt', { wave: 'saw', freq: 140, to: 70, dur: .2, vol: .25 });
def('ol_swish', { wave: 'noise', freq: 2000, to: 600, dur: .25, vol: .15 });
def('ol_yikes', [{ wave: 'saw', freq: 700, to: 120, dur: .5, vol: .3, vib: [18, .12] }, { wave: 'square', freq: 250, to: 80, dur: .45, vol: .15 }]);
def('ol_boo', { wave: 'saw', freq: 200, to: 120, dur: .6, vol: .2, vib: [6, .05] });
def('ol_cheer', [{ wave: 'noise', freq: 1800, to: 1200, dur: .9, vol: .12 }, { wave: 'noise', freq: 900, to: 1500, dur: .9, vol: .08 }]);
def('ol_firework', [{ wave: 'sine', freq: 400, to: 1800, dur: .35, vol: .1 }, { wave: 'noise', freq: 3000, to: 200, dur: .5, vol: .25, step: 0 }]);
def('ol_medal', { wave: 'square', freq: 'C6', arp: [0, 4, 7, 12], step: .07, dur: .3, vol: .2 });
def('ol_record', { wave: 'square', freq: 'C5', arp: [0, 4, 7, 12, 16, 19, 24], step: .06, dur: .5, vol: .22 });
def('ol_turbo', { wave: 'saw', freq: 200, to: 1200, dur: .5, vol: .22 });
def('ol_slide', { wave: 'noise', freq: 600, to: 1800, dur: .3, vol: .12 });
def('ol_curl', { wave: 'noise', freq: 400, dur: .12, vol: .08 });
def('ol_puck', [{ wave: 'noise', freq: 1500, to: 400, dur: .1, vol: .3 }, { wave: 'triangle', freq: 200, to: 90, dur: .1, vol: .3 }]);
def('ol_bell', { wave: 'sine', freq: 1500, to: 1480, dur: .7, vol: .2 });
def('ol_nope', { wave: 'square', freq: 180, to: 140, dur: .25, vol: .2 });
def('ol_good', { wave: 'square', freq: 'E6', to: 'A6', dur: .08, vol: .16 });

O.sfx = (n, o) => { try { A.sfx(n, o); } catch (e) { /* ignore */ } };

// ---------------------------------------------------------------- songs (chiptune, original)
const S = (bpm, steps, tr) => ({ bpm, steps, tracks: tr });
O.songs = {
  title: S(132, 4, [
    { wave: 'square', vol: .13, notes: 'C5 - E5 - G5 - E5 - C5 - E5 - G5 - C6 - | D5 - F5 - A5 - F5 - D5 - F5 - A5 - D6 - | E5 - G5 - B5 - G5 - E5 - G5 - B5 - E6 - | F5 - A5 - C6 - A5 G5 - E5 - C5 - - -' },
    { wave: 'pulse', vol: .09, notes: 'C4 . G3 . C4 . G3 . C4 . G3 . C4 . G3 . | D4 . A3 . D4 . A3 . D4 . A3 . D4 . A3 . | E4 . B3 . E4 . B3 . E4 . B3 . E4 . B3 . | F4 . C4 . F4 . C4 . G3 . D4 . G3 . B3 .' },
    { wave: 'triangle', vol: .22, notes: 'C2 . . . G2 . . . C2 . . . G2 . . . | D2 . . . A2 . . . D2 . . . A2 . . . | E2 . . . B2 . . . E2 . . . B2 . . . | F2 . . . C3 . . . G2 . . . G2 . . .' },
    { wave: 'drums', vol: .22, notes: 'k . h . s . h . k . h . s . h h' }]),
  summer: S(148, 4, [
    { wave: 'square', vol: .12, notes: 'G5 - - A5 G5 E5 - - C5 - E5 - G5 - - - | A5 - - B5 A5 F5 - - D5 - F5 - A5 - - - | G5 - - A5 G5 E5 - - C5 - E5 G5 C6 - - - | B5 - A5 - G5 - F5 - E5 - D5 - C5 - - -' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G3 . C3 . G3 . C3 . G3 . C3 . G3 . | F3 . C4 . F3 . C4 . D3 . A3 . D3 . A3 . | C3 . G3 . C3 . G3 . C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . G2 . B2 . G2 . G3 .' },
    { wave: 'drums', vol: .2, notes: 'k . h h s . h . k . h h s . h k' }]),
  winter: S(112, 4, [
    { wave: 'triangle', vol: .2, notes: 'E5 - - G5 - - B5 - - G5 - - E5 - - - | D5 - - F5 - - A5 - - F5 - - D5 - - - | C5 - - E5 - - G5 - - E5 - - C5 - - - | D5 - - G5 - - B5 - - A5 - - G5 - - -' },
    { wave: 'sine', vol: .18, notes: 'E3 . . . B3 . . . E3 . . . B3 . . . | D3 . . . A3 . . . D3 . . . A3 . . . | C3 . . . G3 . . . C3 . . . G3 . . . | D3 . . . G3 . . . D3 . . . G3 . . .' },
    { wave: 'pulse12', vol: .08, notes: 'E6 . . . . . B6 . . . . . E6 . . . | D6 . . . . . A6 . . . . . D6 . . . | C6 . . . . . G6 . . . . . C6 . . . | D6 . . . . . G6 . . . . . D6 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . . . h . . . s . . . h . . .' }]),
  ceremony: S(100, 4, [
    { wave: 'square', vol: .13, notes: 'C5 - - - G5 - - - E5 - G5 - C6 - - - | D6 - - - C6 - B5 - A5 - - - G5 - - - | F5 - - - A5 - C6 - F6 - - - E6 - D6 - | C6 - - - G5 - E5 - C5 - - - - - - -' },
    { wave: 'triangle', vol: .24, notes: 'C3 - - - E3 - - - G3 - - - C4 - - - | F3 - - - A3 - - - C4 - - - F3 - - - | A2 - - - C3 - - - F3 - - - A3 - - - | G2 - - - B2 - - - C3 - - - - - - -' },
    { wave: 'drums', vol: .18, notes: 'k . . . s . . . k . k . s . . .' }]),
  tense: S(150, 4, [
    { wave: 'pulse', vol: .1, notes: 'A4 . A4 . C5 . A4 . E5 . A4 . C5 . A4 . | G4 . G4 . B4 . G4 . D5 . G4 . B4 . G4 .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . A2 . A2 . A2 . G2 . G2 . G2 . G2 .' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h h' }]),
  snow: S(126, 4, [
    { wave: 'square', vol: .1, notes: 'A5 - C6 - E6 - C6 - A5 - C6 - E6 - A6 - | G5 - B5 - D6 - B5 - G5 - B5 - D6 - G6 - | F5 - A5 - C6 - A5 - F5 - A5 - C6 - F6 - | E5 - G5 - B5 - G5 - E5 - G5 - B5 - E6 -' },
    { wave: 'triangle', vol: .22, notes: 'A2 . E3 . A2 . E3 . G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . E2 . B2 . E2 . B2 .' },
    { wave: 'drums', vol: .16, notes: 'k . h . s . h . k . h . s . h h' }]),
  fanfare: S(120, 4, [{ wave: 'square', vol: .16, loop: false, notes: 'C5 . C5 . C5 - E5 - G5 - - - C6 - - - - - - -' }, { wave: 'triangle', vol: .22, notes: 'C3 . C3 . C3 - E3 - G3 - - - C4 - - - - - - -' }])
};
O.music = (name, o) => { try { A.music(O.songs[name] || name, o || {}); } catch (e) { /* ignore */ } };

// a nation's anthem: a short procedural tune from its seed
O.anthemFor = nat => {
  const r = E.rng(nat.anthem.seed), sc = nat.anthem.scale, base = nat.anthem.root;   // scale: semitone offsets
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = (deg, oct) => { const k = base + sc[((deg % sc.length) + sc.length) % sc.length] + 12 * (oct + Math.floor(deg / sc.length)); return names[((k % 12) + 12) % 12] + (Math.floor(k / 12) + 3); };
  let deg = 0, mel = [], bass = [];
  for (let bar = 0; bar < 4; bar++) { for (let b = 0; b < 4; b++) { deg = O.clamp(deg + Math.round((r() - .5) * 4), -2, 6); if (bar === 3 && b === 3) deg = 0; mel.push(note(deg, 1), '-', r() > .5 ? '-' : '.', '-'); } bass.push(note(bar % 2 ? 4 : 0, -1), '.', '.', '.', note(bar % 2 ? 4 : 0, 0), '.', '.', '.', note(bar % 2 ? 4 : 0, -1), '.', '.', '.', note(bar % 2 ? 4 : 2, 0), '.', '.', '.'); }
  return S(nat.anthem.bpm, 4, [{ wave: 'square', vol: .14, notes: mel.join(' ') }, { wave: 'triangle', vol: .22, notes: bass.join(' ') }, { wave: 'drums', vol: .12, notes: 'k . . . s . . .' }]);
};

// ---------------------------------------------------------------- Animalese-style voices
// every letter is a tiny blip; pitch follows the letter, rhythm follows the word
O.Voice = {
  say(text, v = {}) {
    const mode = game.settings.commentary; if (mode !== 'Voices + subtitles') return;
    const vol = (game.settings.voices === undefined ? .8 : game.settings.voices) * (v.vol || 1); if (vol <= 0) return;
    const s = String(text).toLowerCase().replace(/[^a-z ]/g, ''), n = Math.min(s.length, 34), base = v.pitch || 260;
    let t = 0;
    for (let i = 0; i < n; i++) {
      const ch = s[i]; if (ch === ' ') { t += .05; continue; }
      const k = (ch.charCodeAt(0) - 97), semi = ((k * 7) % 13) - 4 + (v.lilt ? Math.sin(i * .6) * 2 : 0);
      const f = base * Math.pow(2, semi / 12), at = t;
      game.after(at, () => O.sfx({ wave: v.wave || 'square', freq: f, to: f * (1 + ((k % 3) - 1) * .12), dur: .055, vol: .1 * vol }, { vary: 0 }));
      t += .062 + (k % 3) * .008;
    }
  }
};

// ---------------------------------------------------------------- crowd bed: swells follow the excitement
O.crowdT = 0;
O.crowd = (k = 1) => { O.sfx('ol_cheer', { vol: Math.min(1, (game.settings.crowd === undefined ? .7 : game.settings.crowd) * k) }); };
})();
