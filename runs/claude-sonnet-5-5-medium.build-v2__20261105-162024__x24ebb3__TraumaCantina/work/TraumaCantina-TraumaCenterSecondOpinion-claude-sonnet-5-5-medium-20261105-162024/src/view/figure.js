// Full-body figures for wide shots. Pivots carry the hero rig's joint names, so every HERO_CLIPS clip plays on them.
import { THREE, buildModel, toonMaterial, setLookLayer, compileClips, HERO_CLIPS, HERO_RIG } from '../../pixel-engine.js';
import { CAST } from '../content/cast.js';
import { figureDef, castBinding } from '../content/models/index.js';
const { Group, Mesh, BoxGeometry, AnimationMixer, SphereGeometry } = THREE;
export function buildFigure(id) {
  const c = CAST[id] || CAST.ilya, b = castBinding(id), root = buildModel(figureDef(id), { palette: { scrub: b.scrub, skin: b.skin, glove: 0x7ab8e8, shoe: 0x2a2a30, cap: c.cap || c.hair || 0x2a1c18, coat: b.coat, mask: 0xe8f0f0 } }).object; root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  root.scale.setScalar(2.2 * (c.height || 1)); setLookLayer(root, 'actors');
  const clips = compileClips(HERO_CLIPS, HERO_RIG, root), mixer = new AnimationMixer(root), by = {}; for (const cl of clips) by[cl.name] = cl;
  let action = null;
  return { group: root, mixer, play(n, loop = true) { const cl = by[n] || by.Idle; if (!cl) return; const a = mixer.clipAction(cl); if (action && action !== a) { a.reset().play(); action.crossFadeTo(a, 0.25, false); } else a.play(); action = a; }, update(dt) { mixer.update(dt); } };
}
