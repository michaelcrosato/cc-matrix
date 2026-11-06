// Dev overlays: nav grid, hit circles, AI state, spawn markers, flow field, FPS and engine state.
export function drawOverlays(play, w) {
  const ui = play.ui; const view = play.view; const o = play.overlays; const f = view.focus; const R = 14;
  const proj = (x, y, z) => view.project(x, y, z, ui);
  if (o.nav || o.flow) {
    const nav = w.navs[0]; const dirv = [0, 0];
    for (let z = Math.floor(f.z) - R; z <= f.z + R; z++) for (let x = Math.floor(f.x) - R; x <= f.x + R; x++) {
      if (z < 0 || x < 0 || z >= w.zone.h || x >= w.zone.w) continue;
      const p = proj(x + 0.5, 0.02, z + 0.5);
      if (o.nav) ui.rect(p.x, p.y, 2, 2, w.zone.nav.isOpen(x, z) ? 'lime' : 'red');
      if (o.flow && nav.flowDirection(x + 0.5, z + 0.5, dirv)) { const q = proj(x + 0.5 + dirv[0] * 0.4, 0.02, z + 0.5 + dirv[1] * 0.4); ui.rect(q.x, q.y, 1, 1, 'cyan'); }
    }
  }
  if (o.hit) {
    const circle = (x, z, r, c) => { for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283; const p = proj(x + Math.cos(a) * r, 0.05, z + Math.sin(a) * r); ui.rect(p.x, p.y, 1, 1, c); } };
    for (const m of w.active ?? []) if (!m.dead) circle(m.x, m.z, m.r, 'red');
    for (const h of w.heroes) circle(h.x, h.z, 0.4, 'lime');
    for (const a of w.allies) circle(a.x, a.z, 0.35, 'sky');
  }
  if (o.ai) { let n = 0; for (const m of w.active ?? []) { if (m.dead || Math.hypot(m.x - f.x, m.z - f.z) > 18) continue; if (n++ > 16) break; const p = proj(m.x, 1.8, m.z); ui.text(p.x - 12, p.y, `${m.state}${m.aggro ? '!' : ''}`, { color: 'sand', world: true }); } }
  if (o.spawn) for (const s of w.zone.spawns ?? []) { const p = proj(s.x, 0.05, s.z); ui.rect(p.x - 1, p.y - 1, 3, 3, s.kind === 'E' ? 'sand' : 'orange'); }
  if (o.fps) { const s = play.ctx.engine.state(); ui.rect(12, 40, 220, 30, 'ink'); ui.text(14, 42, `FPS ${Math.round(s.fps ?? 0)} ACTIVE ${w.active?.length ?? 0} ALL ${w.monsters.length}`, { color: 'lime' }); ui.text(14, 51, `BACKEND ${s.backend} TICK ${w.tick}`, { color: 'lime' }); ui.text(14, 60, `PARTICLES ${play.ctx.particles.alive}`, { color: 'lime' }); }
}
