// Builds a story set: room shell, recoloured furniture, lighting, weather. Used by story, title and briefing.
import { buildModel, loadPack, PALETTE, Precipitation, setLookLayer, THREE, toonMaterial, clothGrid, SoftMesh, mergeStaticMeshes, compileClips, HERO_CLIPS, HERO_RIG } from '../../pixel-engine.js';
import { SETS } from '../content/sets.js';
import { CATALOG, figureDef } from '../content/models/index.js';
import { recolorSkin } from './bust.js';

const { BoxGeometry, Color, CylinderGeometry, Group, Mesh, AnimationMixer, LoopOnce, LoopRepeat } = THREE;
let kit = null;
export async function furniture() {
  if (kit) return kit;
  try { kit = await loadPack('packs/kenney-furniture.json'); } catch { kit = { failed: true }; }
  return kit;
}
const STEEL = { };
function place(ctx, group, name, x, y, z, turn = 0, scale = 1, palette = null) {
  if (!kit || kit.failed) return null;
  try {
    const b = buildModel(`kenney-furniture/${name}`, { catalog: kit, palette: palette ?? undefined });
    const o = b.object.clone(true);
    o.position.set(x, y, z); o.rotation.y = (turn * Math.PI) / 180; o.scale.setScalar(scale);
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    group.add(o);
    return o;
  } catch { return null; }
}
const box = (group, x, y, z, w, h, d, c, opts = {}) => { const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(c, opts)); m.position.set(x, y, z); m.castShadow = !!opts.cast; m.receiveShadow = true; group.add(m); return m; };

export async function buildSet(ctx, id, { busy = true } = {}) {
  await furniture();
  const S = SETS[id] ?? SETS.or7, g = new Group();
  ctx.scene.add(g);
  const eng = ctx.engine;
  eng.sun.intensity = S.sun; eng.ambient.color.setHex(S.ambient[0]); eng.ambient.intensity = S.ambient[1];
  ctx.scene.background = new Color(S.outdoor ? (S.dawn ? 0xf2d6b0 : 0x0a0e18) : 0x0a0a10);
  const light = ctx.lights.request({ position: [S.lamp[0], S.lamp[1], S.lamp[2]], intensity: S.lamp[3], radius: S.lamp[4], color: S.lamp[5] });
  const out = { group: g, def: S, light, update: () => {} };
  box(g, 0, -0.1, 0, 22, 0.2, 18, S.floor);
  if (!S.outdoor) {
    box(g, 0, 2.5, -5, 22, 5.2, 0.3, S.wall);
    box(g, -8, 2.5, 0, 0.3, 5.2, 18, S.wall);
    box(g, 8, 2.5, 0, 0.3, 5.2, 18, S.wall);
    box(g, 0, 0.3, -4.82, 22, 0.6, 0.1, 0x1f2a30);
  }
  const updates = [];
  if (S.rain && S.outdoor) {
    const rain = new Precipitation({ kind: 'rain', count: 1200, area: [26, 12, 8] });
    rain.wind.set(-1.5, 0);
    ctx.scene.add(rain);
    const center = new THREE.Vector3(0, 3, -3.5);
    updates.push((dt) => rain.update(dt, center));
  }
  switch (id) {
    case 'or7': {
      // table, patient under drape, lamp arm, monitor, tray, gallery glass, doors
      box(g, 0, 0.85, 0, 1.3, 0.14, 3, 0xb8c0cc, { cast: true }); box(g, 0, 0.4, 0, 0.4, 0.8, 0.8, 0x56606e, { cast: true });
      box(g, 0, 1.02, 0, 1.2, 0.22, 2.7, PALETTE.teal, { cast: true }); box(g, 0, 1.03, -1.32, 0.46, 0.26, 0.36, PALETTE.sand);
      box(g, 0, 1.18, -0.5, 0.86, 0.2, 1, PALETTE.teal, { cast: true });
      const arm = new Group(); arm.position.set(0.2, 4.2, 0); g.add(arm);
      box(arm, 0, -0.6, 0, 0.12, 1.2, 0.12, 0x8a93a6); const lamp = new Mesh(new CylinderGeometry(0.6, 0.86, 0.3, 10), toonMaterial(0xcfd6e0)); lamp.position.set(0, -1.3, 0); lamp.castShadow = true; arm.add(lamp);
      const bulb = new Mesh(new CylinderGeometry(0.5, 0.5, 0.04, 10), new THREE.MeshBasicMaterial({ color: 0xfff8dc })); bulb.position.set(0, -1.47, 0); arm.add(bulb);
      out.lampArm = arm;
      updates.push((dt, t) => { arm.rotation.z = Math.sin(t * 0.8) * 0.07; arm.rotation.x = Math.cos(t * 0.6) * 0.04; if (light) { light.position?.set?.(0.2 + Math.sin(arm.rotation.z) * -2.6, 3, Math.sin(arm.rotation.x) * 2.6); } });
      box(g, 2, 0.7, -1.2, 0.1, 1.4, 0.1, 0x56606e); box(g, 2, 1.6, -1.2, 0.95, 0.6, 0.12, 0x10161e, { cast: true }); const screen = new Mesh(new BoxGeometry(0.8, 0.46, 0.02), new THREE.MeshBasicMaterial({ color: 0x2bb673 })); screen.position.set(2, 1.6, -1.13); g.add(screen);
      out.screen = screen;
      box(g, -1.8, 0.75, 0.8, 1.2, 0.06, 0.7, 0xc8d0da, { cast: true }); box(g, -1.8, 0.4, 0.8, 0.08, 0.7, 0.08, 0x56606e);
      box(g, -1.9, 0.82, 0.7, 0.5, 0.04, 0.05, 0xffffff); box(g, -1.6, 0.82, 0.9, 0.4, 0.04, 0.05, 0xffffff);
      // gallery
      box(g, 0, 3.6, -4.85, 8, 2, 0.1, 0x7fb4d8); box(g, 0, 2.5, -4.75, 8.4, 0.25, 0.3, 0x56606e); for (const x of [-4, -2, 0, 2, 4]) box(g, x, 3.6, -4.78, 0.12, 2, 0.1, 0x56606e);
      box(g, 6.2, 1.2, -4.8, 2.2, 2.4, 0.15, 0x56768a); box(g, 6.2, 1.8, -4.72, 0.7, 0.5, 0.03, 0xbfe0ff); box(g, 6.2, 2.7, -4.8, 2.8, 0.3, 0.18, 0x2a3142);
      place(ctx, g, 'trashcan', -3.4, 0, -3.8, 0, 1.2); place(ctx, g, 'bathroom-cabinet', -6.2, 0, -4.2, 0, 2, { wood: 'mist' });
      break;
    }
    case 'scrub': {
      for (const x of [-3, 0, 3]) { box(g, x, 1, -4.4, 1.6, 0.25, 0.8, 0xc8d0da, { cast: true }); box(g, x, 0.5, -4.5, 0.25, 1, 0.3, 0x8a93a6); box(g, x, 1.5, -4.75, 0.09, 0.8, 0.09, 0xe8edf5); box(g, x, 1.85, -4.55, 0.09, 0.09, 0.45, 0xe8edf5); box(g, x, 2.6, -4.82, 1.3, 1, 0.06, 0x9fd8ee); }
      place(ctx, g, 'bathroom-cabinet', 6, 0, -4.2, 0, 2);
      break;
    }
    case 'office': {
      place(ctx, g, 'desk', -0.4, 0, -2.2, 0, 2.4) ?? box(g, -0.4, 0.8, -2.2, 3, 0.2, 1.2, 0x5e3a22, { cast: true });
      place(ctx, g, 'chair-desk', -0.4, 0, -3.3, 0, 2);
      place(ctx, g, 'bookcase-closed-doors', -6.4, 0, -4.4, 0, 2.6); place(ctx, g, 'bookcase-closed', 5.6, 0, -4.4, 0, 2.6);
      place(ctx, g, 'lamp-round-table', -1.6, 1.2, -2.2, 0, 1.4); place(ctx, g, 'potted-plant', 3.2, 0, -4.2, 0, 2);
      box(g, 0.8, 3, -4.82, 5.4, 3, 0.06, 0x18283e); box(g, 0.8, 3, -4.78, 0.1, 3, 0.05, 0x2a1a10); box(g, 0.8, 3, -4.78, 5.4, 0.1, 0.05, 0x2a1a10);
      const streaks = Array.from({ length: 16 }, (_, i) => box(g, -1.6 + (i * 0.33), 3, -4.77, 0.03, 0.34, 0.01, 0x7fa8d0));
      updates.push((dt, t) => streaks.forEach((m, i) => { m.position.y = 4.4 - ((t * (1.6 + (i % 3) * 0.4) + i * 0.37) % 2.8); }));
      for (const [x, y, c] of [[-1.2, 2.2, 0xffd24d], [-0.2, 2.1, 0xff8a6a], [0.6, 2.2, 0xffd24d], [1.6, 2.05, 0x8ad0ff], [2.6, 2.2, 0xffd24d], [3, 2.1, 0xff8a6a]]) box(g, x, y, -4.76, 0.08, 0.08, 0.02, c);
      break;
    }
    case 'ward': {
      for (const [x, z] of [[-5, -3.2], [-1.6, -3.2], [1.8, -3.2], [5.2, -3.2]]) {
        place(ctx, g, 'bed-single', x, 0, z, 0, 2.3, { wood: 'mist', sheet: 'white', blanket: 'sky', pillow: 'white' }) ?? box(g, x, 0.5, z, 1.4, 0.4, 2.4, 0xd8e0e8, { cast: true });
        box(g, x + 1.1, 1, z - 0.6, 0.06, 2, 0.06, 0x8a93a6);
      }
      const curtain = clothGrid({ width: 3, height: 2.6, cols: 12, rows: 8, origin: [-7.6, 3.1, -3.4], pin: 'top' });
      const sm = new SoftMesh(curtain, toonMaterial(0xa8c8cf));
      sm.castShadow = true;
      g.add(sm);
      updates.push((dt) => { curtain.step?.(Math.min(dt, 1 / 60)); sm.sync(); });
      break;
    }
    case 'corridor': {
      for (const x of [-5.6, -2, 1.8, 5.6]) { box(g, x, 0.55, -3.4, 2.2, 0.16, 0.9, 0xc8d0da, { cast: true }); box(g, x, 0.25, -3.4, 2, 0.5, 0.1, 0x56606e); box(g, x, 0.75, -3.4, 2, 0.2, 0.8, PALETTE.sky); }
      for (const x of [-6, 0, 6]) box(g, x, 4.5, -2, 1.6, 0.1, 0.4, 0xfff4d8);
      box(g, 0, 1, -4.8, 22, 0.22, 0.04, 0x2bb673);
      place(ctx, g, 'chair', 3.4, 0, -4, 0, 2); place(ctx, g, 'trashcan', -3.8, 0, -4.2, 0, 1.2);
      break;
    }
    case 'atrium': {
      for (const x of [-6, -2.6, 2.6, 6]) { box(g, x, 2.6, -4, 0.8, 5.2, 0.8, 0xf6f2e6, { cast: true }); box(g, x, 5.1, -4, 1.2, 0.3, 1.2, 0xe9c46a); }
      box(g, 0, 3.6, -4.82, 3.8, 1.6, 0.05, 0xe9c46a); box(g, 0, 3.6, -4.78, 3.2, 1.1, 0.05, 0xfffbe8);
      for (const [x, z] of [[-3, -2], [3, -2]]) { box(g, x, 0.5, z, 1, 1, 1, 0xe9c46a, { cast: true }); for (let i = 0; i < 7; i++) { const m = new Mesh(new BoxGeometry(0.22, 0.22, 0.22), toonMaterial(i % 2 ? 0xffffff : 0xf48fb1)); m.position.set(x + Math.sin(i * 2.1) * 0.4, 1.2 + (i % 3) * 0.14, z + Math.cos(i * 2.1) * 0.4); g.add(m); } }
      break;
    }
    case 'roof': case 'morning': {
      const pad = new Mesh(new CylinderGeometry(7, 7, 0.1, 24), toonMaterial(S.floor + 0x101010)); pad.position.y = 0.02; pad.receiveShadow = true; g.add(pad);
      box(g, -1.3, 0.09, 0, 0.5, 0.05, 3.4, 0xffd24d); box(g, 1.3, 0.09, 0, 0.5, 0.05, 3.4, 0xffd24d); box(g, 0, 0.09, 0, 2.6, 0.05, 0.5, 0xffd24d);
      box(g, 0, 0.6, -6.8, 22, 1.2, 0.3, 0x5a646e);
      for (const [x, z, w, h, c] of [[-9, -14, 6, 7, 0x161e2c], [-1, -16, 5, 11, 0x1a2436], [6, -13, 7, 6, 0x141a26], [12, -15, 5, 9, 0x182030]]) { box(g, x, h / 2, z, w, h, 4, S.dawn ? c + 0x303030 : c); if (!S.dawn) for (let i = 0; i < 12; i++) box(g, x - w / 2 + 0.5 + (i * 1.7) % (w - 1), 0.5 + (i * 2.3) % (h - 1), z + 2.02, 0.2, 0.28, 0.02, 0xffd24d); }
      if (id === 'roof') { box(g, 3.6, 0.7, -2.6, 0.9, 1.4, 0.9, 0xc8d0da, { cast: true }); box(g, 3.6, 1.5, -2.6, 0.5, 0.2, 0.5, 0xe9c46a); }
      break;
    }
    default: break;
  }
  void STEEL; void mergeStaticMeshes;
  let t = 0;
  out.update = (dt) => { t += dt; for (const u of updates) u(dt, t); };
  return out;
}

/** A full-body figure on the rig the hero's clips drive: Idle, Walk, Wave, Sit, Shout, Victory, Hurt... */
export function buildFigure(ctx, id, parent, at = [0, 0, 0], turn = 0, overrides = {}) {
  const def = figureDef(id, overrides);
  const build = buildModel(def, { catalog: CATALOG });
  const obj = build.object;
  setLookLayer(obj, 'actors');
  obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  if (!overrides.scrub) recolorSkin(obj, id);
  obj.position.set(...at); obj.rotation.y = turn;
  const scale = ctx.__figScale ?? 1;
  obj.scale.setScalar(scale * (def ? 1 : 1));
  (parent ?? ctx.scene).add(obj);
  const clips = compileClips(HERO_CLIPS, HERO_RIG, obj);
  const mixer = new AnimationMixer(obj);
  const fig = { obj, mixer, clips, current: null,
    play(name, { once = false, fade = 0.2 } = {}) {
      const clip = clips.find((c) => c.name === name);
      if (!clip) return false;
      const act = mixer.clipAction(clip);
      act.reset(); act.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity); act.clampWhenFinished = once;
      if (fig.current && fig.current !== act) { act.crossFadeFrom(fig.current, fade, false); }
      act.play(); fig.current = act;
      return true;
    },
    update(dt) { mixer.update(dt); },
  };
  fig.play('Idle');
  return fig;
}
