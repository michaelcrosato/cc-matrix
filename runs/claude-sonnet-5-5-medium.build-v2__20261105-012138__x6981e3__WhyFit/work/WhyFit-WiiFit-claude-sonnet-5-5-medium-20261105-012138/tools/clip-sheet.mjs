// node tools/clip-sheet.mjs Tree Heron ... -> shots/clip-<name>.png via the kit's software renderSheet (no GPU).
import { Engine, HERO_RIG, HERO_MODEL, HERO_CLIPS, compileClips, renderSheet, gaitClip } from '../pixel-engine.js';
import { NEW_CLIPS, jogGait } from '../src/art/clips.js';
import { readFile, writeFile } from 'node:fs/promises';
import { deflateSync, crc32 } from 'node:zlib';
let model; const game = { name: 'sheet', async setup(ctx) { model = (await ctx.loadModel(HERO_MODEL)).scene; }, cameraTarget: () => ({ x: 0, y: 0, z: 0, set() { return this; } }) };
const assets = async (p) => new Uint8Array(await readFile(new URL('../' + p, import.meta.url))).buffer;
try { await Engine.headless(game, { assets }); } catch (e) { console.log("ERR", String(e.message).slice(0, 300)); process.exit(1); }
model.traverse((o) => { if (['Hat', 'Brim', 'Moustache'].includes(o.name)) o.visible = false; });
const defs = [...HERO_CLIPS, ...NEW_CLIPS, jogGait(gaitClip)], clips = compileClips(defs, HERO_RIG, model);
function png({ width, height, data }) {
  const raw = Buffer.alloc((width * 4 + 1) * height); for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1); }
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc32(Buffer.concat([Buffer.from(t), d])) >>> 0, 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const name of process.argv.slice(2)) {
  const i = defs.findIndex((d) => d.name === name); if (i < 0) { console.log('no clip', name); continue; }
  const img = renderSheet(model, HERO_RIG, defs[i], clips[i], { frames: 4, views: ['front', 'side'], scale: 90, trails: false, skeleton: false });
  await writeFile(`shots/clip-${name}.png`, png(img)); console.log('wrote', name, img.width, img.height);
}
process.exit(0);
