import { readFile } from 'node:fs/promises';
import { Engine, HERO_MODEL, HERO_RIG, THREE } from '../src/pixel-engine.js';
const assets = async (p) => new Uint8Array(await readFile(new URL('../src/' + p, import.meta.url))).buffer;
class G { name = 'g'; assets = [HERO_MODEL]; async setup(ctx) { const m = (await ctx.loadModel(HERO_MODEL)).scene; m.traverse((o) => { if (o.isMesh) console.log(o.name, o.material?.name, o.material?.color?.getHexString?.(), o.parent?.name); }); } cameraTarget() { return new THREE.Vector3(); } }
await Engine.headless(new G(), { assets });
