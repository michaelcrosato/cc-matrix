// Animalese-style gibberish: one syllable every 2 letters. Same word, same pitch. Falls at '.', rises at '?', louder at '!'.
const hashWord = (w) => { let h = 7; for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) | 0; return Math.abs(h); };
const RECIPES = {
  MAX: { wave: 'triangle', freq: 170, decay: 0.06, volume: 0.42 },
  DAME: { wave: 'square', duty: 0.25, freq: 320, decay: 0.05, volume: 0.28, vibrato: { depth: 1, rate: 22 } },
  COMMODORE: { wave: 'square', freq: 260, decay: 0.07, volume: 0.28, crush: 8, layers: [{ wave: 'noise', freq: 5000, decay: 0.05, volume: 0.05 }] },
  FATHOM: { wave: 'triangle', freq: 110, decay: 0.14, volume: 0.5 },
  PYM: { wave: 'sine', freq: 200, decay: 0.06, volume: 0.46, crush: 6 },
  ISLANDER: { wave: 'saw', freq: 120, decay: 0.09, volume: 0.28 },
  MONK: { wave: 'sine', freq: 90, decay: 0.2, volume: 0.32, layers: [{ wave: 'sine', freq: 135, decay: 0.2, volume: 0.22 }, { wave: 'sine', freq: 180, decay: 0.2, volume: 0.16 }] },
  BOSUN: { wave: 'saw', freq: 60, decay: 0.4, volume: 0.5 },
};
const VOWELS = [1, 0.93, 1.06, 0.88, 1.12];
const CONS = [{ wave: 'noise', freq: 7000, decay: 0.012, volume: 0.1 }, { wave: 'square', freq: 600, freqEnd: 300, decay: 0.012, volume: 0.06 }];
export const VOICE_MAP = { MAX: 'MAX', DAME: 'DAME', COMMODORE: 'COMMODORE', FATHOM: 'FATHOM', PYM: 'PYM', NILS: 'ISLANDER', MENDER: 'ISLANDER', ANSGAR: 'ISLANDER', ISLANDER: 'ISLANDER', MONK: 'MONK', BOSUN: 'BOSUN' };
export function registerVoices(audio) {
  for (const sp in RECIPES) for (let v = 0; v < 5; v++) for (let c = 0; c < 2; c++) {
    const base = RECIPES[sp];
    audio.register(`v_${sp}_${v}_${c}`, { ...base, freq: base.freq * VOWELS[v], layers: [...(base.layers || []), CONS[c]] });
  }
  audio.register('v_bubble', { wave: 'sine', freq: 300, freqEnd: 800, decay: 0.07, volume: 0.2 });
}
/** Voices one line of text as it types: call tick(n) with the number of characters shown so far. */
export class VoiceLine {
  constructor(audio, who, text, gain = () => 1) { this.audio = audio; this.sp = VOICE_MAP[who] || 'ISLANDER'; this.text = text; this.gain = gain; this.i = 0; this.count = 0; }
  tick(shown) {
    while (this.i < shown && this.i < this.text.length) {
      const ch = this.text[this.i];
      if (/[A-Za-z0-9]/.test(ch) && this.i % 2 === 0) {
        let a = this.i, b = this.i;
        while (a > 0 && /\w/.test(this.text[a - 1])) a--;
        while (b < this.text.length && /\w/.test(this.text[b])) b++;
        const word = this.text.slice(a, b).toLowerCase(), h = hashWord(word);
        const rest = this.text.slice(b); const end = rest[0];
        let pitch = (h % 7) - 3, vol = 1;
        if (end === '.' ) pitch -= 3; if (end === '?') pitch += 4; if (end === '!') vol = 1.3;
        if (this.sp === 'PYM') pitch = 0;
        if (this.sp === 'COMMODORE') vol *= 1.1;
        this.audio.play(`v_${this.sp}_${(h + this.i) % 5}_${(this.i >> 1) % 2}`, { pitch, volume: Math.min(1, vol * this.gain()) });
        this.count++;
        if (this.sp === 'FATHOM' && this.count % 5 === 0) this.audio.play('v_bubble', { volume: this.gain(), pitch: (h % 5) });
      }
      this.i++;
    }
  }
}
export function bark(audio, who, text, o = {}, gain = 1) { const sp = VOICE_MAP[who] || 'ISLANDER'; const h = hashWord(text); audio.play(`v_${sp}_${h % 5}_${h % 2}`, { pitch: (h % 5) - 2, volume: (o.volume ?? 1) * gain, pan: o.pan ?? 0 }); }
