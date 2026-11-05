// Applies the AOA engine patches to a fresh copy of the handoff engine (engine/my-3d2dge.js). Each patch is an exact
// string replacement that must match once; every patched spot carries an `AOA:` comment. ENGINE-CHANGES.md lists them.
// Run: node tools/patch-engine.mjs   (idempotent: it starts from the pristine copy in .src)
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
let src = readFileSync(new URL('.src/my-3d2dge/dist/handoff/my-3d2dge.js', root), 'utf8');
const patch = (name, from, to) => {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error('patch "' + name + '" matched ' + n + ' times'); process.exit(1); }
  src = src.replace(from, to);
};

// 1. PlayStation face-button symbols and stepper arrows in the 5x7 font
patch('font', `"♪": '..##.|..#.#|..#..|..#..|.##..|###..|.#...'`,
  `"♪": '..##.|..#.#|..#..|..#..|.##..|###..|.#...',
  /* AOA: PlayStation symbols and stepper arrows */ "✕": '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', "○": '.....|.###.|#...#|#...#|#...#|.###.|.....',
  "□": '.....|#####|#...#|#...#|#...#|#####|.....', "△": '.....|..#..|.#.#.|.#.#.|#...#|#####|.....', "◀": '...#|..##|.###|####|.###|..##|...#', "▶": '#...|##..|###.|####|###.|##..|#...'`);

// 2. Button symbols: PlayStation by default, with Xbox as the one alternative, in the Game group of Settings
patch('glyphs', `glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']], apply: (g, v) => { g.input.glyphs = v; } },`,
  `glyphs: { group: 'Game', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']], apply: (g, v) => { for (const p of g.players || [g.input]) p.glyphs = v; } },   // AOA: PlayStation default, Xbox option`);

// 3. Dialog: a function voice is called for every newly shown letter (Animalese voices)
patch('voice', `if (this.voice && Math.floor(this.shown) > prev && (this._blip++ % 2 === 0)) this.game.audio.sfx(this.voice);`,
  `if (typeof this.voice === 'function') { const txt = this._page.join(''); for (let n = prev; n < Math.floor(this.shown); n++) this.voice(txt[n] || ' ', n, txt, this); }   // AOA: per-letter voice hook
    else if (this.voice && Math.floor(this.shown) > prev && (this._blip++ % 2 === 0)) this.game.audio.sfx(this.voice);`);

// 4a. Audio: a voice bus beside music and effects
patch('voxbus', `this._musBus = c.createGain(); this._musBus.connect(this._master);
      this.applyVolume();`,
  `this._musBus = c.createGain(); this._musBus.connect(this._master);
      this._voxBus = c.createGain(); this._voxBus.connect(this._master);   // AOA: voices
      this.applyVolume();`);
patch('voxvol', `this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1); }`,
  `this._musBus.gain.value = this.musicVolume * (this._ducked || this.ducked ? .35 : 1); if (this._voxBus) this._voxBus.gain.value = this.voiceVolume === undefined ? .8 : this.voiceVolume; }
  /** AOA: a bus's GainNode ('sfx' | 'music' | 'voice'), or null before sound starts */
  bus(name) { if (!this._init()) return null; return name === 'music' ? this._musBus : name === 'voice' ? this._voxBus : this._sfxBus; }`);
// 4b. Audio: instruments (named periodic waves), a pluck decay and a lowpass per track or voice
patch('instr', `      if (wave === 'pulse' || wave === 'pulse12') src.setPeriodicWave(this._pulse(wave === 'pulse' ? .25 : .125));`,
  `      const ins = this.instruments && this.instruments[wave];   // AOA: named instruments
      if (ins) { const key = 'ins:' + wave; src.setPeriodicWave(this._waves[key] || (this._waves[key] = c.createPeriodicWave(new Float32Array(ins.real), new Float32Array(ins.imag)))); }
      else if (wave === 'pulse' || wave === 'pulse12') src.setPeriodicWave(this._pulse(wave === 'pulse' ? .25 : .125));`);
patch('lp', `      src.connect(g); src.start(t);
    }
    g.connect(bus); src.stop(end + .05);`,
  `      if (p.cutoff) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p.cutoff; src.connect(lp); lp.connect(g); } else src.connect(g);   // AOA: lowpass
      src.start(t);
      if (p.detune) { const o2 = c.createOscillator(); o2.type = src.type === 'custom' ? 'sawtooth' : src.type; o2.frequency.setValueAtTime(f0, t); o2.detune.value = p.detune; o2.connect(g); o2.start(t); o2.stop(end + .05); }   // AOA: detuned pair
    }
    g.connect(bus); src.stop(end + .05);`);
patch('decay', `if (p.hold) { g.gain.setValueAtTime(vol, Math.max(t + att, end - .03)); g.gain.linearRampToValueAtTime(0, end); }`,
  `if (p.decay) { g.gain.setTargetAtTime(0, t + att, p.decay / 4); }   // AOA: a pluck's decay
    else if (p.hold) { g.gain.setValueAtTime(vol, Math.max(t + att, end - .03)); g.gain.linearRampToValueAtTime(0, end); }`);
patch('note', `this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: n * spb * (t.gate || .9), vol, hold: true, attack: .006, vib: t.vib }, bus, time);`,
  `this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: t.decay ? Math.max(n * spb * (t.gate || .9), t.decay) : n * spb * (t.gate || .9), vol, hold: true, attack: t.attack || .006, vib: t.vib, decay: t.decay, cutoff: t.cutoff, detune: t.detune }, bus, time);   // AOA: decay, cutoff, detune`);

// 5. Humanoid: swimsuits (outfit 'swim': bare legs and feet, briefs or shorts, a crop top's bare midriff, a neckline,
//    patterns drawn in the torso plate)
patch('swimlegs', `      limb(hip, knee, 1.45 * u * lw, 1.2 * u * lw, C.pants, far);`,
  `      limb(hip, knee, 1.45 * u * lw, 1.2 * u * lw, C.pants, far);
      if (o.swim && o.swim.shorts) limb(hip, lq(hip, knee, o.swim.shorts), 1.6 * u * lw, 1.45 * u * lw, C.swimB || C.cloth, far, .004);   // AOA: swim shorts`);
patch('swimtorso', `      if (facingCam) { const bk = Sp(J.hipC, 1.1, 0, .7); px.rect(g, bk[0] - 1, bk[1] - 1, 2, 2, bt.hi); }`,
  `      if (facingCam && !o.swim) { const bk = Sp(J.hipC, 1.1, 0, .7); px.rect(g, bk[0] - 1, bk[1] - 1, 2, 2, bt.hi); }
      if (o.swim && this.swimDraw) this.swimDraw(g, { shL, shR, hL, hR, wL, wR, core0, core1, facingCam, u, Sp, J, lq });   // AOA: swimsuit cut and pattern`);

// 6. Create + Options belong to the AI Hub: Options does nothing while Create is held (reserveCombo)
patch('combo', `p.buttons.forEach((b, i) => { const on = b.pressed; if (on && !this.padPrev[i]) this.press('Pad' + i); if (!on && this.padPrev[i]) this.release('Pad' + i); this.padPrev[i] = on; });`,
  `const rc = this.reserveCombo, held8 = rc && p.buttons[rc[0]] && p.buttons[rc[0]].pressed;   // AOA: reserveCombo
      p.buttons.forEach((b, i) => { const on = b.pressed && !(held8 && i === rc[1]); if (on && !this.padPrev[i]) this.press('Pad' + i); if (!on && this.padPrev[i]) this.release('Pad' + i); this.padPrev[i] = on; });`);

writeFileSync(new URL('engine/my-3d2dge.js', root), src);
console.log('engine patched: ' + src.length + ' bytes');
