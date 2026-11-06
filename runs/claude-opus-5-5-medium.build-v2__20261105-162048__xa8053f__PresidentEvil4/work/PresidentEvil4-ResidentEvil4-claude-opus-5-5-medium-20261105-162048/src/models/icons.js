// Item icons as TextureDefs with SVG path layers, read through hudSprite. Sized to their Case footprint (14 art px a cell).
import { hudSprite, textureDef } from '../../pixel-engine.js';
const T = (id, w, h, palette, layers) => textureDef({ id: `icon-${id}`, about: `Icon for ${id}`, tags: ['icon'], size: [w, h], palette, layers });
const R = (x, y, w, h) => `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
const gun = { steel: 'slate', hi: 'mist', wood: 'orange', dark: 'night' };
export const ICON_DEFS = {
  pistol: T('pistol', 42, 28, gun, [{ path: `${R(6, 7, 30, 6)}`, fill: 'steel' }, { path: R(14, 5, 12, 11), fill: 'hi' }, { path: 'M12 13 L22 13 L18 25 L8 25 Z', fill: 'wood' }, { path: R(6, 8, 30, 1), fill: 'hi' }, { path: R(20, 13, 6, 5), fill: 'dark' }]),
  scatter: T('scatter', 98, 28, gun, [{ path: R(26, 8, 66, 5), fill: 'steel' }, { path: R(40, 13, 22, 5), fill: 'wood' }, { path: 'M4 10 L28 8 L28 16 L14 22 L4 22 Z', fill: 'wood' }, { path: R(26, 8, 66, 1), fill: 'hi' }, { path: R(88, 6, 3, 2), fill: 'hi' }]),
  rifle: T('rifle', 112, 28, gun, [{ path: R(24, 10, 84, 3), fill: 'steel' }, { path: 'M4 12 L34 10 L70 12 L70 16 L34 16 L16 23 L4 23 Z', fill: 'dark' }, { path: R(36, 4, 28, 4), fill: 'hi' }, { path: R(44, 8, 3, 2), fill: 'steel' }, { path: R(58, 8, 3, 2), fill: 'steel' }]),
  harpoon: T('harpoon', 84, 28, gun, [{ path: R(10, 12, 50, 7), fill: 'wood' }, { path: R(14, 9, 66, 3), fill: 'hi' }, { path: 'M74 6 L82 10 L74 15 Z', fill: 'hi' }, { path: R(44, 3, 3, 22), fill: 'steel' }, { path: 'M16 19 L24 19 L20 26 L12 26 Z', fill: 'wood' }]),
  ammo_pistol: T('ammo_pistol', 28, 14, { box: 'sand', dark: 'night', hi: 'white' }, [{ path: R(3, 3, 22, 9), fill: 'box' }, { path: R(3, 7, 22, 2), fill: 'dark' }, { path: R(6, 4, 3, 2), fill: 'hi' }]),
  ammo_shells: T('ammo_shells', 28, 14, { a: 'red', b: 'sand' }, [{ path: `${R(3, 2, 6, 10)}${R(11, 2, 6, 10)}${R(19, 2, 6, 10)}`, fill: 'a' }, { path: `${R(3, 9, 6, 3)}${R(11, 9, 6, 3)}${R(19, 9, 6, 3)}`, fill: 'b' }]),
  ammo_rifle: T('ammo_rifle', 28, 14, { a: 'sand', b: 'orange' }, [{ path: `${R(3, 3, 3, 9)}${R(8, 3, 3, 9)}${R(13, 3, 3, 9)}${R(18, 3, 3, 9)}`, fill: 'a' }, { path: `${R(3, 1, 3, 2)}${R(8, 1, 3, 2)}${R(13, 1, 3, 2)}${R(18, 1, 3, 2)}`, fill: 'b' }]),
  ammo_bolts: T('ammo_bolts', 42, 14, { a: 'mist', b: 'white' }, [{ path: `${R(3, 3, 32, 2)}${R(3, 9, 32, 2)}`, fill: 'a' }, { path: 'M35 1 L40 4 L35 7 Z M35 7 L40 10 L35 13 Z', fill: 'b' }]),
  samphire: T('samphire', 14, 28, { a: 'green', b: 'lime' }, [{ path: `${R(6, 4, 2, 21)}`, fill: 'a' }, { path: 'M7 8 L12 4 L12 9 Z M7 13 L2 9 L2 14 Z M7 18 L12 14 L12 19 Z', fill: 'b' }]),
  dulse: T('dulse', 14, 28, { a: 'plum', b: 'red' }, [{ path: 'M7 25 L3 16 L7 5 L11 16 Z', fill: 'b' }, { path: R(6, 12, 2, 13), fill: 'a' }]),
  holly: T('holly', 14, 28, { a: 'sand', b: 'orange' }, [{ path: 'M7 4 L12 12 L7 25 L2 12 Z', fill: 'a' }, { path: R(6, 8, 2, 16), fill: 'b' }]),
  mix_ss: T('mix_ss', 14, 28, { a: 'lime', b: 'white', c: 'green' }, [{ path: R(3, 6, 8, 19), fill: 'c' }, { path: R(4, 9, 6, 15), fill: 'a' }, { path: R(5, 3, 4, 3), fill: 'b' }]),
  mix_sss: T('mix_sss', 14, 28, { a: 'cyan', b: 'white', c: 'green' }, [{ path: R(3, 6, 8, 19), fill: 'c' }, { path: R(4, 9, 6, 15), fill: 'a' }, { path: R(5, 3, 4, 3), fill: 'b' }]),
  mix_sd: T('mix_sd', 14, 28, { a: 'orange', b: 'white', c: 'plum' }, [{ path: R(3, 6, 8, 19), fill: 'c' }, { path: R(4, 9, 6, 15), fill: 'a' }, { path: R(5, 3, 4, 3), fill: 'b' }]),
  mix_sdh: T('mix_sdh', 14, 28, { a: 'sand', b: 'white', c: 'orange' }, [{ path: R(3, 6, 8, 19), fill: 'c' }, { path: R(4, 9, 6, 15), fill: 'a' }, { path: R(5, 3, 4, 3), fill: 'b' }]),
  firstaid: T('firstaid', 14, 28, { a: 'white', b: 'red' }, [{ path: R(2, 6, 10, 16), fill: 'a' }, { path: `${R(6, 8, 2, 12)}${R(3, 13, 8, 2)}`, fill: 'b' }]),
  flare: T('flare', 14, 28, { a: 'red', b: 'white' }, [{ path: R(4, 6, 6, 19), fill: 'a' }, { path: R(4, 3, 6, 4), fill: 'b' }]),
  depth: T('depth', 14, 28, { a: 'night', b: 'sand' }, [{ path: R(2, 7, 10, 16), fill: 'a' }, { path: `${R(2, 10, 10, 2)}${R(2, 19, 10, 2)}`, fill: 'b' }]),
  oil: T('oil', 14, 28, { a: 'lime', b: 'sand', c: 'orange' }, [{ path: R(3, 11, 8, 14), fill: 'a' }, { path: R(5, 6, 4, 6), fill: 'a' }, { path: R(5, 3, 4, 3), fill: 'b' }, { path: R(6, 1, 2, 2), fill: 'c' }]),
  pearl: T('pearl', 28, 28, { a: 'white', b: 'mist' }, [{ path: 'M14 6 L20 9 L22 14 L20 19 L14 22 L8 19 L6 14 L8 9 Z', fill: 'b' }, { path: 'M10 9 L15 8 L14 13 L9 13 Z', fill: 'a' }]),
  blackpearl: T('blackpearl', 28, 28, { a: 'slate', b: 'ink', c: 'plum' }, [{ path: 'M14 6 L20 9 L22 14 L20 19 L14 22 L8 19 L6 14 L8 9 Z', fill: 'c' }, { path: 'M10 9 L15 8 L14 13 L9 13 Z', fill: 'a' }]),
  seaglass: T('seaglass', 28, 28, { a: 'cyan', b: 'lime', c: 'sky' }, [{ path: 'M4 12 L12 8 L14 16 L6 20 Z', fill: 'a' }, { path: 'M14 6 L24 8 L22 15 L15 13 Z', fill: 'b' }, { path: 'M15 16 L24 18 L20 24 L13 22 Z', fill: 'c' }]),
  amber: T('amber', 28, 28, { a: 'orange', b: 'sand', c: 'night' }, [{ path: 'M14 4 L23 11 L19 23 L9 23 L5 11 Z', fill: 'a' }, { path: 'M9 9 L14 7 L12 13 Z', fill: 'b' }, { path: R(13, 14, 3, 3), fill: 'c' }]),
  tusk: T('tusk', 28, 28, { a: 'white', b: 'slate' }, [{ path: 'M4 24 C8 14 14 6 24 4 C22 12 16 22 8 26 Z', fill: 'a' }, { path: R(11, 14, 5, 2), fill: 'b' }]),
  goldtooth: T('goldtooth', 28, 28, { a: 'sand', b: 'orange' }, [{ path: 'M8 7 L20 7 L20 15 L18 23 L15 16 L13 16 L10 23 L8 15 Z', fill: 'a' }, { path: R(10, 9, 3, 3), fill: 'b' }]),
  reliquary: T('reliquary', 28, 28, { a: 'orange', b: 'sand', c: 'ink' }, [{ path: R(5, 9, 18, 14), fill: 'a' }, { path: 'M5 9 L14 3 L23 9 Z', fill: 'b' }, { path: `${R(8, 13, 3, 3)}${R(13, 13, 3, 3)}${R(18, 13, 3, 3)}`, fill: 'c' }]),
  coldkey: T('coldkey', 28, 28, { a: 'cyan', b: 'white' }, [{ path: `${R(12, 5, 4, 14)}${R(16, 15, 5, 2)}${R(16, 11, 4, 2)}`, fill: 'a' }, { path: 'M8 18 L20 18 L20 25 L8 25 Z', fill: 'b' }]),
  chart: T('chart', 28, 28, { a: 'sand', b: 'plum', c: 'red' }, [{ path: R(4, 5, 20, 18), fill: 'a' }, { path: 'M8 10 L18 9 L20 18 L10 19 Z', fill: 'b' }, { path: R(12, 12, 3, 3), fill: 'c' }]),
  case1: T('case1', 28, 28, { a: 'slate', b: 'sand', c: 'night' }, [{ path: R(4, 9, 20, 14), fill: 'a' }, { path: R(10, 5, 8, 4), fill: 'c' }, { path: `${R(7, 11, 3, 3)}${R(18, 11, 3, 3)}`, fill: 'b' }]),
  case2: T('case2', 28, 28, { a: 'mist', b: 'orange', c: 'night' }, [{ path: R(3, 8, 22, 16), fill: 'a' }, { path: R(10, 4, 8, 4), fill: 'c' }, { path: `${R(6, 10, 3, 3)}${R(19, 10, 3, 3)}`, fill: 'b' }]),
  helmet: T('helmet', 32, 32, { a: 'orange', b: 'sand', c: 'lime', d: 'night' }, [{ path: 'M16 2 L24 5 L29 12 L29 22 L24 28 L8 28 L3 22 L3 12 L8 5 Z', fill: 'a' }, { path: 'M16 8 L22 11 L24 16 L22 21 L16 24 L10 21 L8 16 L10 11 Z', fill: 'b' }, { path: 'M16 10 L21 12 L22 16 L21 20 L16 22 L11 20 L10 16 L11 12 Z', fill: 'c' }, { path: R(8, 27, 16, 4), fill: 'd' }]),
  pym: T('pym', 32, 32, { a: 'sand', b: 'night', c: 'white', d: 'navy' }, [{ path: R(8, 6, 16, 16), fill: 'a' }, { path: R(8, 4, 16, 5), fill: 'b' }, { path: `${R(10, 12, 5, 4)}${R(17, 12, 5, 4)}`, fill: 'c' }, { path: R(4, 22, 24, 10), fill: 'd' }, { path: R(14, 22, 4, 8), fill: 'c' }]),
  max: T('max', 32, 32, { a: 'mist', b: 'sand', c: 'ink', d: 'red', e: 'slate' }, [{ path: R(8, 6, 16, 16), fill: 'a' }, { path: R(7, 3, 18, 6), fill: 'b' }, { path: R(8, 12, 16, 4), fill: 'c' }, { path: R(6, 21, 20, 4), fill: 'd' }, { path: R(4, 25, 24, 7), fill: 'e' }]),
};
const CACHE = {};
const GROUP = { };
export function iconFor(id, rot = false) {
  const k = id + (rot ? ':r' : ''); if (CACHE[k]) return CACHE[k];
  const base = hudSprite(ICON_DEFS[id] ?? ICON_DEFS.chart); let rows = base.rows;
  if (rot) { const w = rows[0].length, h = rows.length, out = []; for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x]; out.push(s); } rows = out; }
  return (CACHE[k] = { rows, colors: base.colors, w: rows[0].length, h: rows.length });
}
