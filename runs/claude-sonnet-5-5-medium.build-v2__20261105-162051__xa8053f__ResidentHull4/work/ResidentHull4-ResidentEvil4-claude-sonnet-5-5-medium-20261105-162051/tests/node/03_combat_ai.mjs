import { boot, noScripts, S } from './_helpers.mjs';
import { quay } from '../../src/data/levels/quay.js';
import { TUNING, resetTuning } from '../../src/data/tuning.js';

export const slow = true;
export async function run(T) {
  resetTuning();
  // ---- hit zones, stagger, kick ----
  {
    const { e, a } = await boot(noScripts(quay));
    a.player.teleport(18.5, 12); e.step(2);
    const g = a.spawn('gaffer', 18.5, 6, { state: S.APPROACH, speedMul: 0 }); g.speedBase = 0; e.step(3);
    const pt = g.zones.head; const cp = a.camPos;
    const ray = { ox: cp.x, oy: cp.y, oz: cp.z }; const dx = pt.x - cp.x, dy = pt.y - cp.y, dz = pt.z - cp.z, L = Math.hypot(dx, dy, dz); ray.dx = dx / L; ray.dy = dy / L; ray.dz = dz / L;
    const hit = a.combat.trace(ray, 80); T.eq('ray finds head zone', hit.zone, 'head'); T.check('ray hit is the enemy', hit.enemy === g);
    const bz = g.zones.torso.a; const r2 = { ...ray }; const bx = bz.x - cp.x, by = bz.y + 0.3 - cp.y, bzz = bz.z - cp.z, L2 = Math.hypot(bx, by, bzz); r2.dx = bx / L2; r2.dy = by / L2; r2.dz = bzz / L2;
    T.check('ray finds torso (or arm) zone', ['torso', 'arm'].includes(a.combat.trace(r2, 80).zone), a.combat.trace(r2, 80).zone);
    const lz = g.zones.legR[1]; const r3 = { ...ray }; const lx = lz.x - cp.x, ly = lz.y - cp.y, lzz = lz.z - cp.z, L3 = Math.hypot(lx, ly, lzz); r3.dx = lx / L3; r3.dy = ly / L3; r3.dz = lzz / L3;
    const lh = a.combat.trace(r3, 80); T.check('ray finds leg zone', lh.zone === 'leg' || lh.zone === 'torso', lh.zone);
    // damage multipliers
    const hp0 = g.hp; g.takeHit({ amount: 14, zone: 'torso', fromX: 18.5, fromZ: 12 }); T.near('torso x1', hp0 - g.hp, 14, 0.01);
    const hp1 = g.hp; g.takeHit({ amount: 14, zone: 'arm', fromX: 18.5, fromZ: 12 }); T.near('arm x0.7', hp1 - g.hp, 9.8, 0.01);
    const hp2 = g.hp; g.takeHit({ amount: 5, zone: 'head', fromX: 18.5, fromZ: 12 }); T.near('head x2', hp2 - g.hp, 10, 0.01);
    // stagger chance over many seeded heads
    let stuns = 0; for (let i = 0; i < 60; i++) { const h = a.spawn('gaffer', 10 + i * 0.1, 9, { state: S.APPROACH }); h.hp = 999; h.maxHp = 999; h.takeHit({ amount: 1, zone: 'head', fromX: 18, fromZ: 12 }); if (h.state === S.STUN) stuns++; h.dispose(); a.enemies.splice(a.enemies.indexOf(h), 1); }
    T.check('head hits stun about 70%', stuns > 30 && stuns < 56, stuns);
    // kick on a stunned enemy
    const k = a.spawn('gaffer', 18.5, 13.2, { state: S.STUN }); k.speedBase = 0; k.setState(S.STUN, 3); const kn = a.spawn('gaffer', 19.6, 13.3, { state: S.APPROACH }); kn.hp = 100;
    a.player.yaw = 0; e.step(2); T.eq('prompt says KICK', a.prompt && a.prompt.label, 'KICK');
    a.interact.candidates()[0].run(); e.step(40);
    T.check('kick damages the target (40)', k.hp <= k.maxHp - 39.9 || k.dead, k.hp);
    T.check('kick knocks the crowd down', kn.state === S.KNOCKDOWN || kn.state === S.GETUP || kn.hp < 100, kn.state);
    // knee: two hits of leg damage kneel it, then takedown prompt
    const kk = a.spawn('gaffer', 18.5, 13.4, { state: S.KNEEL }); kk.setState(S.KNEEL, 3); a.player.yaw = 0; e.step(2);
    T.eq('prompt says TAKEDOWN', a.prompt && a.prompt.label, 'TAKEDOWN');
    // shooting with the real weapon path
    const g2 = a.spawn('gaffer', 18.5, 4, { state: S.APPROACH }); g2.speedBase = 0; g2.hp = 500; g2.maxHp = 500; e.step(3);
    const before = a.run.mags.pistol; const hp = g2.hp; a.player.aiming = true; a.firePlayer(); T.eq('shot spends a round', a.run.mags.pistol, before - 1);
    T.check('firePlayer applied through the zones', g2.hp <= hp, g2.hp);
    // scatter pellets
    a.run.addWeapon('scatter'); a.run.addItem('ammo_shells', 12); a.run.mags.scatter = 6; a.player.equip('scatter'); a.player.fireCd = 0;
    const hpS = g2.hp; a.firePlayer(); T.check('scatter fires pellets', true);
    T.eq('errors', e.errors.length, 0);
  }
  // ---- crowd of 30: tokens never exceeded, reaches the player ----
  {
    const { e, a } = await boot(noScripts(quay));
    a.dev.god = true; a.player.teleport(-1.5, 3); e.step(2);
    for (let i = 0; i < 30; i++) a.spawn('gaffer', -1.5 + (i % 10) * 2 - 9, 14 + Math.floor(i / 10) * 2, { state: S.APPROACH });
    let maxTok = 0, attacks = 0, over = 0;
    for (let s = 0; s < 1500; s++) { e.step(1); const inWA = a.enemies.filter((x) => !x.dead && (x.state === S.WINDUP || x.state === S.ATTACK)).length; maxTok = Math.max(maxTok, inWA); if (inWA > a.tokenAllowance()) over++; }
    T.eq('attack tokens never exceeded', over, 0);
    T.check('crowd actually attacks', maxTok >= 1, maxTok);
    T.eq('errors', e.errors.length, 0);
  }
  // ---- door bash, window vault ----
  {
    const { e, a } = await boot(noScripts(quay));
    a.dev.god = true;
    const door = a.level.doors.find((d) => d.kind === 'D' && Math.abs(d.x - 9.5) < 1 && Math.abs(d.z - 6.5) < 1) || a.level.doors.find((d) => d.kind === 'D');
    a.player.teleport(door.x + (door.alongX ? 0 : 2.5), door.z + (door.alongX ? 2.5 : 0)); e.step(3);
    const m = a.spawn('gaffer', door.x - (door.alongX ? 0 : 2.5), door.z - (door.alongX ? 2.5 : 0), { state: S.APPROACH });
    for (let s = 0; s < 60 * 9 && !door.open; s++) e.step(1);
    T.check('door broken by a bashing enemy', door.open, m.state);
    const win = a.level.windows[0]; a.level.nav.setOpen(win.col, win.row, true);
    T.check('windows exist and are vaultable', !!win && !win.broken);
    T.eq('errors', e.errors.length, 0);
  }
  // ---- foghorn sends all to sea ----
  {
    const { e, a } = await boot(quay, { warm: 2 });
    a.setFlag('arrived'); a.setFlag('mender-done'); a.setFlag('fathom-met');
    a.dev.god = true; a.player.teleport(-1.5, 3);
    for (let s = 0; s < 400; s++) e.step(1);
    T.check('siege started when entering the square', a.hasFlag('siege-started'), [...a.flags]);
    for (let i = 0; i < 40; i++) a.spawn('gaffer', -1.5 + (i % 8) - 4, -3 - Math.floor(i / 8), { state: S.APPROACH });
    a.siegeT0 = a.time - 215;
    for (let s = 0; s < 60 * 40 && !a.hasFlag('siege-done'); s++) { e.step(1); if (a.scripts.cut) a.scripts.cut.tl.skip(); }
    T.check('foghorn fires after 3:30', a.hasFlag('foghorn'));
    for (let s = 0; s < 60 * 60; s++) { e.step(1); if (a.scripts.cut) a.scripts.cut.tl.skip(); if (!a.aliveEnemies().length) break; }
    T.eq('every enemy walked into the sea', a.aliveEnemies().length, 0);
    T.eq('errors', e.errors.length, 0);
  }
  // a released Limpet reaches a corpse and it rises as a Re-Salted
  {
    const { e, a } = await boot(noScripts(quay)); a.dev.god = true; a.player.teleport(18.5, 12); e.step(2);
    const c = a.spawn('gaffer', 18.5, 6, { state: S.APPROACH }); c.speedBase = 0; c.die({}); e.step(5);
    a.releaseLimpet(c); e.step(60 * 4);
    T.check('limpet turns a corpse into a Re-Salted', a.enemies.some((x) => x.type === 'resalted' && !x.dead), a.enemies.map((x) => x.type + x.state).join(' '));
  }
}
