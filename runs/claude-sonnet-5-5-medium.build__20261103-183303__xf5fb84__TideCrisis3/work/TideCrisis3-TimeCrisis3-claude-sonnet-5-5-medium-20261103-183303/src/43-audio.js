// 43-audio.js — music (tracker songs as code), SFX voices, and the Animalese/Simlish gibberish voice synth.
// No audio files. Songs use the engine's tracker; the voice synth is Web Audio formants on audio.bus('sfx').
const rep = (s, n) => Array(n).fill(s).join(' ');
const bars = (...b) => b.join(' ');
// a 16-step bar from a pattern: 'x' = hit the note, '-' = hold, '.' = rest
const pat = (note, p) => p.split('').map((c, i, a) => c === 'x' ? note : c === '-' ? '-' : '.').join(' ');
const song = (id, o) => def('song', id, o);
const drumsA = 'k . h . s . h . k . h k s . h h', drumsB = 'k . h h s . h . k k h . s . h o';
// theme — D minor, 140 bpm: rising wave arpeggio, brassy pulse lead, saw bass, rock drums
song('theme', { bpm: 140, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .16, notes: bars(pat('D2', 'x.x.x.x.x.x.x.x.'), pat('Bb1', 'x.x.x.x.x.x.x.x.'), pat('F2', 'x.x.x.x.x.x.x.x.'), pat('C2', 'x.x.x.x.x.x.x.x.')) },
  { name: 'lead', wave: 'square', vol: .12, notes: bars('D4 - - - F4 - A4 - D5 - - - C5 - A4 -', 'Bb4 - - - A4 - F4 - D4 - - - . . . .', 'F4 - - - A4 - C5 - F5 - - - E5 - C5 -', 'C5 - - - D5 - E5 - G4 - - - . . . .') },
  { name: 'arp', wave: 'pulse12', vol: .07, notes: bars(rep('D4 F4 A4 D5', 4), rep('Bb3 D4 F4 Bb4', 4), rep('F3 A3 C4 F4', 4), rep('C4 E4 G4 C5', 4)) },
  { name: 'drums', wave: 'drums', vol: .22, notes: bars(drumsA, drumsB, drumsA, drumsB) }] });
song('briefing', { bpm: 90, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .13, notes: bars('D3 - - - - - - - - - - - - - - -', 'Bb2 - - - - - - - - - - - - - - -', 'G2 - - - - - - - - - - - - - - -', 'A2 - - - - - - - - - - - - - - -') },
  { name: 'lead', wave: 'pulse12', vol: .07, notes: bars('. . . . D4 - - - F4 - - - E4 - - -', '. . . . D4 - - - Bb3 - - - . . . .', '. . . . G4 - - - F4 - - - D4 - - -', 'E4 - - - . . . . A3 - - - . . . .') },
  { name: 'tick', wave: 'drums', vol: .12, notes: rep('h . h . h . h . h . h . h . h .', 4) }] });
song('harbor', { bpm: 150, steps: 4, tracks: [
  { name: 'bass', wave: 'triangle', vol: .24, notes: bars('E2 . . E2 . . E2 . B1 . . B1 . . . .', 'A1 . . A1 . . A1 . E2 . . E2 . . . .', 'C2 . . C2 . . C2 . G1 . . G1 . . . .', 'B1 . . B1 . . B1 . F#1 . . B1 . . . .') },
  { name: 'lead', wave: 'square', vol: .1, notes: bars('E5 - . G5 - . B5 - A5 - G5 - E5 - . .', 'A5 - . C6 - . B5 - A5 - G5 - E5 - . .', 'G5 - . E5 - . C5 - E5 - G5 - A5 - . .', 'B5 - . A5 - . F#5 - B5 - . . . . . .'), on: false },
  { name: 'arp', wave: 'pulse12', vol: .06, notes: bars(rep('E4 G4 B4 G4', 4), rep('A3 C4 E4 C4', 4), rep('C4 E4 G4 E4', 4), rep('B3 D#4 F#4 D#4', 4)) },
  { name: 'drums', wave: 'drums', vol: .2, notes: bars('k . h . s . h h k . h k s . h .', 'k . h h s . h . k . h . s . h h', 'k . h . s . h h k . h k s . h .', 'k . h h s . h . k h k . s s s s'), on: false }] });
song('storm', { bpm: 160, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .16, notes: bars(rep('A1 . A1 A1', 4), rep('F1 . F1 F1', 4), rep('G1 . G1 G1', 4), rep('E1 . E1 E1', 4)) },
  { name: 'lead', wave: 'pulse12', vol: .1, notes: bars('A4 - - C5 - - E5 - D5 - C5 - A4 - - .', 'F4 - - A4 - - C5 - B4 - A4 - F4 - - .', 'G4 - - B4 - - D5 - C5 - B4 - G4 - - .', 'E4 - - G#4 - - B4 - A4 - G#4 - E4 - . .'), on: false },
  { name: 'arp', wave: 'square', vol: .05, notes: bars(rep('A3 C4 E4 A4', 4), rep('F3 A3 C4 F4', 4), rep('G3 B3 D4 G4', 4), rep('E3 G#3 B3 E4', 4)) },
  { name: 'drums', wave: 'drums', vol: .22, notes: bars('k . h . s . h . k . h k s . h h', 'k k h . s . h . k . h k s . h o', 'k . h . s . h . k . h k s . h h', 'k . h h s . s . k . k . s s s s'), on: false }] });
song('tidewall', { bpm: 155, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .16, notes: bars(rep('C2 . C2 .', 4), rep('G1 . G1 .', 4), rep('Ab1 . Ab1 .', 4), rep('Bb1 . Bb1 .', 4)) },
  { name: 'lead', wave: 'square', vol: .1, notes: bars('G4 - - C5 - - E5 - G5 - - E5 - C5 - -', 'D5 - - G4 - - B4 - D5 - - B4 - G4 - -', 'Eb5 - - C5 - - Ab4 - C5 - - Eb5 - . . .', 'F5 - - D5 - - Bb4 - D5 - - F5 - G5 - -'), on: false },
  { name: 'arp', wave: 'pulse12', vol: .06, notes: bars(rep('C4 E4 G4 E4', 4), rep('G3 B3 D4 B3', 4), rep('Ab3 C4 Eb4 C4', 4), rep('Bb3 D4 F4 D4', 4)) },
  { name: 'drums', wave: 'drums', vol: .22, notes: bars(drumsA, drumsB, drumsA, 'k . h . s . h . k k k . s s s s'), on: false }] });
song('boss', { bpm: 170, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .2, notes: bars(rep('E1 E1 . E1', 4), rep('G1 G1 . G1', 4), rep('F1 F1 . F1', 4), rep('B0 B0 . B0', 4)) },
  { name: 'lead', wave: 'square', vol: .1, notes: bars('E4 . E4 G4 . G4 B4 . A4 G4 . E4 . . . .', 'G4 . G4 B4 . B4 D5 . C5 B4 . G4 . . . .', 'F4 . F4 A4 . A4 C5 . B4 A4 . F4 . . . .', 'B3 . D#4 F#4 . B4 . . A#4 . . . F#4 . . .') },
  { name: 'drums', wave: 'drums', vol: .24, notes: bars('k . k . s . k k k . k . s . h h', 'k k k . s . h h k . k k s . s s', 'k . k . s . k k k . k . s . h h', 'k k s s k k s s k k s s s s s s') }] });
song('kingtide', { bpm: 165, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .2, notes: bars(rep('D1 D1 . D1', 4), rep('Bb0 Bb0 . Bb0', 4), rep('C1 C1 . C1', 4), rep('A0 A0 . A0', 4)) },
  { name: 'lead', wave: 'square', vol: .11, notes: bars('D5 - - A4 - D5 - F5 - E5 - D5 - C5 - .', 'Bb4 - - F4 - Bb4 - D5 - C5 - Bb4 - A4 - .', 'C5 - - G4 - C5 - E5 - D5 - C5 - Bb4 - .', 'A4 - C#5 - E5 - A5 - G5 - E5 - C#5 - . .') },
  { name: 'arp', wave: 'pulse12', vol: .06, notes: bars(rep('D4 F4 A4 D5', 4), rep('Bb3 D4 F4 Bb4', 4), rep('C4 E4 G4 C5', 4), rep('A3 C#4 E4 A4', 4)) },
  { name: 'drums', wave: 'drums', vol: .24, notes: bars(drumsB, drumsB, drumsB, 'k k s s k k s s k s k s s s s s') }] });
song('range', { bpm: 112, steps: 4, tracks: [
  { name: 'bass', wave: 'triangle', vol: .22, notes: bars('G1 . . G1 . G1 . . Bb1 . . Bb1 . C2 . .', 'C2 . . C2 . C2 . . G1 . . G1 . F1 . .') },
  { name: 'lead', wave: 'pulse12', vol: .08, notes: bars('. . D5 . F5 . . G5 . . F5 . D5 . . .', '. . C5 . Eb5 . . G5 . . F5 . C5 . . .') },
  { name: 'drums', wave: 'drums', vol: .16, notes: bars('k . h . s . h h k . h . s . h .', 'k . h . s . h h k . h k s . h o') }] });
song('results', { bpm: 120, steps: 4, tracks: [{ name: 'lead', wave: 'square', vol: .1, notes: bars('C5 - E5 - G5 - E5 - C5 - G4 - . . . .', 'F5 - A5 - C6 - A5 - F5 - C5 - . . . .') }, { name: 'bass', wave: 'triangle', vol: .2, notes: bars('C2 . . . G1 . . . C2 . . . G1 . . .', 'F1 . . . C2 . . . F1 . . . C2 . . .') }] });
song('clear', { bpm: 150, steps: 4, loop: false, tracks: [{ name: 'lead', wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - - - - G5 - C6 - - - - -' }, { name: 'bass', wave: 'triangle', vol: .2, notes: 'C3 . . . G2 . . . C3 - - - - - - -' }] });
song('gameover', { bpm: 80, steps: 4, loop: false, tracks: [{ name: 'lead', wave: 'triangle', vol: .16, notes: 'G4 - - - Eb4 - - - C4 - - - G3 - - -' }] });
song('continue', { bpm: 100, steps: 4, tracks: [{ name: 'lead', wave: 'pulse12', vol: .1, notes: 'E4 . . . E4 . . . G4 . . . E4 . . .' }, { name: 'tick', wave: 'drums', vol: .14, notes: 'k . . . h . . . k . . . h . . .' }] });
song('ending', { bpm: 70, steps: 4, tracks: [
  { name: 'lead', wave: 'triangle', vol: .16, notes: bars('D5 - - - F5 - - - A5 - - - G5 - F5 -', 'E5 - - - D5 - - - C5 - - - D5 - - -', 'F5 - - - A5 - - - C6 - - - Bb5 - A5 -', 'G5 - - - E5 - - - D5 - - - - - - -') },
  { name: 'pad', wave: 'pulse12', vol: .07, notes: bars(rep('D3 F3 A3 D4', 4), rep('C3 E3 G3 C4', 4), rep('Bb2 D3 F3 Bb3', 4), rep('A2 C#3 E3 A3', 4)) },
  { name: 'bass', wave: 'sawtooth', vol: .1, notes: bars('D2 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -', 'Bb1 - - - - - - - - - - - - - - -', 'A1 - - - - - - - - - - - - - - -') }] });
// ---- SFX ----
const N = (f, to, dur, vol, filter) => ({ wave: 'noise', freq: f, to, dur, vol, filter: filter || 'lowpass' });
const SFXD = {
  w_handgun: [N(2800, 500, .1, .5), { wave: 'sine', freq: 240, to: 60, dur: .1, vol: .5 }, { wave: 'square', freq: 700, to: 120, dur: .05, vol: .12 }],
  w_mg: [N(2400, 600, .06, .38), { wave: 'sine', freq: 200, to: 80, dur: .06, vol: .35 }],
  w_sg: [N(1800, 200, .3, .7), { wave: 'sine', freq: 120, to: 40, dur: .3, vol: .6 }],
  w_gl: [N(900, 150, .3, .55), { wave: 'sine', freq: 180, to: 50, dur: .25, vol: .6 }, { wave: 'saw', freq: 90, to: 400, dur: .18, vol: .15 }],
  empty: { wave: 'square', freq: 220, to: 180, dur: .04, vol: .18 }, reload: [{ wave: 'square', freq: 500, to: 380, dur: .04, vol: .2 }, { wave: 'triangle', freq: 300, dur: .09, vol: .3 }], switch: { wave: 'square', freq: 440, arp: [0, 7], step: .04, dur: .12, vol: .16 },
  cover_in: [N(500, 150, .12, .4), { wave: 'triangle', freq: 120, to: 60, dur: .1, vol: .4 }], cover_out: N(300, 1500, .1, .3, 'highpass'), whizz: { wave: 'sine', freq: 2200, to: 700, dur: .09, vol: .12 },
  ping: { wave: 'square', freq: 2400, to: 1800, dur: .08, vol: .18 }, thud: [N(700, 120, .12, .5), { wave: 'sine', freq: 100, to: 50, dur: .12, vol: .5 }], splinter: N(3000, 800, .1, .35, 'highpass'),
  e_hit: [N(1800, 500, .1, .4), { wave: 'square', freq: 200, to: 80, dur: .08, vol: .2 }], head: { wave: 'triangle', freq: 1400, to: 2000, dur: .1, vol: .35 }, e_die: { wave: 'saw', freq: 300, to: 60, dur: .35, vol: .22 },
  tick: { wave: 'square', freq: 1800, dur: .03, vol: .16 }, chirp: { wave: 'square', freq: 1400, to: 2600, dur: .14, vol: .3 }, time_tick: { wave: 'square', freq: 1200, dur: .05, vol: .12 }, timeup: [{ wave: 'saw', freq: 600, to: 100, dur: .8, vol: .3 }, N(500, 100, .8, .3)],
  pickup: { wave: 'square', freq: 523, arp: [0, 4, 7, 12], step: .05, dur: .25, vol: .24 }, oneup: { wave: 'square', freq: 659, arp: [0, 3, 12, 8, 10, 15], step: .08, dur: .5, vol: .26 }, newweapon: { wave: 'square', freq: 392, arp: [0, 4, 7, 11, 12], step: .06, dur: .4, vol: .24 }, extend: { wave: 'triangle', freq: 880, arp: [0, 7, 12], step: .06, dur: .3, vol: .3 },
  boom_s: [N(900, 100, .5, .6), { wave: 'sine', freq: 90, to: 30, dur: .45, vol: .6 }], boom_b: [N(700, 60, 1.2, .8), { wave: 'sine', freq: 60, to: 22, dur: 1.1, vol: .8 }, { wave: 'saw', freq: 200, to: 30, dur: .6, vol: .2 }],
  glass: N(5000, 1500, .25, .4, 'highpass'), wood: [N(900, 300, .15, .45), { wave: 'triangle', freq: 180, to: 80, dur: .1, vol: .3 }], lantern: { wave: 'triangle', freq: 1200, to: 400, dur: .15, vol: .2 },
  grenade: { wave: 'triangle', freq: 300, to: 200, dur: .2, vol: .3 }, rocket: [N(600, 2200, .5, .35, 'highpass'), { wave: 'saw', freq: 150, to: 300, dur: .5, vol: .15 }], harpoon: { wave: 'square', freq: 1500, to: 300, dur: .2, vol: .25 }, torpedo: [N(3000, 1000, .8, .2, 'highpass'), { wave: 'sine', freq: 70, to: 90, dur: .8, vol: .3 }], flare: { wave: 'square', freq: 900, to: 1800, dur: .15, vol: .2 },
  spin: { wave: 'saw', freq: 100, to: 600, dur: .8, vol: .26 }, minigun: [N(2200, 700, .06, .4), { wave: 'sine', freq: 150, dur: .06, vol: .4 }], slash: [N(600, 3500, .2, .35, 'highpass'), { wave: 'saw', freq: 700, to: 200, dur: .15, vol: .15 }], windup: { wave: 'saw', freq: 200, to: 900, dur: .45, vol: .18 }, stomp: [N(300, 60, .2, .5), { wave: 'sine', freq: 70, to: 30, dur: .25, vol: .6 }],
  select: { wave: 'square', freq: 700, dur: .04, vol: .16 }, confirm: { wave: 'square', freq: 520, arp: [0, 7], step: .05, dur: .14, vol: .2 }, back: { wave: 'square', freq: 400, to: 250, dur: .1, vol: .18 }, stamp: [N(400, 80, .3, .6), { wave: 'sine', freq: 90, to: 40, dur: .3, vol: .6 }], count: { wave: 'square', freq: 1100, dur: .02, vol: .1 },
  zap: [{ wave: 'saw', freq: 2000, to: 200, dur: .2, vol: .25 }, N(4000, 1000, .2, .25, 'highpass')], rotor: N(250, 150, .12, .18), lock: [{ wave: 'square', freq: 300, to: 800, dur: .12, vol: .25 }, N(2000, 400, .1, .3)]
};
let _audioDefined = false;
function defineAudio(game) { if (_audioDefined && game.audio._defd) return; for (const k in SFXD) game.audio.define(k, SFXD[k]); game.audio._defd = true; _audioDefined = true; }
const SND = { play(name, o) { const g = E.current; if (!g || !g.audio || g.headless) return; try { g.audio.sfx(name, o); } catch (e) { } } };
// ---- the gibberish voice: syllables, formant filters, consonant noise bursts, contour and effect ----
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 1900] };
const Voice = {
  active: [],
  syllables(text) {
    const out = []; const s = text.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim(); let cur = '', vow = false, pause = 0;
    for (const ch0 of s) { const ch = ch0.toLowerCase();
      if (/[aeiouy]/.test(ch)) { cur += ch; vow = true; }
      else if (/[a-z]/.test(ch)) { if (vow) { out.push({ s: cur, p: 0, caps: false }); cur = ''; vow = false; } cur += ch; }
      else { if (cur && vow) { out.push({ s: cur, p: 0 }); cur = ''; vow = false; } if (/[,;:]/.test(ch)) pause = .12; else if (/[.!?…—]/.test(ch)) pause = .25; if (pause && out.length) { out[out.length - 1].p = Math.max(out[out.length - 1].p, pause); pause = 0; } if (ch === '!') { if (out.length) out[out.length - 1].excl = 1; } if (ch === '?') { if (out.length) out[out.length - 1].q = 1; } } }
    if (cur && vow) out.push({ s: cur, p: 0 });
    // caps = shouting
    const shout = s.length > 3 && s === s.toUpperCase() && /[A-Z]/.test(s); for (const o of out) o.shout = shout; return out;
  },
  duration(text, who) { const sp = reg('speaker', who), rate = sp ? sp.voice.rate : 11; return Voice.syllables(text).reduce((t, s) => t + 1 / rate + s.p, 0); },
  say(text, who, o = {}) {
    const sp = reg('speaker', who) || reg('speaker', 'kai'), v = sp.voice, syl = Voice.syllables(text), dur = syl.reduce((t, s) => t + 1 / v.rate + s.p, 0);
    const g = E.current, ac = g && g.audio && g.audio.ctx; if (!ac || ac.state === 'suspended' || !g.audio.bus) return dur;
    const bus = g.audio.bus('sfx'); if (!bus) return dur;
    Voice.active = Voice.active.filter(a => a.end > ac.currentTime); while (Voice.active.length >= 2) { const a = Voice.active.shift(); try { a.stop(); } catch (e) { } }
    const t0 = ac.currentTime + .03; let t = t0; const seed = hash32(text), out = ac.createGain(); out.gain.value = o.vol == null ? .55 : o.vol;
    let fxIn = out; if (v.fx === 'radio') { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = .7; out.connect(bp); const ws = ac.createWaveShaper(); const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 2.2); } ws.curve = c; bp.connect(ws); ws.connect(bus); }
    else if (v.fx === 'boom') { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; out.connect(lp); const dl = ac.createDelay(.5); dl.delayTime.value = .09; const fb = ac.createGain(); fb.gain.value = .3; lp.connect(bus); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(bus); }
    else if (v.fx === 'gravel') { const am = ac.createGain(); am.gain.value = .7; const lfo = ac.createOscillator(); lfo.frequency.value = 40; const lg = ac.createGain(); lg.gain.value = .3; lfo.connect(lg); lg.connect(am.gain); lfo.start(t0); lfo.stop(t0 + dur + .5); out.connect(am); am.connect(bus); }
    else out.connect(bus);
    const nodes = [out]; let n = syl.length;
    syl.forEach((sy, i) => {
      const h = ((hash32(sy.s + i + seed) % 1000) / 1000), jit = 1 + (h - .5) * .12, prog = i / Math.max(1, n - 1);
      let contour = 1 - prog * .12; if (sy.q || (i > n - 3 && /\?$/.test(text))) contour = 1 + prog * .22; if (sy.excl || sy.shout) contour *= 1.25;
      const f0 = v.pitch * contour * jit, d = (1 / v.rate) * (.85 + h * .3), vowel = sy.s.replace(/[^aeiouy]/g, '')[0] || 'a', F = FORMANTS[vowel];
      const osc = ac.createOscillator(); osc.type = v.wave || 'sawtooth'; osc.frequency.setValueAtTime(f0 * .96, t); osc.frequency.linearRampToValueAtTime(f0, t + d * .3);
      const env = ac.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(sy.shout ? 1 : .8, t + .012); env.gain.setTargetAtTime(0, t + d * .65, .015);
      for (const f of F) { const bq = ac.createBiquadFilter(); bq.type = 'bandpass'; bq.frequency.value = f * (v.pitch > 180 ? 1.15 : v.pitch < 120 ? .9 : 1); bq.Q.value = 5; osc.connect(bq); bq.connect(env); }
      env.connect(out); osc.start(t); osc.stop(t + d + .08); nodes.push(osc);
      // consonant onset
      const c = sy.s[0]; if (!/[aeiouy]/.test(c)) { const nb = ac.createBufferSource(); nb.buffer = g.audio._noise; const flt = ac.createBiquadFilter(), cg = ac.createGain(), pl = 'ptkbdg'.includes(c), fr = 'sfhzxcj'.includes(c), nas = 'mn'.includes(c); flt.type = fr ? 'highpass' : 'bandpass'; flt.frequency.value = fr ? 4500 : pl ? 1800 : nas ? 300 : 900; const cd = pl ? .012 : fr ? .04 : nas ? .03 : .025; cg.gain.setValueAtTime(pl ? .5 : fr ? .3 : .2, t); cg.gain.exponentialRampToValueAtTime(.001, t + cd); nb.connect(flt); flt.connect(cg); cg.connect(out); nb.start(t, 0, cd + .01); }
      t += d + sy.p;
    });
    const rec = { end: t + .1, stop() { for (const nd of nodes) { try { nd.stop && nd.stop(); nd.disconnect && nd.disconnect(); } catch (e) { } } } }; Voice.active.push(rec); return dur;
  },
  bark(who) { const sp = reg('speaker', who) || reg('speaker', 'kai'); const t = ['hra', 'ugh', 'hup', 'nya', 'gah', 'hey'][Math.floor(cosmetic() * 6)]; return Voice.say(t, who, { vol: .4 }); }
};
// the music layers: drums and lead come in during ACTION, out during WAIT
function musicFor(game, id, o) { const s = reg('song', id); if (!s) return; try { game.audio.music(s, Object.assign({ sync: true, fade: .8 }, o)); } catch (e) { } }
