// ---- weapons: data, firing, rockets, popcorn bags, the laser, the gold records (a new weapon is one entry here) ----
const WEAPONS = MT.WEAPONS = {
  blaster: { name: 'STUDIO BLASTER', letter: '', kind: 'primary', dur: 0, rate: () => MT.T.fireRate, sfx: 'pew', blurb: 'YOUR TRUSTY STUDIO-ISSUE PEA SHOOTER. NEVER RUNS OUT.' },
  spread: { name: 'TRIPLE PLAY', letter: 'S', kind: 'primary', dur: 14, rate: () => 8, sfx: 'triple', color: '#ff2e88', blurb: 'THREE BOLTS AT ONCE. CROWDS HATE IT.' },
  rockets: { name: 'PRIME-TIME ROCKETS', letter: 'R', kind: 'primary', dur: 12, rate: () => 3.5, sfx: 'rocket', color: '#ff9a3c', blurb: 'ROCKETS THAT BLOW UP IN A CROWD. SPLASH DAMAGE!' },
  popcorn: { name: 'POPCORN POPPER', letter: 'P', kind: 'primary', dur: 12, rate: () => 2.5, sfx: 'thunk', color: '#fff0a0', blurb: 'LOBS BAGS OVER COVER THAT BURST INTO KERNELS.' },
  laser: { name: 'LIMELIGHT LASER', letter: 'L', kind: 'primary', dur: 10, rate: () => 0, sfx: 'laser', color: '#2ee6ff', blurb: 'A BEAM THAT PIERCES EVERY FOE IN A LINE.' },
  records: { name: 'GOLD RECORDS', letter: 'G', kind: 'addon', dur: 15, color: '#ffcc33', blurb: 'TWO DISCS ORBIT YOU, SLICING FOES AND SHOTS.' },
  shield: { name: 'SPONSOR SHIELD', letter: 'B', kind: 'addon', dur: 8, color: '#2ee6ff', blurb: 'A BUBBLE NOTHING GETS THROUGH. BROUGHT TO YOU BY KRUNCH-O.' },
  speed: { name: 'SPEED SNEAKERS', letter: 'F', kind: 'addon', dur: 10, color: '#5fe0a0', blurb: 'RUN FASTER, SLIDE MORE OFTEN.' },
  bomb: { name: 'SHOWSTOPPER', letter: '', kind: 'instant', blurb: 'ONE MORE SCREEN-CLEARING FLASHBULB BOMB.' },
  life: { name: 'ENCORE', letter: '', kind: 'instant', blurb: 'AN EXTRA LIFE. THE CROWD WANTS MORE!' },
};
const CAPSULES = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
MT.CAPSULES = CAPSULES;
/** give a contestant a weapon, add-on or instant item */
function giveItem(world, c, id) {
  const w = WEAPONS[id]; if (!w) return;
  if (w.kind === 'primary') { c.weapon = id; c.wT = c.wMax = w.dur * MT.T.puDuration; c.laserAng = null; }
  else if (w.kind === 'addon') c.addons[id] = w.dur * MT.T.puDuration;
  else if (id === 'bomb') { if (c.pr.bombs >= 3) world.credit(c, 2000, { quiet: false }); else c.pr.bombs++; }
  else if (id === 'life') c.pr.lives++;
}
MT.giveItem = giveItem;
const ownerOf = c => c.netId;
function muzzle(c) { return [c.x + Math.cos(c.aim) * 10, c.y + Math.sin(c.aim) * 10, 14]; }
/** each step for a contestant: fire the weapon in hand while firing */
MT.fireWeapon = (world, c, dt) => {
  c.recA += 4.2 * dt;
  const W = WEAPONS[c.weapon] || WEAPONS.blaster;
  if (c.weapon === 'laser') { stepLaser(world, c, dt); return; }
  c.laserSeg = null;
  if (!c.firing) { if (c.fireCD < 0) c.fireCD = 0; return; }
  const rate = W.rate();
  let guard = 0;
  while (c.fireCD <= 0 && guard++ < 4) { fireOnce(world, c, c.weapon); c.fireCD += 1 / rate; }
};
function fireOnce(world, c, w) {
  const T = MT.T, [mx, my, mz] = muzzle(c), sp = T.bulletSpeed, col = SLOT_COLORS[c.slot], cos = world.cosmetic;
  const base = { x: mx, y: my, z: mz, r: 2.5, life: .9, team: 'p', color: col, core: '#ffffff', data: { owner: ownerOf(c), w } };
  if (w === 'blaster') world.pShots.fire(Object.assign({}, base, { vx: Math.cos(c.aim) * sp, vy: Math.sin(c.aim) * sp, dmg: 1 * T.dmgMul }));
  else if (w === 'spread') for (const da of [-.227, 0, .227]) world.pShots.fire(Object.assign({}, base, { vx: Math.cos(c.aim + da) * sp, vy: Math.sin(c.aim + da) * sp, dmg: 1 * T.dmgMul, color: '#ff2e88' }));
  else if (w === 'rockets') world.proj.push({ kind: 'rocket', x: mx, y: my, z: mz, ang: c.aim, v: 180, t: 0, owner: ownerOf(c), cosmetic: cos });
  else if (w === 'popcorn') {
    let tx = c.x + Math.cos(c.aim) * 90, ty = c.y + Math.sin(c.aim) * 90;
    const mg = c.ctl === 'local' && c.input === game.input && game.input.lastDevice === 'mouse' ? game.mouseGround() : null;
    if (mg && Math.hypot(mg[0] - c.x, mg[1] - c.y) < 90) { tx = mg[0]; ty = mg[1]; }
    tx = clamp(tx, AR.X0 + 4, AR.X1 - 4); ty = clamp(ty, AR.Y0 + 4, AR.Y1 - 4);
    const a = E.arc({ x: mx, y: my, z: mz }, { x: tx, y: ty, z: 0 }, 500, { time: .55 });
    world.proj.push({ kind: 'bag', x: mx, y: my, z: mz, vx: a.vx, vy: a.vy, vz: a.vz, grav: 500, t: 0, owner: ownerOf(c), cosmetic: cos, spin: 0 });
  }
  if (!world.quietFx) MT.sfx((WEAPONS[w] || WEAPONS.blaster).sfx, { vol: c.ctl === 'local' ? 1 : .5 });
}
/** the laser: a beam from the muzzle to the first wall, turning at most 7 rad/s, 16 damage a second to all it crosses */
function stepLaser(world, c, dt) {
  if (!c.firing) { c.laserSeg = null; c.laserAng = null; return; }
  c.laserAng = c.laserAng === null ? c.aim : approachAng(c.laserAng, c.aim, 7 * dt);
  const a = c.laserAng, [mx, my] = muzzle(c), map = world.arena.map;
  let L = 0; while (L < 420) { L += 4; const x = mx + Math.cos(a) * L, y = my + Math.sin(a) * L; if (map.heightAt(x, y) > 12 || x < 0 || y < 0 || x > AR.W || y > AR.H) break; }
  c.laserSeg = [mx, my, mx + Math.cos(a) * L, my + Math.sin(a) * L];
  c.laserHum = (c.laserHum || 0) - dt; if (c.laserHum <= 0) { c.laserHum = .12; if (!world.quietFx) MT.sfx('laser', { vol: c.ctl === 'local' ? 1 : .4 }); }
  if (world.cosmetic) return;
  const dmg = 16 * dt * MT.T.dmgMul, [x0, y0, x1, y1] = c.laserSeg, dx = x1 - x0, dy = y1 - y0, LL = dx * dx + dy * dy;
  const test = (t, rad) => { const k = clamp(((t.x - x0) * dx + (t.y - y0) * dy) / LL, 0, 1), px2 = x0 + dx * k - t.x, py2 = y0 + dy * k - t.y; return px2 * px2 + py2 * py2 < (rad + 3) * (rad + 3); };
  for (const e of world.enemies) if (!e.dead && !e.entering && test(e, e.r)) world.damageEnemy(e, dmg, { owner: ownerOf(c), w: 'laser', x: e.x, y: e.y, beam: true });
  if (world.boss) for (const p of world.boss.parts) if (p.alive && world.boss.partHittable(p)) { const q = world.boss.partPos(p); if (test(q, p.r)) world.damageBossPart(p, dmg, { owner: ownerOf(c), w: 'laser', beam: true }); }
  for (const t of world.targets) if (!t.dead && test(t, t.r)) world.damageTarget(t, dmg, { owner: ownerOf(c), w: 'laser', beam: true });
}
MT.drawLaser = (r, c, t) => {
  const [x0, y0, x1, y1] = c.laserSeg;
  r.queue((x0 + x1) / 2, (y0 + y1) / 2, 12, g => {
    const a = r.w(x0, y0, 14), b = r.w(x1, y1, 12), w = 3 + Math.sin(t * 40);
    px.line(g, a[0], a[1], b[0], b[1], '#1a8aa0', Math.round(w + 2)); px.line(g, a[0], a[1], b[0], b[1], '#2ee6ff', Math.round(w)); px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 1);
    px.disc(g, b[0], b[1], 3 + Math.sin(t * 50), '#c0fbff');
  }, { emissive: true, bias: 3 });
  for (let k = 0; k <= 1; k += .34) game.lights.add(lerp(x0, x1, k), lerp(y0, y1, k), 12, 40, .5, { color: '#2ee6ff' });
};
/** the custom projectiles: rockets and popcorn bags (cosmetic copies on a client deal no damage) */
MT.stepProjectiles = (world, dt) => {
  for (const p of world.proj) {
    p.t += dt;
    if (p.kind === 'rocket') {
      p.v = Math.min(300, p.v + 300 * dt); p.x += Math.cos(p.ang) * p.v * dt; p.y += Math.sin(p.ang) * p.v * dt;
      if (Math.random() < .7 && game.particles && !world.quietFx) game.particles.smoke(p.x, p.y, p.z, 1, { size: .5, color: '#c8c0d0' });
      let hit = p.t > .9 || world.arena.map.heightAt(p.x, p.y) > p.z;
      if (!hit && !p.cosmetic) { for (const e of world.enemies) if (!e.dead && !e.entering && dist2(e, p) < (e.r + 3) ** 2) { hit = true; world.damageEnemy(e, 4 * MT.T.dmgMul, { owner: p.owner, w: 'rockets' }); break; } }
      if (!hit && !p.cosmetic && world.boss) for (const q of world.boss.parts) if (q.alive && world.boss.partHittable(q)) { const pp = world.boss.partPos(q); if (dist2(pp, p) < (q.r + 3) ** 2) { hit = true; world.damageBossPart(q, 4 * MT.T.dmgMul, { owner: p.owner, w: 'rockets' }); break; } }
      if (!hit && !p.cosmetic) for (const tg of world.targets) if (!tg.dead && dist2(tg, p) < (tg.r + 3) ** 2) { hit = true; world.damageTarget(tg, 4 * MT.T.dmgMul, { owner: p.owner, w: 'rockets' }); break; }
      if (!hit && p.cosmetic) for (const e of world.enemies) if (dist2(e, p) < (e.r + 3) ** 2) hit = true;
      if (hit) { p.dead = true; world.explode(p.x, p.y, 24, p.cosmetic ? 0 : 3 * MT.T.dmgMul, p.owner, 'rockets'); }
    } else if (p.kind === 'bag') {
      p.vz -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.spin += dt * 12;
      if (p.z <= 0) {
        p.dead = true; world.explode(p.x, p.y, 18, p.cosmetic ? 0 : 2 * MT.T.dmgMul, p.owner, 'popcorn', true);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + p.t; world.pShots.fire({ x: p.x, y: p.y, z: 6, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2, life: .35, dmg: 1.5 * MT.T.dmgMul, team: 'p', pierce: true, color: '#fff0a0', core: '#ffffff', data: { owner: p.owner, w: 'popcorn', pierceLeft: 1 } }); }
        if (!world.quietFx) MT.sfx('kernel');
      }
    }
  }
  E.prune(world.proj, p => p.dead);
};
MT.drawProjectiles = (r, world, t) => {
  for (const p of world.proj) {
    if (p.kind === 'rocket') {
      r.queue(p.x, p.y, p.z, g => { const a = r.w(p.x, p.y, p.z), b = r.w(p.x - Math.cos(p.ang) * 8, p.y - Math.sin(p.ang) * 8, p.z); px.line(g, b[0], b[1], a[0], a[1], '#5a5468', 3); px.line(g, b[0], b[1], a[0], a[1], '#c8d0e0', 1); px.disc(g, a[0], a[1], 2, '#ff3344'); const f = r.w(p.x - Math.cos(p.ang) * 10, p.y - Math.sin(p.ang) * 10, p.z); px.disc(g, f[0], f[1], 2 + Math.random() * 1.5, '#ffcc33'); }, { emissive: true });
      game.lights.add(p.x, p.y, p.z, 28, .5, { color: '#ff9a3c' });
    } else if (p.kind === 'bag') {
      r.decal(() => r.groundDisc(p.x, p.y, 3, '#000000', .35));
      r.sprite(p.x, p.y, p.z, SPR.bag, { anchor: 'center', scale: unzoom(r) });
    }
  }
};
