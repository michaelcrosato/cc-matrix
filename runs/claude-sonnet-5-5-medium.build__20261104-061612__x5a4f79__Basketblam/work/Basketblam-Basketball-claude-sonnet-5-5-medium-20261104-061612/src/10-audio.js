/* BASKETBLAM - audio: music, stings, sound effects, gibberish voices and crowd. All made in code. */
VOICES.LUNA = { pitch: 450, rate: 1.1, wave: 'sine', name: 'LUNA', look: { skin: '#e8d8ff', hair: '#ffffff', style: 'long' }, color: '#d8a8ff' };

const SONGS = {
  title: { bpm: 108, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .07, notes: 'E5 . G5 . A5 . G5 E5 | D5 . E5 . G5 . E5 D5 | C5 . E5 . G5 . A5 . | B5 - - . A5 . G5 .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'A2 . A2 A3 . A2 E3 . | G2 . G2 G3 . G2 D3 . | F2 . F2 F3 . F2 C3 . | E2 . E2 E3 . G2 B2 .' },
    { name: 'arp', wave: 'pulse', vol: .04, notes: 'A4 C5 E5 C5 A4 C5 E5 C5 | G4 B4 D5 B4 G4 B4 D5 B4 | F4 A4 C5 A4 F4 A4 C5 A4 | E4 G4 B4 G4 E4 G4 B4 G4' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h k | k . h . s h h . | k . h . s . h k | k . h k s h s s' }] },
  alley: { bpm: 98, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .06, notes: 'D5 . . F5 . G5 . . | A5 . G5 . F5 . D5 . | C5 . . E5 . G5 . . | A5 . G5 . E5 . C5 .' },
    { name: 'bass', wave: 'triangle', vol: .32, notes: 'D2 . D2 . F2 . G2 A2 | D2 . D2 . F2 . A2 G2 | C2 . C2 . E2 . G2 A2 | C2 . C2 . E2 . G2 E2' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . . h s . h . | k . h . s . h h | k . . h s . h . | k . h . s h s .' }] },
  roof: { bpm: 122, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .06, notes: 'G5 . B5 . D6 . B5 . | A5 . C6 . E6 . C6 . | F5 . A5 . C6 . A5 . | G5 . B5 . D6 - - .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'G2 G2 . G3 G2 . G3 . | A2 A2 . A3 A2 . A3 . | F2 F2 . F3 F2 . F3 . | G2 G2 . G3 D3 . B2 .' },
    { name: 'pad', wave: 'sine', vol: .08, notes: 'B4 - - - - - - - | C5 - - - - - - - | A4 - - - - - - - | B4 - - - D5 - - -' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h h s . h . | k . h h s . h h | k . h h s . h . | k h h h s s s s' }] },
  dome: { bpm: 134, steps: 4, tracks: [
    { name: 'lead', wave: 'saw', vol: .05, notes: 'E5 E5 . G5 . E5 . B4 | C5 C5 . E5 . C5 . G4 | D5 D5 . F5 . D5 . A4 | E5 . G5 . B5 - - .' },
    { name: 'bass', wave: 'triangle', vol: .32, notes: 'E2 E2 E3 E2 E2 E3 E2 E2 | C2 C2 C3 C2 C2 C3 C2 C2 | D2 D2 D3 D2 D2 D3 D2 D2 | E2 E2 E3 E2 B2 B2 B1 B1' },
    { name: 'drums', wave: 'drums', vol: .13, notes: 'k h s h k h s h | k h s h k k s s | k h s h k h s h | k s k s k s s s' }] },
  lunar: { bpm: 88, steps: 4, tracks: [
    { name: 'lead', wave: 'sine', vol: .12, notes: 'A5 - - - E5 - - - | G5 - - - D5 - - - | F5 - - - C5 - - - | E5 - - - B4 - - -' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'A1 . . A2 . . A1 . | G1 . . G2 . . G1 . | F1 . . F2 . . F1 . | E1 . . E2 . . B1 .' },
    { name: 'blip', wave: 'pulse', vol: .04, notes: 'A4 . E5 . A5 . E5 . | G4 . D5 . G5 . D5 . | F4 . C5 . F5 . C5 . | E4 . B4 . E5 . B4 .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . . . s . . h | k . . h s . . . | k . . . s . h . | k . h . s . s s' }] },
  victory: { bpm: 130, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'C5 E5 G5 C6 . G5 C6 - | D5 F5 A5 D6 . A5 D6 - | E5 G5 B5 E6 . D6 C6 - | C6 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . C3 . G2 . G2 . | D3 . D3 . A2 . A2 . | E3 . E3 . B2 . B2 . | C3 . G2 . C3 - - .' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h k | k . h . s . h k | k . h . s . h k | k s k s k - - .' }] },
  lose: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'A4 - - - G4 - - - | F4 - - - E4 - - - | D4 - - - - - - - | - - - - - - - -' },
    { wave: 'sine', vol: .2, notes: 'A2 - - - - - - - | F2 - - - - - - - | D2 - - - - - - - | - - - - - - - -' }] },
  camp: { bpm: 104, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .05, notes: 'C5 . E5 . G5 . E5 . | F5 . A5 . C6 . A5 . | G5 . B5 . D6 . B5 . | C6 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 - - .' },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . . . s . . . | k . . . s . . . | k . . . s . . . | k . . . s . s s' }] }
};
const STINGS = {
  basket: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .09, notes: 'C5 E5 G5 C6 - - - -' }] },
  dunk: { bpm: 170, steps: 4, tracks: [{ wave: 'saw', vol: .1, notes: 'C4 G4 C5 E5 G5 C6 - -' }, { wave: 'drums', vol: .15, notes: 'k . k s - - - -' }] },
  nova: { bpm: 180, steps: 4, tracks: [{ wave: 'saw', vol: .1, notes: 'A4 C5 E5 A5 C6 E6 A6 -' }, { wave: 'drums', vol: .15, notes: 'k s k s k s k s' }] }
};

const SFX = {
  dribble: { wave: 'sine', freq: 130, to: 70, dur: .07, vol: .35 },
  bounce: { wave: 'sine', freq: 150, to: 80, dur: .09, vol: .3 },
  squeak: { wave: 'triangle', freq: 1500, to: 2300, dur: .06, vol: .08 },
  swish: { wave: 'noise', freq: 4000, to: 1500, dur: .28, vol: .22, filter: 'highpass' },
  clank: { wave: 'triangle', freq: 880, to: 520, dur: .22, vol: .3, vib: [40, .05] },
  thud: { wave: 'square', freq: 180, to: 90, dur: .1, vol: .22 },
  whistle: { wave: 'square', freq: 2300, dur: .35, vol: .1, vib: [34, .06] },
  buzzer: { wave: 'saw', freq: 130, dur: .8, vol: .24 },
  tick: { wave: 'square', freq: 1800, dur: .03, vol: .08 },
  swipe: { wave: 'noise', freq: 2400, to: 700, dur: .12, vol: .16 },
  shove: { wave: 'saw', freq: 140, to: 50, dur: .16, vol: .28 },
  down: { wave: 'noise', freq: 600, to: 120, dur: .3, vol: .3, filter: 'lowpass' },
  jump: { wave: 'triangle', freq: 220, to: 540, dur: .13, vol: .12 },
  slam: { wave: 'saw', freq: 90, to: 28, dur: .5, vol: .45 },
  rim: { wave: 'triangle', freq: 1250, to: 400, dur: .5, vol: .3, vib: [26, .05] },
  rattle: { wave: 'square', freq: 700, to: 300, dur: .22, vol: .12, vib: [50, .08] },
  shatter: { wave: 'noise', freq: 8000, to: 800, dur: 1.1, vol: .5 },
  cheer: { wave: 'noise', freq: 700, to: 1100, dur: 1.4, vol: .22, filter: 'lowpass' },
  aww: { wave: 'noise', freq: 900, to: 300, dur: 1.0, vol: .16, filter: 'lowpass' },
  nova: { wave: 'saw', freq: 200, to: 1600, dur: .9, vol: .26, arp: [0, 7, 12, 19], step: .07 },
  novaOff: { wave: 'saw', freq: 700, to: 90, dur: .7, vol: .22 },
  power: { wave: 'square', freq: 440, dur: .4, vol: .16, arp: [0, 4, 7, 12], step: .06 },
  jackpot: { wave: 'square', freq: 660, dur: .6, vol: .18, arp: [0, 5, 9, 12, 17], step: .06 },
  tip: { wave: 'sine', freq: 300, to: 900, dur: .3, vol: .2 },
  perfect: { wave: 'triangle', freq: 880, dur: .25, vol: .16, arp: [0, 7, 12], step: .05 },
  freeze: { wave: 'triangle', freq: 2200, to: 400, dur: .5, vol: .2, vib: [60, .1] }
};
for (const [k, v] of Object.entries(SFX)) game.audio.define('bb_' + k, v);
const sfx = (name, o) => { try { game.audio.sfx('bb_' + name, o); } catch (e) { } };
const sting = name => { try { game.audio.sting ? game.audio.sting(STINGS[name]) : game.audio.sfx('bb_perfect'); } catch (e) { } };
const music = name => { try { game.audio.music(name ? SONGS[name] : null); } catch (e) { } };

/* ---- the gibberish voice (Animalese/Simlish style): a pitched blip per letter with a vowel-ish formant ---- */
const VOWEL_F = { a: 800, e: 540, i: 320, o: 480, u: 360 };
const babble = (v, ch) => {
  const A = game.audio; if (!A.ctx || A.muted || (HAS_WIN && window.AIHub && window.AIHub.ended)) return;
  if (!/[a-z0-9]/i.test(ch)) return;
  try {
    const c = A.ctx, bus = A.sfxBus; if (!bus) return;
    const code = ch.toLowerCase().charCodeAt(0), t = c.currentTime + .001, vowel = VOWEL_F[ch.toLowerCase()];
    const pitch = v.pitch * Math.pow(2, (((code * 7) % 13) - 6) / 24) * (ch === ch.toUpperCase() && vowel ? 1.04 : 1);
    const dur = clamp((vowel ? .085 : .05) / v.rate, .03, .13);
    const osc = c.createOscillator(); osc.type = v.wave; osc.frequency.setValueAtTime(pitch * 1.06, t); osc.frequency.exponentialRampToValueAtTime(pitch, t + dur * .7);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = vowel || (600 + (code % 6) * 260); f.Q.value = vowel ? 3 : 1.4;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    osc.connect(f); f.connect(g); g.connect(bus); osc.start(t); osc.stop(t + dur + .02);
  } catch (e) { }
};
const voiceFor = key => (ch => babble(VOICES[key] || VOICES.RICO, ch));

/* ---- crowd ambience: filtered noise whose level follows the excitement ---- */
const crowd = { node: null, gain: null, level: 0 };
const crowdUpdate = (dt, want) => {
  const A = game.audio; if (!A.ctx) return;
  try {
    if (!crowd.node) {
      const c = A.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let b = 0; for (let i = 0; i < len; i++) { b = b * .96 + (Math.random() * 2 - 1) * .2; d[i] = b; }
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = .5;
      const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(A.musicBus || A.sfxBus); s.start();
      crowd.node = s; crowd.gain = g; crowd.filter = f;
    }
    crowd.level = approach(crowd.level, want, dt * .5);
    crowd.gain.gain.value = crowd.level * .55; crowd.filter.frequency.value = 500 + crowd.level * 900;
  } catch (e) { }
};
const crowdStop = () => { if (crowd.gain) try { crowd.gain.gain.value = 0; } catch (e) { } crowd.level = 0; };
