// Debug overlays for dev mode: collision tiles, nav paths, target, NPC state, an engine line.
import { drawText } from '../ui/draw.js';
import { COLS, ROWS } from '../world/tiles.js';

export class DevOverlay {
  constructor(g) { this.g = g; this.collision = false; this.nav = false; this.target = false; this.npc = false; this.engine = false; }
  draw(hud) {
    const g = this.g;
    if (!g.world) return;
    if (this.collision && g.place === g.town) {
      const p = g.player;
      for (let z = Math.floor(p.z) - 10; z <= Math.floor(p.z) + 10; z++) for (let x = Math.floor(p.x) - 10; x <= Math.floor(p.x) + 10; x++) {
        if (x < 0 || z < 0 || x >= COLS || z >= ROWS) continue;
        if (g.town.blocked(x + 0.5, z + 0.5)) { const s = g.project(x + 0.5, g.town.height(x + 0.5, z + 0.5), z + 0.5); if (s) hud.rect(s.x - 2, s.y - 2, 4, 4, 'red'); }
      }
    }
    if (this.nav) for (const n of g.npcs.all()) {
      if (!n.path || !n.actor.visible) continue;
      for (const pt of n.path) { const s = g.project(pt[0], g.town.height(pt[0], pt[2]) + 0.1, pt[2]); if (s) hud.rect(s.x - 1, s.y - 1, 3, 3, 'lime'); }
    }
    if (this.target && g.interact.target) { const t = g.interact.target; const s = g.project(t.x, 0.1, t.z); if (s) { hud.rect(s.x - 3, s.y - 3, 7, 7, 'cyan'); drawText(hud, s.x + 6, s.y - 3, t.act ?? '?', { color: 'cyan', shadow: 'ink' }); } }
    if (this.npc) for (const n of g.npcs.all()) {
      if (!n.actor.visible) continue;
      const s = g.project(n.actor.x, n.actor.y + 2.2, n.actor.z);
      if (s) drawText(hud, s.x, s.y, `${n.id} ${n.state} ${n.timer.toFixed(0)}`, { align: 'center', color: 'lime', shadow: 'ink' });
    }
    if (this.engine) {
      const st = g.engine.state();
      drawText(hud, 6, 256, `fps ${g.engine.fps.toFixed(0)} ${st.backend} ${st.look ?? ''} ${g.status()}`, { color: 'lime', shadow: 'ink' });
    }
  }
}
