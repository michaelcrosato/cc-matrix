/* ---- Items: fan throws, power-ups, octopi, rats, hats, thin ice, snowbanks, Polar Pete and the Discount Drop (PLAN 7.12) ---- */
const Items = (() => {
  const C = Rink.C;
  function reset(m) {
    m.items = []; m.hazards = []; m.hats = []; m.throwT = T.itemEvery * (.6 + RNG.sim() * .5); m.dropT = 40; m.crate = null; m.techs = [];
    m.ice = m.arena.hazards.includes('thinice') ? [[C.x - 200, C.y - 70], [C.x + 40, C.y + 90], [C.x + 220, C.y - 60]].map(([x, y], i) => ({ i, x, y, rx: 56, ry: 34, hp: 100, hole: false, t: 0 })) : [];
    m.mascot = m.arena.hazards.includes('mascot') ? { x: C.x, y: C.y - 40, vx: 0, vy: 0, t: 0, down: 0, facing: 0, rig: Rigs.cast('pete').rig, cast: true } : null;
  }
  /** a fan throws something from the stands: an item, or an octopus / rat in barns that do that */
  function throwOne(kind, at) {
    const pool = M.arena.items, k = kind || U.pick(RNG.sim, pool);
    const tx = at ? at[0] : C.x + (RNG.sim() - .5) * 360, ty = at ? at[1] : C.y + (RNG.sim() - .5) * 220;
    const fx = clamp(tx + (RNG.sim() - .5) * 200, Rink.X0 + 60, Rink.X1 - 60), fy = RNG.sim() < .7 ? Rink.Y0 - 90 : Rink.Y1 + 60;
    const v = E.arc({ x: fx, y: fy, z: 40 }, { x: tx, y: ty, z: 0 }, 500, { apex: 90 });
    const it = { kind: k, x: fx, y: fy, z: 40, vx: v.vx, vy: v.vy, vz: v.vz, t: 0, life: 12, flying: true, haz: k === 'octopus' || k === 'rat' };
    if (it.haz) M.hazards.push(it); else M.items.push(it);
    Bus.emit('item_throw', { kind: k, x: tx, y: ty });
    return it;
  }
  function step(dt) {
    if (!M.cfg.noItems) {
      M.throwT -= dt * (M.cheats.octorain ? 4 : 1);
      if (M.throwT <= 0) { M.throwT = T.itemEvery * (.7 + RNG.sim() * .6); const haz = M.arena.hazards.filter(h => h === 'octopus' || h === 'rat'); throwOne(M.cheats.octorain ? 'octopus' : haz.length && RNG.sim() < .3 ? U.pick(RNG.sim, haz) : null); }
    }
    for (const list of [M.items, M.hazards]) for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i]; it.t += dt;
      if (it.flying) { it.vz -= 500 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; if (it.z <= 0) { it.z = 0; it.flying = false; it.vx *= .4; it.vy *= .4; if (it.kind === 'octopus') Bus.emit('octopus_land', { x: it.x, y: it.y }); } continue; }
      it.x += it.vx * dt; it.y += it.vy * dt; it.vx *= Math.exp(-dt * 2); it.vy *= Math.exp(-dt * 2); Rink.clamp(it, 4);
      if (it.kind === 'rat') { it.rt = (it.rt || 0) - dt; if (it.rt <= 0) { it.rt = .5 + RNG.sim(); const a = RNG.sim() * TAU; it.vx = Math.cos(a) * 70; it.vy = Math.sin(a) * 70; } if (it.t > 10) { list.splice(i, 1); continue; } }
      if (!it.haz && it.t > it.life) { list.splice(i, 1); continue; }
      for (const s of M.skaters) {
        if (s.off || !Skater.free(s) && s.state !== 'skate') continue;
        const d = Math.hypot(s.x - it.x, s.y - it.y);
        if (!it.haz && d < 12) { grab(s, it); list.splice(i, 1); break; }
        if (it.haz && d < 10 && Math.hypot(s.vx, s.vy) > 40 && (s.state === 'skate' || s.state === 'check') && !(s.items.poutine > 0)) { s.state = 'slip'; s.stateT = 0; if (M.puck.owner === s) Skater.release(s, s.vx, s.vy, 0, 'slip'); Bus.emit('hazard', { kind: it.kind, victim: s.id, team: s.team, x: s.x, y: s.y }); if (it.kind === 'rat') { list.splice(i, 1); break; } }
      }
    }
    // thin ice: a skater in a hole is frozen; holes refreeze after 30 s
    for (const p of M.ice) {
      if (p.hole) { p.t += dt; if (p.t > 30) { p.hole = false; p.hp = 60; p.refrozen = true; } else for (const s of M.skaters) if (!s.off && s.state !== 'frozen' && s.state !== 'bin' && s.state !== 'fight' && inPatch(p, s.x, s.y, .7)) { s.state = 'frozen'; s.stateT = 0; s.vx = s.vy = 0; s.hole = p; if (M.puck.owner === s) Skater.release(s, 0, 0, 0, 'drop'); Bus.emit('plunge', { victim: s.id, team: s.team, x: s.x, y: s.y }); } }
    }
    mascot(dt); drop(dt);
    for (const s of M.skaters) if (M.cheats.magnet && s.human && !M.puck.owner && !M.puck.held && Math.hypot(M.puck.x - s.x, M.puck.y - s.y) < 160) { const p = M.puck, dx = s.x - p.x, dy = s.y - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * 600 * dt; p.vy += dy / d * 600 * dt; }
  }
  function grab(s, it) {
    const k = it.kind, d = ITEMS[k] || { dur: 8 };
    if (k === 'boombox') Boom.add(s.team, 40);
    else if (k === 'bricks') { const g = M.goalies[s.team]; g.bricks = d.dur; }
    else if (k === 'lumber') { s.items.lumber = 1; s.items.lumberShots = 3; }
    else s.items[k] = d.dur;
    if (k === 'hotsauce' || k === 'cocoa') s.turbo = 1;
    Bus.emit('item', { by: s.id, team: s.team, kind: k, name: s.name, item: (ITEMS[k] || {}).name || k, x: it.x, y: it.y });
  }
  const inPatch = (p, x, y, k = 1) => Math.pow((x - p.x) / (p.rx * k), 2) + Math.pow((y - p.y) / (p.ry * k), 2) < 1;
  const holeAt = (x, y) => M && M.ice && M.ice.some(p => p.hole && inPatch(p, x, y, .7));
  /** a knockdown (or big hit) on a thin-ice patch costs it integrity; at 0 it breaks */
  function hitOnIce(s, imp) {
    for (const p of M.ice) if (!p.hole && inPatch(p, s.x, s.y)) {
      p.hp -= imp >= T.knockdown + 40 ? 100 : 50;
      Bus.emit('ice_crack', { patch: p.i, hp: p.hp, x: p.x, y: p.y });
      if (p.hp <= 0) { p.hole = true; p.t = 0; Bus.emit('thin_ice_break', { patch: p.i, victim: s.id, victimTeam: s.team, x: p.x, y: p.y, name: s.name }); }
    }
  }
  Bus.on('stop', e => { if (!M || !M.ice) return; const s = M.byId[e.by]; for (const p of M.ice) if (!p.hole && s && inPatch(p, e.x, e.y)) { p.hp -= 12; Bus.emit('ice_crack', { patch: p.i, hp: p.hp, x: p.x, y: p.y }); if (p.hp <= 0) { p.hole = true; p.t = 0; Bus.emit('thin_ice_break', { patch: p.i, victim: s.id, victimTeam: s.team, x: p.x, y: p.y, name: s.name }); } } });
  function breakIce(i) { const p = M.ice[i || 0]; if (!p) return false; p.hp = 0; p.hole = true; p.t = 0; Bus.emit('thin_ice_break', { patch: p.i, victimTeam: 1, x: p.x, y: p.y, name: 'the ice' }); return true; }
  function popOut(s) { const p = s.hole; if (!p) return; const a = Math.atan2(s.y - p.y, s.x - p.x); s.x = p.x + Math.cos(a) * (p.rx + 10); s.y = p.y + Math.sin(a) * (p.ry + 10); s.hole = null; Rink.clamp(s, 8); }
  function refreeze() { if (M && M.ice) for (const p of M.ice) { p.hole = false; p.hp = 100; } }
  /* Polar Pete skates figure eights in the neutral zone; he can be checked */
  function mascot(dt) {
    const m = M.mascot; if (!m) return;
    m.t += dt;
    if (m.down > 0) { m.down -= dt; m.vx *= .95; m.vy *= .95; if (m.down <= 0) Bus.emit('mascot_up', {}); }
    else { const tx = C.x + Math.sin(m.t * .5) * 90, ty = C.y + Math.sin(m.t) * 70, dx = tx - m.x, dy = ty - m.y; m.vx += (dx * 2 - m.vx) * dt * 2; m.vy += (dy * 2 - m.vy) * dt * 2; }
    m.x += m.vx * dt; m.y += m.vy * dt; Rink.clamp(m, 9);
    if (Math.hypot(m.vx, m.vy) > 5) m.facing = Math.atan2(m.vy, m.vx);
    for (const s of M.skaters) {
      if (s.off || s.state === 'bin' || s.state === 'fight') continue;
      const dx = m.x - s.x, dy = m.y - s.y, d = Math.hypot(dx, dy); if (d >= 16 || d < .01) continue;
      const nx = dx / d, ny = dy / d; m.x = s.x + nx * 16; m.y = s.y + ny * 16;
      if (m.down <= 0 && (s.state === 'check' || Math.hypot(s.vx, s.vy) > 160)) { m.down = 3; m.vx = nx * 160; m.vy = ny * 160; Bus.emit('mascot_down', { by: s.id, team: s.team, name: s.name, x: m.x, y: m.y }); }
      else { const vn = s.vx * nx + s.vy * ny; if (vn > 0) { s.vx -= vn * nx * 1.2; s.vy -= vn * ny * 1.2; } }
    }
    const pk = M.puck; if (!pk.owner && !pk.held && Math.hypot(pk.x - m.x, pk.y - m.y) < 9 && pk.z < 14) { const nx = (pk.x - m.x) / 9, ny = (pk.y - m.y) / 9, vn = pk.vx * nx + pk.vy * ny; if (vn < 0) { pk.vx -= 1.6 * vn * nx; pk.vy -= 1.6 * vn * ny; } }
    m.rig.update(dt, { x: m.x, y: m.y, z: 0, vx: m.vx, vy: m.vy, facing: m.facing, down: m.down > 0 ? Math.min(1, (3 - m.down) * 4) : 0, pose: m.down <= 0 && Math.sin(m.t * 2) > .7 ? 'wave' : null });
  }
  /* the Discount Drop: a claw lowers a crate to center ice every 40 s; it breaks into a power-up */
  function drop(dt) {
    if (!M.arena.hazards.includes('drop')) return;
    M.dropT -= dt;
    if (M.dropT <= 0 && !M.crate) { M.dropT = 40; M.crate = { x: C.x + (RNG.sim() - .5) * 60, y: C.y + (RNG.sim() - .5) * 60, z: 120, t: 0 }; Bus.emit('drop_start', {}); }
    const c = M.crate; if (!c) return;
    c.t += dt; c.z = Math.max(0, 120 - c.t * 50);
    if (c.z <= 0) for (const s of M.skaters) if (!s.off && Math.hypot(s.x - c.x, s.y - c.y) < 16) { Bus.emit('crate_break', { x: c.x, y: c.y }); const k = U.pick(RNG.sim, ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox']); M.items.push({ kind: k, x: c.x, y: c.y, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 12 }); M.crate = null; break; }
  }
  /** at a stoppage the referee collects the octopi, the crew sweeps hats, and techs replace broken glass */
  function atStoppage() {
    if (!M) return;
    if (M.hazards.some(h => h.kind === 'octopus')) { M.refs[0].twirl = 1.5; Bus.emit('octopus_twirl', {}); }
    M.hazards = M.hazards.filter(h => h.kind !== 'octopus' && h.kind !== 'rat');
    if (M.hats && M.hats.length) M.hats = [];
    for (const p of Rink.panels) if (p.state !== 'ok') { M.techs.push({ panel: p.i, t: 1.5 }); p.state = 'ok'; Bus.emit('glass_fixed', { panel: p.i }); }
    M.gear = [];
  }
  /** hats rain after a hat trick */
  Bus.on('hat_trick', () => { if (!M) return; for (let i = 0; i < 30; i++) { const x = Rink.X0 + 40 + RNG.fx() * (Rink.X1 - Rink.X0 - 80), y = Rink.Y0 + 20 + RNG.fx() * (Rink.Y1 - Rink.Y0 - 40); M.hats.push({ x, y, z: 60 + RNG.fx() * 80, vz: -40, c: ['#c83a2a', '#2a5a9a', '#e8b43a', '#3a8a4a', '#f0f0f0', '#141414'][i % 6], t: RNG.fx() }); } });
  Bus.on('goal', e => { if (M && M.arena.hazards.includes('octopus') && RNG.fx() < (M.arena.id === 'grindhouse' ? .6 : .2)) throwOne('octopus'); if (M && RNG.sim() < .25 && !M.cfg.noItems) M.throwT = Math.min(M.throwT, 3); });
  return { reset, step, throwOne, grab, holeAt, hitOnIce, breakIce, popOut, refreeze, atStoppage, inPatch };
})();
