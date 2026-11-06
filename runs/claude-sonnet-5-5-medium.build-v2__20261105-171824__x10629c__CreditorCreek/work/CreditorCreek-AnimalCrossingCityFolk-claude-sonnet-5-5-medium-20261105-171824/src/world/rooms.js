// Interior and City rooms as data, built into Groups at far-apart offsets (dollhouse cutaway: two back walls).
import { THREE, toonMaterial, PALETTE, setLookLayer, buildModel, loadPack, TEXTURE_LIBRARY, MODEL_LIBRARY, ModelCatalog } from '../engine.js';
import { roomDef } from '../art/models.js';
import { part, mat } from './scenery.js';
import { registerPlace, PLACES } from './places.js';
const { Group, Mesh, BoxGeometry } = THREE;
export let FURN_CATALOG = null;
export async function loadFurniture() { try { FURN_CATALOG = await loadPack('packs/kenney-furniture.json', { textures: TEXTURE_LIBRARY }); } catch { FURN_CATALOG = null; } }
export const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
export function furnMesh(model, tint, scale = 1) {
  if (FURN_CATALOG) { try { const palette = tint ? { wood: tint, woodDark: tint, carpet: tint, lamp: tint } : undefined; const b = buildModel('kenney-furniture/' + kebab(model), { catalog: FURN_CATALOG, ...(palette ? { palette } : {}) }); b.object.scale.setScalar(scale); return b.object; } catch (e) { /* fall through */ } }
  const g = new Group(); part(g, 'box', [0.9, 0.7, 0.9], [0, 0.35, 0], tint ?? 'orange'); return g;
}
/** ROOMS: id -> def. rows are for collision ('#' wall, '.' floor, 'o' furniture). Built from w,d + props. */
export const ROOMS = {};
export function defRoom(def) {
  def.ox = 1000 + Object.keys(ROOMS).length * 40; def.oz = 0; ROOMS[def.id] = def;
  const rows = []; for (let z = 0; z < def.d; z++) { let r = ''; for (let x = 0; x < def.w; x++) r += '.'; rows.push(r); } def.rows = rows;
  registerPlace({ id: def.id, ox: def.ox, oz: def.oz, w: def.w, d: def.d, rows, interior: true, def });
  return def;
}
/** (Re)build the room shell from the room ModelDef. over: palette overrides (floor, wall). */
export function rebuildShell(def, over = {}) {
  const grp = def.group; if (grp.userData.shell) grp.remove(grp.userData.shell); const w = def.w, d = def.d;
  const shell = buildModel(roomDef, { params: { w, d, h: def.h ?? 3.2, doorX: def.doorX ?? w / 2 }, palette: { floor: over.floor ?? def.floor ?? 'orange', wall: over.wall ?? def.wall ?? 'sand', wall2: over.wall ?? def.wall2 ?? def.wall ?? 'sand' } }).object;
  shell.position.set(w / 2, 0, d / 2); shell.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } }); grp.add(shell); grp.userData.shell = shell; setLookLayer(shell, 'environment');
}
export function buildRoom(def, g) {
  const grp = new Group(); grp.name = 'room:' + def.id; grp.position.set(def.ox, 0, def.oz); const w = def.w, d = def.d;
  def.props ??= []; def.group = grp; def.windowsGlow = []; rebuildShell(def);
  if (def.rug) part(grp, 'box', [w * 0.45, 0.03, d * 0.4], [w / 2, 0.02, d / 2], def.rug);
  grp.traverse(o => { if (o.isMesh) o.castShadow = false; }); setLookLayer(grp, 'environment'); grp.visible = false; return grp;
}
export function roomPos(def, x, z) { return [def.ox + x, def.oz + z]; }
