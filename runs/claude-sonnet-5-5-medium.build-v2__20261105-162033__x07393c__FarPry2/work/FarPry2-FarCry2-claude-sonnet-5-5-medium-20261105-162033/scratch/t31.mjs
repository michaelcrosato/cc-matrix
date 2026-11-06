import { freePlay } from '../tests/lib/boot.mjs';
const { e, g } = await freePlay(); g.mapSys.raise(true); e.step(40);
const d = g.mapSys.data; const px = (x, y) => [d[(y * 320 + x) * 4], d[(y * 320 + x) * 4 + 1], d[(y * 320 + x) * 4 + 2]];
console.log('gps', px(250, 5), 'margin', px(300, 100), 'paper', px(100, 100), 'tex', g.mapSys.tex.image.width, g.mapSys.tex.image.height, g.mapSys.plane.material.map === g.mapSys.tex);
