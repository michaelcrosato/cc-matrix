(() => {
const E = My3D2dge, SN = globalThis.SN;
// ---- six original synthesized songs; layers come in as a race builds (bass+drums always, arp at lap 2, lead on the last) ----
const bars = (...b) => b.join(' | ');
SN.SONGS = {
  menu: { bpm: 112, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .26, notes: bars('E2 . . E2 . . G2 . | A2 . . A2 . . B2 .', 'C3 . . C3 . . B2 . | D3 . . D3 . . B2 .') },
    { name: 'pad', wave: 'sine', vol: .09, notes: bars('E4 - - - - - - - | A4 - - - - - - -', 'C5 - - - - - - - | B4 - - - - - - -') },
    { name: 'arp', wave: 'pulse12', vol: .05, notes: bars('E5 . G5 . B5 . G5 . | A5 . C6 . E6 . C6 .', 'C6 . E6 . G6 . E6 . | B5 . D6 . F#6 . D6 .') },
    { name: 'hat', wave: 'drums', vol: .05, notes: 'k . . . h . . . k . . . h . . .' }] },
  solenne: { bpm: 126, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .09, notes: bars('A2 . A2 A2 . A2 . A2 | A2 . A2 A2 . C3 . C3', 'F2 . F2 F2 . F2 . F2 | G2 . G2 G2 . G2 . B2') },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . h . s . h . k . h k s . h .' },
    { name: 'arp', wave: 'square', vol: .045, on: false, notes: bars('A4 C5 E5 C5 A4 C5 E5 G5 | A4 C5 E5 C5 A4 C5 E5 G5', 'F4 A4 C5 A4 F4 A4 C5 E5 | G4 B4 D5 B4 G4 B4 D5 F5') },
    { name: 'lead', wave: 'pulse', vol: .05, on: false, notes: bars('E5 - - - C5 - D5 - | E5 - G5 - A5 - - -', 'A5 - - - F5 - G5 - | B5 - - - D6 - - -') }] },
  karakum: { bpm: 132, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .09, notes: bars('D2 D2 . D2 . D2 F2 . | D2 D2 . D2 . A2 . G2', 'Bb1 Bb1 . Bb1 . Bb1 D2 . | C2 C2 . C2 . G2 . E2') },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h h s . h k k . h . s . h h' },
    { name: 'arp', wave: 'pulse12', vol: .05, on: false, notes: bars('D5 . F5 A5 . F5 D5 . | D5 . F5 A5 . C6 A5 .', 'Bb4 . D5 F5 . D5 Bb4 . | C5 . E5 G5 . E5 C5 .') },
    { name: 'lead', wave: 'saw', vol: .04, on: false, notes: bars('A5 - - G5 - F5 - - | A5 - - C6 - A5 - -', 'F5 - - D5 - F5 - - | G5 - - E5 - C5 - -') }] },
  meridian: { bpm: 138, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .1, notes: bars('C2 . C3 C2 . C3 C2 . | C2 . C3 C2 . Eb3 C2 .', 'Ab1 . Ab2 Ab1 . Ab2 Ab1 . | Bb1 . Bb2 Bb1 . Bb2 Bb1 .') },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . h . k . h h k . h . k . h h' },
    { name: 'arp', wave: 'square', vol: .045, on: false, notes: bars('C5 Eb5 G5 Eb5 C5 Eb5 G5 Bb5 | C5 Eb5 G5 Eb5 C5 Eb5 G5 C6', 'Ab4 C5 Eb5 C5 Ab4 C5 Eb5 G5 | Bb4 D5 F5 D5 Bb4 D5 F5 A5') },
    { name: 'lead', wave: 'pulse', vol: .05, on: false, notes: bars('G5 - - - Eb5 - F5 - | G5 - Bb5 - C6 - - -', 'Eb6 - - - C6 - D6 - | F6 - - - D6 - Bb5 -') }] },
  borealis: { bpm: 120, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: bars('F#2 . . F#2 . . A2 . | B2 . . B2 . . C#3 .', 'D2 . . D2 . . F#2 . | E2 . . E2 . . G#2 .') },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . . h s . . h k . h . s . . h' },
    { name: 'arp', wave: 'sine', vol: .08, on: false, notes: bars('F#5 A5 C#6 A5 F#5 A5 C#6 E6 | B4 D5 F#5 D5 B4 D5 F#5 A5', 'D5 F#5 A5 F#5 D5 F#5 A5 C#6 | E5 G#5 B5 G#5 E5 G#5 B5 D6') },
    { name: 'lead', wave: 'pulse12', vol: .05, on: false, notes: bars('C#6 - - - A5 - B5 - | C#6 - E6 - F#6 - - -', 'A5 - - - F#5 - G#5 - | B5 - - - D6 - - -') }] },
  victory: { bpm: 132, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .08, notes: 'C5 . E5 . G5 . C6 - - - . . E6 - G6 -' }, { wave: 'triangle', vol: .2, notes: 'C3 - - - G2 - - - C3 - - - C3 - - -' }] },
  attract: { bpm: 140, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .09, notes: bars('E2 . E3 E2 . E3 E2 . | E2 . E3 E2 . G3 E2 .', 'C2 . C3 C2 . C3 C2 . | D2 . D3 D2 . D3 D2 .') },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . k . h h k . h . k . h h' },
    { name: 'arp', wave: 'square', vol: .045, notes: bars('E5 G5 B5 G5 E5 G5 B5 D6 | E5 G5 B5 G5 E5 G5 B5 E6', 'C5 E5 G5 E5 C5 E5 G5 B5 | D5 F#5 A5 F#5 D5 F#5 A5 C6') }] }
};
SN.Audio = {
  ctx: null, hum: null, humOn: false, muted: false,
  init(game) { this.game = game; },
  music(name, o) { const g = this.game; if (!g || !g.audio) return; try { g.audio.music(SN.SONGS[name] || SN.SONGS.menu, Object.assign({ fade: 1.2 }, o || {})); this.cur = name; } catch (e) { console.warn(e); } },
  layer(name, on) { const g = this.game; try { g.audio.layer(name, on ? 1 : 0, .8); } catch (e) { /* no layer */ } },
  stop() { try { this.game.audio.music(null, { fade: .6 }); } catch (e) { /* */ } this.humStop(); },
  sfx(spec, o) { const g = this.game; if (!g || !g.audio) return; try { g.audio.sfx(spec, o); } catch (e) { /* */ } },
  // ----- sound effects by event -----
  play(name, o) {
    const S = {
      confirm: () => this.sfx('confirm'), cancel: () => this.sfx('cancel'), move: () => this.sfx({ wave: 'square', freq: 'E5', dur: .03, vol: .08 }),
      count: () => this.sfx({ wave: 'square', freq: 'A4', dur: .18, vol: .3 }), go: () => this.sfx({ wave: 'square', freq: 'A5', dur: .5, vol: .35, arp: [0, 7, 12], step: .06 }),
      pickup: () => this.sfx({ wave: 'triangle', freq: 'C5', to: 'C6', dur: .22, vol: .3, arp: [0, 4, 7], step: .05 }), pad: () => this.sfx({ wave: 'saw', freq: 200, to: 900, dur: .4, vol: .2 }),
      fire: () => this.sfx({ wave: 'saw', freq: 900, to: 150, dur: .22, vol: .25 }), cannon: () => this.sfx({ wave: 'noise', freq: 400, dur: .14, vol: .3 }),
      beam: () => this.sfx({ wave: 'sine', freq: 1400, to: 200, dur: .35, vol: .3 }), boom: () => this.sfx('explode'), hit: () => this.sfx('hurt'),
      wall: () => this.sfx({ wave: 'noise', freq: 220, dur: .16, vol: .35 }), land: () => this.sfx({ wave: 'sine', freq: 90, to: 40, dur: .2, vol: .35 }),
      absorb: () => this.sfx({ wave: 'triangle', freq: 'E4', to: 'E6', dur: .25, vol: .25 }), roll: () => this.sfx({ wave: 'saw', freq: 300, to: 1200, dur: .35, vol: .2 }),
      lap: () => this.sfx({ wave: 'square', freq: 'E5', dur: .4, vol: .22, arp: [0, 5, 9, 12], step: .07 }), lock: () => this.sfx({ wave: 'square', freq: 'B5', dur: .06, vol: .2 }),
      elim: () => this.sfx('die'), shift: () => this.sfx({ wave: 'noise', freq: 900, dur: .09, vol: .12 }), zone: () => this.sfx({ wave: 'saw', freq: 120, to: 1000, dur: .8, vol: .28 }),
      drill: () => this.sfx('powerup'), pit: () => this.sfx({ wave: 'sine', freq: 'G5', dur: .25, vol: .2, vib: [8, .03] }), bump: () => this.sfx({ wave: 'noise', freq: 150, dur: .08, vol: .2 })
    };
    (S[name] || (() => {}))(o);
  },
  // Animalese-style gibberish: a few blips per syllable, pitch from the speaker, contour from punctuation
  voice(text, who = 3, mood = 0) {
    const g = this.game; if (!g || !g.audio) return; const base = 180 + (who % 12) * 26, rnd = SN.rng(SN.hashStr(text));
    const syl = Math.min(26, Math.max(3, Math.floor(text.replace(/[^a-z]/gi, '').length / 2.4)));
    for (let i = 0; i < syl; i++) { const f = base * (.8 + rnd() * .9) * (1 + (mood || 0) * .06), step = i * .085; { const spec = { wave: who % 3 === 0 ? 'triangle' : who % 3 === 1 ? 'pulse12' : 'sine', freq: f, to: f * (rnd() < .5 ? 1.18 : .86), dur: .07, vol: .11 }; setTimeout(() => { try { g.audio.sfx(spec); } catch (e) { /* */ } }, step * 1000); } }
  },
  // engine hum follows the human's speed
  hum_update(speedFrac, boost) {
    const g = this.game, ctx = g && g.audio && g.audio.ctx; if (!ctx) return;
    if (!this.hum) {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), gain = ctx.createGain(), lp = ctx.createBiquadFilter(); o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 600; gain.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(gain); gain.connect(ctx.destination); o1.start(); o2.start(); this.hum = { o1, o2, gain, lp };
    }
    const h = this.hum, t = ctx.currentTime, vol = (g.settings ? (g.settings.sound === false ? 0 : g.settings.volume * g.settings.effects) : .5);
    h.o1.frequency.setTargetAtTime(55 + speedFrac * 170, t, .05); h.o2.frequency.setTargetAtTime(27.5 + speedFrac * 85, t, .05); h.lp.frequency.setTargetAtTime(300 + speedFrac * 1400 + (boost ? 600 : 0), t, .05);
    h.gain.gain.setTargetAtTime(this.humOn ? .05 * vol * (.5 + speedFrac) : 0, t, .08);
  },
  humStop() { this.humOn = false; if (this.hum && this.game.audio.ctx) this.hum.gain.gain.setTargetAtTime(0, this.game.audio.ctx.currentTime, .05); },
  // map a sim event to sounds (for the human's craft only, or everyone at lower level)
  event(e, human) {
    const mine = e.ship && e.ship === human;
    switch (e.t) {
      case 'count': this.play('count'); break; case 'go': this.play('go'); break;
      case 'pickup': if (mine) this.play('pickup'); break; case 'pad': if (mine) this.play('pad'); break;
      case 'fire': this.play(e.weapon === 'cannon' ? 'cannon' : mine ? 'fire' : 'bump'); break;
      case 'beam': this.play('beam'); break; case 'blast': this.play('boom'); break;
      case 'hit': if (mine) this.play('hit'); break; case 'wall': if (mine) this.play('wall'); break; case 'land': if (mine && e.impact > 200) this.play('land'); break;
      case 'absorb': if (mine) this.play('absorb'); break; case 'roll': if (mine) this.play('roll'); break; case 'lap': if (mine) this.play('lap'); break;
      case 'lock': this.play('lock'); break; case 'elim': this.play('elim'); break; case 'shift': if (mine) this.play('shift'); break; case 'zone': this.play('zone'); break;
      case 'drill': this.play('drill'); break; case 'pit': if (mine) this.play('pit'); break; case 'bump': if (mine || e.other === human) this.play('bump'); break;
    }
  }
};
})();
