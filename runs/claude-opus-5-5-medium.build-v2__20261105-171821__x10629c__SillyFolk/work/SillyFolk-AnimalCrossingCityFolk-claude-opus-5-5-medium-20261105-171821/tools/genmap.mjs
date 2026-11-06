// Paints the village and City into rows of characters, written out as plain data (src/data/townMap.js). Run once; edit either.
import { writeFileSync } from 'node:fs';
const W = 80, H = 64; const g = Array.from({ length: H }, () => Array(W).fill('.'));
const rect = (x0, z0, x1, z1, c) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (g[z] && x >= 0 && x < W) g[z][x] = c; };
// beach and sea
rect(0, 50, 79, 63, 's'); rect(0, 58, 79, 63, '~');
for (let x = 0; x < W; x++) { const e = 57 + Math.round(Math.sin(x * 0.31) * 1.2); for (let z = e; z < 64; z++) g[z][x] = '~'; }
// upper terrace (two halves) with a lower basin between
rect(2, 2, 31, 14, 'u'); rect(48, 2, 77, 14, 'u'); rect(2, 15, 31, 15, 'c'); rect(48, 15, 77, 15, 'c'); rect(31, 2, 31, 15, 'c'); rect(48, 2, 48, 15, 'c');
rect(32, 0, 47, 3, 'c');
// ramps up from row B
rect(22, 15, 24, 18, 'r'); rect(52, 15, 54, 18, 'r');
// river: pool, then south with a bend, then the mouth
rect(35, 4, 44, 10, 'w'); rect(38, 11, 41, 33, 'w'); rect(39, 33, 43, 36, 'w'); rect(41, 36, 44, 48, 'w'); rect(40, 49, 46, 58, 'm');
// pond
rect(33, 39, 37, 44, 'o'); rect(32, 40, 38, 43, 'o');
// bridges
rect(37, 24, 42, 26, 'b'); rect(40, 39, 45, 41, 'b');
rect(39, 53, 47, 54, 'b');
// dock
rect(19, 54, 21, 62, 'b');
// tide pools
for (const [x, z] of [[5, 54], [6, 54], [5, 55], [9, 56], [10, 56], [12, 55]]) g[z][x] = '~';
// plaza
rect(16, 33, 31, 44, 'P');
// paths
const hp = (z, x0, x1) => { for (let x = x0; x <= x1; x++) for (const dz of [0, 1]) if ('.su'.includes(g[z + dz][x])) g[z + dz][x] = g[z + dz][x] === 'u' ? 'U' : ','; };
const vp = (x, z0, z1) => { for (let z = z0; z <= z1; z++) for (const dx of [0, 1]) if ('.su'.includes(g[z][x + dx])) g[z][x + dx] = g[z][x + dx] === 'u' ? 'U' : ','; };
hp(38, 3, 16); hp(38, 31, 70); hp(25, 3, 74); vp(8, 25, 38); vp(23, 19, 33); vp(53, 19, 38); hp(47, 8, 76); vp(24, 44, 53); vp(62, 38, 50); hp(52, 8, 39); hp(52, 47, 72); vp(68, 25, 38); rect(40, 47, 45, 48, 'b');
vp(23, 7, 14); vp(53, 8, 14); hp(8, 3, 28); hp(8, 53, 74);
// edges: forest ring on three sides
rect(0, 0, 1, 57, '#'); rect(78, 0, 79, 57, '#'); rect(0, 0, 31, 1, '#'); rect(48, 0, 79, 1, '#');
const town = g.map((r) => r.join(''));
// City: an L-shaped boulevard around a plaza, 48×24
const CW = 48, CH = 24; const c = Array.from({ length: CH }, () => Array(CW).fill('#'));
const crect = (x0, z0, x1, z1, ch) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) c[z][x] = ch; };
crect(1, 7, 46, 14, 'k'); crect(3, 9, 44, 12, 'A'); crect(24, 7, 38, 22, 'k'); crect(26, 15, 36, 22, 'Q');
crect(26, 9, 36, 14, 'A'); crect(1, 9, 3, 12, 'k'); crect(18, 2, 19, 6, 'k');
const city = c.map((r) => r.join(''));
const q = (rows) => rows.map((r) => `  '${r}',`).join('\n');
writeFileSync(new URL('../src/data/townMap.js', import.meta.url), `// Village map, one character a metre. . grass , path P plaza s sand u upper grass U upper path r ramp c cliff lip # forest b boards w river o pond m river mouth ~ sea\nexport const TOWN_ROWS = [\n${q(town)}\n];\n// City map. k kerb A asphalt road (walkable) Q plaza # wall\nexport const CITY_ROWS = [\n${q(city)}\n];\n`);
console.log(town.join('\n')); console.log(city.join('\n'));
