// The stage's hazards: force fields (beams that cycle on and off, hurting whatever touches them while on) and spikes (up
// for half a second every 1.6 seconds). Plates, runes, pads and fake walls are handled where heroes move, in 30-world.js.

function stepFeatures(dt) {
  const W = WORLD;
  const t = W.time;
  // force fields: two seconds on, two off, each with its own phase
  for (const f of W.fields) {
    const phase = (t + f.phase) % 4;
    const on = phase >= 2;
    f.on = on;
    f.flicker = !on && phase > 1.6;
    if (!on) continue;
    for (const h of W.heroes) {
      if (h.down || h.fieldCd > 0) continue;
      if (f.cells.some(c => Math.hypot(c.x - h.body.x, c.y - h.body.y) < 9)) {
        h.fieldCd = .5;
        damageHero(h, 12, null);
        h.body.x += (h.body.x - f.cells[1].x) * .1; h.body.y += (h.body.y - f.cells[1].y) * .1;
        say('tip_field', h);
      }
    }
    for (const m of W.monsters) {
      if (!m.alive) continue;
      if (f.cells.some(c => Math.hypot(c.x - m.x, c.y - m.y) < 9)) damageMonster(m, .5 * 12 * dt, null);
    }
  }
  for (const h of W.heroes) h.fieldCd = Math.max(0, (h.fieldCd || 0) - dt);
  // spikes: a quarter-second tremble, then up for half a second
  for (const s of W.spikes) {
    const p = (t + s.phase) % 1.6;
    const up = p >= 1.1 && p < 1.6;
    if (up && !s.hit) {
      s.hit = true;
      for (const h of W.heroes) if (!h.down && Math.hypot(h.body.x - s.x, h.body.y - s.y) < 8) { damageHero(h, 15, null); say('tip_spike', h); }
      for (const m of W.monsters) if (m.alive && m.kind !== 'ghost' && Math.hypot(m.x - s.x, m.y - s.y) < 8) damageMonster(m, 15, null);
    }
    if (!up) s.hit = false;
    s.up = up;
    s.tremble = p >= .85 && p < 1.1;
  }
}
