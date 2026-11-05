/* 12-audio: all sound is synthesized in code. Songs, sound effects, ambience and Animalese-style voices. */
const A = () => G.game.audio;
const rep = (s, n) => Array(n).fill(s).join(' ');

/* ---- songs ---- */
G.SONGS = {
  title: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .13, notes: 'E5 - G5 - A5 - . G5 | E5 - D5 - C5 - . . | D5 - F5 - A5 - G5 - | F5 - E5 - . . . . . ' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 . A2 . E3 . A2 . | A2 . A2 . E3 . A2 . | D3 . D3 . A3 . D3 . | G2 . G2 . D3 . G2 .' },
    { name: 'chord', wave: 'square', vol: .045, notes: 'A4 - - - C5 - - - | A4 - - - C5 - - - | D5 - - - F5 - - - | G4 - - - B4 - - -' },
    { name: 'drums', wave: 'drums', vol: .35, notes: 'k . h . s . h . | k . h h s . h . | k . h . s . h . | k . h . s h h h' } ] },
  beach: { bpm: 128, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: 'C5 - E5 G5 - E5 C5 - | D5 - F5 A5 - F5 D5 - | E5 - G5 B5 - G5 E5 - | G5 - E5 D5 - C5 - . ' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'C3 . C3 G2 C3 . C3 G2 | D3 . D3 A2 D3 . D3 A2 | E3 . E3 B2 E3 . E3 B2 | G2 . G2 D3 G2 . G2 D3' },
    { name: 'pad', wave: 'sine', vol: .07, notes: 'E4 - - - - - - - | F4 - - - - - - - | G4 - - - - - - - | B4 - - - - - - -' },
    { name: 'drums', wave: 'drums', vol: .3, notes: 'k . h . s . h k | . k h . s . h . | k . h . s . h k | . k h . s h h h' } ] },
  pool: { bpm: 116, steps: 4, tracks: [
    { wave: 'triangle', vol: .17, notes: 'F4 - A4 - C5 - A4 - | G4 - Bb4 - D5 - Bb4 - | F4 - A4 - C5 - E5 - | D5 - C5 - A4 - . .' },
    { wave: 'triangle', vol: .2, notes: 'F2 . . C3 . . F2 . | G2 . . D3 . . G2 . | F2 . . C3 . . A2 . | D3 . . A2 . . D3 .' },
    { wave: 'drums', vol: .22, notes: 'k . . h . s . h | k . . h . s . h | k . . h . s . h | k . h h . s h h' } ] },
  casino: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'G4 . B4 . D5 . B4 . | G4 . B4 . E5 . D5 . | A4 . C5 . E5 . C5 . | F#4 . A4 . D5 . C5 .' },
    { wave: 'triangle', vol: .22, notes: 'G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | A2 . E3 . A2 . E3 . | D2 . A2 . D2 . A2 .' },
    { wave: 'drums', vol: .22, notes: 'k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s s h s' } ] },
  promenade: { bpm: 108, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'D5 - F#5 - A5 - F#5 - | E5 - G5 - B5 - G5 - | D5 - F#5 - A5 - D6 - | C#6 - A5 - F#5 - . .' },
    { wave: 'triangle', vol: .2, notes: 'D3 . . A2 D3 . . A2 | E3 . . B2 E3 . . B2 | D3 . . A2 D3 . . A2 | A2 . . E3 A2 . . E3' },
    { wave: 'drums', vol: .2, notes: 'k . . h s . . h | k . . h s . . h | k . . h s . . h | k . h h s . h h' } ] },
  villa: { bpm: 80, steps: 4, tracks: [
    { wave: 'sine', vol: .16, notes: 'C5 - - - E5 - - - | D5 - - - F5 - - - | E5 - - - G5 - - - | D5 - - - B4 - - -' },
    { wave: 'triangle', vol: .18, notes: 'C3 - - - - - G2 - | D3 - - - - - A2 - | E3 - - - - - B2 - | G2 - - - - - D3 -' } ] },
  match: { bpm: 136, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .11, notes: 'A4 - C5 E5 - C5 A4 - | G4 - B4 D5 - B4 G4 - | F4 - A4 C5 - A4 F4 - | E4 - G#4 B4 - E5 - . ' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'A2 . A2 E3 A2 . A2 E3 | G2 . G2 D3 G2 . G2 D3 | F2 . F2 C3 F2 . F2 C3 | E2 . E2 B2 E2 . E2 B2' },
    { name: 'drums', wave: 'drums', vol: .3, notes: 'k . h . s . h k | . k h . s . h . | k . h . s . h k | . k h . s h s h', on: true } ] },
  victory: { bpm: 120, steps: 4, loop: false, tracks: [
    { wave: 'pulse', vol: .16, notes: 'C5 - E5 - G5 - C6 - | - - G5 - C6 - - - ' },
    { wave: 'triangle', vol: .2, notes: 'C3 - - - G3 - - - | C3 - - - - - - -' } ] },
  results: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .17, notes: 'G4 - B4 - D5 - B4 - | A4 - C5 - E5 - C5 - | G4 - B4 - D5 - G5 - | F#5 - D5 - B4 - . .' },
    { wave: 'triangle', vol: .2, notes: 'G2 . . D3 . . G2 . | A2 . . E3 . . A2 . | G2 . . D3 . . B2 . | D3 . . A2 . . D3 .' } ] }
};
G.music = (name, o = {}) => { const a = A(); if (!a) return; if (!name) { a.music(null); G.songName = null; return; } if (G.songName === name && !o.restart) return; G.songName = name; a.music(G.SONGS[name], Object.assign({ fade: .6 }, o)); };
G.jingle = name => { const a = A(); if (a && a.sting) try { a.sting(G.SONGS[name], { at: 'bar' }); } catch (e) { a.music(G.SONGS[name], { loop: false }); } };

/* ---- sound effects (about 45) ---- */
G.SFX = {
  bump: { wave: 'noise', freq: 700, to: 200, dur: .11, vol: .5, filter: 'lowpass' },
  bumpPerfect: [{ wave: 'noise', freq: 900, to: 220, dur: .12, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 520, to: 880, dur: .14, vol: .3 }],
  set: [{ wave: 'noise', freq: 1500, to: 900, dur: .06, vol: .3, filter: 'highpass' }, { wave: 'triangle', freq: 440, to: 520, dur: .09, vol: .22 }],
  spike: [{ wave: 'noise', freq: 1100, to: 140, dur: .16, vol: .6, filter: 'lowpass' }, { wave: 'saw', freq: 220, to: 60, dur: .18, vol: .25 }],
  serve: [{ wave: 'noise', freq: 1200, to: 300, dur: .12, vol: .5, filter: 'lowpass' }, { wave: 'square', freq: 330, to: 660, dur: .12, vol: .2 }],
  toss: { wave: 'sine', freq: 300, to: 520, dur: .15, vol: .2 },
  net: { wave: 'noise', freq: 2400, to: 1200, dur: .12, vol: .22, filter: 'highpass' },
  land: [{ wave: 'noise', freq: 500, to: 100, dur: .2, vol: .5, filter: 'lowpass' }],
  bounce: { wave: 'sine', freq: 180, to: 70, dur: .12, vol: .3 },
  dive: { wave: 'noise', freq: 900, to: 300, dur: .3, vol: .3, filter: 'bandpass' },
  jump: { wave: 'square', freq: 260, to: 520, dur: .1, vol: .12 },
  step: { wave: 'noise', freq: 400, to: 250, dur: .04, vol: .1, filter: 'lowpass' },
  whistle: [{ wave: 'sine', freq: 2600, to: 2900, dur: .24, vol: .2, vib: [32, .02] }],
  whistleLong: [{ wave: 'sine', freq: 2600, to: 3000, dur: .6, vol: .2, vib: [34, .03] }],
  point: { wave: 'square', freq: 523, dur: .1, vol: .2, arp: [0, 4, 7, 12], step: .07 },
  lose: { wave: 'triangle', freq: 330, to: 140, dur: .5, vol: .25 },
  crowd: { wave: 'noise', freq: 600, to: 900, dur: 1.2, vol: .14, filter: 'lowpass' },
  cheer: [{ wave: 'noise', freq: 800, to: 1400, dur: .9, vol: .18, filter: 'bandpass' }],
  gasp: { wave: 'noise', freq: 1500, to: 700, dur: .4, vol: .12, filter: 'bandpass' },
  ring: { wave: 'sine', freq: 880, dur: .08, vol: .12 },
  perfect: { wave: 'square', freq: 660, dur: .16, vol: .18, arp: [0, 7, 12], step: .05 },
  good: { wave: 'triangle', freq: 440, dur: .1, vol: .16 },
  miss: { wave: 'triangle', freq: 200, to: 120, dur: .2, vol: .18 },
  call: { wave: 'saw', freq: 300, to: 400, dur: .14, vol: .12 },
  select: { wave: 'square', freq: 700, dur: .035, vol: .08 },
  confirm: { wave: 'square', freq: 520, dur: .09, vol: .12, arp: [0, 7], step: .045 },
  cancel: { wave: 'square', freq: 320, to: 220, dur: .08, vol: .1 },
  coin: { wave: 'square', freq: 988, dur: .18, vol: .13, arp: [0, 5], step: .06 },
  buy: { wave: 'square', freq: 784, dur: .22, vol: .14, arp: [0, 4, 7, 12], step: .05 },
  gift: { wave: 'triangle', freq: 600, dur: .4, vol: .2, arp: [0, 4, 7, 11, 14], step: .07 },
  heart: { wave: 'sine', freq: 880, to: 1320, dur: .3, vol: .2, vib: [8, .02] },
  slotSpin: { wave: 'square', freq: 400, to: 800, dur: .06, vol: .06 },
  slotStop: { wave: 'square', freq: 260, to: 180, dur: .1, vol: .14 },
  jackpot: { wave: 'square', freq: 523, dur: 1.2, vol: .18, arp: [0, 4, 7, 12, 16, 19, 24], step: .09 },
  card: { wave: 'noise', freq: 2000, to: 1000, dur: .06, vol: .14, filter: 'highpass' },
  roulette: { wave: 'triangle', freq: 1200, to: 600, dur: .04, vol: .1 },
  pad: { wave: 'sine', freq: 440, dur: .12, vol: .15 },
  splash: [{ wave: 'noise', freq: 1500, to: 300, dur: .4, vol: .3, filter: 'lowpass' }],
  shutter: [{ wave: 'noise', freq: 3000, to: 1500, dur: .06, vol: .3, filter: 'highpass' }, { wave: 'square', freq: 200, dur: .05, vol: .1, delay: .07 }],
  fireworks: { wave: 'noise', freq: 800, to: 3000, dur: .5, vol: .22, filter: 'bandpass' },
  dayend: { wave: 'triangle', freq: 392, dur: .8, vol: .18, arp: [0, 4, 7, 4, 0], step: .14 },
  waves: { wave: 'noise', freq: 400, to: 900, dur: 2.4, vol: .06, filter: 'lowpass' },
  gull: { wave: 'sine', freq: 1400, to: 900, dur: .3, vol: .08, vib: [20, .05] }
};
G.installAudio = game => { for (const k in G.SFX) game.audio.define(k, G.SFX[k]); };
G.sfx = (name, o) => { try { G.game.audio.sfx(name, o); } catch (e) { /* audio unavailable headless */ } };
G.voiceSfx = (v, o) => { const a = G.game.audio; try { if (!a._init() || a.muted || a.ctx.state !== 'running') return; for (const x of Array.isArray(v) ? v : [v]) a._voice(x, a._voxBus, a.ctx.currentTime + .005, 1 + (o && o.vary ? o.vary * (a._rnd() * 2 - 1) : 0)); } catch (e) { /* none */ } };

/* ---- Animalese: a bubbling, pitch-wobbling blip per letter ---- */
G.speak = (charId, ch) => {
  const c = G.CAST[String(charId).toLowerCase()] || G.CAST.you, v = c.voice;
  if (!ch || /[\s.,!?\-:;'"()]/.test(ch)) return;
  const code = ch.toLowerCase().charCodeAt(0), vowel = 'aeiou'.includes(ch.toLowerCase());
  const semi = ((code * 7) % 12) - 5, f = v.base * Math.pow(2, semi * v.spread / 12) * (vowel ? 1 : .8);
  const dur = (vowel ? .075 : .045) / v.speed, vm = (G.game.settings && typeof G.game.settings.voices === 'number') ? G.game.settings.voices : .8;   // the Voices slider in Settings
  if (vowel) G.voiceSfx({ wave: v.wave, freq: f, to: f * (1 + ((code % 5) - 2) * .04), dur, vol: .11 }, { vary: .02 });
  else G.voiceSfx([{ wave: 'noise', freq: f * 3, to: f * 2, dur: dur * .6, vol: .07, filter: 'bandpass' }, { wave: v.wave, freq: f, dur, vol: .05 }], { vary: .02 });
};
G.voiceFor = charId => (ch) => G.speak(charId, ch);
G.babble = (charId, text) => { let k = 0; for (const ch of text.slice(0, 18)) { const t = k++ * .045; G.game.after(t, () => G.speak(charId, ch)); } };
