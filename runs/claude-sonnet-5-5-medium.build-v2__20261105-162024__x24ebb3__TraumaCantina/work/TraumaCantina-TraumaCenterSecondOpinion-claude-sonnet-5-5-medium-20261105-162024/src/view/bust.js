// The anime talking head: face and hair from slab outlines, with named pivots for brows, lids and mouth.
import { THREE, buildModel, toonMaterial, PALETTE, setLookLayer } from '../../pixel-engine.js';
import { bustDef, castBinding } from '../content/models/index.js';
import { CAST, EMOTIONS } from '../content/cast.js';
const { Group, Mesh, BoxGeometry, ExtrudeGeometry, Shape, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry } = THREE;
const FACE = [[-0.46, 0.5], [0.46, 0.5], [0.5, 0.05], [0.42, -0.28], [0.2, -0.56], [0, -0.68], [-0.2, -0.56], [-0.42, -0.28], [-0.5, 0.05]];
const FRINGE = [[-0.56, 0.42], [-0.6, 0], [-0.44, 0.16], [-0.4, -0.08], [-0.22, 0.24], [-0.06, 0.02], [0.06, 0.26], [0.24, 0.04], [0.34, 0.26], [0.46, -0.1], [0.6, 0.02], [0.56, 0.42], [0.34, 0.66], [0, 0.74], [-0.34, 0.66]];
const SWEPT = [[-0.56, 0.3], [-0.6, -0.1], [-0.4, 0.1], [-0.1, 0.35], [0.2, 0.3], [0.56, 0.1], [0.6, 0.4], [0.34, 0.68], [0, 0.78], [-0.34, 0.68]];
const slab = (pts, depth) => { const s = new Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); const g = new ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g; };
const col = (n) => toonMaterial(n);
const nm = (m) => { m.castShadow = m.receiveShadow = false; return m; };
export function buildBust(id) {
  const built = buildModel(bustDef(id), { palette: castBinding(id) }), root = built.object, g = (n) => root.getObjectByName(n);
  const head = g('head'), mouth = g('mouth'), inner = g('inner'), sweat = g('sweat'), blush = g('blush');
  const parts = { brows: [g('browL'), g('browR')], lids: [g('lidL'), g('lidR')] }; parts.brows[0].userData.s = -1; parts.brows[1].userData.s = 1;
  root.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = false; }); // shadow acne scatters over faces otherwise
  sweat.visible = false; blush.visible = false; inner.visible = false;
  const st = { emo: 'neutral', blink: 2, bt: 0, t: 0 };
  const api = { group: root, head, sweat, blush, st, id,
    setEmotion(e) { st.emo = e; },
    update(dt, mouthAmt = 0, t = 0, dim = false) {
      st.t += dt; const e = EMOTIONS[st.emo] || EMOTIONS.neutral;
      parts.brows.forEach((b, i) => { const s = b.userData.s; b.position.y += ((0.26 + e.brow[1] - b.position.y) * Math.min(1, dt * 12)); b.rotation.z += ((-s * e.brow[0] - b.rotation.z) * Math.min(1, dt * 12)); });
      st.blink -= dt; if (st.blink < 0) { st.bt = 0.14; st.blink = 2 + (Math.sin(t * 3.7) + 1) * 1.5; } st.bt = Math.max(0, st.bt - dt);
      const lidS = st.bt > 0 ? 1.6 : 0.1 / (e.lid || 1) * 0.6 + 0.1; parts.lids.forEach((l) => { l.scale.y = st.bt > 0 ? 6 : Math.max(0.1, 1.2 - e.lid); l.position.y = 0.1 + (st.bt > 0 ? -0.08 : 0); });
      mouth.scale.set(e.mouth[0], 0.6 + mouthAmt * 2.6 + (e.mouth[1] - 1) * 0.5, 1); inner.visible = mouthAmt > 0.15 || e.mouth[1] > 1.4;
      head.rotation.z += ((e.tilt - head.rotation.z) * Math.min(1, dt * 6)); head.rotation.y = Math.sin(t * 0.7) * 0.06; head.rotation.x = Math.sin(t * 0.9 + 1) * 0.03 - mouthAmt * 0.04;
      sweat.visible = st.emo === 'panic' || st.emo === 'shock'; blush.visible = st.emo === 'smile'; root.position.y = Math.sin(t * 1.3) * 0.01;
      root.traverse((o) => { if (o.material && o.isMesh) o.visible = o.visible; });
    },
  };
  return api;
}
