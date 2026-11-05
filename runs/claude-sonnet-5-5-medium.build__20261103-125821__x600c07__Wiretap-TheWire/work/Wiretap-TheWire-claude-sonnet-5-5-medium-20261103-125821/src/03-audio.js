// 03-audio: code-written music (engine tracks), sfx, ambience, and Animalese-style gibberish voices (WebAudio formants)
const SONGS = {
  // sodium-orange and slow: bass walk + sparse minor pad + brushed hats
  title: { bpm: 74, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'A2 - - - E2 - - - | G2 - - - D2 - - - | F2 - - - C2 - - - | E2 - - - B1 - - -' },
    { name: 'pad', wave: 'sine', vol: .11, notes: 'A4 - - - - - - - C5 - - - - - - - | A4 - - - - - - - B4 - - - - - - - | A4 - - - - - - - G4 - - - - - - - | B4 - - - - - - - E4 - - - - - - -' },
    { name: 'keys', wave: 'pulse12', vol: .06, notes: '. . . . . . E5 . . . . . D5 . . . | . . . . . . C5 . . . . . B4 . . . | . . . . . . A4 . . . . . . . . . | . . . . . . B4 . . . . . . . . .' },
    { name: 'hat', wave: 'drums', notes: 'h . . h . . h . h . . h . . h .' }] },
  field: { bpm: 88, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'D2 . . D2 . . D2 . F2 . . F2 . . E2 . | D2 . . D2 . . D2 . A1 . . A1 . . C2 .' },
    { name: 'tick', wave: 'pulse', vol: .05, notes: 'A4 . . . . . . . A4 . . . . . . . | A4 . . . . . . . G4 . . . . . . .' },
    { name: 'drums', wave: 'drums', on: false, notes: 'k . . . s . . . k . k . s . . .' },
    { name: 'hat', wave: 'drums', notes: 'h . h . h . h . h . h . h . h .' }] },
  wire: { bpm: 66, steps: 4, tracks: [
    { name: 'bass', wave: 'sine', vol: .2, notes: 'E2 - - - - - - - | C2 - - - - - - - | D2 - - - - - - - | B1 - - - - - - -' },
    { name: 'lead', wave: 'triangle', vol: .07, notes: 'B4 - - - G4 - - - | E4 - - - . . . . | A4 - - - F#4 - - - | D4 - - - . . . .' }] },
  corner: { bpm: 96, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .09, notes: 'G2 . G2 . . G2 . . Bb2 . Bb2 . . F2 . . | G2 . G2 . . G2 . . C3 . C3 . . D3 . .' },
    { name: 'drums', wave: 'drums', notes: 'k . . h s . h . k . h h s . h .' },
    { name: 'lead', wave: 'pulse12', vol: .05, notes: '. . D5 . . . F5 . . . G5 . . . . . | . . D5 . . . C5 . . . Bb4 . . . . .' }] },
  versus: { bpm: 104, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'C2 . C2 . C2 . Eb2 . F2 . F2 . G2 . Bb1 . | C2 . C2 . C2 . Eb2 . F2 . F2 . G2 . G2 .' },
    { name: 'drums', wave: 'drums', notes: 'k . h . s . h h k . h . s . h .' },
    { name: 'arp', wave: 'pulse', vol: .04, notes: 'C5 Eb5 G5 Eb5 C5 Eb5 G5 Eb5 F5 Ab5 C6 Ab5 G5 Bb5 D6 Bb5' }] },
  stinger: { bpm: 80, steps: 4, tracks: [{ wave: 'triangle', vol: .2, notes: 'E4 - G4 - B4 - - - - - - - - - - -' }] },
  sad: { bpm: 60, steps: 4, tracks: [{ wave: 'sine', vol: .14, notes: 'A3 - - - - - - - F3 - - - - - - - | E3 - - - - - - - . . . . . . . .' }, { wave: 'triangle', vol: .1, notes: 'A2 - - - - - - - F2 - - - - - - - | E2 - - - - - - - . . . . . . . .' }] }
};
const SFX = {
  tick: { wave: 'square', freq: 'C6', dur: .03, vol: .08 }, focus: { wave: 'triangle', freq: 'A5', dur: .04, vol: .1 },
  shutter: { wave: 'noise', freq: 800, to: 200, dur: .09, vol: .22 }, shutter2: { wave: 'square', freq: 'C4', to: 'C3', dur: .07, vol: .12 },
  made: { wave: 'saw', freq: 'E3', to: 'E2', dur: .5, vol: .25 }, notice: { wave: 'pulse', freq: 'A4', to: 'C5', dur: .12, vol: .15 },
  pager: { wave: 'square', freq: 'E6', dur: .06, vol: .14, arp: [0, 0, 7, 7], step: .08 }, ring: { wave: 'sine', freq: 'A5', dur: .5, vol: .12, arp: [0, 3, 0, 3, 0, 3], step: .07 },
  cash: { wave: 'square', freq: 'B5', to: 'E6', dur: .1, vol: .12 }, deny: { wave: 'saw', freq: 'C3', to: 'A2', dur: .2, vol: .16 },
  gavel: { wave: 'noise', freq: 400, to: 90, dur: .12, vol: .3 }, stamp: { wave: 'triangle', freq: 'G2', to: 'C2', dur: .12, vol: .3 },
  good: { wave: 'triangle', freq: 'C5', dur: .18, vol: .16, arp: [0, 4, 7], step: .07 }, bad: { wave: 'saw', freq: 'G2', dur: .3, vol: .14, arp: [0, -3, -6], step: .09 },
  step: { wave: 'noise', freq: 300, to: 100, dur: .03, vol: .04 }, whistle: { wave: 'sine', freq: 'E6', to: 'G6', dur: .3, vol: .16 },
  tackle: { wave: 'noise', freq: 500, to: 60, dur: .25, vol: .3 }, cuff: { wave: 'square', freq: 'A5', dur: .04, vol: .14, arp: [0, 12], step: .05 }
};
const Sound = {
  ac: null,
  sfx(n, o) { try { const v = SFX[n]; if (v) game.audio.sfx(Object.assign({}, v, o || {})); else game.audio.sfx(n, o); } catch (e) { /* audio not ready */ } },
  music(n, o) { try { game.audio.music(SONGS[n] || n, o); } catch (e) { /* ignore */ } },
  stop() { try { game.audio.music(null); } catch (e) { /* ignore */ } },
  ctx() { if (!this.ac) { try { const C = window.AudioContext || window.webkitAudioContext; if (C) { this.ac = new C(); this.out = this.ac.createGain(); this.out.connect(this.ac.destination); } } catch (e) { /* none */ } } if (this.ac && this.ac.state === 'suspended') this.ac.resume().catch(() => { }); return this.ac; },
  // Animalese-style voice: one blip per letter, pitch from the voice profile, vowel formants via bandpass, optional phone filter
  speak(text, voice = 'dana', opts = {}) {
    const ac = this.ctx(); if (!ac || (game.settings && game.settings.sound === false)) return 0;
    const P = VOICES[voice] || VOICES.dana, vol = (game.settings ? (game.settings.volume * (game.settings.effects == null ? 1 : game.settings.effects)) : .7) * (opts.vol == null ? 1 : opts.vol) * .35;
    const letters = String(text).toLowerCase().replace(/[^a-z]/g, ''); let t = ac.currentTime + .02, n = 0;
    const phone = opts.phone ? ac.createBiquadFilter() : null; if (phone) { phone.type = 'bandpass'; phone.frequency.value = 1400; phone.Q.value = .7; phone.connect(this.out); }
    const dest = phone || this.out; this.out.gain.value = 1;
    for (let i = 0; i < letters.length && n < 28; i += (i % 3 === 2 ? 2 : 1)) {
      const c = letters.charCodeAt(i) - 97, f0 = P.base * Math.pow(2, ((c * 7) % 12) / 12 * P.range + (P.up ? 0 : 0));
      const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = P.wave; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (1 + P.slide), t + P.len);
      const vow = 'aeiou'.indexOf(letters[i]); const fm = [[800, 1200], [550, 1900], [350, 2300], [450, 800], [320, 900]][vow >= 0 ? vow : (c % 5)];
      f.type = 'bandpass'; f.frequency.value = fm[0] * P.formant; f.Q.value = 3.5; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0005, t + P.len);
      o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + P.len + .02); t += P.len * .9 + (letters[i] === 'a' ? .01 : 0); n++;
    }
    return t - ac.currentTime;
  }
};
// voice profiles (App. I, shortened): base Hz, range, wave, blip length, glide, formant scale
const VOICES = {
  dana: { base: 210, range: 1.1, wave: 'triangle', len: .07, slide: .06, formant: 1.1 }, szabo: { base: 120, range: .9, wave: 'sawtooth', len: .08, slide: -.05, formant: .9 },
  major: { base: 100, range: .6, wave: 'sawtooth', len: .095, slide: -.08, formant: .85 }, tee: { base: 140, range: 1.0, wave: 'square', len: .075, slide: .03, formant: .95 },
  slim: { base: 90, range: .7, wave: 'sawtooth', len: .1, slide: -.04, formant: .8 }, judge: { base: 130, range: .5, wave: 'triangle', len: .1, slide: -.03, formant: .9 },
  rae: { base: 250, range: 1.2, wave: 'triangle', len: .065, slide: .08, formant: 1.2 }, kid: { base: 300, range: 1.3, wave: 'square', len: .06, slide: .1, formant: 1.25 },
  runner: { base: 180, range: 1.1, wave: 'square', len: .07, slide: .05, formant: 1.05 }, brass: { base: 110, range: .5, wave: 'sawtooth', len: .1, slide: -.06, formant: .85 }
};
// ambience bed: rain-ish noise + distant siren, driven from the field scene's update
const Ambience = { t: 0, tick(dt, mood = 1) { this.t -= dt; if (this.t <= 0) { this.t = 2 + rnd(rng.cosmetic) * 4; if (rnd(rng.cosmetic) < .35) Sound.sfx({ wave: 'sine', freq: 520, to: 700, dur: 1.2, vol: .015 * mood }); else Sound.sfx({ wave: 'noise', freq: 200, to: 80, dur: .4, vol: .018 * mood }); } } };
