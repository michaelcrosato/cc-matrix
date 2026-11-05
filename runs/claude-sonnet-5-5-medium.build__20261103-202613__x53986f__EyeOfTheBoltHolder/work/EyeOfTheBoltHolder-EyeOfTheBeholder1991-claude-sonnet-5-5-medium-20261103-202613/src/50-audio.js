/* AUDIO: every sound is code. SFX voices, step-sequencer songs with a fight layer, and the babble voice synth (Animalese/Simlish). */
B.SFX = {
  step: { wave: 'noise', freq: 320, to: 120, dur: .07, vol: .08, filter: 'lowpass' }, step_wet: [{ wave: 'noise', freq: 500, to: 160, dur: .09, vol: .08, filter: 'lowpass' }, { wave: 'sine', freq: 300, to: 150, dur: .05, vol: .04, delay: .03 }],
  step_metal: [{ wave: 'noise', freq: 1500, to: 600, dur: .05, vol: .07 }, { wave: 'square', freq: 220, to: 160, dur: .04, vol: .03 }], step_dust: { wave: 'noise', freq: 260, to: 100, dur: .09, vol: .06, filter: 'lowpass' },
  turn: { wave: 'noise', freq: 900, to: 500, dur: .06, vol: .04 }, bump: [{ wave: 'square', freq: 90, to: 50, dur: .1, vol: .18 }, { wave: 'noise', freq: 300, dur: .06, vol: .1 }],
  door: [{ wave: 'saw', freq: 110, to: 160, dur: .35, vol: .08, vib: [14, .08], filter: 'lowpass' }, { wave: 'noise', freq: 700, to: 300, dur: .3, vol: .05 }], doorclose: [{ wave: 'saw', freq: 160, to: 90, dur: .25, vol: .08, filter: 'lowpass' }, { wave: 'square', freq: 80, dur: .06, vol: .15, delay: .24 }],
  gate: { wave: 'saw', freq: 70, to: 110, dur: .95, vol: .12, vib: [12, .1], filter: 'lowpass' }, gatedown: [{ wave: 'saw', freq: 110, to: 60, dur: .7, vol: .1, filter: 'lowpass' }, { wave: 'square', freq: 70, dur: .08, vol: .2, delay: .68 }],
  lever: [{ wave: 'square', freq: 260, to: 140, dur: .08, vol: .2 }, { wave: 'noise', freq: 1200, dur: .05, vol: .12, delay: .09 }], button: { wave: 'square', freq: 520, to: 400, dur: .05, vol: .15 }, catch: [{ wave: 'square', freq: 800, dur: .03, vol: .15 }, { wave: 'noise', freq: 2000, dur: .04, vol: .1, delay: .04 }],
  plate: { wave: 'square', freq: 140, to: 90, dur: .12, vol: .2 }, plateup: { wave: 'square', freq: 90, to: 160, dur: .1, vol: .12 }, secret: [{ wave: 'saw', freq: 60, to: 40, dur: 1.1, vol: .14, vib: [20, .1], filter: 'lowpass' }, { wave: 'noise', freq: 400, to: 150, dur: 1, vol: .06 }],
  illusion: { wave: 'sine', freq: 900, to: 1800, dur: .25, vol: .1, vib: [30, .2] }, tele: [{ wave: 'sine', freq: 200, to: 1200, dur: .4, vol: .1 }, { wave: 'noise', freq: 1500, to: 300, dur: .4, vol: .06 }], spin: { wave: 'saw', freq: 90, to: 60, dur: .5, vol: .06, vib: [9, .2], filter: 'lowpass' },
  fall: { wave: 'sine', freq: 600, to: 80, dur: .9, vol: .15 }, land: [{ wave: 'noise', freq: 240, dur: .15, vol: .2, filter: 'lowpass' }, { wave: 'square', freq: 60, dur: .15, vol: .2 }],
  darts: [{ wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2 }, { wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2, delay: .07 }], unlock: { wave: 'square', freq: 660, arp: [0, 7], step: .06, dur: .14, vol: .18 }, lockfail: { wave: 'square', freq: 180, dur: .07, vol: .16 }, snap: { wave: 'noise', freq: 3000, to: 800, dur: .1, vol: .14 },
  alcove: { wave: 'triangle', freq: 330, to: 440, dur: .1, vol: .15 }, pickup: { wave: 'triangle', freq: 440, to: 660, dur: .08, vol: .14 }, putdown: { wave: 'triangle', freq: 330, to: 220, dur: .08, vol: .14 }, throw: { wave: 'noise', freq: 2400, to: 600, dur: .14, vol: .1 }, clatter: { wave: 'noise', freq: 900, to: 300, dur: .12, vol: .1 },
  eat: [{ wave: 'noise', freq: 1500, dur: .04, vol: .12 }, { wave: 'noise', freq: 1500, dur: .04, vol: .12, delay: .1 }, { wave: 'noise', freq: 1500, dur: .04, vol: .12, delay: .2 }], drink: [{ wave: 'sine', freq: 300, to: 200, dur: .1, vol: .14 }, { wave: 'sine', freq: 280, to: 180, dur: .1, vol: .14, delay: .13 }], scroll: { wave: 'noise', freq: 1800, to: 3000, dur: .3, vol: .08 }, zap: { wave: 'square', freq: 1400, to: 300, dur: .12, vol: .12 },
  swing: { wave: 'noise', freq: 2600, to: 800, dur: .1, vol: .1 }, swing_blunt: { wave: 'noise', freq: 1800, to: 500, dur: .14, vol: .12 }, twang: [{ wave: 'saw', freq: 300, to: 120, dur: .12, vol: .1 }, { wave: 'noise', freq: 3000, dur: .04, vol: .08 }], whirr: { wave: 'noise', freq: 1200, to: 2400, dur: .2, vol: .06 },
  hit: [{ wave: 'noise', freq: 900, to: 200, dur: .1, vol: .2 }, { wave: 'square', freq: 120, to: 70, dur: .08, vol: .15 }], hit_metal: [{ wave: 'square', freq: 700, to: 300, dur: .1, vol: .15 }, { wave: 'noise', freq: 3000, dur: .05, vol: .1 }], hit_bone: [{ wave: 'noise', freq: 2000, to: 500, dur: .08, vol: .16 }, { wave: 'square', freq: 400, to: 200, dur: .05, vol: .1 }], hit_ooze: { wave: 'sine', freq: 200, to: 60, dur: .18, vol: .22 },
  miss: { wave: 'noise', freq: 1500, to: 700, dur: .09, vol: .06 }, crit: [{ wave: 'square', freq: 900, to: 400, dur: .12, vol: .16 }, { wave: 'noise', freq: 3000, dur: .08, vol: .12 }], hurt: [{ wave: 'saw', freq: 200, to: 90, dur: .15, vol: .18 }, { wave: 'noise', freq: 600, dur: .1, vol: .1 }],
  levelup: { wave: 'square', freq: 523, arp: [0, 4, 7, 12], step: .07, dur: .35, vol: .16 }, death: { wave: 'triangle', freq: 220, to: 55, dur: .8, vol: .22 }, raise: { wave: 'sine', freq: 300, arp: [0, 7, 12, 19], step: .1, dur: .6, vol: .14 }, deed: { wave: 'square', freq: 440, arp: [0, 7, 12, 16, 19], step: .08, dur: .6, vol: .14 }, secretfound: { wave: 'sine', freq: 600, arp: [0, 5, 9], step: .08, dur: .4, vol: .12 },
  cast: { wave: 'saw', freq: 220, to: 880, dur: .25, vol: .13 }, heal: { wave: 'sine', freq: 520, arp: [0, 4, 7], step: .07, dur: .35, vol: .14 }, spark: [{ wave: 'saw', freq: 220, to: 880, dur: .18, vol: .14 }, { wave: 'noise', freq: 3000, to: 600, dur: .2, vol: .08 }], orb: [{ wave: 'noise', freq: 400, to: 80, dur: .5, vol: .22, filter: 'lowpass' }, { wave: 'saw', freq: 90, to: 40, dur: .5, vol: .15 }], lightning: [{ wave: 'noise', freq: 4000, to: 500, dur: .3, vol: .2 }, { wave: 'square', freq: 1500, to: 100, dur: .3, vol: .12 }], bless: { wave: 'triangle', freq: 660, arp: [0, 5, 9, 12], step: .08, dur: .4, vol: .12 },
  squeak: { wave: 'square', freq: 1500, to: 2400, dur: .07, vol: .09 }, slurp: { wave: 'sine', freq: 140, to: 60, dur: .22, vol: .2 }, chitter: { wave: 'square', freq: 1800, arp: [0, 3, 0, 5], step: .03, dur: .14, vol: .08 }, rattle: { wave: 'noise', freq: 2200, arp: [0, 3, 0, 5], step: .04, dur: .22, vol: .1 }, clank: [{ wave: 'square', freq: 150, to: 90, dur: .15, vol: .18 }, { wave: 'noise', freq: 1500, dur: .08, vol: .1 }], growl: { wave: 'saw', freq: 90, to: 60, dur: .35, vol: .14, vib: [20, .15] }, chant: { wave: 'sine', freq: 280, to: 340, dur: .4, vol: .12, vib: [6, .1] }, hum: { wave: 'sine', freq: 200, to: 260, dur: .4, vol: .09, vib: [16, .2] },
  windup: { wave: 'saw', freq: 120, to: 220, dur: .3, vol: .06 }, roar: [{ wave: 'saw', freq: 110, to: 55, dur: 1, vol: .2, vib: [7, .12] }, { wave: 'noise', freq: 500, to: 120, dur: .8, vol: .15, filter: 'lowpass' }],
  chain: [{ wave: 'noise', freq: 5000, to: 400, dur: .4, vol: .26 }, { wave: 'square', freq: 1800, to: 80, dur: .4, vol: .15 }], slam: [{ wave: 'square', freq: 80, to: 40, dur: .3, vol: .26 }, { wave: 'noise', freq: 500, dur: .2, vol: .2, filter: 'lowpass' }], lockturn: [{ wave: 'saw', freq: 60, to: 120, dur: 2, vol: .1, vib: [8, .15], filter: 'lowpass' }, { wave: 'square', freq: 90, dur: .1, vol: .2, delay: 1.9 }], shriek: { wave: 'saw', freq: 1200, to: 400, dur: .6, vol: .14, vib: [30, .2] }, gaze: { wave: 'sine', freq: 140, to: 600, dur: 1, vol: .1 },
  ui_move: { wave: 'square', freq: 520, dur: .025, vol: .07 }, ui_ok: { wave: 'square', freq: 660, arp: [0, 5], step: .04, dur: .09, vol: .1 }, ui_back: { wave: 'square', freq: 420, to: 300, dur: .07, vol: .09 }, ui_err: { wave: 'square', freq: 160, dur: .1, vol: .1 }, ui_tab: { wave: 'triangle', freq: 600, dur: .04, vol: .09 },
  gear: [{ wave: 'square', freq: 800, dur: .03, vol: .12 }, { wave: 'square', freq: 1000, dur: .03, vol: .12, delay: .05 }], clockstrike: { wave: 'sine', freq: 440, arp: [0, -5, 0, -5, 7], step: .25, dur: 1.4, vol: .18 }, brace: { wave: 'square', freq: 200, to: 300, dur: .08, vol: .1 }, drip: { wave: 'sine', freq: 1400, to: 900, dur: .06, vol: .05 }, wake: { wave: 'saw', freq: 140, to: 240, dur: .2, vol: .08 }
};
B.SONGS = {
  title: { bpm: 76, steps: 2, tracks: [
    { wave: 'pulse25', vol: .1, notes: 'D4 - F4 A4 G4 - F4 E4 | D4 - - - C4 E4 G4 F4 | E4 - D4 C#4 D4 - - - | A3 - - - . . . .' },
    { wave: 'triangle', vol: .25, notes: 'D2 - - - - - - - | Bb1 - - - - - - - | G1 - - - - - - - | A1 - - - - - - -' },
    { wave: 'sine', vol: .08, notes: 'D5 - - - - - - - | F5 - - - - - - - | E5 - - - D5 - - - | A4 - - - . . . .' }] },
  drains: { bpm: 60, steps: 2, tracks: [
    { wave: 'triangle', vol: .24, notes: 'A1 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -' },
    { wave: 'pulse25', vol: .05, notes: 'A3 . C4 . E4 . . . | D4 . C4 . B3 . . . | A3 . C4 . F4 . E4 . | E4 . . . G#3 . . .' },
    { wave: 'sine', vol: .06, notes: '. . . . . . E5 . | . . . . . . . . | . . . . . . . A5 | . . . . . . . .' },
    { name: 'fight', wave: 'drums', vol: .1, on: false, notes: 'k . h k s . h . | k k h . s . h h' }, { name: 'fightbass', wave: 'saw', vol: .06, on: false, notes: 'A2 A2 . A2 C3 . A2 . | G2 G2 . G2 Bb2 . G2 .' }] },
  tumbler: { bpm: 96, steps: 3, tracks: [
    { wave: 'triangle', vol: .25, notes: 'E2 . B2 E2 . B2 | E2 . B2 G2 . D3 | C2 . G2 C2 . G2 | B1 . F#2 B1 . F#2' },
    { wave: 'pulse12', vol: .05, notes: 'E4 . . G4 . . | B4 . . A4 . . | G4 . . E4 . . | F#4 . . . . .' },
    { wave: 'drums', vol: .06, notes: 'h . h c . h | h . h c . h' },
    { name: 'fight', wave: 'drums', vol: .12, on: false, notes: 'k . h k s h | k k h . s h' }, { name: 'fightbass', wave: 'saw', vol: .07, on: false, notes: 'E2 E2 . E2 G2 . | C2 C2 . C2 E2 .' }] },
  gloam: { bpm: 54, steps: 2, tracks: [
    { wave: 'sine', vol: .14, notes: 'C3 - - - - - - - | F#3 - - - - - - - | C3 - - - - - - - | Bb2 - - - - - - -' },
    { wave: 'sine', vol: .1, notes: 'G4 - - - - - Eb4 - | - - - - D4 - - - | G4 - - - - - A4 - | - - F#4 - - - - -' },
    { wave: 'triangle', vol: .12, notes: 'C2 - - - - - - - | F#1 - - - - - - - | C2 - - - - - - - | G1 - - - - - - -' },
    { name: 'fight', wave: 'drums', vol: .1, on: false, notes: 'k . . k s . h . | k . k . s . h h' }, { name: 'fightbass', wave: 'saw', vol: .06, on: false, notes: 'C2 C2 . C2 Eb2 . C2 . | F#2 F#2 . F#2 A2 . F#2 .' }] },
  vault: { bpm: 138, steps: 4, tracks: [
    { wave: 'saw', vol: .07, notes: 'A2 A2 . A2 C3 . A2 . | G2 G2 . G2 Bb2 . G2 . | F2 F2 . F2 A2 . F2 . | E2 . G#2 . B2 . E3 .' },
    { wave: 'pulse12', vol: .05, notes: 'A4 E5 A5 E5 A4 E5 A5 E5 | G4 D5 G5 D5 G4 D5 G5 D5 | F4 C5 F5 C5 F4 C5 F5 C5 | E4 B4 E5 B4 G#4 B4 E5 B4' },
    { wave: 'drums', vol: .11, notes: 'k . h k s . h . | k k h . s . h h' }, { wave: 'triangle', vol: .25, notes: 'A1 . A1 . A1 . A1 . | G1 . G1 . G1 . G1 . | F1 . F1 . F1 . F1 . | E1 . E1 . E1 . E1 .' }] },
  camp: { bpm: 70, steps: 2, tracks: [
    { wave: 'triangle', vol: .2, notes: 'D3 - F#3 A3 G3 - F#3 E3 | D3 - - - C#3 E3 A3 G3 | F#3 - E3 D3 E3 - - - | D3 - - - . . . .' },
    { wave: 'sine', vol: .08, notes: 'D2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - | D2 - - - - - - -' }] },
  ending: { bpm: 84, steps: 2, tracks: [
    { wave: 'pulse25', vol: .1, notes: 'D4 - F#4 A4 G4 - F#4 E4 | D4 - - - C#4 E4 A4 G4 | F#4 - E4 D4 E4 - A4 - | D5 - - - - - - -' },
    { wave: 'triangle', vol: .24, notes: 'D2 - - - - - - - | G1 - - - - - - - | A1 - - - - - - - | D2 - - - - - - -' },
    { wave: 'sine', vol: .09, notes: 'F#5 - - - A5 - - - | B5 - - - G5 - - - | A5 - - - E5 - - - | D5 - - - - - - -' }] },
  race: { bpm: 150, steps: 4, tracks: [
    { wave: 'pulse25', vol: .08, notes: 'E4 . E4 G4 . A4 . G4 | E4 . E4 G4 . B4 . A4 | D4 . D4 F4 . G4 . F4 | D4 . D4 F4 . A4 . G4' },
    { wave: 'saw', vol: .09, notes: 'E2 . E2 . E2 . E2 . | E2 . E2 . E2 . E2 . | D2 . D2 . D2 . D2 . | D2 . D2 . D2 . D2 .' },
    { wave: 'drums', vol: .1, notes: 'k . h k s . h . | k k h . s . h h' }] }
};
B.STING = { levelUp: { bpm: 140, steps: 2, tracks: [{ wave: 'square', vol: .14, notes: 'C5 E5 G5 C6' }] }, deed: { bpm: 120, steps: 2, tracks: [{ wave: 'square', vol: .14, notes: 'D5 F#5 A5 D6 A5 D6' }] }, gameOver: { bpm: 60, steps: 2, tracks: [{ wave: 'triangle', vol: .24, notes: 'D3 - A2 - F2 - D2 - - -' }] }, victory: { bpm: 120, steps: 2, tracks: [{ wave: 'square', vol: .14, notes: 'D5 - F#5 A5 D6 - - -' }] }, join: { bpm: 150, steps: 2, tracks: [{ wave: 'triangle', vol: .16, notes: 'G4 B4 D5 G5' }] } };
/* ---- the babble: pure plan(), live syllables on WebAudio ---- */
B.VOICES = {
  narrator: { base: 95, range: 3, rate: 9, wave: 'triangle', formant: 1, breath: 0, vib: [4, .01], echo: .2 }, keywarden: { base: 170, range: 4, rate: 12, wave: 'square', formant: 1, breath: 0 }, lintel: { base: 120, range: 5, rate: 10, wave: 'sawtooth', formant: 1, breath: .1 },
  tamsin: { base: 300, range: 7, rate: 15, wave: 'square', formant: 1.1, breath: .1 }, durgan: { base: 105, range: 4, rate: 11, wave: 'square', formant: .85, breath: 0 }, ysolde: { base: 220, range: 5, rate: 9, wave: 'sine', formant: 1, breath: .2, echo: .4 },
  veil: { base: 240, range: 3, rate: 10, wave: 'triangle', formant: 1, breath: .5 }, snick: { base: 260, range: 8, rate: 16, wave: 'square', formant: 1.2, breath: 0 }, boltholder: { base: 70, range: 6, rate: 8, wave: 'sawtooth', formant: .8, breath: 0, echo: .5, ring: 30 },
  human_m: { base: 130, range: 5, rate: 12, wave: 'triangle', formant: 1 }, human_f: { base: 230, range: 5, rate: 13, wave: 'triangle', formant: 1.1 }, dwarf_m: { base: 100, range: 4, rate: 11, wave: 'square', formant: .85 }, elf_f: { base: 270, range: 6, rate: 13, wave: 'sine', formant: 1.15 }, halfling_m: { base: 220, range: 7, rate: 15, wave: 'pulse', formant: 1.1 }
};
B.voiceFor = (m) => B.VOICES[m.voice] || B.VOICES[m.race + '_' + m.sex] || B.VOICES[m.sex === 'f' ? 'human_f' : 'human_m'];
const FORM = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700] };
B.babble = {
  /** plan(text, profile) -> [{ t, pitch, f1, f2, noise, dur, gain }]; deterministic */
  plan(text, pr) {
    const out = []; let t = 0, lastV = 'a', count = 0; const syl = 1 / pr.rate;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i].toLowerCase(), isV = 'aeiou'.includes(ch), isL = /[a-z]/.test(ch);
      if (ch === '.' || ch === '!' || ch === '?') { t += .15; continue; } if (ch === ',') { t += .08; continue; }
      if (!isL) continue; if (isV) lastV = ch;
      count++; if (!isV && count % 2) continue;
      const f = FORM[lastV], semis = (ch.charCodeAt(0) * 7) % (pr.range + 1), pitch = pr.base * Math.pow(2, semis / 12);
      const noise = 'bdgkpt'.includes(ch) ? .01 : 'fsvzh'.includes(ch) ? .04 : 0, hum = 'mn'.includes(ch);
      let p2 = pitch, g = .6; const nxt = text.slice(i).search(/[.!?]/); if (nxt > -1 && nxt < 3) { const e = text[i + nxt]; if (e === '?') p2 *= 1.25; if (e === '!') { p2 *= 1.15; g = .8; } }
      out.push({ t, pitch: p2, f1: f[0] * pr.formant, f2: f[1] * pr.formant, noise, hum, dur: syl * .9, gain: g }); t += syl;
    }
    return out;
  },
  ctx: null, bus: null, lastShown: 0, lastId: null,
  init(game) { this.game = game; },
  bus_() { const a = this.game.audio, c = a.ctx; if (!c) return null; if (this.ctx !== c) { this.ctx = c; this.bus = c.createGain(); this.bus.connect(a.bus('voice') || c.destination); } this.bus.gain.value = a.muted ? 0 : (this.game.settings.voices == null ? .8 : this.game.settings.voices) * 1.4; return this.bus; },
  /** play one syllable event now */
  play(ev, pr) {
    const bus = this.bus_(); if (!bus) return; const c = this.ctx, t0 = c.currentTime + .005, dur = Math.max(.05, ev.dur);
    const osc = c.createOscillator(); osc.type = pr.wave === 'pulse' ? 'square' : pr.wave; osc.frequency.value = ev.pitch; if (pr.vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = pr.vib[0]; lg.gain.value = ev.pitch * pr.vib[1]; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + dur + .05); }
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(ev.gain, t0 + .005); g.gain.setValueAtTime(ev.gain * .6, t0 + dur * .6); g.gain.linearRampToValueAtTime(0, t0 + dur + .03);
    for (const f of [ev.f1, ev.f2]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(f, 8000); bp.Q.value = 8; osc.connect(bp); bp.connect(g); }
    g.connect(bus); osc.start(t0); osc.stop(t0 + dur + .06);
    if (ev.noise) { const n = c.createBufferSource(), len = Math.floor(c.sampleRate * (ev.noise + .01)); const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; n.buffer = buf; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const ng = c.createGain(); ng.gain.value = .25; n.connect(hp); hp.connect(ng); ng.connect(bus); n.start(t0); }
    if (pr.echo) { const dl = c.createDelay(.5); dl.delayTime.value = .14; const eg = c.createGain(); eg.gain.value = pr.echo * .5; g.connect(dl); dl.connect(eg); eg.connect(bus); }
  },
  /** each frame while a dialog types: syllables for newly shown letters */
  track(talk, pr) {
    if (!talk || !talk.open) { this.lastShown = 0; this.lastText = null; return; }
    const pg = talk.pages && talk.pages[talk.i]; const txt = pg ? (Array.isArray(pg) ? pg.join(' ') : String(pg)) : ''; if (this.lastText !== txt || talk.shown < this.lastShown) { this.lastText = txt; this.lastShown = 0; }
    const shown = Math.floor(talk.shown); if (shown > this.lastShown) { const seg = txt.slice(this.lastShown, shown); const evs = this.plan(seg, pr); for (const ev of evs.slice(0, 2)) this.play(ev, pr); this.lastShown = shown; }
  },
  bark(kind, pr, S) { const ev = { pitch: pr.base * (kind === 'hurt' ? 1.4 : 1.2), f1: kind === 'hurt' ? 600 : 800, f2: kind === 'hurt' ? 1000 : 1300, noise: 0, dur: .14, gain: .6 }; this.play(ev, pr); setTimeout(() => this.play(Object.assign({}, ev, { pitch: ev.pitch * (kind === 'hurt' ? .8 : 1.2) }), pr), 120); }
};
/** The music director: a song per floor; the fight layer follows the monsters */
B.Music = {
  game: null, cur: null, fight: false, fightT: 0,
  init(game) { this.game = game; for (const k in B.SFX) game.audio.define(k, B.SFX[k]); },
  play(name, o) { if (this.cur === name) return; this.cur = name; this.fight = false; const s = B.SONGS[name]; if (s) this.game.audio.music(s, Object.assign({ fade: 1 }, o || {})); else this.game.audio.stopMusic(.5); },
  stop() { this.cur = null; this.game.audio.stopMusic(.5); },
  update(dt, engaged) {
    const a = this.game.audio; if (!this.cur || !a.song) return;
    if (engaged) this.fightT = 4; else this.fightT = Math.max(0, this.fightT - dt);
    const on = this.fightT > 0;
    if (on !== this.fight) { this.fight = on; try { a.layer('fight', on ? 1 : 0, .5); a.layer('fightbass', on ? 1 : 0, .5); } catch (e) { } }
  },
  sting(name) { try { this.game.audio.sting(B.STING[name], { duck: .4 }); } catch (e) { } }
};
