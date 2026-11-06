// The parts every car shares: wheels (tyre, hub, spoke bars, by rim style) and the mud shell.
import { model, PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';
import { CAR_MODELS } from '../models/cars.js';
const { BoxGeometry, CylinderGeometry, Group, Mesh } = THREE;
export const RIM_COLOURS = ['mist', 'white', 'sand', 'white'];
const tyreGeom = new Map(), SPOKES = [[1, 'box'], [5, 'box'], [8, 'bar'], [3, 'box']];
export function wheelMesh(R, width, style, rimColour) {
  const spin = new Group(), key = `${R}:${width}`;
  if (!tyreGeom.has(key)) tyreGeom.set(key, new CylinderGeometry(R, R, width, 12).rotateZ(Math.PI / 2));
  const tyre = new Mesh(tyreGeom.get(key), toonMaterial(PALETTE.ink));
  tyre.castShadow = true; tyre.receiveShadow = false; spin.add(tyre);
  const rimR = R * 0.62, hub = new Mesh(new CylinderGeometry(rimR, rimR, width + 0.03, 8).rotateZ(Math.PI / 2), toonMaterial(PALETTE[rimColour])); spin.add(hub);
  const [n] = SPOKES[style] ?? SPOKES[0];
  for (let k = 0; k < n; k++) { const bar = new Mesh(new BoxGeometry(width + 0.06, R * 0.28, rimR * 1.9), toonMaterial(PALETTE.night)); bar.rotation.x = (k / n) * Math.PI; spin.add(bar); }
  return spin;
}
const mudDefs = new Map();
export function mudDefFor(carId) {
  if (mudDefs.has(carId)) return mudDefs.get(carId);
  const k = CAR_MODELS[carId], top = 0.66, body = k.body.map(([z, y]) => [z, Math.min(y, top)]);
  const def = model({ id: `mud-${carId}`, about: 'mud on the lower body', tags: ['vehicle', 'part'], palette: { mud: 'orange' }, parts: [{ slab: body, depth: k.width + 0.05, at: [0, 0, 0], rot: [0, -90, 0], c: 'mud' }], collider: 'none' });
  mudDefs.set(carId, def);
  return def;
}
