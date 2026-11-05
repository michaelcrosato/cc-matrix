// Applies MASH TV engine patches P1-P4 to engine/my-3d2dge.js (idempotent). Each is marked "// MASH TV PATCH Pn".
import { readFileSync, writeFileSync } from 'node:fs';
const F = new URL('../engine/my-3d2dge.js', import.meta.url);
let s = readFileSync(F, 'utf8'); const log = [];
function rep(tag, from, to) {
  if (s.includes('MASH TV PATCH ' + tag)) { log.push(tag + ' already'); return; }
  if (!s.includes(from)) throw new Error('anchor missing for ' + tag);
  s = s.replace(from, to); log.push(tag + ' applied');
}
// P1: expose HOOKS
rep('P1', "HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};",
  "HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};\nE.HOOKS = HOOKS; // MASH TV PATCH P1");
// P2: glyphs default PlayStation, two options, apply to every player
rep('P2', "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']], apply: (g, v) => { g.input.glyphs = v; } },",
  "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { for (const p of (g.players || [g.input])) p.glyphs = v; g.input.glyphs = v; } }, // MASH TV PATCH P2");
// P3: Arcade.enter takes an input; continue reads every player's input
rep('P3', "enter(score, mode = '', done) { this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0 }; this.game.input.consumeAll(); }",
  "enter(score, mode = '', done, input) { this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0, input: input || null }; (input || this.game.input).consumeAll(); } // MASH TV PATCH P3");
rep('P3b', "const I = this.game.input, e = this.entry, tap = clicked(I);\n    if (e) {", "const e = this.entry, I = (e && e.input) || this.game.input, tap = clicked(I);\n    if (e) { // MASH TV PATCH P3b");
rep('P3c', "const yes = I.pressed('start') || I.pressed('confirm') || !!tap, paid",
  "const yes = (this.game.players || [I]).some(q => q.pressed('start') || q.pressed('confirm')) || !!tap, paid /* MASH TV PATCH P3c */");
// P4: audio bus getter
rep('P4', "  /** true once the browser lets the game make sound */\n  get ready()", "  get bus() { this._init(); return this._sfxBus; } // MASH TV PATCH P4\n  /** true once the browser lets the game make sound */\n  get ready()");
writeFileSync(F, s); console.log(log.join(', '));
