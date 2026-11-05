// All sound is code: chip sfx voices, original songs, and an Animalese formant voice synth.
(() => {
const { E } = DQ;
let G = null;
const SFX = {
  stitch: [{ wave: 'triangle', freq: 'C6', to: 'G6', dur: .09, vol: .3 }, { wave: 'square', freq: 'E6', dur: .05, vol: .12 }],
  thud: { wave: 'noise', freq: 220, to: 90, dur: .08, vol: .35 },
  rip: [{ wave: 'noise', freq: 2800, to: 400, dur: .22, vol: .35 }, { wave: 'saw', freq: 220, to: 70, dur: .18, vol: .15 }],
  clink: [{ wave: 'square', freq: 'A6', to: 'E7', dur: .05, vol: .2 }, { wave: 'noise', freq: 4000, dur: .03, vol: .15 }],
  rustle: { wave: 'noise', freq: 1500, to: 800, dur: .12, vol: .2 },
  squeak: { wave: 'square', freq: 900, to: 1500, dur: .1, vol: .2 },
  windup: { wave: 'saw', freq: 140, to: 320, dur: .3, vol: .12 },
  pop: [{ wave: 'sine', freq: 500, to: 120, dur: .14, vol: .35 }, { wave: 'noise', freq: 1800, dur: .05, vol: .2 }],
  twang: [{ wave: 'saw', freq: 260, to: 90, dur: .25, vol: .25 }, { wave: 'noise', freq: 900, to: 200, dur: .1, vol: .2 }],
  ding: [{ wave: 'sine', freq: 'E6', dur: .12, vol: .3 }, { wave: 'sine', freq: 'B6', dur: .2, vol: .25, delay: .08 }],
  harp: { wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12, 16, 19, 24], step: .05, dur: .5, vol: .25 },
  fanfare: { wave: 'square', freq: 'C5', arp: [0, 0, 7, 12, 16, 12, 16, 19], step: .09, dur: .9, vol: .18 },
  levelup: [{ wave: 'square', freq: 'G5', arp: [0, 4, 7, 12, 7, 12, 16, 19, 24], step: .08, dur: 1.1, vol: .18 }, { wave: 'triangle', freq: 'C4', arp: [0, 7, 12], step: .22, dur: .8, vol: .22 }],
  horn: [{ wave: 'saw', freq: 'C3', to: 'G3', dur: .9, vol: .2 }, { wave: 'square', freq: 'G3', dur: .9, vol: .1 }],
  lullaby: { wave: 'sine', freq: 'E5', arp: [0, 4, 2, 0, -3, 0], step: .28, dur: 1.8, vol: .2 },
  chestopen: { wave: 'square', freq: 'C5', arp: [0, 7, 12], step: .06, dur: .3, vol: .18 },
  boom: [{ wave: 'noise', freq: 400, to: 40, dur: .5, vol: .5 }, { wave: 'sine', freq: 90, to: 30, dur: .5, vol: .5 }],
  step: { wave: 'noise', freq: 600, to: 300, dur: .03, vol: .08 },
  tick: { wave: 'square', freq: 1200, dur: .02, vol: .08 }
};
DQ.audio = {
  sfx(name, o) { try { if (G && G.audio) G.audio.sfx(name, o); } catch (e) { } },
  music(name, o) { try { if (!G || !G.audio) return; if (DQ.currentSong === name) return; DQ.currentSong = name; G.audio.music(name ? DQ.SONGS[name] || null : null, { fade: 1, sync: false, ...(o || {}) }); } catch (e) { DQ.err('music', e); } },
  voiceLetter(v, ch) { try { voiceLetter(v, ch); } catch (e) { } }
};
DQ.initAudio = function (game) {
  G = game; for (const [k, v] of Object.entries(SFX)) game.audio.define(k, v);
};
// ---------- Animalese: a formant babble per letter ----------
let vbus = null, lastV = 0;
function voiceLetter(v, ch) {
  const a = G && G.audio; if (!a || !a.ctx || a.muted || a.ctx.state !== 'running') return;
  const c = a.ctx; ch = String(ch).toLowerCase(); if (!/[a-z]/.test(ch)) return;
  const now = c.currentTime; if (now - lastV < .04) return; lastV = now;
  if (!vbus) { vbus = c.createGain(); vbus.connect(a._master || c.destination); }
  const vol = (DQ.settings && DQ.settings.voices != null ? DQ.settings.voices : 1); vbus.gain.value = .55 * vol;
  const idx = ch.charCodeAt(0) - 97, isV = 'aeiouy'.includes(ch);
  const semis = ((idx * 5) % 9) - 3, f0 = v.pitch * Math.pow(2, semis / 12) * (isV ? 1 : 1.08);
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(f0 * (isV ? 1.04 : .92), now + .07);
  const F = { a: 800, e: 500, i: 320, o: 480, u: 350, y: 400 }, fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 5;
  fl.frequency.value = isV ? F[ch] : 900 + (idx % 7) * 260;
  const g = c.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(isV ? .22 : .1, now + .008); g.gain.exponentialRampToValueAtTime(.001, now + (isV ? .075 : .04) / (v.speed || 1) * 1.1);
  o.connect(fl); fl.connect(g); g.connect(vbus); o.start(now); o.stop(now + .12);
}
// ---------- songs (engine step format, 4 steps per beat) ----------
const S = (...bars) => bars.join(' ');
DQ.SONGS = {
  title: { bpm: 92, steps: 4, tracks: [
    { wave: 'pulse', vol: .13, notes: S('E5 - G5 - C6 - B5 -', 'A5 - G5 - E5 - . .', 'F5 - A5 - C6 - D6 -', 'C6 - B5 - G5 - . .', 'E5 - G5 - C6 - E6 -', 'D6 - C6 - A5 - . .', 'F5 - E5 - D5 - G5 -', 'E5 - . . C5 - . . .') },
    { wave: 'triangle', vol: .22, notes: S('C3 . G3 . C3 . G3 .', 'A2 . E3 . A2 . E3 .', 'F2 . C3 . F2 . C3 .', 'G2 . D3 . G2 . D3 .') },
    { wave: 'drums', vol: .12, notes: 'k . . . s . h . k . h . s . h h' }] },
  glen: { bpm: 112, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: S('G5 - A5 G5 E5 - D5 -', 'E5 - G5 - C6 - . .', 'A5 - G5 A5 C6 - B5 -', 'G5 - E5 - D5 - . .', 'G5 - A5 G5 E5 - D5 -', 'E5 - G5 - C6 - E6 -', 'D6 - C6 B5 A5 G5 - E5 -', 'C5 - . . . . . .') },
    { wave: 'triangle', vol: .22, notes: S('C3 . . C3 G2 . . G2', 'C3 . . C3 E3 . . E3', 'F2 . . F2 C3 . . C3', 'G2 . . G2 D3 . . D3') },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . k . h k s . h .' }] },
  night: { bpm: 72, steps: 4, tracks: [
    { wave: 'sine', vol: .2, notes: S('A4 - - - C5 - - -', 'E5 - - - D5 - C5 -', 'A4 - - - B4 - - -', 'G4 - - - . . . .') },
    { wave: 'triangle', vol: .2, notes: S('A2 . . . . . E3 .', 'A2 . . . . . G2 .', 'F2 . . . . . C3 .', 'E2 . . . . . B2 .') }] },
  town: { bpm: 100, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: S('C5 - E5 - G5 - E5 -', 'F5 - A5 - C6 - A5 -', 'G5 - B5 - D6 - B5 -', 'C6 - G5 - E5 - . .', 'A5 - G5 - F5 - E5 -', 'D5 - F5 - A5 - . .', 'G5 - F5 - E5 - D5 -', 'C5 - E5 - C5 - . .') },
    { wave: 'triangle', vol: .2, notes: S('C3 G3 E3 G3 C3 G3 E3 G3', 'F2 C3 A2 C3 F2 C3 A2 C3', 'G2 D3 B2 D3 G2 D3 B2 D3', 'C3 G3 E3 G3 C3 G3 E3 G3') },
    { wave: 'drums', vol: .08, notes: 'k . . . h . . . s . . . h . . .' }] },
  crags: { bpm: 90, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: S('D5 - F5 - A5 - G5 -', 'F5 - E5 - D5 - . .', 'Bb4 - D5 - F5 - E5 -', 'D5 - . . . . . .') },
    { wave: 'triangle', vol: .22, notes: S('D3 . . D3 A2 . . A2', 'D3 . . D3 F3 . . F3', 'Bb2 . . Bb2 F3 . . F3', 'A2 . . A2 E3 . . E3') },
    { wave: 'drums', vol: .1, notes: 'k . . h s . . h' }] },
  quarry: { bpm: 104, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: S('E5 . E5 - G5 - F#5 -', 'E5 . D5 - B4 - . .', 'E5 . E5 - G5 - A5 -', 'B5 - A5 - G5 - . .') },
    { wave: 'saw', vol: .08, notes: S('E3 . . E3 . . E3 .', 'E3 . . E3 . . D3 .', 'C3 . . C3 . . C3 .', 'B2 . . B2 . . B2 .') },
    { wave: 'drums', vol: .12, notes: 'k . h k s . h .' }] },
  fray: { bpm: 78, steps: 4, tracks: [
    { wave: 'sine', vol: .18, notes: S('C5 - - Eb5 - - F#5 -', 'G5 - - - F#5 - Eb5 -', 'C5 - - Eb5 - - D5 -', 'B4 - - - . . . .') },
    { wave: 'triangle', vol: .2, notes: S('C2 . . . . . G2 .', 'C2 . . . . . F#2 .', 'Ab2 . . . . . Eb2 .', 'G2 . . . . . D2 .') }] },
  siege: { bpm: 138, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: S('A4 A4 C5 A4 E5 - D5 -', 'C5 C5 E5 C5 G5 - F5 -', 'F4 F4 A4 F4 C5 - Bb4 -', 'E5 - D5 - C5 - B4 -') },
    { wave: 'saw', vol: .07, notes: S('A2 A2 . A2 A2 . A2 A2', 'C3 C3 . C3 C3 . C3 C3', 'F2 F2 . F2 F2 . F2 F2', 'E2 E2 . E2 E2 . E2 E2') },
    { wave: 'drums', vol: .16, notes: 'k . h k s . h h k k h . s . h h' }] },
  boss: { bpm: 152, steps: 4, tracks: [
    { wave: 'saw', vol: .09, notes: S('E4 E4 G4 E4 B4 - A4 -', 'G4 G4 B4 G4 D5 - C5 -', 'C4 C4 E4 C4 G4 - F#4 -', 'B3 B3 D4 B3 F#4 - E4 -') },
    { wave: 'pulse', vol: .1, notes: S('E5 - . E5 G5 - . G5', 'B5 - A5 - G5 - . .', 'C5 - . C5 E5 - . E5', 'F#5 - G5 - E5 - . .') },
    { wave: 'triangle', vol: .24, notes: S('E2 E2 . E2 E2 . E2 E2', 'G2 G2 . G2 G2 . G2 G2', 'C2 C2 . C2 C2 . C2 C2', 'B1 B1 . B1 B1 . B1 B1') },
    { wave: 'drums', vol: .17, notes: 'k h k h s h k h k k h h s h s s' }] },
  victory: { bpm: 120, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 - E5 - G5 - C6 - . . G5 - C6 - E6 - - - - - - - . . . .' },
    { wave: 'triangle', vol: .22, notes: 'C3 - G3 - C3 - G3 - . . C3 - E3 - G3 - - - - - - - . . . .' }] },
  bee: { bpm: 126, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: S('G5 - B5 - D6 - B5 -', 'A5 - C6 - E6 - C6 -', 'G5 - B5 - D6 - E6 -', 'D6 - B5 - G5 - . .') },
    { wave: 'triangle', vol: .2, notes: S('G2 D3 G2 D3 G2 D3 G2 D3', 'A2 E3 A2 E3 A2 E3 A2 E3', 'G2 D3 G2 D3 G2 D3 G2 D3', 'D3 A3 D3 A3 D3 A3 D3 A3') },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h h' }] }
};
// pick music from the situation
DQ.musicTick = function () {
  const S = DQ.S; if (!S) return;
  let song;
  if (S.mode === 'bee') song = 'bee';
  else if (S.boss && S.boss.hp > 0 && S.boss.state !== 'dead') song = 'boss';
  else if (['prep', 'wave', 'breather', 'boss'].includes(S.siege.phase)) song = 'siege';
  else if (DQ.phase(S.clock.hour) === 'night') song = 'night';
  else song = { plaza: 'town', glen: 'glen', crags: 'crags', quarry: 'quarry', fray: 'fray', lake: 'glen' }[S.regionNow] || 'glen';
  DQ.audio.music(song);
};
})();
