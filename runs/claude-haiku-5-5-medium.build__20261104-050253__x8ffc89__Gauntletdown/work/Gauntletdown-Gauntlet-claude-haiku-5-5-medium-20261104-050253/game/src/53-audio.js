// Audio, all written in code: the songs (original compositions in the engine's song format), and the Babble voices, the
// gibberish of the narrator and the heroes. A voice is a run of syllables, each a short tone through a band filter, with
// vowels setting the filter and consonants a short noise burst. The same words always sound the same (the pitch of each
// syllable is hashed from it), and each speaker has a base pitch, a wave and a rate.

const SONGS = {
  // the title and the menus: a D minor march, square lead, triangle bass, snare rolls
  throwdown: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .16, notes: 'D4 - F4 - A4 - G4 - F4 - D4 - E4 - F4 - D4 - - - A3 - - - D4 - F4 - A4 - C5 - A4 - F4 - D4 - E4 - D4 - - - - - ' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'D2 . D2 . A2 . A2 . D2 . D2 . F2 . F2 . ' },
    { name: 'drums', wave: 'drums', vol: .2, notes: 'k . . . s . . . k . . . s . . s ' }
  ] },
  // floors 1 to 3: a bouncy minor pulse and a kitchen clatter
  larder: { bpm: 120, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: 'A4 . C5 . E5 . C5 . B4 . G4 . A4 . . . ' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 A2 E2 E2 F2 F2 G2 G2 ' },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . h . s . h . k . h k s . h . ' }
  ] },
  // floors 4 to 6: an organ-like arpeggio in slow triplets over a drone
  ossuary: { bpm: 96, steps: 6, tracks: [
    { name: 'lead', wave: 'triangle', vol: .14, notes: 'D4 F4 A4 D5 A4 F4 C4 E4 G4 C5 G4 E4 ' },
    { name: 'drone', wave: 'sine', vol: .14, notes: 'D2 - - - - - D2 - - - - - ' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . . s . . k . . s . . ' }
  ] },
  // floors 7 and 8: a driving saw bass, anvil hits
  furnace: { bpm: 136, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .15, notes: 'E2 E2 E3 E2 G2 G2 G3 G2 B2 B2 B3 B2 A2 A2 A3 A2 ' },
    { name: 'lead', wave: 'square', vol: .08, notes: 'E5 . . G5 . . B4 . . A4 . . ' },
    { name: 'drums', wave: 'drums', vol: .2, notes: 'k . k . s . k . k . s k ' }
  ] },
  // the treasure rooms: a frantic jig over a ticking hat
  hoard: { bpm: 160, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .13, notes: 'G4 B4 D5 G5 F5 D5 B4 D5 A4 C5 E5 A5 G5 E5 C5 E5 ' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'G2 . G2 . C3 . C3 . A2 . A2 . D3 . D3 . ' },
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k h k h s h k h ' }
  ] },
  // the King: a slow dark line, and drums that come in with each phase (game.audio.layer)
  king: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'saw', vol: .1, notes: 'C4 . Eb4 . G4 . Bb3 . C4 . Eb4 . F4 . G4 . ' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'C2 C2 C2 C2 Ab1 Ab1 Ab1 Ab1 ' },
    { name: 'drums', wave: 'drums', vol: .22, on: false, notes: 'k . k . s . k k ' }
  ] },
  // the game over: a slow descending dirge, played once
  fed: { bpm: 70, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .2, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - D4 - - - ' },
    { name: 'bass', wave: 'sine', vol: .14, notes: 'D2 - - - C2 - - - Bb1 - - - A1 - - - ' }
  ] },
  // the ending: a heroic major fanfare
  victory: { bpm: 110, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .16, notes: 'D4 . F4 A4 D5 . C5 . A4 . F4 . D4 - - - ' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'D2 . D2 . Bb1 . Bb1 . ' },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . s . k . s . k . k s k . k . ' }
  ] }
};
function stageSong(stage) {
  if (!stage) return SONGS.throwdown;
  if (stage.kind === 'boss') return SONGS.king;
  if (stage.kind === 'treasure') return SONGS.hoard;
  return { larder: SONGS.larder, ossuary: SONGS.ossuary, furnace: SONGS.furnace }[stage.realm] || SONGS.larder;
}

// The speakers: the narrator, the heroes, and the monsters that talk.
const VOICES = {
  narrator: { base: 78, rate: 5, wave: 'saw', vol: .2, dark: .8, echo: true },
  berserker: { base: 110, rate: 7, wave: 'square', vol: .16, noise: .2 },
  shieldmaiden: { base: 190, rate: 7, wave: 'saw', vol: .15 },
  ranger: { base: 230, rate: 9, wave: 'square', vol: .13 },
  hexer: { base: 260, rate: 8, wave: 'triangle', vol: .15, vib: [6, .05] },
  gnasher: { base: 120, rate: 10, wave: 'square', vol: .12, noise: .4 }
};

const VOWELS = /[aeiouy]/;
// The sounds of a text: each word's syllables, each a consonant run and a vowel group.
function syllablesOf(text) {
  const out = [];
  for (const word of text.toUpperCase().split(/([^A-Z]+)/)) {
    if (!word) continue;
    if (!/[A-Z]/.test(word)) { out.push({ pause: word.includes(',') ? .25 : word.includes('.') || word.includes('!') || word.includes('?') ? .4 : .12 }); continue; }
    const s = word.toLowerCase().match(/[^aeiouy]*[aeiouy]+[^aeiouy]*/g) || [word.toLowerCase()];
    for (const syl of s) out.push({ onset: syl.replace(/[aeiouy].*$/, ''), vowel: (syl.match(/[aeiouy]+/) || ['a'])[0][0], end: syl.endsWith('?') });
  }
  return out;
}
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
// The formant band for a vowel: low and open for a and o, high for e and i.
const BAND = { a: 'lowpass', o: 'lowpass', u: 'lowpass', e: 'bandpass', i: 'bandpass', y: 'bandpass' };
let BABBLE_LAST = [];
// Build the voices for a text and play them: each syllable a short tone (and a noise burst after a consonant).
function babble(text, speaker) {
  const v = VOICES[speaker] || VOICES.narrator;
  const now = game.time || 0;
  BABBLE_LAST = BABBLE_LAST.filter(t => now - t < .5);
  if (BABBLE_LAST.length >= 3) return;   // at most three voices at once
  BABBLE_LAST.push(now);
  const list = [];
  let t = 0;
  const gap = 1 / v.rate;
  for (const s of syllablesOf(text)) {
    if (s.pause) { t += s.pause; continue; }
    const h = hashStr(s.onset + s.vowel) % 9 - 4, f = v.base * (1 + h * .03) * (v.dark || 1) * (s.end ? 1.12 : 1);
    list.push({ wave: v.wave, freq: f, to: f * (s.end ? 1.25 : .9), dur: gap * .7, vol: v.vol * .55, delay: t, filter: BAND[s.vowel] || 'bandpass', q: 3, vib: v.vib });
    if (s.onset && v.noise !== undefined) list.push({ wave: 'noise', freq: 2400, dur: .03, vol: v.vol * .4, delay: t, filter: 'highpass' });
    t += gap;
  }
  if (!list.length) return;
  game.audio.sfx(list, { vol: .8, vary: 0 });
}
// The narrator reads each line; a hero barks, the way the heroes speak (short, and rate-limited).
const BARK_T = {};
function bark(h, text) {
  const now = game.time || 0;
  if (now - (BARK_T[h.cls] || -9) < 2) return;
  BARK_T[h.cls] = now;
  babble(text, h.cls);
}
SAY_HOOK = (text, key) => { if (prefs.voices !== false) babble(text, 'narrator'); };
