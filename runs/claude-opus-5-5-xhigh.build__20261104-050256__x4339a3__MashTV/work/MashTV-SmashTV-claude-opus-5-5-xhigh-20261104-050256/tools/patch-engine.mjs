// Applies the MASH TV engine patches (P1-P4) to a fresh copy of the handoff engine.
// Usage: node tools/patch-engine.mjs   (reads handoff/my-3d2dge.js, writes engine/my-3d2dge.js)
// Each patch is marked "// MASH TV PATCH Pn" in the output; engine/PATCHES.md says why.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let src = readFileSync(join(root, 'handoff/my-3d2dge.js'), 'utf8');
const patches = [];
function patch(id, find, replace) {
  if (!src.includes(find)) throw new Error(`patch ${id}: anchor not found`);
  src = src.replace(find, typeof replace === 'function' ? replace(find) : replace);
  patches.push(id);
}

// P1: expose the engine's hook lists, so the game can switch every player's input preset after input.tick and before
// the Shell reads navigation (arrows aim in play, move the focus in menus).
patch('P1',
  "const HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};",
  f => f + "\nE.HOOKS = HOOKS;   // MASH TV PATCH P1: the game adds an input hook (preset sync for every player)");

// P2: the button-symbols setting defaults to PlayStation, offers PlayStation or Xbox, and applies to every player.
patch('P2',
  "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']], apply: (g, v) => { g.input.glyphs = v; } },",
  "glyphs: { group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { for (const q of (g._players || [g.input])) q.glyphs = v; } },   // MASH TV PATCH P2");
patch('P2b',
  "  q.lastDevice = q.device; if (q.pad !== null) { q.tick(0); q.consumeAll(); }",
  "  q.glyphs = P[0].glyphs;   // MASH TV PATCH P2: a player who joins later shows the same button symbols\n  q.lastDevice = q.device; if (q.pad !== null) { q.tick(0); q.consumeAll(); }");

// P3: initials entry reads the given player's input; the continue takes a press from any player.
patch('P3',
  "  enter(score, mode = '', done) { this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0 }; this.game.input.consumeAll(); }",
  "  enter(score, mode = '', done, input) { const I = input || this.game.input; this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0, input: I }; I.consumeAll(); }   // MASH TV PATCH P3: whose input enters the initials");
patch('P3b',
  "    const I = this.game.input, e = this.entry, tap = clicked(I);\n    if (e) {",
  "    const e = this.entry, I = (e && e.input) || this.game.input, tap = clicked(this.game.input);   // MASH TV PATCH P3\n    if (e) {");
patch('P3c',
  "      const yes = I.pressed('start') || I.pressed('confirm') || !!tap, paid",
  "      const all = this.game._players || [this.game.input], yes = all.some(q => q.pressed('start') || q.pressed('confirm')) || !!tap /* MASH TV PATCH P3: any player continues */, paid");
patch('P3d',
  "        this.mode = 'play'; I.consumeAll(); this.game.audio.sfx('confirm'); if (c.done) c.done(true);",
  "        this.mode = 'play'; for (const q of all) q.consumeAll(); this.game.audio.sfx('confirm'); if (c.done) c.done(true);");

// P4: the effects bus for sounds of the game's own (the Babble voices), so they follow volume and mute.
patch('P4',
  "  _init() {\n    if (this.ctx || this.failed) return this.ctx;",
  "  get bus() { return this.ctx ? this._sfxBus : null; }   // MASH TV PATCH P4: the effects bus (null before the first sound)\n  _init() {\n    if (this.ctx || this.failed) return this.ctx;");

writeFileSync(join(root, 'engine/my-3d2dge.js'), src);
console.log('engine patched:', patches.join(' '));
