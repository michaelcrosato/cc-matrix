/* code-written music, sound effects and Animalese-style gibberish voices */
(() => {
const G = SD, game = G.game, audio = game.audio;
const rep = (s, n) => Array(n).fill(s).join(' ');

G.SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'A2 - . A2 . . C3 . | E2 - . E2 . . G2 . | F2 - . F2 . . A2 . | E2 - . G2 . . B2 .' },
    { wave: 'square', vol: .07, notes: 'A4 - - . C5 - E5 - | D5 - - . . . . . | C5 - - . A4 - G4 - | E4 - - - . . . .' },
    { wave: 'pulse', vol: .05, notes: 'E4 . . . A4 . . . | F4 . . . A4 . . . | F4 . . . C5 . . . | E4 . . . G4 . . .' },
    { wave: 'drums', vol: .22, notes: 'k . . . s . . h | k . . k s . h . | k . . . s . . h | k . k . s . h h' }
  ] },
  town: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'C3 . E3 . G3 . E3 . | F3 . A3 . C4 . A3 . | G3 . B3 . D4 . B3 . | C3 . G3 . E3 . G3 .' },
    { wave: 'square', vol: .06, notes: 'E4 - - . G4 - . . | F4 - - . A4 - . . | G4 - - . B4 - . . | E4 - - . . . D4 .' },
    { wave: 'drums', vol: .18, notes: 'k . h . s . h . | k . h h s . h . | k . h . s . h . | k . h . s h h h' }
  ] },
  fight: { bpm: 142, steps: 4, tracks: [
    { wave: 'saw', vol: .16, notes: 'E2 E2 . E2 E2 . G2 . | E2 E2 . E2 E2 . A2 . | E2 E2 . E2 E2 . G2 . | D2 D2 . D2 D2 . B2 .' },
    { wave: 'square', vol: .07, notes: 'B4 - . B4 . E5 - . | A4 - . A4 . D5 - . | B4 - . B4 . G5 - . | F#4 - . A4 . D5 - .' },
    { wave: 'drums', vol: .26, notes: 'k h s h k k s h | k h s h k h s s | k h s h k k s h | k k s h k s s s' }
  ] },
  therapy: { bpm: 64, steps: 4, tracks: [
    { wave: 'sine', vol: .22, notes: 'C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - -' },
    { wave: 'sine', vol: .1, notes: 'E4 - - - G4 - - - | E4 - - - A4 - - - | F4 - - - A4 - - - | D4 - - - G4 - - -' },
    { wave: 'triangle', vol: .05, notes: '. . . . . . C5 . | . . . . . . . . | . . E5 . . . . . | . . . . . . . .' }
  ] },
  woods: { bpm: 58, steps: 4, tracks: [
    { wave: 'sine', vol: .25, notes: 'E2 - - - - - - - | E2 - - - - - - - | F2 - - - - - - - | D#2 - - - - - - -' },
    { wave: 'triangle', vol: .08, notes: 'B4 . . . . . . . | . . . . F5 . . . | . . . . . . . . | E5 . . . . . . .' },
    { wave: 'noise', vol: .04, notes: '. . . . . . . . | h . . . . . . . | . . . . . . . . | . . . . h . . .' }
  ] },
  diner: { bpm: 116, steps: 4, tracks: [
    { wave: 'triangle', vol: .28, notes: 'G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | D3 . A3 . D3 . A3 . | G2 . D3 . G2 . B2 .' },
    { wave: 'square', vol: .07, notes: 'B4 . D5 . G5 . D5 . | C5 . E5 . G5 . E5 . | D5 . F#5 . A5 . F#5 . | G5 - - . . . . .' },
    { wave: 'drums', vol: .16, notes: 'k . s . k . s . | k . s . k . s . | k . s . k . s . | k . s . k s s s' }
  ] },
  boss: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .17, notes: 'D2 D2 D3 D2 D2 D3 F2 F3 | D2 D2 D3 D2 D2 D3 A2 A3 | C2 C2 C3 C2 C2 C3 E2 E3 | B1 B1 B2 B1 B1 B2 F#2 F#3' },
    { wave: 'square', vol: .08, notes: 'A4 - . D5 - . F5 - | G5 - . F5 - . D5 - | E5 - . G5 - . C6 - | B5 - . F#5 - . D5 -' },
    { wave: 'drums', vol: .28, notes: 'k h s h k k s k | k h s h k k s s | k h s h k k s k | k s k s k s s s' }
  ] },
  silence: null
};
G.music = (name, o) => { if (!name) { audio.music(null); return; } if (G.curMusic === name) return; G.curMusic = name; audio.music(G.SONGS[name], Object.assign({ fade: 1 }, o || {})); };
G.stopMusic = () => { G.curMusic = null; audio.music(null); };

/* extra sound effects */
const def = (n, v) => audio.define(n, v);
def('quack', [{ wave: 'saw', freq: 470, to: 250, dur: .13, vol: .22 }, { wave: 'square', freq: 330, to: 200, dur: .1, vol: .1 }]);
def('cash', [{ wave: 'square', freq: 'E6', dur: .06, vol: .14 }, { wave: 'square', freq: 'B6', dur: .16, vol: .12 }]);
def('bell', [{ wave: 'sine', freq: 1568, dur: .7, vol: .26 }, { wave: 'sine', freq: 2349, dur: .5, vol: .1 }]);
def('munch', [{ wave: 'noise', dur: .05, vol: .25 }, { wave: 'triangle', freq: 180, to: 90, dur: .08, vol: .2 }]);
def('stare', [{ wave: 'saw', freq: 90, to: 50, dur: .6, vol: .3 }, { wave: 'sine', freq: 60, to: 40, dur: .6, vol: .3 }]);
def('panic', [{ wave: 'sine', freq: 70, to: 55, dur: .9, vol: .4 }, { wave: 'saw', freq: 900, to: 300, dur: .5, vol: .1 }]);
def('gunshot', [{ wave: 'noise', dur: .13, vol: .4 }, { wave: 'saw', freq: 200, to: 40, dur: .12, vol: .3 }]);
def('rank', [{ wave: 'square', freq: 'C5', dur: .1, vol: .18 }, { wave: 'square', freq: 'E5', dur: .1, vol: .18, step: .1 }, { wave: 'square', freq: 'G5', dur: .3, vol: .2, step: .2 }]);
def('whistle', [{ wave: 'sine', freq: 1200, to: 1900, dur: .25, vol: .15 }]);

/* Animalese-style gibberish: every letter blips a random pitch inside the speaker's range */
G.VOICES = {
  TOMMY: [78, 128, 'triangle'], CARM: [220, 330, 'sine'], 'DR. MEL-FEE': [170, 250, 'sine'], PAULY: [120, 190, 'square'], SAL: [100, 160, 'triangle'],
  DUCK: [380, 620, 'saw'], VINNY: [95, 150, 'square'], SLAVKO: [60, 100, 'saw'], MARIA: [260, 380, 'sine'], GINO: [130, 200, 'triangle'], STELLA: [240, 340, 'triangle'],
  ANTHONY: [150, 260, 'square'], MEADOW: [230, 360, 'sine'], WAITER: [140, 210, 'triangle'], '???': [100, 200, 'square']
};
G.setVoice = (talk, name) => {
  const v = G.VOICES[name] || G.VOICES['???'];
  Object.defineProperty(talk, 'voice', { configurable: true, get() {
    const f = v[0] + Math.random() * (v[1] - v[0]);
    return { wave: v[2], freq: f, to: f * (.8 + Math.random() * .5), dur: .045 + Math.random() * .03, vol: .15 };
  }, set() {} });
};
})();
