// Dev mode's overlays, drawn in art pixels over the world.
import { NavGrid } from '../../pixel-engine.js';

export class DevOverlays {
  constructor(game) { this.game = game; }
  draw(ui) {
    const g = this.game, w = g.world;
    const o = g.overlays;
    if (!w?.zone) return;
    const view = g.view;
    const h = g.localHero();
    if (o.nav && h) {
      const z = w.zone;
      const cx = Math.floor(h.x), cz = Math.floor(h.z);
      for (let j = cz - 12; j <= cz + 12; j++) for (let i = cx - 12; i <= cx + 12; i++) {
        if (z.nav.isOpen(i, j)) continue;
        const [sx, sy] = view.project(i + 0.5, 0, j + 0.5);
        ui.rect(sx - 1, sy - 1, 2, 2, 'red');
      }
    }
    if (o.flow && h) {
      const out = [0, 0];
      const nav = w.zone.navs[h.navIndex ?? 0];
      const cx = Math.floor(h.x), cz = Math.floor(h.z);
      for (let j = cz - 10; j <= cz + 10; j += 2) for (let i = cx - 10; i <= cx + 10; i += 2) {
        if (!nav.walkable(i + 0.5, j + 0.5) || !nav.flowDirection(i + 0.5, j + 0.5, out)) continue;
        const [a, b] = view.project(i + 0.5, 0, j + 0.5);
        const [c, d] = view.project(i + 0.5 + out[0] * 0.6, 0, j + 0.5 + out[1] * 0.6);
        ui.rect(a, b, 1, 1, 'cyan');
        ui.rect(c, d, 1, 1, 'white');
      }
    }
    if (o.hit) {
      for (const m of [...w.monsters, ...w.heroes]) {
        if (m.dead || m.gone) continue;
        for (let a = 0; a < 10; a++) {
          const ang = (a / 10) * Math.PI * 2;
          const [sx, sy] = view.project(m.x + Math.cos(ang) * m.r, 0.1, m.z + Math.sin(ang) * m.r);
          ui.rect(sx, sy, 1, 1, m.kind === 'hero' ? 'lime' : 'orange');
        }
      }
    }
    if (o.ai) for (const m of w.monsters) {
      if (m.dead) continue;
      const [sx, sy] = view.project(m.x, 2, m.z);
      ui.text(sx, sy, m.state, { color: 'cyan', align: 'center' });
    }
    if (o.spawn) for (const s of w.zone.spawnList) {
      const [sx, sy] = view.project(s.x, 0.2, s.z);
      ui.rect(sx - 1, sy - 1, 3, 3, s.done ? 'slate' : s.kind === 'E' ? 'orange' : 'lime');
    }
    if (o.state) {
      const st = g.ctx.engine.state();
      ui.text(12, ui.h - 62, `FPS ${st.fps?.toFixed?.(0) ?? st.fps} ${g.status()}`.slice(0, 66), { color: 'cyan' });
      ui.text(12, ui.h - 52, `T ${w.t} MON ${w.monsters.length} ALLY ${w.allies.length} DROPS ${w.drops.length}`, { color: 'cyan' });
    }
  }
}
export { NavGrid };
