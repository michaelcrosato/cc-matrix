// Animalese-style gibberish: every spoken line is syllables played from the text as it types. Pitch
// comes from a hash of the word (the same word sounds the same), falls at '.', rises at '?', louder at '!'.
const VOWELS = 'AEIOU';
const SPEAKERS = {
  max: { base: 170, wave: 'triangle', decay: 0.07, volume: 0.32 },
  dame: { base: 320, wave: 'square', duty: 0.25, decay: 0.05, volume: 0.2, vibrato: { depth: 0.7, rate: 16 } },
  commodore: { base: 260, wave: 'square', decay: 0.075, volume: 0.2, crush: 8, noise: true },
  fathom: { base: 110, wave: 'triangle', decay: 0.13, volume: 0.42, bubble: true },
  pym: { base: 200, wave: 'sine', decay: 0.07, volume: 0.32, crush: 6, flat: true },
  islander: { base: 120, wave: 'saw', decay: 0.09, volume: 0.22 },
  monk: { base: 92, wave: 'sine', decay: 0.2, volume: 0.32, choir: true },
  bosun: { base: 60, wave: 'saw', decay: 0.5, volume: 0.42 },
  nils: { base: 145, wave: 'triangle', decay: 0.08, volume: 0.3 },
  mender: { base: 125, wave: 'saw', decay: 0.1, volume: 0.2 },
};
export const SPEAKER_NAMES = Object.keys(SPEAKERS);

export const SPEAKER_INFO = {
  max: { label: 'MAX', color: 'sand' },
  dame: { label: 'DAME OTTOLINE', color: 'lime' },
  commodore: { label: 'THE COMMODORE', color: 'orange' },
  fathom: { label: 'MR. FATHOM', color: 'cyan' },
  pym: { label: 'MR. PYM', color: 'mist' },
  islander: { label: 'ISLANDER', color: 'orange' },
  monk: { label: 'MONK', color: 'orange' },
  bosun: { label: 'THE BOSUN', color: 'red' },
  nils: { label: 'NILS', color: 'sky' },
  mender: { label: 'NET-MENDER', color: 'orange' },
};

/** One syllable as a SoundDef: 5 vowel colours × 2 consonant styles, per speaker. */
export function syllableDef(speaker, vowel, hard) {
  const s = SPEAKERS[speaker];
  const f = s.base * (1 + vowel * 0.09);
  const layers = [];
  if (hard) layers.push({ wave: 'noise', freq: 5200, decay: 0.012, volume: s.volume * 0.5 });
  if (s.noise) layers.push({ wave: 'noise', freq: 2600, decay: s.decay * 0.9, volume: s.volume * 0.45 });
  if (s.choir) {
    layers.push({ wave: 'sine', freq: f * 1.5, decay: s.decay, attack: 0.03, volume: s.volume * 0.7 });
    layers.push({ wave: 'sine', freq: f * 2, decay: s.decay, attack: 0.03, volume: s.volume * 0.5 });
  }
  if (s.bubble && vowel % 2 === 0) layers.push({ wave: 'sine', freq: 400 + vowel * 60, freqEnd: 900, decay: 0.05, delay: 0.03, volume: 0.16 });
  return {
    wave: s.wave,
    duty: s.duty,
    freq: f * (hard ? 1.06 : 1),
    freqEnd: f * (s.flat ? 1 : (hard ? 0.86 : 0.94)),
    attack: s.choir ? 0.03 : 0.004,
    decay: s.decay,
    volume: s.volume,
    crush: s.crush,
    vibrato: s.vibrato,
    layers: layers.length ? layers : undefined,
  };
}

export const syllableName = (speaker, vowel, hard) => `v_${speaker}_${vowel}${hard ? 'h' : 's'}`;

function hash(word) {
  let h = 7;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) % 9973;
  return h;
}

export class Voice {
  constructor(audio, settings) {
    this.audio = audio;
    this.settings = settings;
    this.count = 0;
    this.lastSpeaker = null;
    for (const sp of SPEAKER_NAMES) {
      for (let v = 0; v < 5; v++) {
        for (const hard of [false, true]) audio.register(syllableName(sp, v, hard), syllableDef(sp, v, hard));
      }
    }
  }

  /** Speak the part of `text` from character `from` to `to`, one syllable every 2 letters. */
  speak(speaker, text, from, to, o = {}) {
    const sp = SPEAKERS[speaker] ? speaker : 'islander';
    for (let i = from; i < to; i++) {
      const c = text[i];
      if (!c || !/[A-Z0-9]/i.test(c)) continue;
      if (i % 2) continue;
      const start = text.lastIndexOf(' ', i) + 1;
      const endSpace = text.indexOf(' ', i);
      const word = text.slice(start, endSpace < 0 ? text.length : endSpace);
      const last = word[word.length - 1];
      const h = hash(word.toUpperCase());
      const vowel = VOWELS.includes(c.toUpperCase()) ? VOWELS.indexOf(c.toUpperCase()) : h % 5;
      const hard = 'KTPGDBCQ'.includes(c.toUpperCase());
      let pitch = ((h % 7) - 3) * (SPEAKERS[sp].flat ? 0.15 : 0.55);
      const wordEnd = i >= start + word.length - 2;
      if (wordEnd && last === '.') pitch -= 3;
      if (wordEnd && last === '?') pitch += 4;
      const vol = (last === '!' ? 1.25 : 1) * this.settings.voice * (o.volume ?? 1);
      this.audio.play(syllableName(sp, vowel, hard), { pitch, volume: Math.min(1, vol), pan: o.pan ?? 0 });
      this.count++;
      this.lastSpeaker = sp;
    }
  }

  /** A short bark: the whole line at once would be mush, so it is spaced by the caller or kept to 2-3 syllables. */
  bark(speaker, text, o = {}) {
    const sp = SPEAKERS[speaker] ? speaker : 'islander';
    const h = hash(text);
    const n = o.syllables ?? 3;
    for (let i = 0; i < n; i++) {
      const v = (h + i * 3) % 5;
      this.audio.play({ ...syllableDef(sp, v, i === 0), delay: i * 0.09 }, { pitch: ((h + i) % 5) - 2, volume: Math.min(1, (o.volume ?? 1) * this.settings.voice), pan: o.pan ?? 0 });
    }
    this.count += n;
    this.lastSpeaker = sp;
  }
}
