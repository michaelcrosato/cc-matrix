/* ---- AUDIO: all of it written in code. Music (step-sequencer songs), sound effects (voices), and Animalese babble. ---- */
G.SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'A2 - - - E3 - - - A2 - - - E3 - - - | F2 - - - C3 - - - F2 - - - C3 - - - | D2 - - - A2 - - - D2 - - - A2 - - - | E2 - - - B2 - - - E2 - - - B2 - - -' },
    { wave: 'pulse25', vol: .11, notes: 'A4 - - - C5 - E5 - - - D5 - C5 - - - | C5 - - - A4 - F4 - - - A4 - C5 - - - | D5 - - - F5 - A5 - - - G5 - F5 - - - | E5 - - - - - . . B4 - - - . . . .' },
    { wave: 'saw', vol: .05, notes: 'A3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | D3 - - - - - - - - - - - - - - - | E3 - - - - - - - - - - - - - - -' }] },
  spring: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .28, notes: 'C3 . G3 . E3 . G3 . | F3 . C4 . A3 . C4 . | G3 . D4 . B3 . D4 . | C3 . G3 . E3 . G3 .' },
    { wave: 'pulse25', vol: .1, notes: 'E5 - G5 - E5 - D5 - | C5 - F5 - A5 - G5 - | B5 - G5 - D5 - . . | C5 - E5 - G5 - - -' }] },
  summer: { bpm: 116, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'D3 . . D3 . A3 . D3 | G3 . . G3 . D4 . G3 | A3 . . A3 . E4 . A3 | D3 . . D3 . A3 . D3' },
    { wave: 'square', vol: .06, notes: 'F#5 - A5 - D6 - A5 - | G5 - B5 - D6 - B5 - | A5 - C#6 - E6 - C#6 - | D6 - - - A5 - . .' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h . | k . h k s . h .' }] },
  autumn: { bpm: 88, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'E2 - - - B2 - - - | C3 - - - G3 - - - | D3 - - - A3 - - - | B2 - - - F#3 - - -' },
    { wave: 'pulse25', vol: .1, notes: 'B4 - E5 - G5 - E5 - | G4 - C5 - E5 - C5 - | A4 - D5 - F#5 - D5 - | F#4 - B4 - D5 - . .' },
    { wave: 'saw', vol: .035, notes: 'E4 - - - - - - - | C4 - - - - - - - | D4 - - - - - - - | B3 - - - - - - -' }] },
  winter: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .26, notes: 'A2 - - - - - - - | F2 - - - - - - - | C3 - - - - - - - | G2 - - - - - - -' },
    { wave: 'pulse12', vol: .08, notes: 'E6 . . . A5 . . . | C6 . . . F5 . . . | G5 . . . C6 . . . | D6 . . . B5 . . .' },
    { wave: 'sine', vol: .12, notes: 'A4 - - - - - E5 - | A4 - - - - - C5 - | G4 - - - - - E5 - | G4 - - - - - D5 -' }] },
  battle: { bpm: 138, steps: 4, tracks: [
    { wave: 'triangle', vol: .32, notes: 'D2 . D2 . D2 . F2 . | D2 . D2 . A2 . G2 . | Bb1 . Bb1 . Bb1 . D2 . | C2 . C2 . G2 . E2 .' },
    { wave: 'pulse25', vol: .1, notes: 'D5 - F5 - A5 - G5 F5 | D5 - E5 - F5 - A5 - | Bb4 - D5 - F5 - E5 D5 | C5 - E5 - G5 - - -' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s . h h' }] },
  boss: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'E2 E2 . E2 E2 . G2 . | E2 E2 . E2 B2 . A2 . | F2 F2 . F2 F2 . A2 . | D2 D2 . D2 A2 . G2 .' },
    { wave: 'pulse25', vol: .11, notes: 'E5 - - G5 - B5 - A5 | G5 - - E5 - D5 - E5 | F5 - - A5 - C6 - B5 | A5 - - F5 - E5 - D5' },
    { wave: 'triangle', vol: .3, notes: 'E3 . E3 . E3 . E3 . | E3 . E3 . E3 . E3 . | F3 . F3 . F3 . F3 . | D3 . D3 . D3 . D3 .' },
    { wave: 'drums', vol: .11, notes: 'k h s h k k s h' }] },
  event: { bpm: 72, steps: 4, tracks: [
    { wave: 'sine', vol: .2, notes: 'D3 - - - A3 - - - | Bb2 - - - F3 - - - | G2 - - - D3 - - - | A2 - - - E3 - - -' },
    { wave: 'triangle', vol: .13, notes: 'F5 - - - E5 - D5 - | D5 - - - C5 - Bb4 - | Bb4 - - - A4 - G4 - | A4 - - - - - . .' }] },
  victory: { bpm: 126, steps: 4, tracks: [
    { wave: 'pulse25', vol: .12, notes: 'C5 - E5 - G5 - C6 - - - - - . . . . | F5 - A5 - C6 - F6 - - - E6 - D6 - C6 -' },
    { wave: 'triangle', vol: .3, notes: 'C3 - G3 - C4 - G3 - | F3 - C4 - F4 - C4 -' }] },
  defeat: { bpm: 66, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'A2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - -' },
    { wave: 'sine', vol: .16, notes: 'C5 - - - B4 - A4 - | A4 - - - G4 - F4 - | E4 - - - - - - - | . . . . . . . .' }] }
};
G.SFX = {
  cursor: { wave: 'square', freq: 880, dur: .03, vol: .1 }, select: { wave: 'square', freq: 660, arp: [0, 7], step: .04, dur: .12, vol: .18 }, back: { wave: 'square', freq: 440, to: 330, dur: .08, vol: .14 },
  error: { wave: 'square', freq: 160, to: 110, dur: .16, vol: .2 }, page: { wave: 'triangle', freq: 1200, dur: .02, vol: .12 },
  clock: [{ wave: 'noise', freq: 4000, dur: .02, vol: .15, filter: 'highpass' }, { wave: 'triangle', freq: 880, to: 700, dur: .08, vol: .14, delay: .02 }],
  bell: [{ wave: 'sine', freq: 660, dur: .9, vol: .3 }, { wave: 'sine', freq: 1320, dur: .6, vol: .12 }, { wave: 'triangle', freq: 990, dur: .5, vol: .08 }],
  season: [{ wave: 'triangle', freq: 392, arp: [0, 4, 7, 12], step: .12, dur: .6, vol: .3 }, { wave: 'sine', freq: 196, dur: .9, vol: .2 }],
  summon: [{ wave: 'saw', freq: 120, to: 480, dur: .5, vol: .15 }, { wave: 'sine', freq: 600, arp: [0, 7, 12, 16], step: .09, dur: .5, vol: .25, delay: .15 }],
  move: { wave: 'noise', freq: 1800, dur: .04, vol: .06, filter: 'highpass' },
  slash: [{ wave: 'noise', freq: 2400, to: 800, dur: .1, vol: .3 }], hit: [{ wave: 'noise', freq: 1400, to: 400, dur: .12, vol: .4 }, { wave: 'square', freq: 200, to: 70, dur: .1, vol: .25 }],
  miss: { wave: 'noise', freq: 3000, to: 1500, dur: .12, vol: .12, filter: 'bandpass' }, arrow: [{ wave: 'noise', freq: 3000, to: 1200, dur: .16, vol: .15 }, { wave: 'triangle', freq: 1500, to: 600, dur: .14, vol: .1 }],
  magic: [{ wave: 'sine', freq: 500, to: 1500, dur: .3, vol: .25 }, { wave: 'triangle', freq: 750, arp: [0, 5, 9, 12], step: .05, dur: .25, vol: .15, delay: .05 }],
  heal: { wave: 'triangle', freq: 523, arp: [0, 4, 7, 12, 16], step: .06, dur: .4, vol: .32 },
  down: [{ wave: 'square', freq: 400, to: 60, dur: .4, vol: .25 }, { wave: 'noise', freq: 600, to: 100, dur: .35, vol: .2 }],
  bind: [{ wave: 'saw', freq: 90, to: 440, dur: .4, vol: .15 }, { wave: 'square', freq: 880, arp: [0, 3, 7], step: .07, dur: .25, vol: .15, delay: .3 }],
  levelup: { wave: 'square', freq: 523, arp: [0, 4, 7, 12, 16, 19, 24], step: .06, dur: .5, vol: .22 },
  fanfare: [{ wave: 'square', freq: 523, arp: [0, 0, 7, 12, 16, 12, 16, 24], step: .11, dur: .95, vol: .2 }, { wave: 'triangle', freq: 262, arp: [0, 0, 7, 12], step: .22, dur: .95, vol: .3 }],
  lose: [{ wave: 'triangle', freq: 330, arp: [0, -3, -7, -12], step: .24, dur: 1, vol: .3 }],
  coin: { wave: 'square', freq: 988, arp: [0, 5], step: .07, dur: .25, vol: .2 }, candle: [{ wave: 'noise', freq: 800, to: 300, dur: .3, vol: .12, filter: 'lowpass' }, { wave: 'sine', freq: 440, to: 220, dur: .5, vol: .2 }],
  quest: { wave: 'triangle', freq: 392, arp: [0, 4, 7, 4, 7, 12], step: .07, dur: .4, vol: .25 }, stillness: [{ wave: 'sine', freq: 220, to: 110, dur: 1.2, vol: .3 }, { wave: 'triangle', freq: 1760, to: 1200, dur: 1, vol: .06 }]
};
G.initAudio = game => { for (const k in G.SFX) game.audio.define('b_' + k, G.SFX[k]); };
G.sfx = (name, o) => { try { G.game.audio.sfx('b_' + name, o); } catch (e) { } };
G.music = (name, o) => { try { if (G.musicNow === name && !(o && o.restart)) return; G.musicNow = name; G.game.audio.music(name ? G.SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); } catch (e) { } };
/* Animalese babble: each typed letter is a short bleep. Vowels sing, consonants click. who = a pitch multiplier. */
G.babble = (ch, pitch = 1) => {
  if (!/[a-z]/i.test(ch)) return;
  const c = ch.toLowerCase().charCodeAt(0) - 97, vowel = 'aeiou'.includes(ch.toLowerCase());
  const f = 190 * pitch * Math.pow(2, ((c * 5) % 12) / 12 * (vowel ? .9 : .6) - .15);
  const v = vowel ? { wave: pitch > 1.1 ? 'triangle' : 'square', freq: f, to: f * (1 + ((c % 3) - 1) * .08), dur: .07, vol: .09 } : { wave: 'noise', freq: f * 5, dur: .035, vol: .07, filter: 'bandpass' };
  G.sfx_raw(v);
};
G.sfx_raw = v => { try { G.game.audio.sfx(v, { vary: .02 }); } catch (e) { } };
