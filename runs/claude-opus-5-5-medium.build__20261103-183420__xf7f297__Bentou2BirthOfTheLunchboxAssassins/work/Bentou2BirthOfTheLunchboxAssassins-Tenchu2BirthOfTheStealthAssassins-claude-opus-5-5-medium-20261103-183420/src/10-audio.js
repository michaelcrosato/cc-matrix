/* 10-audio: all music, effects and voices in code. Songs on the engine's step sequencer in Japanese scales (Hirajoshi
 * D E F A Bb, In E F A B C), one song in layers per mission (base / tension / alert); effects as voice lists; and a
 * formant gibberish voice synth (Animalese-style) on the patched voice bus. */
const KOTO = { wave: 'pulse12', pluck: true, ring: 1.2 }, SHAMI = { wave: 'saw', pluck: true, ring: .35 }, SHAKU = { wave: 'sine', attack: .09, vib: [5, .012] };
const FUE = { wave: 'pulse', vib: [6, .015], attack: .03 }, DRONE = { wave: 'triangle' };
const T_ = (o, name, vol, notes, extra) => Object.assign({ name, vol, notes }, o, extra || {});
B.SONGS = {
  title: { bpm: 72, steps: 4, tracks: [
    T_(DRONE, 'drone', .2, 'D3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - - | Bb2 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -'),
    T_(KOTO, 'koto', .13, 'D5 . . . A4 . . . Bb4 . A4 . F4 . . . | E4 . . . F4 . A4 . D5 . . . . . . . | F5 . E5 . D5 . . . Bb4 . A4 . F4 . . . | E4 . F4 . E4 . D4 . . . . . . . . .'),
    T_(SHAKU, 'shaku', .1, '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . A4 - - - Bb4 - A4 - | F4 - - - - - - - E4 - - - D4 - - - | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    T_({ wave: 'drums' }, 'taiko', .08, '. . . . . . . . . . . . k . . . | . . . . . . . . . . . . k . k .')] },
  shop: { bpm: 96, steps: 4, tracks: [
    T_(SHAMI, 'shami', .1, 'E4 . E4 F4 A4 . . . B4 . A4 . F4 . E4 . | E4 . E4 F4 A4 . B4 . C5 . B4 . A4 . . . | F4 . F4 A4 B4 . . . C5 . B4 . A4 . F4 . | E4 . F4 . E4 . . . . . . . . . . .'),
    T_(KOTO, 'koto', .08, 'E3 . . . B3 . . . E3 . . . A3 . . . | F3 . . . C4 . . . E3 . . . B3 . . .'),
    T_({ wave: 'drums' }, 'block', .05, 'c . . . h . . . c . h . h . . .')] },
  results: { bpm: 80, steps: 4, tracks: [
    T_(KOTO, 'koto', .12, 'A4 . D5 . E5 . F5 . E5 . D5 . A4 . . . | Bb4 . A4 . F4 . E4 . D4 . . . . . . .'),
    T_(DRONE, 'drone', .16, 'D3 - - - - - - - - - - - - - - - | Bb2 - - - - - - - A2 - - - - - - -')] },
  ending: { bpm: 66, steps: 4, tracks: [
    T_(SHAKU, 'shaku', .12, 'D5 - - - E5 - - - F#5 - - - A5 - - - | B5 - - - A5 - F#5 - E5 - - - - - - - | D5 - - - B4 - - - A4 - - - B4 - D5 - | E5 - - - - - - - D5 - - - - - - -'),
    T_(KOTO, 'koto', .09, 'D4 F#4 A4 D5 A4 F#4 D4 F#4 B3 D4 F#4 B4 F#4 D4 B3 D4 | G3 B3 D4 G4 D4 B3 G3 B3 A3 C#4 E4 A4 E4 C#4 A3 C#4'),
    T_(DRONE, 'drone', .14, 'D3 - - - - - - - B2 - - - - - - - | G2 - - - - - - - A2 - - - - - - -')] },
  boss: { bpm: 140, steps: 4, tracks: [
    T_({ wave: 'drums' }, 'taiko', .17, 'k . k . s . k k k . s . k s k s'),
    T_(SHAMI, 'shami', .1, 'D4 D4 F4 D4 A4 . Bb4 A4 D4 D4 F4 D4 E4 . D4 . | D4 D4 F4 D4 A4 . D5 Bb4 A4 . F4 . E4 F4 E4 D4'),
    T_(FUE, 'fue', .06, 'D6 - - - . . . . Bb5 - A5 - . . . . | F5 - - - E5 - - - D5 - - - . . . .'),
    T_(DRONE, 'drone', .2, 'D2 . D2 . D2 . D2 . D2 . D2 . C2 . C2 . | Bb1 . Bb1 . Bb1 . Bb1 . A1 . A1 . A1 . A1 .')] }
};
/* mission songs: base layer (drone + koto) always on; tension (shamisen) and alert (taiko + fue) come in by layers */
const missionSong = (bpm, drone, koto, shami, fue, extra = []) => ({ bpm, steps: 4, tracks: [
  T_(DRONE, 'drone', .18, drone), T_(KOTO, 'koto', .1, koto), ...extra,
  T_(SHAMI, 'tension', .09, shami, { on: false }),
  T_({ wave: 'drums' }, 'alertDrum', .16, 'k . . k s . k . k k . k s . k s', { on: false }), T_(FUE, 'alertFue', .06, fue, { on: false })] });
B.SONGS.training = missionSong(84, 'D3 - - - - - - - - - - - - - - - | F3 - - - - - - - E3 - - - - - - -', 'A4 . . . . . D5 . . . . . E5 . . . | F5 . . . E5 . . . D5 . . . . . . . | . . . . Bb4 . . . A4 . . . . . F4 . | E4 . . . . . . . D4 . . . . . . .',
  'D4 . F4 . A4 . F4 . D4 . E4 . F4 . E4 .', 'D6 - . D6 F6 - E6 - D6 - . . A5 - . .');
B.SONGS.m1 = missionSong(90, 'D2 - - - - - - - - - - - - - - - | Bb1 - - - - - - - A1 - - - - - - -', 'D3 . A3 . D4 . A3 . F3 . A3 . E3 . A3 . | D3 . A3 . Bb3 . A3 . F3 . E3 . D3 . . . | . . . . D5 . . . E5 . F5 . E5 . . . | . . . . A4 . . . Bb4 . A4 . F4 . . .',
  'D4 . D4 F4 A4 . F4 . D4 . D4 F4 E4 . D4 .', 'A5 - Bb5 A5 F5 - E5 - D5 - - - . . . .');
B.SONGS.m2 = missionSong(78, 'E2 - - - - - - - - - - - - - - - | F2 - - - - - - - E2 - - - - - - -', 'B5 . . . . . . . C6 . . . . . . . | . . . . A5 . . . . . . . . . . . | E5 . . . . . F5 . . . . . . . B4 . | . . . . . . . . A4 . . . . . . .',
  'E4 . E4 F4 A4 . B4 . A4 . F4 . E4 . F4 .', 'E6 - F6 E6 C6 - B5 - A5 - - - . . . .');
B.SONGS.m3 = missionSong(88, 'D3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -', 'D4 . F4 . A4 . . . Bb4 . A4 . F4 . . . | E4 . F4 . A4 . D5 . . . . . . . . .',
  'D4 F4 A4 F4 D4 F4 A4 F4 E4 F4 A4 F4 E4 F4 D4 .', 'D6 - - Bb5 A5 - F5 - E5 - F5 - D5 - . .',
  [T_(FUE, 'festival', .045, 'A5 - - - D6 - - - Bb5 - A5 - F5 - - - | . . . . . . . . . . . . . . . . | E5 - - - F5 - - - A5 - - - D5 - - - | . . . . . . . . . . . . . . . .'), T_({ wave: 'drums' }, 'festDrum', .06, 'k . . . c . . . k . k . c . . .')]);
B.STINGS = {
  cut: { bpm: 160, steps: 4, loop: false, tracks: [T_(SHAMI, 's', .16, 'D5 A5 D6 - - - - -'), T_({ wave: 'sine', attack: .2 }, 'sw', .1, 'D4 - - - - - - -')] },
  alert: { bpm: 180, steps: 4, loop: false, tracks: [T_(FUE, 's', .12, 'Bb5 A5 Bb5 A5 D6 - - -'), T_({ wave: 'drums' }, 'd', .2, 'k k k . k . . .')] },
  objective: { bpm: 150, steps: 4, loop: false, tracks: [T_(KOTO, 's', .14, 'A4 D5 E5 A5 - - - -')] },
  newTool: { bpm: 150, steps: 4, loop: false, tracks: [T_(KOTO, 's', .14, 'D5 F5 A5 D6 A5 D6 - -')] },
  gameOver: { bpm: 70, steps: 4, loop: false, tracks: [T_(SHAKU, 's', .14, 'A4 - - - F4 - - - E4 - - - D4 - - - - - - -'), T_(DRONE, 'd', .14, 'D2 - - - - - - - - - - - - - - -')] }
};
/* effects */
const SFX = {
  stepDirt: { wave: 'noise', freq: 600, dur: .04, vol: .05, filter: 'lowpass' }, stepGravel: [{ wave: 'noise', freq: 2400, dur: .05, vol: .08 }, { wave: 'noise', freq: 1200, dur: .03, vol: .05, delay: .02 }],
  stepWood: { wave: 'triangle', freq: 180, to: 120, dur: .05, vol: .09 }, stepTatami: { wave: 'noise', freq: 400, dur: .04, vol: .03, filter: 'lowpass' }, splash: [{ wave: 'noise', freq: 900, to: 300, dur: .22, vol: .12 }, { wave: 'noise', freq: 2400, dur: .08, vol: .06 }],
  grappleThrow: { wave: 'noise', freq: 1800, to: 3600, dur: .18, vol: .08 }, clink: [{ wave: 'square', freq: 2400, dur: .05, vol: .08 }, { wave: 'square', freq: 3200, dur: .04, vol: .05, delay: .03 }], zip: { wave: 'saw', freq: 300, to: 900, dur: .25, vol: .05 },
  shuriken: { wave: 'noise', freq: 4000, to: 2000, dur: .12, vol: .06 }, thunk: { wave: 'triangle', freq: 220, to: 90, dur: .08, vol: .14 },
  clash: [{ wave: 'square', freq: 1600, to: 1200, dur: .12, vol: .12 }, { wave: 'noise', freq: 3000, dur: .08, vol: .1 }], parry: [{ wave: 'sine', freq: 1760, dur: .5, vol: .16 }, { wave: 'sine', freq: 2640, dur: .35, vol: .08 }],
  twang: [{ wave: 'saw', freq: 'D4', to: 'D3', dur: .35, vol: .12 }, { wave: 'saw', freq: 'A4', dur: .25, vol: .06 }], thud: { wave: 'triangle', freq: 110, to: 50, dur: .2, vol: .2 },
  bodyDrop: [{ wave: 'noise', freq: 300, dur: .15, vol: .12, filter: 'lowpass' }, { wave: 'triangle', freq: 90, to: 50, dur: .15, vol: .12 }], dive: { wave: 'noise', freq: 700, to: 200, dur: .3, vol: .1 }, bubble: { wave: 'sine', freq: 700, to: 1400, dur: .06, vol: .05 },
  smoke: { wave: 'noise', freq: 500, to: 200, dur: .5, vol: .12 }, caltrop: [{ wave: 'square', freq: 3000, dur: .02, vol: .06 }, { wave: 'square', freq: 2600, dur: .02, vol: .05, delay: .05 }, { wave: 'square', freq: 3400, dur: .02, vol: .05, delay: .09 }],
  crack: [{ wave: 'noise', freq: 3000, dur: .05, vol: .2 }, { wave: 'noise', freq: 2000, dur: .05, vol: .18, delay: .09 }, { wave: 'noise', freq: 2600, dur: .06, vol: .2, delay: .2 }],
  bell: [{ wave: 'sine', freq: 220, dur: 2.4, vol: .22 }, { wave: 'sine', freq: 563, dur: 1.8, vol: .1 }, { wave: 'sine', freq: 1012, dur: 1.2, vol: .06 }, { wave: 'sine', freq: 1431, dur: .8, vol: .04 }],
  bark: [{ wave: 'noise', freq: 900, dur: .07, vol: .14 }, { wave: 'square', freq: 320, to: 220, dur: .09, vol: .1 }], growl: { wave: 'saw', freq: 90, to: 80, dur: .4, vol: .08, vib: [24, .1] },
  crunch: { wave: 'noise', freq: 1500, dur: .08, vol: .07 }, snore: { wave: 'saw', freq: 70, to: 60, dur: .7, vol: .05, vib: [9, .15] }, heartbeat: [{ wave: 'sine', freq: 60, to: 40, dur: .12, vol: .22 }, { wave: 'sine', freq: 55, to: 38, dur: .1, vol: .16, delay: .16 }],
  uiMove: { wave: 'triangle', freq: 900, dur: .03, vol: .06 }, uiConfirm: { wave: 'pulse12', freq: 'A5', dur: .25, vol: .08 }, uiBack: { wave: 'triangle', freq: 400, to: 300, dur: .06, vol: .06 },
  fusuma: { wave: 'noise', freq: 800, to: 400, dur: .25, vol: .06 }, stamp: [{ wave: 'noise', freq: 200, dur: .2, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 80, to: 40, dur: .25, vol: .3 }],
  whistle: { wave: 'sine', freq: 1800, to: 2400, dur: .3, vol: .1 }, eat: [{ wave: 'noise', freq: 1300, dur: .05, vol: .08 }, { wave: 'noise', freq: 1100, dur: .05, vol: .08, delay: .12 }],
  boom: [{ wave: 'noise', freq: 400, to: 60, dur: .6, vol: .3 }, { wave: 'triangle', freq: 70, to: 30, dur: .5, vol: .25 }], whoosh: { wave: 'noise', freq: 1000, to: 3000, dur: .14, vol: .07 },
  roar: [{ wave: 'saw', freq: 110, to: 70, dur: .9, vol: .14, vib: [18, .12] }, { wave: 'noise', freq: 500, dur: .8, vol: .1 }], shing: { wave: 'saw', freq: 2400, to: 4800, dur: .2, vol: .06 },
  thunder: [{ wave: 'noise', freq: 200, to: 60, dur: 1.6, vol: .25, filter: 'lowpass' }], cough: { wave: 'noise', freq: 900, dur: .12, vol: .07 }, lever: [{ wave: 'square', freq: 200, to: 150, dur: .2, vol: .08 }, { wave: 'noise', freq: 800, dur: .2, vol: .06 }]
};
for (const k in SFX) A.define(k, SFX[k]);
B.sfx = (n, o) => A.sfx(n, o);
/* positional effects: quieter with distance from the hero, silent past 260 */
B.sfxAt = (n, x, y, o = {}) => { const h = B.mission && B.mission.hero; const d = h ? Math.hypot(h.x - x, h.y - y) : 0; if (d > 260) return; A.sfx(n, Object.assign({}, o, { vol: (o.vol || 1) * (1 - d / 300) })); };
/* the mission's music mood: tension and alert layers */
B.music = {
  mood: (lv, fade = .6) => { const t = lv >= 1 ? 1 : 0, a = lv >= 2 ? 1 : 0; if (B.music._t !== t) { A.layer('tension', t, t ? fade : 3); B.music._t = t; } if (B.music._a !== a) { A.layer('alertDrum', a, a ? .3 : 4); A.layer('alertFue', a, a ? .6 : 4); B.music._a = a; } },
  play: (id, o) => { B.music._t = B.music._a = 0; A.music(id ? B.SONGS[id] || id : null, o); }
};

/* ---- the gibberish voice: syllables (consonant + vowel groups) through two band-pass formants ---- */
const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2100] };
B.VOICES = {
  granny: { hz: 205, f: 1.05, rate: 9, jit: .06, wave: 'square' }, sojiro: { hz: 108, f: .9, rate: 10, jit: .03, wave: 'sawtooth' }, kaede: { hz: 265, f: 1.12, rate: 13, jit: .03, wave: 'square' },
  takanori: { hz: 140, f: .95, rate: 10, jit: .03, wave: 'sawtooth' }, kurogane: { hz: 82, f: .85, rate: 8, jit: .03, wave: 'sawtooth' }, gonroku: { hz: 72, f: .8, rate: 7, jit: .04, wave: 'sawtooth' },
  hotaru: { hz: 240, f: 1.1, rate: 14, jit: .03, wave: 'square' }, tobei: { hz: 175, f: 1, rate: 15, jit: .04, wave: 'square' }, ittetsu: { hz: 95, f: .85, rate: 9, jit: .03, wave: 'sawtooth' },
  kanemori: { hz: 150, f: .95, rate: 13, jit: .05, wave: 'sawtooth' }, guard: { hz: 120, f: .9, rate: 11, jit: .03, wave: 'sawtooth' }, maid: { hz: 260, f: 1.1, rate: 12, jit: .03, wave: 'square' },
  disciple: { hz: 160, f: 1, rate: 11, jit: .03, wave: 'sawtooth' }, sakubei: { hz: 130, f: .95, rate: 12, jit: .04, wave: 'sawtooth' }
};
const syllables = text => {
  const out = [], s = String(text).toLowerCase(); let cons = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (FORM[ch]) { while (i + 1 < s.length && FORM[s[i + 1]] && s[i + 1] !== ch) i++; out.push({ c: cons, v: ch }); cons = ''; }
    else if (/[a-z]/.test(ch)) cons = (cons + ch).slice(-2);
    else if (/[.,!?;:-]/.test(ch)) { out.push({ pause: ch === ',' ? .12 : .22, mark: ch }); cons = ''; }
  }
  return out;
};
B.Voice = {
  /* speak text in a profile: { vol, pan, pitch } */
  speak(text, who, o = {}) {
    const c = A.ctx; if (!c || !A.voiceBus || A.muted || HEADLESS) return 0;
    const p = typeof who === 'object' ? who : B.VOICES[who] || B.VOICES.guard, syl = syllables(text), n = syl.filter(q => !q.pause).length || 1;
    const q = /\?\s*$/.test(text), bang = /!\s*$/.test(text), vol = (o.vol === undefined ? 1 : o.vol) * (bang ? .16 : .11), pitch = (o.pitch || 1) * (bang ? 1.2 : 1);
    let t = c.currentTime + .02, k = 0; const dur = 1 / p.rate;
    let out = A.voiceBus;
    if (o.pan !== undefined && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = clamp(o.pan, -1, 1); pn.connect(A.voiceBus); out = pn; }
    for (const s of syl) {
      if (s.pause) { t += s.pause; continue; }
      const u = k / n; k++;
      let hz = p.hz * pitch * (1 - .15 * u) * (1 + (crand() * 2 - 1) * p.jit);
      if (q && k >= n - 1) hz *= 1.25;
      const F = FORM[s.v], g = c.createGain(), osc = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), mixg = c.createGain();
      osc.type = p.wave; osc.frequency.setValueAtTime(hz, t); osc.frequency.linearRampToValueAtTime(hz * .97, t + dur);
      f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0] * p.f; f2.frequency.value = F[1] * p.f; f1.Q.value = 6; f2.Q.value = 8;
      osc.connect(f1); osc.connect(f2); f1.connect(mixg); f2.connect(mixg); mixg.gain.value = 2.2; mixg.connect(g); g.connect(out);
      let t0 = t;
      if (/[ptkbdg]/.test(s.c) || /[sfhz]/.test(s.c)) {   // a consonant: a burst of noise before the vowel
        const fric = /[sfhz]/.test(s.c), nb = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(), nd = fric ? .05 : .02;
        nb.buffer = A._noise; nf.type = fric ? 'highpass' : 'bandpass'; nf.frequency.value = fric ? 3500 : 2200; ng.gain.setValueAtTime(vol * .6, t); ng.gain.exponentialRampToValueAtTime(.0005, t + nd);
        nb.connect(nf); nf.connect(ng); ng.connect(out); nb.start(t); nb.stop(t + nd + .02); t0 = t + nd * .6;
      }
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.setValueAtTime(vol, t0 + dur * .7); g.gain.linearRampToValueAtTime(0, t0 + dur * .7 + .025);
      osc.start(t0); osc.stop(t0 + dur + .05); t = t0 + dur;
    }
    return t - c.currentTime;
  },
  /* a dialog's voice: speaks each page as it opens */
  dialog(talk, who) { if (!talk.open) { talk._vp = -1; return; } if (talk._vp !== talk.i) { talk._vp = talk.i; const pg = talk.pages && talk.pages[talk.i]; if (pg) B.Voice.speak(Array.isArray(pg) ? pg.join(' ') : String(pg), who); } },
  /* a bark in the world: quieter with distance, panned by its place on screen */
  bark(text, who, x, y) {
    const h = B.mission && B.mission.hero; if (!h) return;
    const d = Math.hypot(h.x - x, h.y - y); if (d > 220) return;
    let pan = 0; try { const s = game.r && game.r.w ? game.r.w(x, y, 0) : null; if (s) pan = (s[0] / game.W - .5) * 1.4; } catch (e) { pan = 0; }
    B.Voice.speak(text, who, { vol: 1 - d / 240, pan });
  }
};
