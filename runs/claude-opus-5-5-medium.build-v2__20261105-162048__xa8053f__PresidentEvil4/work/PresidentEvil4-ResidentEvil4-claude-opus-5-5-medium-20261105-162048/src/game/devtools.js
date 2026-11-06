// Dev overlays: hit zones, nav and flow, triggers. Thin glow boxes.
import { glowMaterial, PALETTE, THREE } from '../../pixel-engine.js';
const box = (w, h, d, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glowMaterial(c)); m.castShadow = false; return m; };
export class DevTools {
  constructor(app) { this.app = app; }
  toggleZones(A) { A.showZones = !A.showZones; }
  toggleNav(A) {
    A.showNav = !A.showNav; if (A.navGroup) { A.ctx.scene.remove(A.navGroup); A.navGroup = null; } if (!A.showNav) return; const g = new THREE.Group(), L = A.level, nav = A.navOf(0, 0); for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { if (!nav.isOpen(x, y)) continue; const m = box(0.3, 0.03, 0.3, PALETTE.lime); m.position.set(L.wx(x), 0.08, L.wz(y)); g.add(m); } A.ctx.scene.add(g); A.navGroup = g;
  }
  toggleTriggers(A) { A.showTriggers = !A.showTriggers; if (A.trigGroup) { A.ctx.scene.remove(A.trigGroup); A.trigGroup = null; } if (!A.showTriggers) return; const g = new THREE.Group(); for (const it of A.interact.items) { const m = box(0.3, 2, 0.3, PALETTE.cyan); m.position.set(it.x, 1 + (it.floor ?? 0) * A.floorH, it.z); g.add(m); } A.ctx.scene.add(g); A.trigGroup = g; }
  /** Draw hit zones as HUD ticks each frame. */
  drawZones(A, ui, project) { if (!A.showZones) return; const cam = A.ctx.camera.camera; for (const e of A.enemies) { if (e.dead) continue; const z = e.zones; const dot = (v, c) => { const [x, y, d] = project(cam, ui.W, ui.H, v); if (d < 1) ui.rect(x - 1, y - 1, 3, 3, c); }; dot(z.head, 'lime'); if (z.pelvis) { dot(z.pelvis, 'white'); dot(z.neck, 'white'); dot(z.legRb, 'sand'); dot(z.legLb, 'sand'); dot(z.armRb, 'cyan'); dot(z.armLb, 'cyan'); } } }
}
