// Interiors: a dollhouse cutaway with two back walls. Data for every room; a Place and a Group are built on first entry.
import { buildModel, MODEL_LIBRARY, THREE, toonMaterial, PALETTE, setLookLayer } from '../engine.js';
import { Place } from './place.js';
import { twoTone } from '../art/textures.js';
import { ITEMS } from '../data/items.js';
const K = (n, p) => ({ model: 'kenney-furniture/' + n, palette: p });
const cot = { wood: 'sand', woodDark: 'orange', carpet: 'orange', carpetDarker: 'red', metal: 'mist' };
const W = { cream: ['sand', 'white', 'stripe'], navy: ['navy', 'blue', 'stripe'], plum: ['plum', 'red', 'dots'], teal: ['teal', 'green', 'stripe'], slate: ['slate', 'mist', 'stripe'], green: ['green', 'lime', 'dots'], yellow: ['sand', 'white', 'dots'], night: ['night', 'plum', 'dots'], red: ['red', 'orange', 'stripe'], boards: ['orange', 'plum', 'boards'], sky: ['sky', 'white', 'stripe'], white: ['white', 'mist', 'boards'], knit: ['red', 'sand', 'check'] };
const Fl = { oak: ['orange', 'sand', 'boards'], check: ['white', 'slate', 'check'], navy: ['navy', 'blue', 'dots'], plum: ['plum', 'red', 'boards'], carpet: ['red', 'plum', 'dots'], stone: ['mist', 'slate', 'check'], dark: ['night', 'slate', 'check'], moss: ['green', 'lime', 'dots'], sand: ['sand', 'orange', 'boards'] };
const f = (m, x, z, rot = 0, o = {}) => ({ m, x, z, rot, ...o });
const NEIGHBOUR_DECOR = {
  dorrit: { w: 'cream', fl: 'oak', furn: [f('kenney-furniture/kitchen-stove', 1, 0.6), f('kenney-furniture/kitchen-cabinet', 2, 0.6), f('kenney-furniture/kitchen-sink', 3, 0.6), f('kenney-furniture/table-round', 4, 4, 0, { p: cot }), f('kenney-furniture/chair', 3, 4, 90, { p: cot }), f('clay-pot', 5, 0.6), f('clay-pot', 5.6, 1), f('clay-pot', 0.7, 2), f('clay-pot', 1.2, 2.2), f('bucket', 6, 3)] },
  tavi: { w: 'yellow', fl: 'sand', furn: [f('kenney-furniture/bed-single', 1, 1, 0, { p: { wood: 'sand', carpet: 'sand', metalLight: 'white' } }), f('kenney-furniture/lamp-round-floor', 3, 0.7, 0, { p: { metal: 'sand', lamp: 'sand' } }), f('kenney-furniture/lounge-sofa', 5, 0.8, 0, { p: { wood: 'sand', carpet: 'sand' } }), f('kenney-furniture/rug-round', 3.5, 4, 0, { p: { carpet: 'sand', carpetDarker: 'orange' } }), f('kenney-furniture/potted-plant', 6.2, 3, 0, { p: { plant: 'lime', wood: 'sand' } })] },
  bartleby: { w: 'slate', fl: 'stone', furn: [f('kenney-furniture/lounge-chair', 3.5, 2.5, 0, { p: { wood: 'plum', carpet: 'red' } })] },
  ottoline: { w: 'plum', fl: 'plum', furn: [f('kenney-furniture/bed-double', 1.4, 1.4, 0, { p: { wood: 'plum', carpet: 'red', metalLight: 'sand' } }), f('kenney-furniture/rug-rounded', 4, 4, 0, { p: { carpet: 'red', carpetDarker: 'plum' } }), f('throne', 5.4, 1), f('chandelier', 3.5, 2.8, 0, { y: 2.2 }), f('kenney-furniture/bathroom-mirror', 3.2, 0.3, 0)] },
  rocco: { w: 'red', fl: 'stone', furn: [f('sf-trophy', 0.8, 0.8), f('sf-trophy', 1.8, 0.8), f('sf-trophy', 2.8, 0.8), f('sf-trophy', 3.8, 0.8), f('sf-trophy', 4.8, 0.8), f('kenney-furniture/bench', 5, 4, 90, { p: { wood: 'slate' } }), f('anvil', 2, 4)] },
  nib: { w: 'navy', fl: 'navy', furn: [f('bookshelf', 1, 0.6), f('bookshelf', 2.4, 0.6), f('kenney-furniture/desk', 5, 0.8, 0, { p: { wood: 'plum', metal: 'mist' } }), f('kenney-furniture/books', 4.6, 2, 0), f('kenney-furniture/books', 1, 4, 30), f('kenney-furniture/books', 5.5, 3.7, 80)] },
  ozzie: { w: 'night', fl: 'dark', furn: [f('kenney-furniture/cardboard-box-closed', 1, 1), f('kenney-furniture/cardboard-box-open', 2, 0.8), f('kenney-furniture/cardboard-box-closed', 0.9, 2), f('notice-board', 4, 0.6), f('kenney-furniture/desk', 5.3, 3.2, 90, { p: { wood: 'slate' } })] },
  yolanda: { w: 'knit', fl: 'carpet', furn: [f('kenney-furniture/lounge-sofa', 3, 0.9, 0, { p: { wood: 'red', carpet: 'orange' } }), f('kenney-furniture/television-vintage', 1, 1, 0, { p: { wood: 'red', metal: 'sand', metalDark: 'red' } }), f('kenney-furniture/rug-round', 4, 4.4, 0, { p: { carpet: 'blue', carpetDarker: 'sand' } }), f('kenney-furniture/pillow', 5.7, 1, 0), f('kenney-furniture/pillow-blue', 5.9, 2, 0)] },
  fitch: { w: 'white', fl: 'oak', furn: [f('kenney-furniture/cardboard-box-closed', 1, 1), f('kenney-furniture/cardboard-box-closed', 2.2, 1), f('kenney-furniture/cardboard-box-open', 3.4, 0.9), f('kenney-furniture/cardboard-box-closed', 1, 2.4), f('kenney-furniture/lamp-square-floor', 5.5, 1, 0, { p: { metal: 'slate', lamp: 'sand' } }), f('kenney-furniture/table-coffee-square', 4, 4, 0, { p: { wood: 'slate' } })] },
};
/** Room defs: size [w,d], walls, floor, doors, hosts, props with interactions. x,z are local metres from the back corner. */
export const ROOM_DEFS = {
  home: { w: 6, d: 6, wall: 'cream', floor: 'oak', home: true, music: null, label: 'Home', exit: 'town:home' },
  home_annex: { w: 6, d: 6, wall: 'sky', floor: 'oak', home: true, music: null, label: 'The Annex', doors: [{ x: 3, z: 6.3, to: 'home', tx: 5.6, tz: 3, kind: 'rug' }] },
  home_up: { w: 8, d: 8, wall: 'cream', floor: 'plum', home: true, music: null, label: 'Upstairs', doors: [{ x: 4, z: 8.3, to: 'home', tx: 1, tz: 1, kind: 'rug' }] },
  store: { w: 10, d: 8, wall: 'sky', floor: 'check', music: 'store', label: "Mrs. Gander's", exit: 'town:store', host: { npc: 'gander', x: 2, z: 1.8 }, furn: [f('shop-counter', 2, 1), f('shop-shelf', 5, 1), f('shop-shelf', 8, 1), f('shop-shelf', 5, 4), f('shop-shelf', 8, 4)] },
  hall: { w: 10, d: 8, wall: 'teal', floor: 'navy', music: 'hall', label: 'Town Hall & Post', exit: 'town:hall', host: { npc: 'clementine', x: 3, z: 1.8 }, furn: [f('shop-counter', 3, 1), f('kenney-furniture/bookcase-closed-doors', 8, 0.7, 0, { p: { wood: 'navy', metal: 'sand' } }), f('crate', 6.4, 0.9), f('kenney-furniture/potted-plant', 9, 3, 0, { p: cot })], props: [{ id: 'lostbin', x: 6.4, z: 1.7, label: 'Lost & Found' }] },
  mothwick: { w: 8, d: 8, wall: 'plum', floor: 'carpet', music: 'mothwick', label: "Mothwick's", exit: 'town:mothwick', host: { npc: 'mothwick', x: 2, z: 1.8 }, furn: [f('shop-counter', 2, 1), f('kenney-furniture/coat-rack-standing', 5, 1, 0, { p: cot }), f('kenney-furniture/coat-rack-standing', 6.4, 1, 0, { p: cot }), f('wardrobe', 7.1, 3.5, 270), f('kenney-furniture/bathroom-mirror', 4, 0.2)] , props: [{ id: 'patternstudio', x: 5.7, z: 2.2, label: 'Pattern Studio' }, { id: 'clothesrail', x: 7.1, z: 4.6, label: "Today's Rail" }] },
  museum: { w: 10, d: 8, wall: 'white', floor: 'stone', music: 'museum', label: 'Museum Hall', exit: 'town:museum', host: { npc: 'quill', x: 5, z: 2.6 }, furn: [f('shop-counter', 5, 1.6)], doors: [{ x: -0.3, z: 2, to: 'm_fish', tx: 9.3, tz: 3, kind: 'wall', label: 'Aquarium' }, { x: -0.3, z: 6, to: 'm_bug', tx: 9.3, tz: 3, kind: 'wall', label: 'Insectarium' }, { x: 2, z: -0.3, to: 'm_fossil', tx: 5, tz: 5.3, kind: 'back', label: 'Fossil Hall' }, { x: 8, z: -0.3, to: 'm_art', tx: 5, tz: 5.3, kind: 'back', label: 'Gallery' }] },
  m_fish: { w: 10, d: 6, wall: 'navy', floor: 'navy', music: 'museum', label: 'Aquarium', wing: 'fish', doors: [{ x: 10.3, z: 3, to: 'museum', tx: 0.7, tz: 2, kind: 'rug' }] },
  m_bug: { w: 10, d: 6, wall: 'green', floor: 'moss', music: 'museum', label: 'Insectarium', wing: 'bug', doors: [{ x: 10.3, z: 3, to: 'museum', tx: 0.7, tz: 6, kind: 'rug' }] },
  m_fossil: { w: 10, d: 6, wall: 'cream', floor: 'sand', music: 'museum', label: 'Fossil Hall', wing: 'fossil', doors: [{ x: 5, z: 6.3, to: 'museum', tx: 2, tz: 0.7, kind: 'rug' }] },
  m_art: { w: 10, d: 6, wall: 'plum', floor: 'plum', music: 'museum', label: 'Gallery', wing: 'art', doors: [{ x: 5, z: 6.3, to: 'museum', tx: 8, tz: 0.7, kind: 'rug' }] },
  salon: { w: 8, d: 8, wall: 'plum', floor: 'check', music: 'salon', label: 'Snip & Gossip', exit: 'city:salon', host: { npc: 'fleece', x: 2, z: 2 }, city: true, furn: [f('kenney-furniture/bathroom-mirror', 5, 0.2), f('kenney-furniture/chair-modern-cushion', 5, 1.5, 0, { p: { metal: 'ink', carpetBlue: 'red' } }), f('kenney-furniture/bathroom-sink-square', 7, 0.8)], props: [{ id: 'cutchair', x: 5, z: 2.4, label: 'The Chair' }] },
  couture: { w: 8, d: 8, wall: 'white', floor: 'stone', music: 'couture', label: 'Maison Plume', exit: 'city:couture', host: { npc: 'flavia', x: 4, z: 1.6 }, city: true, furn: [f('kenney-furniture/coat-rack-standing', 1, 1, 0, { p: { wood: 'sand' } }), f('kenney-furniture/coat-rack-standing', 7, 1, 0, { p: { wood: 'sand' } }), f('kenney-furniture/rug-rectangle', 4, 4, 90, { p: { carpet: 'red', carpetDarker: 'plum' } })], props: [{ id: 'couturerail', x: 1.2, z: 2, label: 'The Couture Rail' }] },
  magda: { w: 7, d: 7, wall: 'night', floor: 'dark', music: 'magda', label: "Magda's Genuine Articles", exit: 'city:magda', host: { npc: 'magda', x: 3.5, z: 1.4 }, city: true, furn: [f('shop-counter', 3.5, 0.8), f('crate', 1, 1), f('barrel', 6, 1)], props: [{ id: 'magda0', x: 1.2, z: 3.2, label: 'Painting' }, { id: 'magda1', x: 3.5, z: 3.2, label: 'Painting' }, { id: 'magda2', x: 5.8, z: 3.2, label: 'Painting' }] },
  theatre: { w: 10, d: 8, wall: 'red', floor: 'carpet', music: 'theatre', label: 'The Palace Theatre', exit: 'city:theatre', host: { npc: 'bellows', x: 5, z: 1.6 }, city: true, stage: true, furn: [f('kenney-furniture/bench-cushion', 3, 5, 0, { p: { wood: 'plum', carpet: 'red' } }), f('kenney-furniture/bench-cushion', 7, 5, 0, { p: { wood: 'plum', carpet: 'red' } })] },
  auction: { w: 10, d: 8, wall: 'teal', floor: 'oak', music: 'auction', label: "Pemberton's Auction Rooms", exit: 'city:auction', host: { npc: 'pemberton', x: 5, z: 1.4 }, city: true, furn: [f('desk', 5, 0.8), f('stool', 2.5, 4), f('stool', 5, 4), f('stool', 7.5, 4)] },
  bureau: { w: 8, d: 8, wall: 'slate', floor: 'navy', music: 'bureau', label: 'Better Burrows Bureau', exit: 'city:bureau', host: { npc: 'brisket', x: 4, z: 1.8 }, city: true, furn: [f('kenney-furniture/desk', 4, 1, 0, { p: { wood: 'navy', metal: 'sand' } }), f('kenney-furniture/bookcase-closed-doors', 1, 0.7, 0, { p: { wood: 'navy', metal: 'sand' } }), f('kenney-furniture/bookcase-closed-doors', 7, 0.7, 0, { p: { wood: 'navy', metal: 'sand' } })] },
  cafe: { w: 8, d: 8, wall: 'boards', floor: 'oak', music: 'cafe', label: 'The Daily Grind', exit: 'city:cafe', host: { npc: 'lou', x: 3, z: 1.4 }, city: true, furn: [f('shop-counter', 3, 0.8), f('kenney-furniture/kitchen-coffee-machine', 5.4, 0.7, 0), f('kenney-furniture/table-round', 6, 5, 0, { p: { wood: 'plum' } }), f('kenney-furniture/stool-bar', 5, 5, 0, { p: { wood: 'plum', carpet: 'red' } })] },
  tent: { w: 6, d: 6, wall: 'plum', floor: 'carpet', music: 'magda', label: "Madame Nibbles' Tent", exit: 'city:tent', host: { npc: 'nibbles', x: 3, z: 1.6 }, city: true, furn: [f('kenney-furniture/table-round', 3, 2.6, 0, { p: { wood: 'plum' } })] },
};
for (const [id, d] of Object.entries(NEIGHBOUR_DECOR)) ROOM_DEFS['h_' + id] = { w: 7, d: 6, wall: d.w, floor: d.fl, music: null, label: 'Cottage', exit: 'town:' + id, furn: d.furn, neighbour: id };
const wallMat = (key) => { const [a, b, k] = W[key] ?? W.cream; return toonMaterial(PALETTE.white, { map: twoTone(`wall-${a}-${b}-${k}`, a, b, k) }); };
const floorMat = (key) => { const [a, b, k] = Fl[key] ?? Fl.oak; return toonMaterial(PALETTE.white, { map: twoTone(`floor-${a}-${b}-${k}`, a, b, k) }); };
export const matWall = (a, b) => toonMaterial(PALETTE.white, { map: twoTone(`wall-${a}-${b}-stripe`, a, b, 'stripe') });
export const matFloor = (a, b) => toonMaterial(PALETTE.white, { map: twoTone(`floor-${a}-${b}-check`, a, b, 'check') });
/** Interior of a furniture entry; filters palette keys to slots the model has. */
export function buildFurn(modelId, palette) {
  let p; if (palette) { let slots; try { slots = MODEL_LIBRARY.get(modelId).palette; } catch { slots = null; } if (slots) { p = {}; for (const k of Object.keys(palette)) if (k in slots) p[k] = palette[k]; } }
  const b = buildModel(modelId, p ? { palette: p } : {}); b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); setLookLayer(b.object, 'actors'); return b;
}
let nextSlot = 0;
export function makeRoom(id, def) {
  const ox = 1000 + (nextSlot++) * 40, oz = 0;
  const rows = Array.from({ length: def.d }, () => 'F'.repeat(def.w));
  const place = new Place(id, rows, ox, oz, { indoor: true });
  const group = new THREE.Group(); group.visible = false; group.name = 'room:' + id;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(def.w, 0.2, def.d), floorMat(def.floor)); setUV(floor, def.w / 2, def.d / 2); floor.position.set(ox + def.w / 2, -0.1, def.d / 2); floor.receiveShadow = true; group.add(floor);
  const wallH = 3.2, th = 0.3;
  const wb = new THREE.Mesh(new THREE.BoxGeometry(def.w + th, wallH, th), wallMat(def.wall)); setUV(wb, def.w, wallH); wb.position.set(ox + def.w / 2 - th / 2, wallH / 2, -th / 2); wb.receiveShadow = true;
  const wl = new THREE.Mesh(new THREE.BoxGeometry(th, wallH, def.d + th), wallMat(def.wall)); setUV(wl, def.d, wallH, true); wl.position.set(ox - th / 2, wallH / 2, def.d / 2 - th / 2); wl.receiveShadow = true;
  for (const [w, sx, sz, px, pz] of [[wb, def.w + th, 0.2, ox + def.w / 2 - th / 2, 0], [wl, 0.2, def.d + th, ox, def.d / 2 - th / 2]]) { const trim = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.2, sz), toonMaterial(PALETTE.ink)); trim.position.set(px, wallH + 0.1, pz); group.add(trim); }
  group.add(wb, wl);
  // floor base so the room reads as a slab
  const base = new THREE.Mesh(new THREE.BoxGeometry(def.w + th, 0.5, def.d + th), toonMaterial(PALETTE.ink)); base.position.set(ox + def.w / 2 - th / 2, -0.45, def.d / 2 - th / 2); group.add(base);
  const room = { id, def, place, group, wb, wl, floor, furnObjs: new Map(), ox, oz: 0, props: [], doors: [] };
  // back-wall doorways
  for (const d of def.doors ?? []) { const door = new THREE.Mesh(new THREE.BoxGeometry(d.kind === 'wall' ? 0.1 : 1.4, d.kind === 'rug' ? 0.04 : 2.4, d.kind === 'wall' ? 1.4 : d.kind === 'back' ? 0.1 : 1.4), toonMaterial(d.kind === 'rug' ? PALETTE.red : PALETTE.ink)); const x = ox + Math.min(def.w - 0.7, Math.max(0.05, d.x)), z = Math.min(def.d - 0.7, Math.max(0.05, d.z)); door.position.set(x, d.kind === 'rug' ? 0.02 : 1.2, z); group.add(door); room.doors.push({ ...d, wx: x, wz: z }); }
  // exit mat at the front edge
  if (def.exit) { const mat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), toonMaterial(PALETTE.red)); mat.position.set(ox + def.w / 2, 0.02, def.d - 0.45); group.add(mat); room.exitAt = [ox + def.w / 2, def.d - 0.45]; }
  for (const it of def.furn ?? []) addStatic(room, it);
  for (const p of def.props ?? []) room.props.push({ ...p, wx: ox + p.x, wz: p.z });
  return room;
}
function setUV(mesh, u, v, swap) { const a = mesh.geometry.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * u, a.getY(i) * v); a.needsUpdate = true; }
function addStatic(room, it) {
  const b = buildFurn(it.m ?? it.model, it.p); const o = b.object; o.position.set(room.ox + it.x, it.y ?? 0, it.z); o.rotation.y = ((it.rot ?? 0) * Math.PI) / 180; room.group.add(o);
  const bb = new THREE.Box3().setFromObject(o);
  if (!it.y && bb.max.y > 0.1) room.place.rects.push({ x0: bb.min.x, z0: bb.min.z, x1: bb.max.x, z1: bb.max.z });
}
export const roomExitDoor = (id) => ROOM_DEFS[id]?.exit;
export { ITEMS };
