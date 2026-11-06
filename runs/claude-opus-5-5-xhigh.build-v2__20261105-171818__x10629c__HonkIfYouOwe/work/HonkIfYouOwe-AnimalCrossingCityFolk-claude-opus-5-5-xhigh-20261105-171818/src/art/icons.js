// About 45 category icons, 16×16, drawn with tiny shape helpers and an automatic ink outline.
// Rows are authored once as data; colours are slots (o main, x accent, w highlight, # outline).
const S = 16;
function canvas() { return Array.from({ length: S }, () => Array(S).fill('.')); }
function ell(g, cx, cy, rx, ry, c) { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) g[y][x] = c; }
function box(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y]?.[x] !== undefined) g[y][x] = c; }
function line(g, x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / (n || 1)); const y = Math.round(y0 + (y1 - y0) * i / (n || 1)); if (g[y]?.[x] !== undefined) g[y][x] = c; } }
function tri(g, x0, y0, x1, y1, x2, y2, c) { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const a = (x1 - x0) * (y + 0.5 - y0) - (y1 - y0) * (x + 0.5 - x0); const b = (x2 - x1) * (y + 0.5 - y1) - (y2 - y1) * (x + 0.5 - x1); const d = (x0 - x2) * (y + 0.5 - y2) - (y0 - y2) * (x + 0.5 - x2); if ((a >= 0 && b >= 0 && d >= 0) || (a <= 0 && b <= 0 && d <= 0)) g[y][x] = c; } }
function outline(g) {
  const out = g.map((r) => r.slice());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? '.') !== '.')) out[y][x] = '#';
  }
  return out.map((r) => r.join(''));
}
const D = {
  bean: (g) => { ell(g, 8, 8, 4.5, 6, 'o'); box(g, 6, 5, 8, 5, 'w'); line(g, 9, 5, 7, 11, 'x'); },
  fish1: (g) => { ell(g, 7, 8, 5.5, 3.5, 'o'); tri(g, 12, 8, 15, 4, 15, 12, 'x'); box(g, 4, 7, 4, 7, '#'); box(g, 6, 10, 9, 10, 'w'); },
  fish2: (g) => { ell(g, 8, 8, 6.5, 2.5, 'o'); tri(g, 13, 8, 15, 5, 15, 11, 'x'); box(g, 3, 7, 3, 7, '#'); line(g, 6, 6, 11, 6, 'x'); },
  fish3: (g) => { ell(g, 7, 8, 5, 5, 'o'); tri(g, 11, 8, 15, 5, 15, 11, 'x'); tri(g, 7, 3, 10, 1, 10, 4, 'x'); box(g, 4, 6, 4, 6, '#'); },
  crab: (g) => { ell(g, 8, 9, 5, 3.5, 'o'); box(g, 2, 4, 3, 7, 'x'); box(g, 12, 4, 13, 7, 'x'); box(g, 6, 7, 6, 7, '#'); box(g, 9, 7, 9, 7, '#'); line(g, 4, 12, 3, 14, 'x'); line(g, 11, 12, 12, 14, 'x'); },
  boot: (g) => { box(g, 4, 2, 9, 11, 'o'); box(g, 4, 10, 13, 13, 'o'); box(g, 4, 12, 13, 13, 'x'); box(g, 4, 3, 9, 3, 'w'); },
  butterfly: (g) => { ell(g, 4.5, 6, 3.5, 4, 'o'); ell(g, 11.5, 6, 3.5, 4, 'o'); ell(g, 5, 11, 2.5, 2.5, 'x'); ell(g, 11, 11, 2.5, 2.5, 'x'); box(g, 8, 4, 8, 13, '#'); },
  beetle: (g) => { ell(g, 8, 9, 4.5, 5.5, 'o'); ell(g, 8, 3.5, 2.5, 2, 'x'); line(g, 8, 4, 8, 14, '#'); box(g, 2, 8, 3, 8, '#'); box(g, 12, 8, 13, 8, '#'); box(g, 2, 11, 3, 11, '#'); box(g, 12, 11, 13, 11, '#'); },
  flier: (g) => { box(g, 7, 2, 8, 13, 'x'); ell(g, 4, 6, 3.5, 1.5, 'o'); ell(g, 11, 6, 3.5, 1.5, 'o'); ell(g, 4, 9, 3, 1.5, 'o'); ell(g, 11, 9, 3, 1.5, 'o'); },
  hopper: (g) => { ell(g, 7, 9, 5, 2.5, 'o'); ell(g, 12, 8, 2, 2, 'x'); line(g, 4, 8, 2, 4, 'x'); line(g, 2, 4, 1, 11, 'x'); line(g, 8, 11, 7, 14, 'x'); },
  bee: (g) => { ell(g, 8, 9, 5.5, 4, 'o'); box(g, 5, 6, 6, 12, '#'); box(g, 9, 6, 10, 12, '#'); ell(g, 6, 3.5, 2.5, 2, 'w'); ell(g, 10, 3.5, 2.5, 2, 'w'); },
  snail: (g) => { ell(g, 8, 7, 4.5, 4.5, 'o'); ell(g, 8, 7, 2, 2, 'x'); box(g, 2, 11, 14, 12, 'w'); box(g, 13, 8, 14, 11, 'w'); box(g, 13, 6, 13, 7, '#'); },
  bone: (g) => { box(g, 4, 7, 11, 9, 'o'); ell(g, 3.5, 6, 2, 2, 'o'); ell(g, 3.5, 10, 2, 2, 'o'); ell(g, 12.5, 6, 2, 2, 'o'); ell(g, 12.5, 10, 2, 2, 'o'); },
  ammonite: (g) => { ell(g, 8, 8, 6, 6, 'o'); ell(g, 8, 8, 3.5, 3.5, 'x'); ell(g, 8, 8, 1.5, 1.5, 'o'); },
  rockIcon: (g) => { ell(g, 8, 9, 6, 5, 'o'); box(g, 5, 6, 8, 6, 'w'); line(g, 9, 9, 12, 11, 'x'); },
  picture: (g) => { box(g, 1, 3, 14, 12, 'x'); box(g, 3, 5, 12, 10, 'o'); ell(g, 7, 7, 2, 2, 'w'); },
  pear: (g) => { ell(g, 8, 10, 4.5, 4.5, 'o'); ell(g, 8, 6, 2.5, 3, 'o'); box(g, 8, 1, 8, 3, 'x'); box(g, 9, 2, 10, 2, 'x'); box(g, 6, 8, 6, 9, 'w'); },
  fruitRound: (g) => { ell(g, 8, 9, 5.5, 5.5, 'o'); box(g, 8, 2, 8, 4, 'x'); box(g, 9, 3, 11, 3, 'x'); box(g, 5, 7, 6, 8, 'w'); },
  flowerIcon: (g) => { for (const [x, y] of [[8, 4], [4.5, 7], [11.5, 7], [6, 11], [10, 11]]) ell(g, x, y, 2.5, 2.5, 'o'); ell(g, 8, 8, 2, 2, 'x'); },
  seed: (g) => { box(g, 3, 3, 12, 13, 'o'); box(g, 3, 3, 12, 5, 'x'); ell(g, 8, 9, 2.5, 2.5, 'w'); },
  sapling: (g) => { ell(g, 8, 5, 4, 3.5, 'o'); box(g, 7, 8, 8, 13, 'x'); box(g, 5, 13, 10, 14, 'x'); },
  weedIcon: (g) => { line(g, 8, 13, 8, 4, 'o'); line(g, 8, 11, 4, 6, 'o'); line(g, 8, 11, 12, 6, 'o'); box(g, 6, 13, 9, 14, 'x'); },
  shell: (g) => { tri(g, 8, 13, 1, 5, 15, 5, 'o'); ell(g, 8, 6, 6.5, 3, 'o'); line(g, 8, 13, 4, 4, 'x'); line(g, 8, 13, 8, 3, 'x'); line(g, 8, 13, 12, 4, 'x'); },
  driftIcon: (g) => { line(g, 2, 11, 13, 5, 'o'); line(g, 2, 10, 13, 4, 'o'); line(g, 3, 12, 14, 6, 'o'); line(g, 7, 8, 9, 3, 'x'); },
  bag: (g) => { ell(g, 8, 10, 5, 5, 'o'); box(g, 6, 3, 9, 5, 'o'); box(g, 5, 5, 10, 5, 'x'); box(g, 7, 8, 8, 12, 'w'); },
  cheese: (g) => { tri(g, 2, 12, 14, 5, 14, 12, 'o'); box(g, 2, 12, 14, 13, 'x'); ell(g, 10, 10, 1.5, 1.5, 'x'); ell(g, 6, 11, 1, 1, 'x'); },
  chair: (g) => { box(g, 4, 2, 5, 13, 'o'); box(g, 4, 8, 11, 9, 'x'); box(g, 10, 9, 11, 13, 'o'); },
  table: (g) => { box(g, 1, 6, 14, 8, 'o'); box(g, 3, 9, 4, 13, 'x'); box(g, 11, 9, 12, 13, 'x'); },
  bed: (g) => { box(g, 1, 5, 2, 13, 'x'); box(g, 13, 8, 14, 13, 'x'); box(g, 2, 8, 13, 11, 'o'); box(g, 3, 6, 6, 8, 'w'); },
  lamp: (g) => { tri(g, 8, 2, 3, 8, 13, 8, 'o'); box(g, 7, 8, 8, 12, 'x'); box(g, 5, 13, 10, 14, 'x'); },
  shelfIcon: (g) => { box(g, 2, 2, 13, 14, 'x'); box(g, 4, 4, 11, 7, 'o'); box(g, 4, 9, 11, 12, 'w'); },
  sofa: (g) => { box(g, 2, 5, 13, 9, 'o'); box(g, 1, 8, 14, 12, 'x'); box(g, 2, 13, 3, 14, '#'); box(g, 12, 13, 13, 14, '#'); },
  plantIcon: (g) => { ell(g, 8, 5, 5, 4, 'o'); box(g, 5, 9, 10, 14, 'x'); },
  tv: (g) => { box(g, 1, 3, 14, 11, 'x'); box(g, 3, 5, 12, 9, 'o'); box(g, 6, 12, 9, 13, 'x'); },
  stereo: (g) => { box(g, 2, 4, 13, 12, 'x'); ell(g, 5, 8, 2.5, 2.5, 'o'); ell(g, 11, 8, 2.5, 2.5, 'o'); box(g, 7, 2, 8, 3, 'x'); },
  clock: (g) => { ell(g, 8, 8, 6, 6, 'o'); line(g, 8, 8, 8, 4, 'x'); line(g, 8, 8, 11, 9, 'x'); },
  rug: (g) => { box(g, 1, 4, 14, 12, 'o'); box(g, 3, 6, 12, 10, 'x'); box(g, 5, 8, 10, 8, 'w'); },
  trophy: (g) => { box(g, 4, 2, 11, 7, 'o'); ell(g, 8, 7, 4, 3, 'o'); box(g, 7, 9, 8, 11, 'x'); box(g, 4, 12, 11, 13, 'x'); box(g, 2, 3, 3, 6, 'o'); box(g, 12, 3, 13, 6, 'o'); },
  shirt: (g) => { box(g, 4, 3, 11, 13, 'o'); box(g, 1, 3, 3, 7, 'o'); box(g, 12, 3, 14, 7, 'o'); box(g, 6, 3, 9, 4, 'x'); },
  hat: (g) => { box(g, 5, 4, 10, 10, 'o'); box(g, 2, 10, 13, 12, 'o'); box(g, 5, 8, 10, 9, 'x'); },
  glasses: (g) => { ell(g, 4.5, 8, 3, 3, 'w'); ell(g, 11.5, 8, 3, 3, 'w'); ell(g, 4.5, 8, 1.5, 1.5, 'o'); ell(g, 11.5, 8, 1.5, 1.5, 'o'); box(g, 7, 7, 8, 7, 'x'); },
  umbrella: (g) => { ell(g, 8, 7, 6.5, 5, 'o'); box(g, 1, 7, 14, 12, '.'); box(g, 8, 7, 8, 13, 'x'); box(g, 6, 13, 8, 13, 'x'); },
  wallpaper: (g) => { box(g, 3, 2, 11, 13, 'o'); for (let x = 4; x < 11; x += 3) box(g, x, 2, x, 13, 'x'); box(g, 11, 2, 13, 4, 'w'); },
  floorIcon: (g) => { box(g, 2, 3, 13, 12, 'o'); for (let y = 5; y < 12; y += 3) box(g, 2, y, 13, y, 'x'); },
  letter: (g) => { box(g, 1, 4, 14, 12, 'w'); line(g, 1, 4, 8, 9, 'x'); line(g, 14, 4, 8, 9, 'x'); box(g, 11, 5, 13, 7, 'o'); },
  record: (g) => { ell(g, 8, 8, 6.5, 6.5, 'o'); ell(g, 8, 8, 2.5, 2.5, 'x'); ell(g, 8, 8, 1, 1, 'w'); },
  gift: (g) => { box(g, 2, 6, 13, 13, 'o'); box(g, 7, 6, 8, 13, 'x'); box(g, 2, 8, 13, 9, 'x'); ell(g, 6, 4, 2, 1.5, 'x'); ell(g, 10, 4, 2, 1.5, 'x'); },
  net: (g) => { line(g, 2, 14, 9, 7, 'x'); ell(g, 10, 5, 4, 4, 'w'); ell(g, 10, 5, 2.5, 2.5, 'o'); },
  rod: (g) => { line(g, 2, 14, 13, 1, 'x'); line(g, 13, 1, 14, 9, 'w'); ell(g, 14, 10, 1, 1, 'o'); ell(g, 5, 11, 1.5, 1.5, 'o'); },
  shovel: (g) => { line(g, 12, 2, 6, 8, 'x'); box(g, 2, 9, 7, 14, 'o'); line(g, 11, 1, 14, 4, 'x'); },
  axe: (g) => { line(g, 4, 14, 11, 3, 'x'); box(g, 6, 2, 13, 7, 'o'); box(g, 12, 2, 13, 7, 'w'); },
  can: (g) => { box(g, 5, 6, 12, 13, 'o'); line(g, 5, 8, 1, 4, 'o'); box(g, 0, 3, 2, 4, 'x'); ell(g, 9, 5, 3, 2.5, '.'); line(g, 7, 6, 8, 3, 'x'); line(g, 11, 6, 9, 3, 'x'); },
  sling: (g) => { line(g, 8, 14, 8, 8, 'x'); line(g, 8, 8, 4, 3, 'x'); line(g, 8, 8, 12, 3, 'x'); line(g, 4, 3, 12, 3, 'o'); ell(g, 8, 4, 1.5, 1.5, 'o'); },
  coffee: (g) => { box(g, 3, 5, 10, 12, 'w'); box(g, 4, 6, 9, 7, 'x'); box(g, 11, 7, 13, 10, 'w'); line(g, 5, 1, 6, 4, 'o'); line(g, 8, 1, 9, 4, 'o'); },
  medicine: (g) => { box(g, 5, 3, 10, 13, 'o'); box(g, 6, 1, 9, 2, 'x'); box(g, 7, 6, 8, 10, 'w'); box(g, 6, 7, 9, 8, 'w'); },
  star: (g) => { tri(g, 8, 1, 3, 14, 13, 14, 'o'); tri(g, 1, 5, 15, 5, 8, 11, 'o'); },
  mush: (g) => { ell(g, 8, 6, 6, 4.5, 'o'); box(g, 2, 7, 13, 10, '.'); box(g, 6, 7, 9, 13, 'w'); ell(g, 6, 4, 1, 1, 'w'); ell(g, 10, 5, 1, 1, 'w'); },
  gem: (g) => { tri(g, 8, 14, 2, 6, 14, 6, 'o'); box(g, 4, 3, 11, 6, 'o'); line(g, 8, 3, 8, 13, 'x'); },
  ticket: (g) => { box(g, 1, 5, 14, 11, 'o'); box(g, 5, 5, 5, 11, 'x'); ell(g, 10, 8, 1.5, 1.5, 'w'); },
  question: (g) => { box(g, 2, 2, 13, 13, 'o'); box(g, 6, 4, 9, 4, 'w'); box(g, 9, 4, 9, 7, 'w'); box(g, 7, 7, 9, 7, 'w'); box(g, 7, 7, 7, 9, 'w'); box(g, 7, 11, 7, 11, 'w'); },
};
export const ICONS = {};
for (const [id, fn] of Object.entries(D)) { const g = canvas(); fn(g); ICONS[id] = outline(g); }
const DEFAULT = { o: 'sand', x: 'orange', w: 'white', '#': 'ink' };
const cache = new Map();
const cols = (c) => {
  if (!c) return DEFAULT;
  let v = cache.get(c);
  if (!v) { v = { ...DEFAULT, ...c }; cache.set(c, v); }
  return v;
};
export function drawIcon(hud, x, y, id, colors, scale = 1) {
  const rows = ICONS[id] ?? ICONS.question;
  hud.sprite(x, y, rows, cols(colors), { shadow: false, scale });
}
