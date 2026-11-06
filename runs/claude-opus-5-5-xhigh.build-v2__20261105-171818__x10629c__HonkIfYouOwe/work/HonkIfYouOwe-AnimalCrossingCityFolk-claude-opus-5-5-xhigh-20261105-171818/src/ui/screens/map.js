// The map: a pixel map, pins, who's where now.
import { panel, drawText, inRect, dim, textWidth } from '../draw.js';
import { COLS, ROWS, tileChar } from '../../world/tiles.js';
import { BUILDINGS, LANDMARKS, ACRE_NAMES } from '../../data/town.js';
import { NEIGHBOUR_ORDER, NEIGHBOURS } from '../../data/neighbours.js';

const LEGEND = { '.': 'green', ':': 'lime', '=': 'sand', '"': 'sand', _: 'mist', s: 'sand', '~': 'blue', w: 'sky', o: 'sky', m: 'blue', t: 'sky', W: 'sky', f: 'white', B: 'orange', '^': 'sand', b: 'orange', d: 'orange', C: 'slate', '#': 'teal', H: 'teal', X: 'plum' };
const SEASON_LAWN = ['lime', 'green', 'sand', 'white'];
const SEASON_HIGH = ['lime', 'lime', 'orange', 'mist'];
const CHAR_MAP = { '.': 'a', ':': 'b', '=': 'c', '"': 'c', _: 'd', s: 'c', '~': 'e', w: 'f', o: 'f', m: 'e', t: 'f', W: 'f', f: 'g', B: 'h', '^': 'c', b: 'h', d: 'h', C: 'i', '#': 'j', H: 'j' };
let rowsCache = null;
function mapRows() {
  if (rowsCache) return rowsCache;
  const s = 3;
  const grid = [];
  for (let z = 0; z < ROWS; z++) { let line = ''; for (let x = 0; x < COLS; x++) line += (CHAR_MAP[tileChar(x, z)] ?? 'a').repeat(s); for (let i = 0; i < s; i++) grid.push(line); }
  const out = grid.map((l) => l.split(''));
  for (const b of BUILDINGS) for (let z = b.z * s; z < (b.z + b.d) * s; z++) for (let x = b.x * s; x < (b.x + b.w) * s; x++) out[z][x] = 'k';
  rowsCache = out.map((l) => l.join(''));
  return rowsCache;
}
class MapScreen {
  constructor(g) {
    this.id = 'map';
    this.focus = 0;
    this.pins = [];
    for (const b of BUILDINGS) this.pins.push({ name: b.id === 'home' ? 'Your place' : b.name, x: b.x + b.w / 2, z: b.z + b.d / 2, kind: 'b' });
    this.pins.push({ name: 'Bus stop', x: LANDMARKS.busStop[0], z: LANDMARKS.busStop[1], kind: 'b' });
    this.pins.push({ name: 'The Old Pear', x: LANDMARKS.oldPear[0], z: LANDMARKS.oldPear[1], kind: 'b' });
    this.pins.push({ name: 'The Lookout', x: LANDMARKS.lookoutBench[0], z: LANDMARKS.lookoutBench[1], kind: 'b' });
    this.pins.push({ name: 'The Lighthouse', x: LANDMARKS.lighthouse[0], z: LANDMARKS.lighthouse[1], kind: 'b' });
    for (const id of NEIGHBOUR_ORDER) if (g.world.npcs[id].moved === 'here') { const a = g.npcs.actor(id); const inside = g.npcs.get(id).inside; this.pins.push({ name: inside ? `${NEIGHBOURS[id].name}, indoors` : NEIGHBOURS[id].name, x: a.x, z: a.z, kind: 'n', dim: inside }); }
    this.focusPin = this.pins.findIndex((p) => p.kind === 'n');
    if (this.focusPin < 0) this.focusPin = 0;
  }
  focusIndex() { return this.focusPin; }
  labels() { return this.pins.map((p) => p.name); }
  update(g, inp) {
    if (inp.nav.right || inp.nav.down) { this.focusPin = (this.focusPin + 1) % this.pins.length; g.sound('uiTick'); }
    if (inp.nav.left || inp.nav.up) { this.focusPin = (this.focusPin + this.pins.length - 1) % this.pins.length; g.sound('uiTick'); }
    const m = inp.mouse;
    if (m.moved) this.pins.forEach((p, i) => { const [x, y] = this.at(p); if (Math.hypot(m.x - x, m.y - y) < 5) this.focusPin = i; });
    if (inp.back || inp.map || inp.confirm || m.rclick) { g.sound('uiCancel'); g.ui.pop(this); }
  }
  at(p) { return [120 + Math.round(p.x * 3), 22 + Math.round(p.z * 3)]; }
  prompts() { return [['back', 'Close']]; }
  draw(g, hud) {
    dim(hud);
    panel(hud, 112, 14, 256, 208, { fill: 'navy', trim: 'sand' });
    const season = g.season;
    hud.sprite(120, 22, mapRows(), { a: SEASON_LAWN[season], b: SEASON_HIGH[season], c: 'sand', d: 'mist', e: 'blue', f: 'sky', g: 'white', h: 'orange', i: 'slate', j: 'teal', k: 'plum' }, { shadow: false });
    this.pins.forEach((p, i) => {
      const [x, y] = this.at(p);
      if (i === this.focusPin) { hud.rect(x - 3, y - 3, 7, 7, 'ink'); hud.rect(x - 2, y - 2, 5, 5, 'sand'); }
      else if (p.kind === 'n') { hud.rect(x - 1, y - 1, 3, 3, p.dim ? 'slate' : 'red'); }
    });
    if (g.place === g.town) {
      const [x, y] = this.at({ x: g.player.x, z: g.player.z });
      const on = Math.floor(g.ctx.time * 3) % 2 === 0;
      hud.rect(x - 2, y - 2, 5, 5, on ? 'white' : 'ink');
    }
    const name = this.pins[this.focusPin].name;
    const col = Math.max(0, Math.min(4, Math.floor(g.player.x / 16))), row = Math.max(0, Math.min(3, Math.floor(g.player.z / 16)));
    const where = g.place === g.town ? `You are in ${ACRE_NAMES[row][col]}.` : `You are at ${g.place.def?.name ?? g.place.name}.`;
    panel(hud, 112, 224, 256, 26, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 228, name, { align: 'center', color: 'ink' });
    drawText(hud, 240, 238, where, { align: 'center', color: 'slate' });
  }
}
export const mapScreen = (g) => new MapScreen(g);
export { LEGEND, inRect, textWidth };
