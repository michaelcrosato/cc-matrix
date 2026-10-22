'use strict';
/* ===== Attract-mode pilot: cheats freely (god mode), only job is to show off the game ===== */
const AI = {
  st: { tapT: 0, charging: 0, chargeCd: 4, rollCd: 0, bombCd: 12, tapOn: false },
  reset() { this.st = { tapT: 0, charging: 0, chargeCd: 4, rollCd: 0, bombCd: 12, tapOn: false }; },
  compute(g, dt) {
    const P = g.P, s = this.st, c = { mx: 0, my: 0, fire: false, fireP: false, fireR: false, bomb: false, rollL: false, rollR: false, boost: false, brake: false, squad: false };
    if (g.state !== 'play' || !P.alive) return c;
    s.rollCd -= dt; s.bombCd -= dt; s.chargeCd -= dt; s.tapT -= dt;
    // target selection
    let best = null, bs = 1e9, count = 0;
    for (const e of g.enemies) {
      if (!e.alive || !e.lock || e.invuln || e.hide) continue; const dz = g.pz - e.mesh.position.z; if (dz < 14 || dz > 210) continue;
      count++; const sc = dz * 0.6 + Math.hypot(e.mesh.position.x - P.ox, e.mesh.position.y - P.oy) * 0.8 - (e.boss ? 40 : 0); if (sc < bs) { bs = sc; best = e; }
    }
    let tx = 0, ty = 4;
    if (best) { const dz = g.pz - best.mesh.position.z, ld = dz / 300; tx = best.mesh.position.x; ty = best.mesh.position.y; if (best.rel) tx += (best.x - (best.x)) * 0; }
    else {
      // chase rings / crates, otherwise gentle sweep
      let pk = null, pd = 1e9; for (const p of g.pickups) { const dz = g.pz - p.mesh.position.z; if (dz > 0 && dz < 160 && dz < pd) { pd = dz; pk = p; } }
      if (pk) { tx = pk.mesh.position.x; ty = pk.mesh.position.y; } else { tx = Math.sin(g.time * 0.7) * 14; ty = 4 + Math.sin(g.time * 0.5) * 5; }
    }
    // obstacle avoidance
    for (const o of g.obstacles) {
      const mp = o.mesh.position, dz = g.pz - mp.z; if (dz < -4 || dz > 75) continue;
      for (const b of o.boxes) {
        const cx = mp.x + b.x, cy = mp.y + b.y; if (Math.abs(g.pz - (mp.z + b.z)) > 80 + b.hz) continue;
        const px = Math.abs(tx - cx) < b.hx + 5, py = ty > cy - b.hy - 4 && ty < cy + b.hy + 4;
        if (px && py) {
          const opts = [{ x: cx - b.hx - 5, y: ty }, { x: cx + b.hx + 5, y: ty }, { x: tx, y: cy - b.hy - 4 }, { x: tx, y: cy + b.hy + 4 }].filter((q) => Math.abs(q.x) < 30 && q.y > -8 && q.y < 16);
          opts.sort((a, b2) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b2.x - tx, b2.y - ty)); if (opts.length) { tx = opts[0].x; ty = opts[0].y; }
        }
      }
    }
    c.mx = clamp((tx - P.ox) * 0.45, -1, 1); c.my = clamp((ty - P.oy) * 0.5, -1, 1);
    // firing: charge/lock bursts when plenty of targets, otherwise rapid taps
    if (s.charging > 0) { c.fire = true; s.charging -= dt; if (s.charging <= 0) { c.fire = false; c.fireR = true; s.chargeCd = 5; } }
    else if (count >= 3 && s.chargeCd <= 0) s.charging = 1.15;
    else if (best && s.tapT <= 0) { c.fire = true; c.fireP = true; s.tapT = 0.13; }
    // defense
    if (s.rollCd <= 0) for (const b of g.eb) { const dz = g.pz - b.pos.z; if (dz > 2 && dz < 26 && Math.hypot(b.pos.x - P.ox, b.pos.y - P.oy) < 6 && b.vel.z > 0) { if (Math.random() < 0.5) c.rollL = true; else c.rollR = true; s.rollCd = 1.2; break; } }
    if (s.bombCd <= 0 && (count >= 7 || (g.boss && g.boss.phase > 1 && Math.random() < dt * 0.1)) && P.bombs > 0) { c.bomb = true; s.bombCd = 20; }
    if (P.bombs < 2) P.bombs = 3;
    if (P.squad >= 1) c.squad = true;
    if (!best && !g.boss && P.boost > 0.7 && g.obstacles.every((o) => g.pz - o.mesh.position.z < -90 || g.pz - o.mesh.position.z > 10)) c.boost = Math.sin(g.time * 0.4) > 0.3;
    P.shield = P.maxShield;
    return c;
  },
};
