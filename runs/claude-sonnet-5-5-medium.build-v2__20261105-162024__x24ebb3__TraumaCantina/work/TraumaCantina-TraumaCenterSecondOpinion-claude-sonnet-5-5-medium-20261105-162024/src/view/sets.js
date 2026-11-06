// Story sets: OR-7, ward, corridor, office, scrub room, atrium, roof. Each is a Group + lighting recipe + camera shots.
import { model, buildModel as bm, RenderView, Mirror, THREE, toonMaterial, PALETTE, setLookLayer, loadPack, buildModel, Precipitation, applySky, skyAt } from '../../pixel-engine.js';
import { buildFigure } from './figure.js';
import { setDefs, roomDef } from '../content/models/index.js';
const place = (g, key, x, y, z) => { const o = bm(setDefs[key]).object; o.position.set(x, y, z); o.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); g.add(o); return o; };
const { Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, CanvasTexture, NearestFilter, PlaneGeometry, MeshBasicMaterial, Color } = THREE;
let KIT = null;
export async function ensureKit() { if (KIT) return KIT; try { KIT = await loadPack('packs/kenney-furniture.json'); } catch (e) { KIT = null; } return KIT; }
const TINT = { wood: 'mist', carpet: 'sky', metal: 'slate', metalLight: 'white', fabric: 'sky', cloth: 'sky' };
export function prop(id, pos = [0, 0, 0], rot = 0, scale = 1, tint = {}) {
  if (!KIT) return null;
  try { const d = KIT.get?.('kenney-furniture/' + id); const pal = {}; for (const k of Object.keys(d?.palette || {})) pal[k] = tint[k] || TINT[k] || 'mist'; const b = buildModel('kenney-furniture/' + id, { catalog: KIT, palette: pal }); const o = b.object; o.position.set(...pos); o.rotation.y = rot; o.scale.setScalar(scale); o.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); return o; } catch (e) { return null; }
}
// Set dressing is collected as parts of ONE model() per set (data), built by finishDressing().
let DR = [];
const box = (g, w, h, d, c, x, y, z, o = {}) => { const col = c.isMaterial ? 0x808080 : c, k = DR.length; DR.push({ part: o.cyl ? { cyl: [w, h, d], at: [x, y, z], c: 's' + k, ...(o.glow ? { glow: true } : {}) } : { box: [w, h, d], at: [x, y, z], ...(o.rot ? { rot: o.rot.map((r) => (r * 180) / Math.PI) } : {}), c: 's' + k, ...(o.glow ? { glow: true } : {}) }, col }); return { material: null }; };
function finishDressing(g, id) {
  if (!DR.length) return; const palette = {}, bind = {}, parts = DR.map((d) => { const k = d.part.c; palette[k] = 'mist'; bind[k] = d.col; return d.part; });
  const def = model({ id: 'set-dress-' + id, about: `Dressing of the ${id} set`, tags: ['set', 'dressing'], floats: true, palette, parts });
  const o = bm(def, { palette: bind }).object; o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); g.add(o); DR = [];
}
function room(g, w, d, h, floor, wall, backOnly = false) {
  const o = bm(roomDef, { params: { w, d, h, sides: backOnly ? 0 : 1 }, palette: { floor, wall } }).object; o.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); g.add(o);
}
function monitorTex() { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48; const t = new CanvasTexture(cv); t.magFilter = NearestFilter; return { cv, t, g: cv.getContext('2d') }; }

export function buildSet(ctx, id) {
  DR = []; const g = new Group(), S = { group: g, update() {}, figures: [], shots: {}, lights: [], dispose() { g.removeFromParent(); } };
  const eng = ctx.engine; ctx.scene.add(g);
  const light = (o) => { S.lights.push(ctx.lights.request(o)); };
  const fig = (cid, x, z, rot, anim = 'Idle') => { const f = buildFigure(cid); f.group.position.set(x, 0, z); f.group.rotation.y = rot; f.play(anim); g.add(f.group); S.figures.push(f); return f; };
  S.fig = fig;
  switch (id) {
    case 'or7': {
      eng.sun.intensity = 0.35; eng.ambient.intensity = 0.28; eng.ambient.color.setHex(0x8fa8c8);
      room(g, 18, 14, 6, 0x2a3440, 0x3a4a58);
      box(g, 8, 3.2, 0.12, PALETTE.cyan, 0, 3, -6.9); // gallery glass
      box(g, 8.4, 0.2, 0.3, 0x2a2a30, 0, 1.4, -6.85); box(g, 8.4, 0.2, 0.3, 0x2a2a30, 0, 4.6, -6.85);
      place(g, 'table', 0, 0.1, 0);
      const lamp = new Group(); lamp.position.set(0, 5.6, 0); g.add(lamp); place(lamp, 'lamp', 0, 0, 0); setLookLayer(lamp, 'actors');
      const mon = box(g, 1.2, 0.9, 0.2, PALETTE.ink, 3.6, 2.6, -1.0), mt = monitorTex(); const scr = new Mesh(new PlaneGeometry(1.0, 0.75), new MeshBasicMaterial({ map: mt.t })); scr.position.set(3.6, 2.6, -0.88); g.add(scr);
      try { const rv = new RenderView({ size: [128, 96], fov: 50, every: 2 }); rv.camera.position.set(0, 4.2, 2.6); rv.camera.lookAt(0, 1.4, 0); const sm = new Mesh(new PlaneGeometry(1.0, 0.75), rv.screenMaterial()); sm.position.set(3.6, 2.6, -0.87); RenderView.screen(sm); g.add(sm); const stop = rv.attach(ctx.engine.renderer, ctx.scene); S.stops = [...(S.stops || []), stop]; } catch (e) {} box(g, 0.1, 2, 0.1, PALETTE.slate, 3.6, 1, -1.0);
      place(g, 'tray', -3.6, 0, 0.2);
      for (const x of [-2, 2]) box(g, 1.6, 3.2, 0.2, 0x3a3a40, x + (x < 0 ? -5 : 5), 1.6, -6.8);
      light({ position: [0, 3.2, 0.2], color: 0xfff0d8, intensity: 14, radius: 7 }); light({ position: [3.6, 2.6, -0.2], color: 0x40ff90, intensity: 2, radius: 3 });
      S.update = (dt, t, vit = 99) => { lamp.rotation.z = Math.sin(t * 0.9) * 0.06; lamp.rotation.x = Math.cos(t * 0.7) * 0.04; const g2 = mt.g; g2.fillStyle = '#041008'; g2.fillRect(0, 0, 64, 48); g2.fillStyle = '#40ff90'; let py = 24; for (let x = 0; x < 64; x++) { const ph = ((t * 1.2 - (64 - x) / 40) % 1 + 1) % 1; const v = ph > 0.14 && ph < 0.2 ? 1 - Math.abs(ph - 0.17) / 0.03 : 0; const y = 24 - v * 18; g2.fillRect(x, y | 0, 1, 1); } mt.t.needsUpdate = true; };
      S.shots = { wide: { pos: [0, 4.6, 8.6], target: [0, 1.6, 0], fov: 46 }, table: { pos: [0.5, 5.5, 3.2], target: [0, 1.5, 0], fov: 40 }, gallery: { pos: [0, 3.2, -2], target: [0, 2.2, -7], fov: 44 } };
      fig('reyes', -2.6, 1.6, 0.4, 'Idle'); fig('ilya', 2.6, 1.5, -0.4, 'Idle'); fig('pem', -3.8, -0.8, 1.2, 'Idle');
      break;
    }
    case 'ward': {
      eng.sun.intensity = 0.5; eng.ambient.intensity = 0.5; eng.ambient.color.setHex(0xd8e4f0);
      room(g, 18, 12, 5, 0xb8c0c8, 0xd8e0e8);
      for (const x of [-5, 0, 5]) { const b = prop('bed-single', [x, 0, -3.8], 0, 2.2) ; if (b) g.add(b); else box(g, 1.6, 0.6, 3, PALETTE.white, x, 0.4, -3.8); box(g, 2.2, 1.6, 0.06, PALETTE.sky, x + 1.4, 1.4, -2.2); }
      const wnd = box(g, 5, 2.6, 0.1, PALETTE.navy, -2, 3, -5.9); const rain = new Precipitation({ kind: 'rain', count: 700 }); rain.position?.set?.(-2, 3, -5.7); S.rain = rain;
      for (const x of [-7, 6]) box(g, 0.5, 0.6, 0.5, PALETTE.slate, x, 0.3, 2); // buckets
      light({ position: [0, 4.2, -1], color: 0xe8f0ff, intensity: 8, radius: 11 });
      S.shots = { wide: { pos: [0, 3.6, 7.5], target: [0, 1.6, -2], fov: 48 } }; fig('pem', 2.4, 0.6, -0.5, 'Idle'); fig('ilya', -2.6, 1.0, 0.5, 'Idle'); fig('reyes', 4.6, 1.2, -0.9, 'Idle');
      break;
    }
    case 'corridor': {
      eng.sun.intensity = 0.3; eng.ambient.intensity = 0.4; eng.ambient.color.setHex(0xb8c8d0);
      room(g, 26, 8, 4.5, 0x8a929a, 0xc8d0d8); for (let i = -2; i <= 2; i++) { box(g, 1.2, 3, 0.1, 0x4a5a6a, i * 5, 1.5, -3.9); }
      for (const x of [-6, 0, 6]) { box(g, 2.2, 0.15, 1, PALETTE.white, x, 1.0, 1.2); for (const lx of [-0.9, 0.9]) box(g, 0.1, 0.9, 0.1, PALETTE.slate, x + lx, 0.45, 1.2); box(g, 2, 0.25, 0.9, PALETTE.teal, x, 1.2, 1.2); }
      light({ position: [-4, 4, 0], color: 0xe8f0ff, intensity: 7, radius: 9, flicker: 'torch' }); light({ position: [5, 4, 0], color: 0xe8f0ff, intensity: 7, radius: 9 });
      S.shots = { wide: { pos: [0, 2.8, 8], target: [0, 1.4, 0], fov: 50 } }; fig('bram', -1.6, 0.2, 0.4); fig('ilya', 1.0, 0.0, -0.4); fig('reyes', 3.2, -0.4, -0.8, 'Shout');
      break;
    }
    case 'office': {
      eng.sun.intensity = 0.25; eng.ambient.intensity = 0.35; eng.ambient.color.setHex(0xc8a888);
      room(g, 14, 10, 5, 0x5a3a2a, 0x6a4a3a); const w = box(g, 5, 2.6, 0.1, PALETTE.navy, 0, 2.8, -4.9); for (let i = 0; i < 9; i++) box(g, 0.14, 0.14, 0.04, i % 2 ? 0xffd070 : 0xff8060, -2 + i * 0.5, 2 + (i % 3) * 0.4, -4.8, { glow: true });
      const d = prop('desk', [0, 0, -2.4], 0, 2.2); if (d) g.add(d); else box(g, 3, 1.1, 1.2, PALETTE.orange, 0, 0.55, -2.4); const ch = prop('chair-desk', [0, 0, -3.8], 3.14, 2); if (ch) g.add(ch); const bk = prop('bookcase-closed', [-5, 0, -3.8], 0, 2.4); if (bk) g.add(bk);
      light({ position: [2.5, 3.2, -2], color: 0xffc880, intensity: 9, radius: 8 });
      const rain = new Precipitation({ kind: 'rain', count: 500 }); S.rain = rain;
      S.shots = { wide: { pos: [0, 2.8, 6], target: [0, 1.6, -2], fov: 46 } }; fig('bram', 0, -3.4, 0, 'Idle'); fig('ilya', -1.8, 0.6, 0.3, 'Idle'); fig('sabine', 2.2, 0.4, -0.5, 'Idle');
      break;
    }
    case 'scrub': {
      eng.sun.intensity = 0.4; eng.ambient.intensity = 0.5; eng.ambient.color.setHex(0xd8f0f0);
      room(g, 14, 8, 4.5, 0xc0d0d4, 0xe0f0f0); for (const x of [-3.6, 0, 3.6]) { const s = prop('bathroom-sink', [x, 0, -3.2], 0, 2.2); if (s) g.add(s); else box(g, 1.2, 1, 0.8, PALETTE.white, x, 0.8, -3.2); }
      try { const mi = new Mirror({ size: [8, 1.8] }); mi.mesh.position.set(0, 3, -3.75); g.add(mi.mesh); S.stops = [...(S.stops || []), mi.attach(ctx.engine.renderer, ctx.scene)]; } catch (e) { const mr = box(g, 10, 1.8, 0.08, 0xaad8e8, 0, 3, -3.8); mr.material = toonMaterial(PALETTE.cyan); }
      light({ position: [0, 3.8, 0], color: 0xe8ffff, intensity: 9, radius: 10 });
      S.shots = { wide: { pos: [0, 2.6, 6], target: [0, 1.4, -1.5], fov: 46 } }; fig('sabine', -1.2, -1.4, 0, 'Idle'); fig('ilya', 1.6, -0.6, -0.2); fig('pem', 4, 0, -0.6); fig('reyes', -3.8, 0, 0.5);
      break;
    }
    case 'atrium': {
      eng.sun.intensity = 0.7; eng.ambient.intensity = 0.65; eng.ambient.color.setHex(0xfff4e0);
      room(g, 22, 14, 7, 0xf0ece0, 0xf8f4ec); for (const x of [-8, -3, 3, 8]) { box(g, 0.8, 6.8, 0.8, 0xf5b700, x, 3.4, -5); }
      for (let i = 0; i < 6; i++) { const p = prop('potted-plant', [-6 + i * 2.4, 0, -2.2], 0, 1.4); if (p) g.add(p); }
      for (const x of [-6, 6]) box(g, 1.4, 1, 1.4, 0xf8f8f8, x, 0.5, 1.2);
      light({ position: [0, 5.5, 0], color: 0xfff0d8, intensity: 12, radius: 13 });
      S.shots = { wide: { pos: [0, 3.4, 9], target: [0, 1.8, 0], fov: 48 } }; fig('hesper', 0.4, 0, -0.2, 'Idle'); fig('bram', -3, 0.4, 0.5); fig('sabine', -4.4, 1.4, 0.7); fig('reyes', 3, 1.2, -0.6);
      break;
    }
    case 'roof': {
      eng.sun.intensity = 0.15; eng.ambient.intensity = 0.3; eng.ambient.color.setHex(0x6a7aa8); eng.sun.color.setHex(0x8aa0c8);
      room(g, 24, 16, 1, 0x30363e, 0x181c28, true); box(g, 8.4, 0.05, 8.4, 0x3a4048, 0, 0.03, 0, { cyl: true }); box(g, 0.4, 0.04, 2.4, PALETTE.sand, -0.8, 0.07, 0); box(g, 0.4, 0.04, 2.4, PALETTE.sand, 0.8, 0.07, 0); box(g, 1.6, 0.04, 0.4, PALETTE.sand, 0, 0.07, 0);
      box(g, 0.7, 1.2, 0.7, PALETTE.red, 4, 0.6, -2); for (let i = -5; i <= 5; i++) box(g, 0.1, 1.2, 0.1, PALETTE.slate, i * 2, 0.6, 6.8);
      light({ position: [0, 5, 3], color: 0xa8c8ff, intensity: 8, radius: 12 }); light({ position: [4, 1.8, -2], color: 0xff4040, intensity: 4, radius: 5, flicker: 'pulse' });
      const rain = new Precipitation({ kind: 'rain', count: 1500 }); S.rain = rain;
      S.shots = { wide: { pos: [0, 3.2, 9], target: [0, 1.4, 0], fov: 50 } }; fig('hesper', 2.0, -1.0, -0.8, 'Idle'); fig('ilya', -1.8, 0.6, 0.4, 'Idle'); fig('sabine', -3.2, 1.2, 0.6, 'Idle'); fig('reyes', 0.4, 1.4, 0.0, 'Idle');
      break;
    }
  }
  finishDressing(g, id);
  if (S.rain) { g.add(S.rain); }
  const upd = S.update; S.update = (dt, t, ...r) => { upd(dt, t, ...r); for (const f of S.figures) f.update(dt); S.rain?.update?.(dt, S.rainFocus || new THREE.Vector3(0, 2, 0)); };
  return S;
}
