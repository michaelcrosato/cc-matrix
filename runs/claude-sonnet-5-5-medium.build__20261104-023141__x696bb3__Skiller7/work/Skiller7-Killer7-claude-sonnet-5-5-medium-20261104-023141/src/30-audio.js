// Audio, all in code: chip songs, SFX voices, our own laughter synth and Animalese-style gibberish voices.
const AU = S7.audio = { ready: false, amb: null, curSong: null };
const bar = (...s) => s.join(' ');

// ---------------------------------------------------------------- songs (the engine's step sequencer)
S7.songs = {
  title: { bpm: 78, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .16, notes: bar('A3 - - - - - - - E3 - - - - - - -', 'F3 - - - - - - - E3 - - - - - - -', 'A3 - - - - - - - E3 - - - C4 - - -', 'D3 - - - - - - - E3 - - - - - - -') },
    { name: 'lead', wave: 'square', vol: .07, notes: bar('. . . . E5 - - - D5 - . . C5 - - -', 'A4 - - - . . . . C5 - - - D5 - - -', 'E5 - - - . . G5 - E5 - - - D5 - - -', 'C5 - - - A4 - - - E4 - - - . . . .') },
    { name: 'drums', wave: 'drums', vol: .09, notes: bar('k . . . . . h . k . . . . . h .', 'k . . . . . h . k . . . . . h .', 'k . . . . . h . k . . . s . h .', 'k . . . s . . . k . . . s . s s') }] },
  room7: { bpm: 66, steps: 4, tracks: [
    { name: 'box', wave: 'sine', vol: .12, notes: bar('E5 - . G5 - . B5 - . G5 - . E5 - . . .', 'D5 - . F5 - . A5 - . F5 - . D5 - . . .', 'C5 - . E5 - . G5 - . E5 - . C5 - . . .', 'D5 - . F5 - . A5 - . B5 - . . . . . .') },
    { name: 'low', wave: 'triangle', vol: .1, notes: bar('E3 - - - - - - - - - - - - - - -', 'D3 - - - - - - - - - - - - - - -', 'C3 - - - - - - - - - - - - - - -', 'B2 - - - - - - - E3 - - - - - - -') }] },
  hotel: { bpm: 104, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .17, notes: bar('D3 - . D3 F3 - . A3 G3 - . G3 B3 - . D4', 'C3 - . C3 E3 - . G3 A3 - . A3 C4 - . E4', 'F3 - . F3 A3 - . C4 Bb3 - . Bb3 D4 - . F4', 'A2 - . A2 C#3 - . E3 A3 - . G3 E3 - . C#3') },
    { name: 'keys', wave: 'square', vol: .045, notes: bar('. . F4 - . . A4 - . . F4 - . . D4 -', '. . E4 - . . G4 - . . E4 - . . C4 -', '. . A4 - . . C5 - . . A4 - . . F4 -', '. . E4 - . . A4 - . . G4 - . . E4 -') },
    { name: 'drums', wave: 'drums', vol: .06, notes: bar('h . h . s . h . h . h . s . h h', 'h . h . s . h . h . h . s . h .', 'h . h . s . h . h . h . s . h h', 'h . h . s . h h h . h . s . s .') }] },
  village: { bpm: 100, steps: 4, tracks: [
    { name: 'oom', wave: 'triangle', vol: .18, notes: bar('C3 - - - G3 - - - C3 - - - G3 - - -', 'F3 - - - C4 - - - F3 - - - C4 - - -', 'G3 - - - D4 - - - G3 - - - D4 - - -', 'C3 - - - G3 - - - E3 - G3 - C4 - - -') },
    { name: 'pah', wave: 'pulse', vol: .05, notes: bar('. . E4 G4 . . E4 G4 . . E4 G4 . . E4 G4', '. . F4 A4 . . F4 A4 . . F4 A4 . . F4 A4', '. . G4 B4 . . G4 B4 . . G4 B4 . . G4 B4', '. . E4 G4 . . E4 G4 . . E4 G4 . . C5 -') },
    { name: 'horn', wave: 'square', vol: .06, notes: bar('E5 - - - G5 - - - E5 - D5 - C5 - - -', 'F5 - - - A5 - - - F5 - E5 - D5 - - -', 'G5 - - - B5 - - - G5 - F5 - D5 - - -', 'E5 - - - D5 - - - C5 - - - . . . .') }] },
  blackrun: { bpm: 152, steps: 4, tracks: [
    { name: 'arp', wave: 'saw', vol: .05, notes: bar('E4 G4 B4 E5 B4 G4 E4 G4 B4 E5 B4 G4 E4 G4 B4 E5', 'D4 F4 A4 D5 A4 F4 D4 F4 A4 D5 A4 F4 D4 F4 A4 D5', 'C4 E4 G4 C5 G4 E4 C4 E4 G4 C5 G4 E4 C4 E4 G4 C5', 'D4 F4 A4 D5 A4 F4 B3 D4 F4 B4 F4 D4 B3 D4 F4 B4') },
    { name: 'bass', wave: 'triangle', vol: .18, notes: bar('E2 - E2 E2 - E2 E2 - E2 - E2 E2 - E2 G2 -', 'D2 - D2 D2 - D2 D2 - D2 - D2 D2 - D2 F2 -', 'C2 - C2 C2 - C2 C2 - C2 - C2 C2 - C2 E2 -', 'B1 - B1 B1 - B1 B1 - D2 - D2 D2 - E2 F2 G2') },
    { name: 'drums', wave: 'drums', vol: .09, notes: bar('k . h . s . h . k . h k s . h .', 'k . h . s . h . k . h k s . h h', 'k . h . s . h . k . h k s . h .', 'k . h . s . s . k k h . s s s s') }] },
  boss1: { bpm: 144, steps: 4, tracks: [
    { name: 'bells', wave: 'sine', vol: .12, notes: bar('E5 - - - - - E5 - - - B5 - - - - -', 'E5 - - - - - E5 - - - A5 - - - - -', 'D5 - - - - - D5 - - - A5 - - - - -', 'B4 - - - D5 - E5 - G5 - B5 - - - - -') },
    { name: 'bass', wave: 'saw', vol: .09, notes: bar('E2 E2 - E2 E2 - E2 E2 E2 E2 - E2 G2 - A2 -', 'E2 E2 - E2 E2 - E2 E2 E2 E2 - E2 G2 - A2 -', 'D2 D2 - D2 D2 - D2 D2 D2 D2 - D2 F2 - G2 -', 'B1 B1 - B1 B1 - B1 B1 B1 B1 - D2 E2 - G2 -') },
    { name: 'drums', wave: 'drums', vol: .1, notes: bar('k . . k s . . k k . . k s . k .', 'k . . k s . . k k . . k s . k k', 'k . . k s . . k k . . k s . k .', 'k k . k s . s k k k s k s s s s') }] },
  boss2: { bpm: 132, steps: 4, tracks: [
    { name: 'choir', wave: 'saw', vol: .06, notes: bar('A3 - - - - - - - C4 - - - - - - -', 'F3 - - - - - - - A3 - - - - - - -', 'G3 - - - - - - - B3 - - - - - - -', 'E3 - - - - - - - G#3 - - - B3 - - -') },
    { name: 'bass', wave: 'square', vol: .08, notes: bar('A1 . A1 A1 . A1 A1 . A1 . A1 A1 . C2 D2 .', 'F1 . F1 F1 . F1 F1 . F1 . F1 F1 . A1 C2 .', 'G1 . G1 G1 . G1 G1 . G1 . G1 G1 . B1 D2 .', 'E1 . E1 E1 . E1 E1 . E1 . G#1 G#1 . B1 B1 .') },
    { name: 'drums', wave: 'drums', vol: .11, notes: bar('k . h . s . h k k . h . s . h .', 'k . h . s . h k k . h . s . h .', 'k . h . s . h k k . h . s . h k', 'k . k . s . k k s s k k s s s s') }] },
  credits: { bpm: 72, steps: 4, tracks: [
    { name: 'a', wave: 'triangle', vol: .15, notes: bar('C3 - - - G3 - - - A3 - - - E3 - - -', 'F3 - - - C4 - - - G3 - - - D4 - - -') },
    { name: 'b', wave: 'sine', vol: .1, notes: bar('E5 - - - D5 - - - C5 - - - E5 - - -', 'A5 - - - G5 - - - F5 - - - D5 - - -') }] }
};
S7.cueSong = { title: 'title', room7: 'room7', hotel: 'hotel', village: 'village', blackrun: 'blackrun', boss1: 'boss1', boss2: 'boss2', credits: 'credits', none: null };
AU.music = function (cue) {
  const g = S7.game; if (!g) return; const name = S7.cueSong[cue];
  if (AU.curSong === cue) return; AU.curSong = cue;
  try { if (name === null || name === undefined) g.audio.music(null); else g.audio.music(S7.songs[name], { sync: true, fade: 1 }); } catch (e) { S7.fail('music', e); }
};

// ---------------------------------------------------------------- SFX voices
AU.defineAll = function (audio) {
  const d = (n, v) => audio.define(n, v);
  d('shot_rev', [{ wave: 'noise', dur: .13, vol: .34, to: 'C3' }, { wave: 'saw', freq: 'A2', to: 'A1', dur: .16, vol: .3 }]);
  d('shot_pole', [{ wave: 'noise', dur: .05, vol: .2 }, { wave: 'square', freq: 'E5', to: 'E3', dur: .06, vol: .14 }]);
  d('shot_rifle', [{ wave: 'noise', dur: .3, vol: .4, to: 'C2' }, { wave: 'saw', freq: 'E2', to: 'E1', dur: .4, vol: .3 }]);
  d('shot_shotgun', [{ wave: 'noise', dur: .35, vol: .5, to: 'C2' }, { wave: 'square', freq: 'A1', to: 'A1', dur: .3, vol: .26 }]);
  d('shot_horn', [{ wave: 'saw', freq: 'D2', to: 'D3', dur: .5, vol: .3, vib: [9, .02] }, { wave: 'triangle', freq: 'A2', dur: .5, vol: .24 }]);
  d('shot_cam', [{ wave: 'noise', dur: .05, vol: .3 }, { wave: 'square', freq: 'A6', to: 'A4', dur: .15, vol: .15 }]);
  d('shot_launch', [{ wave: 'saw', freq: 'C3', to: 'C2', dur: .4, vol: .3 }, { wave: 'noise', dur: .3, vol: .3 }]);
  d('thaw', [{ wave: 'triangle', freq: 'C5', to: 'C6', dur: .12, vol: .2 }, { wave: 'sine', freq: 'G5', to: 'G6', dur: .25, vol: .16, delay: .06 }, { wave: 'noise', dur: .35, vol: .08, delay: .05 }]);
  d('crit', [{ wave: 'square', freq: 'E6', dur: .05, vol: .16 }, { wave: 'square', freq: 'B6', dur: .2, vol: .16, delay: .05 }, { wave: 'sine', freq: 'E7', dur: .4, vol: .12, delay: .08 }]);
  d('hitbody', [{ wave: 'noise', dur: .06, vol: .16 }, { wave: 'square', freq: 'A3', to: 'A2', dur: .08, vol: .12 }]);
  d('clank', [{ wave: 'square', freq: 'F5', to: 'E5', dur: .09, vol: .12 }, { wave: 'noise', dur: .03, vol: .14 }]);
  d('scan', [{ wave: 'sine', freq: 'C3', to: 'C6', dur: .6, vol: .26 }, { wave: 'triangle', freq: 'G3', to: 'G6', dur: .7, vol: .12, delay: .05 }, { wave: 'noise', dur: .5, vol: .05, delay: .1 }]);
  d('scanping', [{ wave: 'sine', freq: 'A6', dur: .12, vol: .13 }]);
  d('hurt', [{ wave: 'saw', freq: 'A2', to: 'A1', dur: .25, vol: .3 }, { wave: 'noise', dur: .25, vol: .25 }]);
  d('boom', [{ wave: 'noise', dur: .6, vol: .5, to: 'C2' }, { wave: 'saw', freq: 'C2', to: 'C1', dur: .6, vol: .4 }]);
  d('freeze', [{ wave: 'sine', freq: 'C7', to: 'C4', dur: .8, vol: .2 }, { wave: 'noise', dur: .5, vol: .18, to: 'C5' }, { wave: 'triangle', freq: 'E6', dur: .9, vol: .1, delay: .1, vib: [20, .05] }]);
  d('rescue', [{ wave: 'noise', dur: .1, vol: .2 }, { wave: 'square', freq: 'C5', dur: .1, vol: .12, delay: .15 }, { wave: 'square', freq: 'G5', dur: .1, vol: .12, delay: .3 }, { wave: 'square', freq: 'C6', dur: .25, vol: .14, delay: .45 }]);
  d('switch', [{ wave: 'triangle', freq: 'C4', to: 'C5', dur: .15, vol: .2 }, { wave: 'triangle', freq: 'G4', to: 'G5', dur: .2, vol: .18, delay: .1 }, { wave: 'sine', freq: 'C6', dur: .3, vol: .12, delay: .2 }]);
  d('ringon', [{ wave: 'sine', freq: 'C3', to: 'G3', dur: .35, vol: .2 }]);
  d('select', [{ wave: 'square', freq: 'E5', dur: .04, vol: .1 }]);
  d('confirm2', [{ wave: 'square', freq: 'E5', dur: .05, vol: .12 }, { wave: 'square', freq: 'B5', dur: .09, vol: .12, delay: .05 }]);
  d('deny', [{ wave: 'square', freq: 'E3', dur: .1, vol: .16 }, { wave: 'square', freq: 'C3', dur: .16, vol: .16, delay: .1 }]);
  d('reload', [{ wave: 'noise', dur: .04, vol: .16 }, { wave: 'square', freq: 'C4', dur: .05, vol: .1, delay: .25 }, { wave: 'noise', dur: .06, vol: .2, delay: .5 }]);
  d('empty', [{ wave: 'square', freq: 'C3', dur: .04, vol: .1 }]);
  d('pickup_red', [{ wave: 'sine', freq: 'C6', to: 'G6', dur: .1, vol: .18 }, { wave: 'sine', freq: 'E6', dur: .15, vol: .12, delay: .06 }]);
  d('pickup_rime', [{ wave: 'triangle', freq: 'E6', dur: .08, vol: .14 }, { wave: 'triangle', freq: 'A6', dur: .08, vol: .14, delay: .07 }, { wave: 'sine', freq: 'E7', dur: .2, vol: .1, delay: .14 }]);
  d('pickup_item', [{ wave: 'square', freq: 'C5', dur: .08, vol: .14 }, { wave: 'square', freq: 'E5', dur: .08, vol: .14, delay: .08 }, { wave: 'square', freq: 'G5', dur: .08, vol: .14, delay: .16 }, { wave: 'square', freq: 'C6', dur: .22, vol: .16, delay: .24 }]);
  d('gate_open', [{ wave: 'saw', freq: 'C2', to: 'C3', dur: .5, vol: .2 }, { wave: 'square', freq: 'G4', dur: .1, vol: .12, delay: .3 }, { wave: 'square', freq: 'D5', dur: .25, vol: .12, delay: .4 }]);
  d('glass', [{ wave: 'noise', dur: .5, vol: .3, to: 'C6' }, { wave: 'sine', freq: 'A6', to: 'E7', dur: .4, vol: .14 }]);
  d('bell', [{ wave: 'sine', freq: 'E5', dur: 1.2, vol: .3 }, { wave: 'sine', freq: 'B5', dur: .9, vol: .16 }, { wave: 'square', freq: 'E6', dur: .5, vol: .06 }]);
  d('cut', [{ wave: 'noise', dur: .025, vol: .08 }]);
  d('step', [{ wave: 'noise', dur: .04, vol: .05, to: 'C4' }]);
  d('wax', [{ wave: 'triangle', freq: 'G4', dur: .1, vol: .14 }, { wave: 'triangle', freq: 'D5', dur: .1, vol: .14, delay: .08 }, { wave: 'sine', freq: 'G5', dur: .3, vol: .12, delay: .16 }]);
  d('chime', [{ wave: 'sine', freq: 'G5', dur: .6, vol: .22 }, { wave: 'sine', freq: 'E5', dur: .8, vol: .2, delay: .22 }, { wave: 'sine', freq: 'C5', dur: 1.2, vol: .22, delay: .46 }]);
  d('cuckoo', [{ wave: 'sine', freq: 'E5', dur: .18, vol: .22 }, { wave: 'sine', freq: 'C5', dur: .3, vol: .22, delay: .24 }]);
  d('skill', [{ wave: 'saw', freq: 'C4', to: 'C6', dur: .3, vol: .16 }, { wave: 'sine', freq: 'G5', dur: .4, vol: .12, delay: .1 }]);
  d('rain', [{ wave: 'sine', freq: 'C6', dur: .06, vol: .14 }, { wave: 'sine', freq: 'E6', dur: .06, vol: .14, delay: .06 }, { wave: 'sine', freq: 'G6', dur: .06, vol: .14, delay: .12 }, { wave: 'sine', freq: 'C7', dur: .2, vol: .14, delay: .18 }, { wave: 'noise', dur: .5, vol: .06, delay: .1 }]);
  d('flash', [{ wave: 'noise', dur: .2, vol: .35, to: 'C7' }, { wave: 'sine', freq: 'C7', to: 'C5', dur: .4, vol: .14 }]);
  d('echo', [{ wave: 'saw', freq: 'D3', dur: .6, vol: .24, vib: [8, .03] }, { wave: 'sine', freq: 'D4', dur: .8, vol: .2, delay: .15 }, { wave: 'sine', freq: 'D5', dur: 1, vol: .14, delay: .3 }]);
  d('throw', [{ wave: 'noise', dur: .18, vol: .1, to: 'C5' }]);
  d('splat', [{ wave: 'noise', dur: .12, vol: .14, to: 'C3' }]);
  d('lift', [{ wave: 'square', freq: 'C2', dur: .05, vol: .1 }]);
  d('card', [{ wave: 'saw', freq: 'C2', to: 'C3', dur: .8, vol: .2 }, { wave: 'square', freq: 'C4', dur: .2, vol: .1, delay: .6 }]);
  d('win', [{ wave: 'square', freq: 'C5', dur: .12, vol: .16 }, { wave: 'square', freq: 'E5', dur: .12, vol: .16, delay: .12 }, { wave: 'square', freq: 'G5', dur: .12, vol: .16, delay: .24 }, { wave: 'square', freq: 'C6', dur: .5, vol: .18, delay: .36 }]);
  d('go', [{ wave: 'square', freq: 'C6', dur: .4, vol: .18 }]);
  d('count', [{ wave: 'square', freq: 'C5', dur: .15, vol: .16 }]);
};
AU.sfx = (name, o) => { const g = S7.game; if (!g || !g.audio) return; try { g.audio.sfx(name, o); } catch (e) { /* silent */ } };
const ctxOf = () => { const g = S7.game; if (!g || !g.audio || typeof window === 'undefined') return null; const a = g.audio; return a.ctx || a._init(); };

// ---------------------------------------------------------------- laughter: our own WebAudio synth, panned to the Whiteout
const LAUGH = {
  giggle: { f0: 520, n: 6, gap: .085, dur: .06, f1: [900, 2400], drop: .96 },
  chuckle: { f0: 230, n: 4, gap: .14, dur: .1, f1: [600, 1100], drop: .93 },
  whoop: { f0: 380, n: 5, gap: .075, dur: .06, f1: [1000, 2600], drop: 1.07 },
  boom: { f0: 110, n: 3, gap: .3, dur: .22, f1: [400, 900], drop: .9 },
  trill: { f0: 430, n: 9, gap: .06, dur: .045, f1: [800, 2200], drop: 1.0 }
};
AU.laugh = function (style, pan, loud, pitch = 1) {
  const c = ctxOf(); if (!c || c.state !== 'running') return; const a = S7.game.audio, L = LAUGH[style] || LAUGH.giggle;
  const vol = S7.clamp(loud, 0, 1) * .5 * S7.T('laughLoud'); if (vol < .01) return;
  const t0 = c.currentTime + .01, panner = c.createStereoPanner ? c.createStereoPanner() : null;
  const out = c.createGain(); out.gain.value = vol; if (panner) { panner.pan.value = S7.clamp(pan, -1, 1); out.connect(panner); panner.connect(a._sfxBus); } else out.connect(a._sfxBus);
  let f = L.f0 * pitch;
  for (let i = 0; i < L.n; i++) {
    const t = t0 + i * L.gap * (1 + (S7.R('fx')() - .5) * .2), o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.15, t); o.frequency.exponentialRampToValueAtTime(f, t + L.dur);
    bp.type = 'bandpass'; bp.Q.value = 3.5; bp.frequency.value = L.f1[i % 2];
    const amp = Math.pow(.86, i); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + L.dur + .03);
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + L.dur + .05); f *= L.drop;
  }
};
AU.bearing = function (x, y) {   // -1 left .. 1 right of the camera
  const c = S7.st.cam, yaw = Math.atan2(c.ly - c.y, c.lx - c.x), dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) || 1;
  return (dx * -Math.sin(yaw) + dy * Math.cos(yaw)) / d;
};

// ---------------------------------------------------------------- Animalese: each letter is a short pitched blip
const VOICES = {
  murmel: { base: 400, wob: .35, rate: 1.4, wave: 'square' }, oma: { base: 180, wob: .4, rate: .9, wave: 'triangle' }, rosalind: { base: 300, wob: .15, rate: 1, wave: 'triangle' },
  pim: { base: 520, wob: .3, rate: 1.1, wave: 'sine' }, concierge: { base: 140, wob: .08, rate: .85, wave: 'sawtooth' }, grau: { base: 85, wob: .12, rate: .8, wave: 'sawtooth' },
  king: { base: 60, wob: .1, rate: .6, wave: 'sawtooth' }, sweep: { base: 220, wob: .05, rate: 1, wave: 'square' }, foehn: { base: 110, wob: .6, rate: 1.2, wave: 'sawtooth' }, narrator: { base: 200, wob: .2, rate: 1, wave: 'triangle' }
};
Object.assign(S7.reg.voices, VOICES);
const voiceOf = who => S7.reg.voices[who] || (S7.reg.personas[who] && Object.assign({ wave: 'square' }, S7.reg.personas[who].voice)) || VOICES.narrator;
let lastBlip = 0;
AU.speak = function (who, ch) {
  const c = ctxOf(); if (!c || c.state !== 'running' || !ch || ch === ' ') return;
  const v = voiceOf(who), code = ch.toLowerCase().charCodeAt(0);
  if (!(code >= 97 && code <= 122) && !(code >= 48 && code <= 57)) return;
  const now = c.currentTime; if (now - lastBlip < .035) return; lastBlip = now;
  const idx = code - 97, vowel = 'aeiou'.includes(ch.toLowerCase()), pitch = v.base * Math.pow(2, ((idx * 7) % 12 - 5) / 12 * (1 + v.wob) / 1.6) * (vowel ? 1.12 : .95);
  const o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain(), dur = (vowel ? .075 : .045) / v.rate;
  o.type = v.wave || 'square'; o.frequency.setValueAtTime(pitch, now); o.frequency.linearRampToValueAtTime(pitch * (vowel ? 1.08 : .88), now + dur);
  bp.type = 'bandpass'; bp.frequency.value = vowel ? 700 + (idx % 5) * 260 : 1800; bp.Q.value = 1.8;
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.2, now + .006); g.gain.exponentialRampToValueAtTime(.001, now + dur);
  o.connect(bp); bp.connect(g); g.connect(S7.game.audio._sfxBus); o.start(now); o.stop(now + dur + .02);
};

// ---------------------------------------------------------------- ambience: wind, hotel hum, the shaft
AU.ambience = function (kind) {
  const c = ctxOf(); if (!c) return; if (AU.ambKind === kind) return;
  if (AU.amb) { try { AU.amb.g.gain.linearRampToValueAtTime(0, c.currentTime + .8); const old = AU.amb; setTimeout(() => { try { old.src.stop(); } catch (e) { /* done */ } }, 1000); } catch (e) { /* done */ } AU.amb = null; }
  AU.ambKind = kind; if (!kind) return;
  const a = S7.game.audio; if (!a._noise) return;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  src.buffer = a._noise; src.loop = true; f.type = 'lowpass'; f.frequency.value = kind === 'wind' ? 500 : kind === 'shaft' ? 220 : 160; f.Q.value = kind === 'wind' ? 2 : .7;
  g.gain.value = 0; g.gain.linearRampToValueAtTime(kind === 'wind' ? .09 : .045, c.currentTime + 1.2);
  lfo.frequency.value = kind === 'wind' ? .13 : .07; lg.gain.value = kind === 'wind' ? 280 : 40; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  src.connect(f); f.connect(g); g.connect(a._sfxBus); src.start(); AU.amb = { src, g };
};

// ---------------------------------------------------------------- listeners: the bus drives all sound
AU.wire = function () {
  const B = S7.bus, sfx = AU.sfx;
  B.on('shot', d => { const w = S7.reg.weapons[d.weapon]; sfx(w.sfx); });
  B.on('hit', d => { if (d.part === 'shield') sfx('clank'); else if (d.part === 'body') sfx('hitbody'); });
  B.on('crit', () => sfx('crit'));
  B.on('kill', d => { sfx('thaw'); });
  B.on('explode', d => sfx(d.big ? 'boom' : d.source === 'whiteout' ? 'boom' : 'boom', { vol: d.big ? 1 : .7 }));
  B.on('scan', () => sfx('scan'));
  B.on('hurt', () => sfx('hurt'));
  B.on('freeze', () => sfx('freeze'));
  B.on('rescue', () => sfx('rescue'));
  B.on('switch', () => sfx('switch'));
  B.on('ringon', () => sfx('ringon'));
  B.on('select', () => sfx('select'));
  B.on('deny', () => sfx('deny'));
  B.on('reload', () => sfx('reload'));
  B.on('pickup', d => sfx(d.kind === 'red' ? 'pickup_red' : d.kind === 'rime' ? 'pickup_rime' : 'pickup_item'));
  B.on('gate', d => { if (d.ok) sfx(d.how === 'echo' ? 'glass' : 'gate_open'); });
  B.on('skill', d => sfx(d.skill === 'echo' ? 'echo' : d.skill === 'rain' ? 'rain' : d.skill === 'flash' ? 'flash' : 'skill'));
  B.on('throw', () => sfx('throw'));
  B.on('splat', () => sfx('splat'));
  B.on('bossring', d => sfx('bell'));
  B.on('card', () => sfx('card'));
  B.on('wax', () => sfx('wax'));
  B.on('cut', () => sfx('cut'));
  B.on('save', () => sfx('chime'));
  B.on('music', d => AU.music(d.cue));
  B.on('talkchar', d => AU.speak(d.who, d.ch));
  B.on('laugh', d => { if (S7.st.mode === 'talk' || S7.st.mode === 'cutscene') return; AU.laugh(d.style, AU.bearing(d.x, d.y), d.loud * (d.enemy.visible > 0 ? 1 : 1.0), .9 + (d.enemy.id % 5) * .06); });
  B.on('area', d => { const A = S7.reg.areas[d.to]; if (!A) return; AU.music(A.music); AU.ambience(A.ambience === 'wind' ? 'wind' : A.ambience === 'shaft' ? 'shaft' : A.ambience === 'hotel' ? 'hum' : 'hum'); });
  B.on('echo', d => { if (d.kind === 'go') sfx('go'); if (d.kind === 'finish') sfx('win'); });
};
