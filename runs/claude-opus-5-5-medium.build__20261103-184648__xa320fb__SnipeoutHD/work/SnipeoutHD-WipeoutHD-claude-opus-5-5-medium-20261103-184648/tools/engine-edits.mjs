// Applies the SNIPEOUT engine edits to engine/my-3d2dge.js and engine/my-3d2dge-3d.js (idempotent: each edit is marked)
import { readFileSync, writeFileSync } from 'node:fs';
const f2 = new URL('../engine/my-3d2dge.js', import.meta.url), f3 = new URL('../engine/my-3d2dge-3d.js', import.meta.url);
let s = readFileSync(f2, 'utf8'), t = readFileSync(f3, 'utf8');
const rep = (src, a, b, name) => { if (src.includes('SNIPEOUT EDIT: ' + name)) return src; if (!src.includes(a)) throw new Error('edit not found: ' + name); return src.replace(a, b); };
// 1. button symbols default PlayStation, in Display
s = rep(s, "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']], apply: (g, v) => { g.input.glyphs = v; } },",
  "glyphs: { group: 'Display', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']], apply: (g, v) => { g.input.glyphs = v; for (const p of g.players || []) p.glyphs = v; } },   // SNIPEOUT EDIT: glyphs: PlayStation by default, a Display option (TASK: PS glyphs, Xbox in Settings)",
  'glyphs');
// 2. font glyphs for the PlayStation symbols
s = rep(s, "GLYPHS['←'] = '000100111100000'; GLYPHS['→'] = '000001111001000';",
  "GLYPHS['←'] = '000100111100000'; GLYPHS['→'] = '000001111001000';\nGLYPHS['✕'] = '101101010101101'; GLYPHS['○'] = '010101101101010'; GLYPHS['□'] = '111101101101111'; GLYPHS['△'] = '010010101101111';   // SNIPEOUT EDIT: font PlayStation glyphs",
  'font PlayStation glyphs');
s = rep(s, "const G57 = {", "const G57 = {\n  \"✕\": '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', \"○\": '.....|.###.|#...#|#...#|#...#|.###.|.....', \"□\": '.....|#####|#...#|#...#|#...#|#####|.....', \"△\": '.....|..#..|.#.#.|.#.#.|#...#|#####|.....',   // SNIPEOUT EDIT: font57 PlayStation glyphs", 'font57 PlayStation glyphs');
// 3. analog button values
s = rep(s, "p.buttons.forEach((b, i) => { const on = b.pressed;", "this.padValues = Array.from(p.buttons, b => +b.value || (b.pressed ? 1 : 0));   // SNIPEOUT EDIT: analog values\n      p.buttons.forEach((b, i) => { const on = b.pressed;", 'analog values');
s = rep(s, "  anyPressed() { return this._now.size > 0; }", `  anyPressed() { return this._now.size > 0; }
  /** SNIPEOUT EDIT: analog input: how far action a is pressed, 0..1: a pad button's value (triggers), 1 for a key or mouse button held */
  value(a) {
    const o = this._valueOverride && this._valueOverride[a]; if (o !== undefined) return o;
    const m = this.map[a]; if (!m) return 0; let v = 0;
    for (const c of m) { if (/^Pad\\d+$/.test(c)) { const pv = this.padValues && this.padValues[+c.slice(3)]; if (pv) v = Math.max(v, pv); if (this.held.has(c)) v = Math.max(v, pv || 1); } else if (this.held.has(c)) v = 1; }
    return Math.min(1, v);
  }`, 'analog input');
// 4. synth: lowpass envelope, unison, pan, accents, clap/boom drums, sidechain duck
s = rep(s, "      src.connect(g); src.start(t);\n    }\n    g.connect(bus); src.stop(end + .05);",
`      src.connect(g); src.start(t);
      // SNIPEOUT EDIT: synth: unison copies (uni, det cents), a lowpass with an envelope (lp: { f, q, env, dec }), pan
      if (p.uni > 1) for (let u = 1; u < p.uni; u++) { const o2 = c.createOscillator(); o2.type = src.type === 'custom' ? 'sawtooth' : src.type; o2.frequency.setValueAtTime(f0, t); if (to) o2.frequency.exponentialRampToValueAtTime(to, end); o2.detune.value = (u % 2 ? 1 : -1) * Math.ceil(u / 2) * (p.det || 10); o2.connect(g); o2.start(t); o2.stop(end + .05); }
    }
    let out = g;
    if (p.lp) { const lf = c.createBiquadFilter(); lf.type = 'lowpass'; lf.Q.value = p.lp.q || 1; const fb = p.lp.f || 800, fe = (p.lp.env || 0) * (p.acc ? 2 : 1); lf.frequency.setValueAtTime(fb + fe, t); if (fe) lf.frequency.exponentialRampToValueAtTime(Math.max(30, fb), t + (p.lp.dec || .15)); g.connect(lf); out = lf; }
    if (p.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = clamp(p.pan, -1, 1); out.connect(pn); out = pn; }
    out.connect(bus); src.stop(end + .05);`, 'synth');
s = rep(s, "  t: [{ wave: 'triangle', freq: 180, to: 90, dur: .16, vol: .45 }]\n};",
  "  t: [{ wave: 'triangle', freq: 180, to: 90, dur: .16, vol: .45 }],\n  p: [{ wave: 'noise', freq: 1500, dur: .012, vol: .3 }, { wave: 'noise', freq: 1500, dur: .012, vol: .3, delay: .011 }, { wave: 'noise', freq: 1400, dur: .14, vol: .3, delay: .022 }],   // SNIPEOUT EDIT: drums p (clap) and b (sub boom)\n  b: [{ wave: 'sine', freq: 55, to: 35, dur: .4, vol: .8 }]\n};", 'drums p');
s = rep(s, "      for (const v of kit) this._voice(Object.assign({}, v, { vol: v.vol * vol / .18 }), bus, time);\n      return;",
  "      for (const v of kit) this._voice(Object.assign({}, v, { vol: v.vol * vol / .18 }), bus, time);\n      if (t.duck && tok[0] === 'k' && bus && bus.gain && this.song && this.song.bus) { const g = this.song.bus.gain; g.setValueAtTime(1 - t.duck, time); g.linearRampToValueAtTime(1, time + .12); }   // SNIPEOUT EDIT: sidechain duck\n      return;", 'sidechain');
s = rep(s, "    let n = 1; while (i + n < t.tokens.length && t.tokens[i + n] === '-') n++;\n    const f = noteFreq(tok);",
  "    let n = 1; while (i + n < t.tokens.length && t.tokens[i + n] === '-') n++;\n    const acc = tok.endsWith('!'); if (acc) tok = tok.slice(0, -1);   // SNIPEOUT EDIT: accents\n    const f = noteFreq(tok);", 'accents');
s = s.replace("  _note(t, i, time, spb, bus) {\n    const tok = t.tokens[i];", "  _note(t, i, time, spb, bus) {\n    let tok = t.tokens[i];");
s = rep(s, "    this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: n * spb * (t.gate || .9), vol, hold: true, attack: .006, vib: t.vib }, bus, time);",
  "    this._voice({ wave: t.wave || 'square', freq: f * Math.pow(2, t.octave || 0), dur: n * spb * (t.gate || .9), vol: acc ? vol * 1.35 : vol, hold: !t.pluck, attack: .006, vib: t.vib, lp: t.lp, uni: t.uni, det: t.det, pan: t.pan, acc }, bus, time);   // SNIPEOUT EDIT: synth tracks", 'synth tracks');
// 5. World3D particle ground of the game's own
t = rep(t, "g.particles.ground = (x, y, z) => this.level.floorAt(x, y, z);", "g.particles.ground = this.o.particleGround || ((x, y, z) => this.level.floorAt(x, y, z));   // SNIPEOUT EDIT: particle ground (sparks land on the track)", 'particle ground');
writeFileSync(f2, s); writeFileSync(f3, t);
console.log('engine edits applied');
