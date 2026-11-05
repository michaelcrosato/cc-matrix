// 52-devview.js: the dev view overlays (plan 4.16, VIEW tab): hit volumes, the colliders (the solid boxes), the AI state of
// each enemy, and the threat timers. Each is a toggle in TC.tune.view; all are off by default. Drawn in screen space over
// each viewport, projected with that viewport's camera. They never change the sim.
TC.drawDevView = function (play, g, vp, ras, cam) {
  const v = TC.tune.view;
  if (v.perf && vp.i === 0) {
    const ms = play.frameMs || 0;
    const lines = ['FRAME ' + ms.toFixed(1) + ' MS (' + (ms > 0 ? Math.round(1000 / ms) : 0) + ' FPS)', 'ENEMIES ' + play.sim.enemies.length, 'THREATS ' + play.sim.threats.length, 'BOXES ' + play.world.boxes.length, 'PROJECTILES ' + play.sim.projectiles.length];
    lines.forEach((ln, i) => TC.text(g, ln, vp.x + 4, vp.y + 88 + i * 8, '#9fffb0', { scale: 1 }));
  }
  if (!v.hitVolumes && !v.colliders && !v.aiLabels && !v.threatDebug) return;
  const x0 = vp.x, y0 = vp.y;
  const box = (b, color) => {
    const pts = [];
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) {
      const p = ras.project([x, y, z]);
      if (p) pts.push(p);
    }
    if (pts.length < 2) return;
    const minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
    const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
    g.strokeStyle = color; g.lineWidth = 1; g.globalAlpha = 0.9;
    g.strokeRect(Math.round(x0 + minX) + 0.5, Math.round(y0 + minY) + 0.5, Math.max(1, Math.round(maxX - minX)), Math.max(1, Math.round(maxY - minY)));
    g.globalAlpha = 1;
  };
  if (v.colliders) for (const b of play.world.boxes) if (b.solid && !b.gone) box(b.b, '#3aff7a');
  for (const e of play.sim.enemies) {
    if (!e.alive && !e.gone) continue;
    if (v.hitVolumes && e.alive) for (const hv of play.sim.hitVolumes(e)) box(hv.b, e.exposed ? '#ff5a5a' : '#7a7a9a');
    const p = ras.project([e.x, e.y, 30 * (e.size || 1)]);
    if (!p) continue;
    if (v.aiLabels) TC.text(g, (e.state || '') + ' ' + (e.hp != null ? e.hp.toFixed(1) : ''), x0 + p[0], y0 + p[1] - 6, '#ffe9a0', { align: 'center', scale: 1 });
  }
  if (v.threatDebug) {
    let row = 0;
    for (const th of play.sim.threats) {
      if (th.resolved) continue;
      TC.text(g, 'T' + th.id + ' ' + th.kind + ' -> P' + (th.target + 1) + ' in ' + Math.max(0, th.impactAt - play.sim.t).toFixed(2) + 's', x0 + 4, y0 + 56 + row * 8, '#ff9ac2', { scale: 1 });
      row++;
    }
  }
  void cam;
};
