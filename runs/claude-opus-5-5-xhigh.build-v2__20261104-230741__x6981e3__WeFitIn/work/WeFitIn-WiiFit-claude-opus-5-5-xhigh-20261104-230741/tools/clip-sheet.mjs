// Preview clips without a GPU: node tools/clip-sheet.mjs [ClipName ...] writes check/clips/<name>.png.
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileClips, Engine, HERO_MODEL, HERO_RIG, renderSheet, THREE } from '../pixel-engine.js';
import { dress } from '../src/art/avatar.js';
import { GAME_CLIPS } from '../src/art/clips.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'check', 'clips');
mkdirSync(OUT, { recursive: true });

function png({ width, height, data }) {
  const chunk = (type, body) => {
    const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    crc.writeUInt32BE(crc32(Buffer.concat([t, body])) >>> 0);
    return Buffer.concat([len, t, body, crc]);
  };
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

class Holder { name = 'clip-sheet'; assets = [HERO_MODEL]; async setup(ctx) { this.model = (await ctx.loadModel(HERO_MODEL, { castShadow: false })).scene; } cameraTarget() { return new THREE.Vector3(); } }
const holder = new Holder();
await Engine.headless(holder, {});
// Dress it first, so we judge the real silhouette and not the kit's hat and moustache.
dress(holder.model, { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink', headband: 'red' });
const only = process.argv.slice(2);
const defs = GAME_CLIPS.filter((c) => !only.length || only.includes(c.name));
const clips = compileClips(defs, HERO_RIG, holder.model);
defs.forEach((def, i) => {
  const count = def.frames > 36 ? 5 : 6; // frames is a list of the frame numbers to draw
  const frames = Array.from({ length: count }, (_, k) => Math.round((k / (count - 1)) * def.frames));
  writeFileSync(join(OUT, `${def.name}.png`), png(renderSheet(holder.model, HERO_RIG, def, clips[i], { frames, views: ['front', 'side'], scale: 90, trails: false, skeleton: false })));
});
console.log(`${defs.length} sheets in check/clips`);
process.exit(0);
