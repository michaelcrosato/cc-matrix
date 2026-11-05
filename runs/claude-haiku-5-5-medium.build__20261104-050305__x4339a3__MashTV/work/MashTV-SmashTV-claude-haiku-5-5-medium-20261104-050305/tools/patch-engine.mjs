// Copies the engine from the handoff package into engine/ and applies MASH TV's patches (see engine/PATCHES.md).
// Each replacement must match exactly once, or the script fails: the engine must be the version this game was built on.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const SRC = new URL('../.cache/my-3d2dge/dist/handoff/my-3d2dge.js', import.meta.url);
const DST = new URL('../engine/my-3d2dge.js', import.meta.url);
let src = readFileSync(SRC, 'utf8');
const PATCHES = [
  ['P1', "const HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};",
   "const HOOKS = { input: [], step: [], enter: [], draw: [], rot: null, frame: null, pose: null, pause: null }, FADES = {};\nE.HOOKS = HOOKS; // MASH TV PATCH P1"],
  ['P3a', "enter(score, mode = '', done) { this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0 }; this.game.input.consumeAll(); }",
   "enter(score, mode = '', done, input = null) { this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0, input }; (input || this.game.input).consumeAll(); } // MASH TV PATCH P3"],
  ['P3b', "const I = this.game.input, e = this.entry, tap = clicked(I);",
   "const e = this.entry, I = (e && e.input) || this.game.input, tap = clicked(I); // MASH TV PATCH P3"],
  ['P3c', "const yes = I.pressed('start') || I.pressed('confirm') || !!tap, paid",
   "const yes = I.pressed('start') || I.pressed('confirm') || !!tap || this.game.players.some(q => q !== I && (q.pressed('start') || q.pressed('confirm'))) /* MASH TV PATCH P3 */, paid"],
  ['P4', "  _init() {\n    if (this.ctx || this.failed) return this.ctx;",
   "  get bus() { this._init(); return this._sfxBus; } // MASH TV PATCH P4\n  _init() {\n    if (this.ctx || this.failed) return this.ctx;"],
];
for (const [id, from, to] of PATCHES) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`patch ${id}: expected 1 match, found ${n}`);
  src = src.replace(from, () => to);
}
mkdirSync(new URL('../engine/', import.meta.url), { recursive: true });
writeFileSync(DST, src);
console.log(`engine patched: ${PATCHES.map(p => p[0]).join(', ')} -> engine/my-3d2dge.js (${src.length} bytes)`);
