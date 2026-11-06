import { PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';

const { BoxGeometry, CylinderGeometry, Mesh, SphereGeometry, Vector3 } = THREE;

function soften(mesh, kind = 'prism') {
  mesh.geometry.computeBoundingBox();
  const b = mesh.geometry.boundingBox;
  const s = b.getSize(new Vector3());
  const c = b.getCenter(new Vector3());
  const g = kind === 'egg' ? new SphereGeometry(0.5, 10, 8) : new CylinderGeometry(0.5, 0.5, 1, 8);
  g.scale(s.x, s.y, s.z);
  g.translate(c.x, c.y, c.z);
  mesh.geometry = g;
}

/** Re-dress the kit hero. `look` uses palette names. */
export function dress(root, look) {
  const hide = new Set(['Moustache', 'ButtonR', 'ButtonL', 'Hat', 'Brim', 'Eyes', 'Nose']);
  const SLOT = {
    Overalls: 'bottom',
    ThighR: 'bottom',
    ThighL: 'bottom',
    ShinR_Mesh: look.long ? 'bottom' : 'skin',
    ShinL_Mesh: look.long ? 'bottom' : 'skin',
    Shirt: 'top',
    SleeveR: 'top',
    SleeveL: 'top',
    ForearmR_Mesh: look.long ? 'top' : 'skin',
    ForearmL_Mesh: look.long ? 'top' : 'skin',
    GloveR: 'skin',
    GloveL: 'skin',
    Face: 'skin',
    ShoeR: 'shoe',
    ShoeL: 'shoe',
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (hide.has(o.name)) {
      o.visible = false;
      return;
    }
    if (SLOT[o.name]) o.material = toonMaterial(PALETTE[look[SLOT[o.name]]] ?? PALETTE.sand);
    if (o.name === 'Face') soften(o, 'egg');
    else if (/Sleeve|Forearm|Thigh|Shin|Glove/.test(o.name)) soften(o);
  });
  const face = root.getObjectByName('Face');
  if (!face) return root;
  face.geometry.computeBoundingBox();
  const fb = face.geometry.boundingBox;
  const size = fb.getSize(new Vector3());
  const c = fb.getCenter(new Vector3());
  const add = (m, x, y, z) => {
    m.position.set(x, y, z);
    face.parent.add(m);
    return m;
  };
  for (const sx of [-1, 1]) add(new Mesh(new BoxGeometry(0.055, 0.09, 0.03), toonMaterial(PALETTE.ink)), c.x + sx * size.x * 0.2, c.y + 0.02, c.z + size.z * 0.48);
  add(new Mesh(new BoxGeometry(0.1, 0.022, 0.03), toonMaterial(PALETTE.ink)), c.x, c.y - size.y * 0.2, c.z + size.z * 0.47);
  const hair = add(new Mesh(new SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), toonMaterial(PALETTE[look.hair] ?? PALETTE.ink)), c.x, c.y + size.y * 0.04, c.z - size.z * 0.05);
  hair.scale.set(size.x * 1.08, size.y * 1.04, size.z * 1.08);
  if (look.bun) add(new Mesh(new SphereGeometry(0.1, 8, 6), toonMaterial(PALETTE[look.hair] ?? PALETTE.ink)), c.x, c.y + size.y * 0.6, c.z - size.z * 0.2);
  if (look.headband) {
    const band = add(new Mesh(new CylinderGeometry(0.5, 0.5, 1, 10), toonMaterial(PALETTE[look.headband] ?? PALETTE.red)), c.x, c.y + size.y * 0.16, c.z);
    band.scale.set(size.x * 1.06, 0.06, size.z * 1.06);
  }
  return root;
}

export const PLAYER_LOOK = { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink', headband: 'red' };
export const COACH_LOOK = { skin: 'sand', top: 'cyan', bottom: 'cyan', shoe: 'white', hair: 'mist', bun: true, long: true, headband: 'white' };

export const LOOK_CHOICES = {
  skin: ['sand', 'orange', 'red', 'plum'],
  hair: ['ink', 'sand', 'plum', 'mist'],
  top: ['white', 'cyan', 'lime', 'red'],
  bottom: ['sky', 'navy', 'teal', 'slate'],
  headband: ['red', 'white', 'lime', 'orange'],
};
