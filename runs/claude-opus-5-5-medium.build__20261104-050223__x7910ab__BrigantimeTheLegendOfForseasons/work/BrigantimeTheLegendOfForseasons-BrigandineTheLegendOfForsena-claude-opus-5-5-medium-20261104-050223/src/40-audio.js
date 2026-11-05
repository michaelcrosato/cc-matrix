/* ---- AUDIO: all code, no files. Songs in the engine's { bpm, steps, tracks } format around the Wheel motif
 * (D A G A | F E D), stings, custom sound effects through audio.define, and the Animalese babble voice ---- */
const rep = (s, n) => Array(n).fill(s).join(' | ');
G.SONGS = {
  title: { bpm: 92, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .1, notes: 'D5 - - - A5 - - - G5 - - - A5 - - - | F5 - - - E5 - - - D5 - - - - - - - | D5 - - - A5 - - - G5 - A5 - C6 - - - | A5 - - - G5 - F5 - E5 - - - - - . . | F5 - - - G5 - - - A5 - - - D6 - - - | C6 - - - A5 - - - G5 - - - - - - - | F5 - E5 - D5 - - - E5 - F5 - G5 - - - | A5 - - - - - - - . . . . . . . .' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: rep('D3 - . D3 A2 - . A2 C3 - . C3 G2 - . G2', 4) },
    { name: 'pad', wave: 'saw', vol: .035, notes: rep('D4 - - - - - - - - - - - - - - - | C4 - - - - - - - - - - - - - - -', 2) + ' | ' + rep('Bb3 - - - - - - - - - - - - - - - | A3 - - - - - - - - - - - - - - -', 2) },
    { name: 'drums', wave: 'drums', vol: .07, notes: 'k . . . h . . . s . . . h . . k' }] },
  spring: { bpm: 104, steps: 4, tracks: [
    { wave: 'pulse12', vol: .09, notes: 'F5 - A5 - C6 - A5 - B5 - - - G5 - - - | E5 - G5 - C6 - B5 - A5 - - - - - . . | F5 - C6 - A5 - G5 - A5 - B5 - C6 - - - | G5 - F5 - E5 - G5 - F5 - - - - - . .' },
    { wave: 'triangle', vol: .22, notes: rep('F3 - . F3 C3 - . C3 G3 - . G3 C3 - . E3', 4) },
    { wave: 'drums', vol: .05, notes: 'k . h . h . h . k . h . h . h h' }] },
  summer: { bpm: 116, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'A4 - - E5 - - A5 - G5 - E5 - D5 - - - | E5 - - A5 - - B5 - C#6 - B5 - A5 - - - | G5 - - D5 - - G5 - F#5 - E5 - D5 - - - | E5 - C#5 - A4 - B4 - A4 - - - - - . .' },
    { wave: 'triangle', vol: .24, notes: rep('A2 . A2 . E3 . A2 . G2 . G2 . D3 . G2 .', 4) },
    { wave: 'drums', vol: .07, notes: 's . s s k . s . s . s s k . s s' }] },
  autumn: { bpm: 96, steps: 3, tracks: [
    { wave: 'triangle', vol: .15, notes: 'E5 - - G5 - - B5 - - A5 - - | G5 - - F#5 - - E5 - - - - - | D5 - - F#5 - - A5 - - G5 - - | F#5 - - E5 - - D#5 - - - - -' },
    { wave: 'saw', vol: .035, notes: 'E4 - - G4 - - B4 - - C5 - - | B4 - - A4 - - G4 - - - - - | D4 - - F#4 - - A4 - - B4 - - | A4 - - G4 - - F#4 - - - - -' },
    { wave: 'triangle', vol: .2, notes: 'E2 . . B2 . . E3 . . A2 . . | C3 . . G2 . . E2 . . B2 . . | D2 . . A2 . . D3 . . G2 . . | B2 . . F#2 . . B1 . . . . .' },
    { wave: 'drums', vol: .04, notes: 'k . . h . . h . .' }] },
  winter: { bpm: 72, steps: 4, tracks: [
    { wave: 'sine', vol: .11, notes: 'B5 - - - - - F#5 - - - - - D5 - - - | E5 - - - - - - - C#5 - - - - - - - | B4 - - - D5 - - - F#5 - - - A5 - - - | G5 - - - F#5 - - - - - - - - - - -' },
    { wave: 'pulse12', vol: .04, notes: 'B6 . . . . . . . F#6 . . . . . . . | . . . . E6 . . . . . . . . . . .' },
    { wave: 'sine', vol: .08, notes: rep('B2 - - - - - - - - - - - - - - - | G2 - - - - - - - - - - - - - - -', 2) }] },
  battle_attack: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .08, notes: 'D5 - D5 - A5 - - - G5 - A5 - F5 - - - | E5 - D5 - C5 - D5 - A4 - - - - - . . | D5 - F5 - A5 - D6 - C6 - A5 - G5 - - - | F5 - E5 - D5 - E5 - D5 - - - - - . .' },
    { name: 'bass', wave: 'saw', vol: .07, notes: rep('D2 D2 D3 D2 D2 D3 D2 D3 C2 C2 C3 C2 Bb1 Bb2 A1 A2', 4) },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . s . k k s . k . s . k k s s' },
    { name: 'tension', wave: 'pulse', vol: .05, on: false, notes: rep('D6 . D6 . C#6 . C#6 . D6 . D6 . Eb6 . D6 .', 4) }] },
  battle_defend: { bpm: 128, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .09, notes: 'G4 - Bb4 - D5 - - - C5 - Bb4 - A4 - - - | Bb4 - A4 - G4 - D4 - G4 - - - - - . . | Eb5 - D5 - C5 - Bb4 - A4 - Bb4 - C5 - - - | D5 - C5 - Bb4 - A4 - G4 - - - - - . .' },
    { name: 'bass', wave: 'triangle', vol: .25, notes: rep('G2 . G2 . D3 . G2 . Eb2 . Eb2 . D2 . D2 .', 4) },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . o . s . o o k . o . s . t t' },
    { name: 'tension', wave: 'saw', vol: .04, on: false, notes: rep('G5 . F#5 . G5 . F#5 . G5 . A5 . Bb5 . A5 .', 4) }] },
  hourless: { bpm: 100, steps: 4, tracks: [
    { wave: 'saw', vol: .05, notes: 'C5 - - - B4 - - - Bb4 - - - A4 - - - | Ab4 - - - G4 - - - F#4 - - - G4 - - - | C5 - - - Eb5 - - - D5 - - - C5 - - - | B4 - - - - - - - G4 - - - - - - -' },
    { wave: 'triangle', vol: .2, notes: rep('C2 - . . G1 - . . C2 - . . G1 - . .', 4) },
    { wave: 'drums', vol: .06, notes: 'c . c . c . c . c . c . c . c .' }] },
  boss: { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .08, notes: 'E5 - F5 - E5 - D5 - E5 - - B4 - C5 - | E5 - F5 - G5 - F5 - E5 - - - . . | B5 - A5 - G5 - F5 - E5 - F5 - - E5 - | D5 - C5 - B4 - C5 - E5 - - - . .' },
    { name: 'saw', wave: 'saw', vol: .05, notes: rep('E3 E3 F3 E3 E3 B2 C3 B2 E3 E3 F3 G3 F3', 4) },
    { name: 'bass', wave: 'triangle', vol: .25, notes: rep('E2 . E2 E2 . F2 E2 . E2 . D2 . E2', 4) },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . s k k . s . k k s . s' }] },
  event: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'D5 - - - A4 - - - G4 - - - A4 - - - | F4 - - - E4 - - - D4 - - - - - - - | F4 - - - A4 - - - C5 - - - Bb4 - - - | A4 - - - - - - - - - - - - - - -' },
    { wave: 'pulse12', vol: .04, notes: rep('D4 - F4 - A4 - F4 - C4 - E4 - G4 - E4 -', 2) + ' | ' + rep('Bb3 - D4 - F4 - D4 - A3 - C#4 - E4 - C#4 -', 2) },
    { wave: 'triangle', vol: .16, notes: rep('D2 - - - - - - - C2 - - - - - - -', 1) + ' | ' + rep('Bb1 - - - - - - - A1 - - - - - - -', 1) }] },
  ending: { bpm: 80, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'D5 - - - A5 - - - G5 - - - A5 - - - | F#5 - - - E5 - - - D5 - - - - - - - | B4 - - - D5 - - - G5 - - - F#5 - - - | E5 - - - D5 - C#5 - D5 - - - - - - -' },
    { wave: 'triangle', vol: .2, notes: rep('D3 - - - A2 - - - B2 - - - F#2 - - -', 1) + ' | ' + rep('G2 - - - D3 - - - G2 - - - A2 - - -', 1) },
    { wave: 'saw', vol: .03, notes: 'D4 - - - - - - - - - - - - - - - | B3 - - - - - - - - - - - - - - - | G3 - - - - - - - - - - - - - - - | A3 - - - - - - - - - - - - - - -' },
    { wave: 'drums', vol: .04, notes: 'k . . . . . . . s . . . . . . .' }] }
};
const STING = (bpm, notes, wave = 'pulse', bass) => ({ bpm, steps: 4, tracks: [{ wave, vol: .12, notes }].concat(bass ? [{ wave: 'triangle', vol: .2, notes: bass }] : []) });
G.STINGS = {
  season_spring: STING(140, 'F5 A5 C6 F6 - - - - A5 C6 F6 A6 - - - -', 'pulse12', 'F3 - - - - - - - C3 - - - - - - -'),
  season_summer: STING(140, 'A4 C#5 E5 A5 - - E5 - A5 - - - - - - -', 'square', 'A2 - - - E2 - - - A2 - - - - - - -'),
  season_autumn: STING(120, 'E5 - G5 - B5 - - - A5 - G5 - E5 - - -', 'triangle', 'E2 - - - - - - - B1 - - - - - - -'),
  season_winter: STING(90, 'B5 - - F#5 - - D5 - - B4 - - - - - -', 'sine', 'B1 - - - - - - - - - - - - - - -'),
  victory: STING(150, 'D5 D5 D5 - A5 - - - G5 - A5 - D6 - - - - - - -', 'square', 'D3 - - - A2 - - - G2 - A2 - D3 - - -'),
  defeat: STING(90, 'D5 - - - C5 - - - Bb4 - - - A4 - - - - - - -', 'triangle', 'D2 - - - - - - - A1 - - - - - - -'),
  levelup: STING(180, 'C5 E5 G5 C6 E6 - - -', 'pulse'),
  promote: STING(160, 'G4 B4 D5 G5 - B5 - D6 - - G6 - - - - -', 'pulse', 'G2 - - - D3 - - - G3 - - - - - - -'),
  summon: STING(130, 'C5 - G5 - C6 - - - E6 - - -', 'saw'),
  capture: STING(150, 'A5 E5 A5 - - -', 'square'),
  candle: STING(60, 'C3 - - - - - - - B2 - - - - - - -', 'triangle', 'C2 - - - - - - - - - - - - - - -')
};
G.SFX = {
  ui_move: { wave: 'pulse', freq: 'E6', dur: .03, vol: .12 }, ui_confirm: { wave: 'pulse', freq: 'A5', to: 'E6', dur: .08, vol: .18 }, ui_cancel: { wave: 'pulse', freq: 'E5', to: 'A4', dur: .08, vol: .15 },
  ui_error: { wave: 'square', freq: 'C3', dur: .12, vol: .14 }, ui_open: { wave: 'triangle', freq: 'C5', to: 'G5', dur: .1, vol: .2 },
  bell_toll: [{ wave: 'sine', freq: 'C4', dur: 1.2, vol: .3 }, { wave: 'sine', freq: 'G5', dur: .8, vol: .1 }, { wave: 'triangle', freq: 'C5', dur: 1, vol: .08 }],
  sword_clang: [{ wave: 'square', freq: 2200, to: 1600, dur: .06, vol: .12 }, { wave: 'noise', freq: 4000, dur: .05, vol: .12 }], slash_whoosh: { wave: 'noise', freq: 800, to: 2400, dur: .14, vol: .12 },
  bow_twang: { wave: 'triangle', freq: 'G3', to: 'D3', dur: .15, vol: .2 }, arrow_hit: { wave: 'noise', freq: 1500, to: 400, dur: .06, vol: .15 },
  cast_charge: { wave: 'sine', freq: 'C4', to: 'C6', dur: .45, vol: .14, vib: [10, .02] },
  spell_spring: { wave: 'triangle', freq: 'C6', dur: .5, vol: .16, arp: [0, 4, 7, 12, 16], step: .05 }, spell_summer: [{ wave: 'noise', freq: 600, to: 200, dur: .5, vol: .2 }, { wave: 'saw', freq: 'A2', to: 'E2', dur: .4, vol: .1 }],
  spell_autumn: [{ wave: 'noise', freq: 3000, to: 1500, dur: .4, vol: .1 }, { wave: 'triangle', freq: 'E3', dur: .5, vol: .15 }], spell_winter: { wave: 'sine', freq: 'B6', dur: .5, vol: .12, arp: [0, 7, 12, 7, 0], step: .06 },
  spell_hour: [{ wave: 'square', freq: 'C5', dur: .05, vol: .1 }, { wave: 'square', freq: 'G4', dur: .05, vol: .1 }], heal: { wave: 'sine', freq: 'C5', dur: .4, vol: .16, arp: [0, 4, 7, 12], step: .07 },
  buff: { wave: 'pulse', freq: 'G4', to: 'G5', dur: .2, vol: .12 }, debuff: { wave: 'pulse', freq: 'G4', to: 'C4', dur: .2, vol: .12 },
  poison: { wave: 'saw', freq: 'C3', dur: .2, vol: .1, vib: [12, .05] }, burn: { wave: 'noise', freq: 900, dur: .25, vol: .12 }, chill: { wave: 'sine', freq: 'A6', to: 'E6', dur: .25, vol: .1 },
  sleep: { wave: 'sine', freq: 'E5', to: 'C5', dur: .4, vol: .1 }, stop: [{ wave: 'square', freq: 'C6', dur: .04, vol: .1 }, { wave: 'square', freq: 'C5', dur: .3, vol: .06 }],
  crit: [{ wave: 'noise', freq: 5000, to: 800, dur: .15, vol: .2 }, { wave: 'square', freq: 'C6', to: 'C4', dur: .15, vol: .1 }], miss: { wave: 'noise', freq: 2000, to: 3000, dur: .1, vol: .08 },
  ko_monster: { wave: 'square', freq: 'C4', to: 'C2', dur: .35, vol: .14 }, ko_knight: [{ wave: 'saw', freq: 'D3', dur: .6, vol: .14 }, { wave: 'saw', freq: 'A2', dur: .6, vol: .1 }],
  capture: { wave: 'square', freq: 'E6', dur: .3, vol: .08, arp: [0, 5, 0, 5, 0], step: .05 }, summon_rise: { wave: 'saw', freq: 'C3', to: 'C5', dur: .6, vol: .1 },
  roar_small: { wave: 'saw', freq: 'G3', to: 'D3', dur: .25, vol: .14, vib: [30, .1] }, roar_large: [{ wave: 'saw', freq: 'C3', to: 'G2', dur: .5, vol: .16, vib: [25, .12] }, { wave: 'noise', freq: 300, dur: .4, vol: .1 }],
  growl: { wave: 'saw', freq: 'E2', dur: .3, vol: .12, vib: [20, .15] }, chirp: { wave: 'sine', freq: 'C7', to: 'G6', dur: .08, vol: .1 }, flap: { wave: 'noise', freq: 400, dur: .08, vol: .1 },
  march_drums: [{ wave: 'noise', freq: 150, dur: .1, vol: .2 }], banner_flip: { wave: 'noise', freq: 1200, to: 600, dur: .15, vol: .1 }, castle_taken: { wave: 'square', freq: 'C5', dur: .4, vol: .12, arp: [0, 4, 7, 12], step: .08 },
  candle_hiss: { wave: 'noise', freq: 5000, to: 2000, dur: .4, vol: .08 }, tide: { wave: 'sine', freq: 'C4', to: 'G4', dur: .3, vol: .1 }, timer_tick: { wave: 'square', freq: 'C6', dur: .02, vol: .06 }
};
G.audioInit = game => { for (const k in G.SFX) game.audio.define(k, G.SFX[k]); };
G.sfx = (name, o) => { try { G.game.audio.sfx(name, o); } catch (e) { /* no sound headless */ } };
G.music = (id, o) => { try { const A = G.game.audio, s = G.SONGS[id]; if (!s) return; if (A.song === s) return; A.music(s, Object.assign({ fade: .6 }, o)); } catch (e) { /* no sound headless */ } };
G.sting = id => { try { G.game.audio.sting(G.STINGS[id], { duck: .35 }); } catch (e) { /* no sound headless */ } };

/* ---- the babble voice: vowels are formant-filtered tone bursts, consonants noise ticks ---- */
G.voice = {
  profile(id) {
    if (!id || id === 'narrator') return null;
    if (G.has('knight', id)) return G.get('knight', id).voice;
    if (G.has('speaker', id)) return G.get('speaker', id).voice;
    return { base: 200, range: 5, wave: 'triangle', formant: 1, rate: 1 };
  },
  // the pure schedule of one line (tests use it): [{ t, kind: 'v' | 'c', freq, dur, vol }]
  plan(p, text) {
    const out = []; if (!p) return out; let t = 0; const s = text.replace(/\{[^}]*\}/g, ''), F = { a: 800, e: 1200, i: 2200, o: 600, u: 400, y: 1800 };
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], lc = ch.toLowerCase(), rate = p.rate || 1;
      if (ch === '.') { t += (s.slice(i, i + 3) === '...' ? .25 : .12) / rate; continue; }
      if (ch === ',') { t += .08 / rate; continue; }
      if (F[lc]) { const h = (lc.charCodeAt(0) * 7 + i * 3) % p.range, up = /\?/.test(s.slice(i, i + 6)) ? 2 : 0; out.push({ t, kind: 'v', freq: p.base * Math.pow(2, (h - p.range / 2 + up) / 12), dur: .045 + (h % 3) * .01, vol: ch !== lc ? .2 : .14, formant: F[lc] * (p.formant || 1), wave: p.wave, vib: p.vib, double: p.double }); t += .055 / rate; }
      else if (/[a-z]/i.test(ch)) { out.push({ t, kind: 'c', dur: .018, vol: .05 }); t += .03 / rate; }
      else if (ch === ' ') t += .02 / rate;
    }
    return out;
  },
  _noise: null,
  // one typed letter (E.Dialog's per-letter voice hook)
  letter(p, ch) {
    const A = G.game && G.game.audio; if (!p || !A || !A.ctx || !A._sfxBus || (G.settings && G.settings.voices === 'Off')) return;
    const c = A.ctx, t = c.currentTime, lc = (ch || '').toLowerCase(), F = { a: 800, e: 1200, i: 2200, o: 600, u: 400, y: 1800 };
    try {
      if (F[lc]) {
        const h = (lc.charCodeAt(0) * 7 + (this._k = (this._k || 0) + 1) * 3) % p.range, f = p.base * Math.pow(2, (h - p.range / 2) / 12);
        const voices = p.double ? [f, f * Math.pow(2, p.double / 12)] : [f];
        for (const fr of voices) {
          const o = c.createOscillator(), bp = c.createBiquadFilter(), gn = c.createGain();
          o.type = { pulse: 'square', saw: 'sawtooth', square: 'square', triangle: 'triangle', sine: 'sine' }[p.wave] || 'triangle'; o.frequency.setValueAtTime(fr, t);
          if (p.vib) o.frequency.linearRampToValueAtTime(fr * (1 + p.vib * (h % 2 ? 1 : -1)), t + .05);
          bp.type = 'bandpass'; bp.frequency.value = F[lc] * (p.formant || 1); bp.Q.value = 2.5;
          gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(ch !== lc ? .32 : .24, t + .005); gn.gain.exponentialRampToValueAtTime(.001, t + .06);
          o.connect(bp); bp.connect(gn); gn.connect(A._sfxBus); o.start(t); o.stop(t + .07);
        }
      } else if (/[a-z]/i.test(ch)) {
        if (!this._noise) { const b = c.createBuffer(1, 2048, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this._noise = b; }
        const s = c.createBufferSource(), hp = c.createBiquadFilter(), gn = c.createGain(); s.buffer = this._noise; hp.type = 'highpass'; hp.frequency.value = 3000;
        gn.gain.setValueAtTime(.06, t); gn.gain.exponentialRampToValueAtTime(.001, t + .025); s.connect(hp); hp.connect(gn); gn.connect(A._sfxBus); s.start(t); s.stop(t + .03);
      }
    } catch (e) { /* the audio context refused */ }
  }
};
// monsters don't babble: a cry by species
G.cry = sp => { const m = G.get('monster', sp), size = m.sizes[0]; G.sfx(m.rig.kind === 'beast' ? (size === 'L' ? 'roar_large' : 'roar_small') : m.rig.kind === 'blob' ? 'chirp' : 'growl'); };
