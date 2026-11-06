// One-off helper that lays out src/data/townMap.js (rows of characters). Designers edit the
// rows directly afterwards; this exists so the first layout could be reasoned about in code.
import { writeFileSync } from 'node:fs';
import { BUILDINGS, LANDMARKS } from '../src/data/town.js';
const W = 80, H = 64;
const g = Array.from({ length: H }, () => Array(W).fill('.'));
const rect = (x0, z0, x1, z1, c) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (g[z]?.[x] !== undefined) g[z][x] = c; };
const when = (x0, z0, x1, z1, c, only) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (g[z]?.[x] !== undefined && only.includes(g[z][x])) g[z][x] = c; };
// Terrace
rect(0, 0, 79, 15, ':');
// Sand and sea
rect(0, 49, 79, 57, 's');
rect(0, 58, 79, 63, '~');
for (let x = 0; x < 80; x++) { const d = Math.round(Math.sin(x * 0.31) * 1.2 + Math.sin(x * 0.11) * 1.2); rect(x, 49 + d, x, 57, 's'); rect(x, 57 + Math.round(Math.sin(x * 0.2 + 1) * 0.9), x, 63, '~'); }
// River: fall, flow, bend, mouth
rect(36, 3, 44, 10, 'W');
rect(38, 11, 41, 14, 'W');
rect(38, 2, 41, 2, 'f');
rect(38, 15, 41, 15, 'f');
rect(38, 16, 41, 33, 'w');
rect(38, 32, 45, 34, 'w');
rect(42, 32, 45, 48, 'w');
for (let z = 48; z <= 58; z++) { const k = Math.floor((z - 48) * 0.7); rect(42 - k, z, 45 + k, z, 'm'); }
// Pond
rect(33, 42, 38, 46, 'o'); rect(34, 41, 37, 47, 'o');
// Cliff line and ramps
rect(0, 15, 37, 15, 'C'); rect(42, 15, 79, 15, 'C');
for (const rx of [22, 54]) {
  rect(rx - 1, 12, rx - 1, 15, 'C'); rect(rx + 4, 12, rx + 4, 15, 'C');
  rect(rx, 12, rx + 3, 15, '^');
}
// Terrace bridge
rect(38, 12, 41, 13, 'B');
// Plaza
rect(16, 33, 32, 47, '_');
// Paths
const path = (x0, z0, x1, z1) => when(x0, z0, x1, z1, '=', ['.', 's']);
const tpath = (x0, z0, x1, z1) => when(x0, z0, x1, z1, '"', [':']);
path(0, 27, 14, 29); // the road out
path(13, 29, 14, 42); path(8, 40, 15, 42);
path(23, 16, 24, 32);  // ramp to plaza
path(32, 37, 41, 38); // plaza to bend
path(46, 38, 51, 39); path(46, 39, 66, 40); path(50, 40, 51, 48); path(50, 48, 56, 48);
path(39, 16, 39, 16);
path(24, 25, 37, 26); path(42, 24, 56, 25); // upper row across north bridge
path(55, 16, 56, 24); path(56, 25, 72, 27);
path(66, 40, 70, 41);
path(17, 24, 24, 25); path(20, 31, 23, 32); path(51, 23, 53, 25);
path(24, 47, 24, 50); path(23, 47, 25, 49);
tpath(22, 10, 24, 11); tpath(23, 11, 37, 11); tpath(36, 12, 37, 13); tpath(42, 12, 43, 13); tpath(42, 11, 58, 11); tpath(55, 11, 56, 11); tpath(58, 7, 70, 8); tpath(58, 7, 59, 11);
// Bridges
rect(38, 24, 41, 25, 'b');
rect(42, 38, 45, 39, 'b');
// Dock
rect(23, 55, 25, 62, 'd');
// Tide pools
rect(5, 52, 8, 54, 't'); rect(11, 50, 13, 51, 't'); rect(3, 55, 4, 56, 't');
// Forest ring (blocked border)
for (let z = 0; z < 58; z++) for (const x of [0, 1, 78, 79]) if (!(x < 2 && z >= 27 && z <= 29)) g[z][x] = g[z][x] === ':' || g[z][x] === 'C' ? 'H' : '#';
rect(0, 0, 79, 1, 'H');
g[27][0] = '#'; g[28][0] = '#'; g[29][0] = '#'; // the road ends in trees; the bus comes round the bend
const rows = g.map((r) => r.join(''));
const out = `// The village: 80×64 tiles (1 tile = 1 m), five acres by four. Edit the rows to change the map.
// . grass  = path  _ plaza paving  s sand  ~ sea  w river  o pond  m river mouth  t tide pool
// : terrace grass (+2 m)  " terrace path  W terrace pool  f waterfall  B terrace bridge
// ^ ramp (terrace on the north, ground on the south)  b bridge  d dock  C cliff (blocked)
// # forest ring (blocked)  H forest ring on the terrace (blocked)
export const TOWN_ROWS = [
${rows.map((r) => `  '${r}',`).join('\n')}
];
`;
writeFileSync(new URL('../src/data/townMap.js', import.meta.url), out);
for (const b of BUILDINGS) for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) g[z][x] = 'X';
for (const [k, [x, z]] of Object.entries(LANDMARKS)) g[Math.floor(z)][Math.floor(x)] = '@';
console.log(g.map((r) => r.join('')).join('\n'));
