// Eight parody paintings as pixel textures, each with a forged variant that differs in one detail.
import { textureDef, textureMap, TEXTURE_LIBRARY, toonMaterial, PALETTE } from '../engine.js';

const full = (c) => ({ path: 'M0 0H32V24H0Z', fill: c });
const P = (d, fill) => ({ path: d, fill });
const pal = { sky: 'sky', blue: 'blue', navy: 'navy', ink: 'ink', white: 'white', sand: 'sand', orange: 'orange', red: 'red', plum: 'plum', green: 'green', lime: 'lime', teal: 'teal', mist: 'mist', slate: 'slate', night: 'night', cyan: 'cyan' };
const LAYERS = {
  monaLlama: [full('teal'), P('M0 16H32V24H0Z', 'green'), P('M9 24C9 16 12 14 16 14C20 14 23 16 23 24Z', 'plum'), P('M13 15V8C13 6 19 6 19 8V15Z', 'white'), P('M12 3L14 7H12ZM20 3L18 7H20Z', 'white'), P('M13 9H15V10H13ZM17 9H19V10H17Z', 'ink'), P('M14 12H18V13H14Z', 'plum')],
  gooseEarring: [full('ink'), P('M12 24C12 17 14 15 16 15C22 15 24 18 24 24Z', 'white'), P('M15 16V9C15 6 22 6 22 9C22 12 19 11 19 16Z', 'white'), P('M22 9L27 10L22 11Z', 'orange'), P('M18 8H19V9H18Z', 'ink'), P('M14 5H24V7H14Z', 'blue'), P('M13 7H16V10H13Z', 'sand')],
  greatWave: [full('sand'), P('M0 18C6 18 8 6 16 5C22 4 24 9 21 11C19 9 16 10 16 13C18 16 24 15 32 18V24H0Z', 'navy'), P('M13 5C16 3 22 4 24 8L21 8C20 6 16 6 13 8Z', 'white'), P('M14 21C16 20 18 20 20 21L19 23H15Z', 'red'), P('M26 5L30 10H22Z', 'white')],
  starryBus: [full('navy'), P('M0 18H32V24H0Z', 'night'), P('M6 14H20V20H6Z', 'sky'), P('M8 15H11V17H8ZM13 15H16V17H13Z', 'cyan'), P('M8 20H10V21H8ZM16 20H18V21H16Z', 'ink'), P('M24 12H25V20H24Z', 'slate'), P('M22 10H27V13H22Z', 'orange'), P('M4 4H6V6H4ZM12 2H14V4H12ZM20 5H22V7H20ZM27 2H29V4H27ZM9 8H10V9H9Z', 'sand'), P('M0 7C6 3 11 11 16 7C21 3 26 11 32 7V8C26 12 21 4 16 8C11 12 6 4 0 8Z', 'blue')],
  venusFlytrap: [full('sky'), P('M0 18H32V24H0Z', 'teal'), P('M8 22C8 16 24 16 24 22Z', 'sand'), P('M10 20H11V22H10ZM13 19H14V22H13ZM16 18H17V22H16ZM19 19H20V22H19ZM22 20H23V22H22Z', 'orange'), P('M14 17V10H18V17Z', 'green'), P('M11 5L16 10L21 5L21 8L16 12L11 8Z', 'lime'), P('M11 5L13 7L14 5L16 8L18 5L19 7L21 5L21 6L11 6Z', 'white'), P('M3 4H8V6H3Z', 'white')],
  theHonk: [full('orange'), P('M0 5C8 2 14 8 22 5C26 4 30 6 32 4V0H0Z', 'red'), P('M0 10C8 7 14 12 32 8V5C14 9 8 5 0 8Z', 'sand'), P('M0 24L18 12H32V14H22L10 24Z', 'plum'), P('M12 24V16C12 12 18 12 18 16V24Z', 'night'), P('M13 8C13 4 19 4 19 8C19 12 13 12 13 8Z', 'white'), P('M15 9H17V12H15Z', 'ink'), P('M14 7H15V8H14ZM17 7H18V8H17Z', 'ink'), P('M26 11H27V14H26ZM29 11H30V14H29Z', 'ink')],
  whistlersMoose: [full('mist'), P('M0 18H32V24H0Z', 'slate'), P('M4 4H12V12H4Z', 'night'), P('M5 5H11V11H5Z', 'white'), P('M16 24V13C16 11 26 11 26 15V24Z', 'ink'), P('M13 6H21V14H13Z', 'plum'), P('M9 3H14V5H9ZM20 3H25V5H20Z', 'sand'), P('M12 2H14V6H12ZM20 2H22V6H20Z', 'sand'), P('M14 12H20V14H14Z', 'ink'), P('M8 5H12V8H8Z', 'red')],
  cheeseDelights: [full('sky'), P('M0 16H32V24H0Z', 'lime'), P('M6 8H26V20H6Z', 'sand'), P('M6 8H26V10H6Z', 'orange'), P('M10 12H13V15H10ZM19 11H23V15H19ZM14 16H17V19H14Z', 'orange'), P('M2 20H5V22H2ZM27 19H30V22H27Z', 'plum'), P('M0 0H6V6H0Z', 'white'), P('M26 2C28 0 30 2 32 2V6H26Z', 'red')],
};
const FORGE = {
  monaLlama: (l) => [...l, P('M12 11H13V13H12ZM19 11H20V13H19Z', 'sand')],
  gooseEarring: (l) => l,
  greatWave: (l) => l.filter((x) => x.fill !== 'red'),
  starryBus: (l) => l.map((x) => (x.fill === 'sand' ? P('M4 4H6V6H4ZM12 2H14V4H12ZM27 2H29V4H27ZM9 8H10V9H9Z', 'sand') : x)),
  venusFlytrap: (l) => l.map((x) => (x.fill === 'sand' ? P('M8 18C8 24 24 24 24 18Z', 'sand') : x)),
  theHonk: (l) => l.filter((x) => !(x.fill === 'ink' && x.path.startsWith('M26'))),
  whistlersMoose: (l) => l.filter((x) => x.fill !== 'red'),
  cheeseDelights: (l) => l.filter((x) => !(x.fill === 'orange' && x.path.startsWith('M10'))),
};
// The genuine goose has the pearl; the forgery doesn't.
LAYERS.gooseEarring.push(P('M20 14H21V16H20Z', 'white'));
FORGE.gooseEarring = (l) => l.slice(0, -1);
const make = (id, layers) => textureDef({ id: `art-${id}`, about: `Painting: ${id}`, tags: ['surface', 'art'], size: [32, 24], palette: pal, layers });
export const PAINTINGS = Object.entries(LAYERS).flatMap(([id, l]) => [make(id, l), make(`${id}F`, FORGE[id](l))]);
let installed = false;
const install = () => { if (installed) return; installed = true; for (const t of PAINTINGS) TEXTURE_LIBRARY.add(t); };
const cache = new Map();
export function paintingMaterial(itemId) {
  install();
  let m = cache.get(itemId);
  if (!m) { m = toonMaterial(PALETTE.white, { map: textureMap(`art-${itemId}`) }); cache.set(itemId, m); }
  return m;
}
