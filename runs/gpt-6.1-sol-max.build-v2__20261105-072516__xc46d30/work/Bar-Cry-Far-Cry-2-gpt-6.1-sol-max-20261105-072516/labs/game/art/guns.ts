/** @file Assembled gun meshes keep every authored silhouette and reload pose in a single native prop batch. */
import {
  defineGeometry,
  defineMaterial,
  buildPropPart,
  partMatrix,
  mergeGeometries,
  Color,
  type PropPart,
} from '../../../engine';
import { GUN_MESHES } from '../weapons/guns';
defineMaterial('material:field-gun', { color: '#ffffff', roughness: 0.8, vertexColors: true });
for (const [id, recipe] of Object.entries(GUN_MESHES))
  defineGeometry(id, {
    description: 'An assembled firearm in one visible hand pose.',
    budget: 4096,
    create: () => {
      const pieces = recipe.map((p) => {
        const part = p as PropPart,
          g = buildPropPart(part).applyMatrix4(partMatrix(part)),
          c = new Color(p.tint === '#41484a' ? '#ffffff' : p.tint);
        const Attr = g.getAttribute('position').constructor as new (a: Float32Array, n: number) => never;
        const colors = new Float32Array(g.getAttribute('position').count * 3);
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = c.r;
          colors[i + 1] = c.g;
          colors[i + 2] = c.b;
        }
        g.setAttribute('color', new Attr(colors, 3));
        g.clearGroups();
        return g;
      });
      const merged = mergeGeometries(pieces);
      for (const p of pieces) p.dispose();
      return merged;
    },
  });
