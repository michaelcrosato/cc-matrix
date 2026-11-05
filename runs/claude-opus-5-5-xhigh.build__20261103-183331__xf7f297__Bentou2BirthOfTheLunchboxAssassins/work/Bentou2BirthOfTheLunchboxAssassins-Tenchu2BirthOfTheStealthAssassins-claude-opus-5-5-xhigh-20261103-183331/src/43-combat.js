/* ---- COMBAT: one damage pipeline for every body (multipliers, a frontal block, i-frames, death events), the hero's
 * combos and jump attack, the block, the timed parry and its riposte, and enemy strikes with visible wind-ups. Hits get
 * hit-stop, shake, sparks and ink, never damage numbers ---- */
const Combat = {};
/** B.damage(src, dst, amount, { kind, angle, silent, unblockable }) -> damage dealt */
B.damage = (src, dst, amount, o = {}) => {
  const M = B.M; if (!M || !dst || !dst.alive || dst.dead) return 0;
  if (dst.kind === 'hero') {
    if (M.cheats.god || (dst.action && dst.action.invulnerable) || dst.iframes > 0 || dst.action && /^cut_|grapple/.test(dst.action.name)) return 0;
    amount *= T('enemyDmg') * (o.kind === 'fall' || o.kind === 'drown' ? 1 / T('enemyDmg') : 1);
    const ang = o.angle !== undefined ? o.angle : src ? Math.atan2(dst.y - src.y, dst.x - src.x) : null;
    if (dst.blocking && ang !== null && !o.unblockable && Math.abs(E.angDiff(dst.facing, ang + Math.PI)) < Math.PI / 3) {
      amount *= 1 - dst.C.block; Au.sfx('clash'); Pt.sparks(dst.x, dst.y, dst.z + 18, 8, ang + Math.PI); game.shake(1.5); dst.blockFx = .2;
      if (amount < .5) return 0;
    } else if (!o.silent) { dst.hurtT = .4; game.freeze(.05); game.shake(4); Au.sfx('hurt', { vol: .7 }); B.Hud.pulse(); game.input.rumble && game.input.rumble(.5, .15); }
    if (!o.silent) dst.iframes = .4;
    dst.hp -= amount; M.stats.damageTaken += amount;
    if (game.settings.blood !== 'off' && !o.silent && amount > 3) Pt.bits(dst.x, dst.y, dst.z + 16, 5, ['#8a0a10', '#c81a20']);
    B.emit('damage', { src, dst, amount, kind: o.kind });
    if (dst.hp <= 0) { dst.hp = 0; dst.dead = true; dst.combo.cancel(); if (dst.drag) Hero.dropBody(dst, M); Au.sfx('die'); B.emit('heroDeath', { by: src, kind: o.kind }); }
    return amount;
  }
  // an enemy, a boss, a civilian or Tobei (a prisoner in his cage is nobody's target)
  if (dst.kind === 'escort' && dst.caged) return 0;
  if (src && src.kind === 'hero') { amount *= src.C.dmg; if (dst.kind === 'boss' && !['riposte', 'fire', 'plunge'].includes(o.kind)) amount *= .45; if (M.cheats.oneHit && dst.kind !== 'escort') amount = 9999; }
  if (dst.guardFront && src && Math.abs(E.angDiff(dst.facing, Math.atan2(src.y - dst.y, src.x - dst.x))) < dst.guardFront.arc && !o.unblockable) {
    amount *= 1 - dst.guardFront.k; Au.sfx('clash'); Pt.sparks(dst.x, dst.y, dst.z + 20, 8, Math.atan2(src.y - dst.y, src.x - dst.x)); if (amount < 1) { dst.blockFx = .25; return 0; }
  }
  dst.hp -= amount; dst.hurtT = .3; dst.flash = .12;
  const ang = src ? Math.atan2(dst.y - src.y, dst.x - src.x) : 0;
  game.freeze(o.kind === 'riposte' ? .12 : .05); game.shake(o.kind === 'fire' ? 5 : 2.5); Au.sfx('hit', { vol: .8 });
  Pt.impact && Pt.impact(dst.x, dst.y, dst.z + 18, 1, '#ffffff'); Pt.sparks(dst.x, dst.y, dst.z + 18, 6, ang);
  if (game.settings.blood !== 'off' && dst.kind !== 'spirit') { Pt.bits(dst.x, dst.y, dst.z + 16, 6, ['#8a0a10', '#c81a20', '#3a0406']); if (crand() < .4) M.world.decals.push({ kind: 'ink', x: dst.x + (crand() - .5) * 8, y: dst.y + (crand() - .5) * 8, r: 2 + crand() * 2, seed: crand() * 999 | 0 }); }
  if (dst.kind !== 'boss' && src && src.kind === 'hero' && E.knockback) E.knockback(src, dst, 60);
  if (dst.onHit) dst.onHit(src, amount, o);
  B.emit('damage', { src, dst, amount, kind: o.kind });
  if (dst.hp <= 0 && dst.alive) {
    dst.hp = 0;
    if (dst.onDeath && dst.onDeath(src, o) === false) return amount;
    dst.alive = false; dst.fighting = false; if (dst.atk && dst.atk.cancel) dst.atk.cancel();
    Au.sfx('die', { vol: .5 }); B.emit('kill', { victim: dst, how: o.kind || 'strike', by: src });
  }
  return amount;
};
/** the enemies a strike can hit: guards, civilians, the active boss and its summons */
Combat.targets = M => M.guards.concat(M.civs, M.bosses, M.summons || []).filter(e => e.alive && !e.cutBy && !e.sunk && e.kind !== 'escort' && !e.untouchable);
/** face the cursor (mouse mode) or the nearest enemy within 40 in front (auto-aim) */
Combat.faceTarget = (h, it, M) => {
  if (it && it.aimPoint && it.mouseMode) { h.facing = Math.atan2(it.aimPoint.y - h.y, it.aimPoint.x - h.x); return; }
  let f = h.facing; const mv = it && it.move; if (mv && Math.hypot(mv[0], mv[1]) > .3) f = Math.atan2(mv[1], mv[0]);
  let best = null, bd = 44; for (const e of Combat.targets(M)) { const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < bd && Math.abs(e.z - h.z) < 12 && Math.abs(E.angDiff(f, Math.atan2(e.y - h.y, e.x - h.x))) < 1.3) { bd = d; best = e; } }
  h.facing = best ? Math.atan2(best.y - h.y, best.x - h.x) : f;
};
/** the hero's combo: each swing hits each target once in its arc */
Combat.heroSwing = (h, dt, M) => {
  const ph = h.combo.update(dt);
  if (ph === 'active') { Au.sfx('swing', { vol: .5 }); B.noise(h.x, h.y, h.z, 25, 'swing'); }
  if (!h.combo.busy) return;
  const step = Math.max(0, h.combo.step), dmg = h.C.comboDmg[step] || 12, spin = h.combo.current && h.combo.current.spec && h.combo.current.spec.spin;
  h.combo.hits(Combat.targets(M), e => E.inArc(h, h.facing, e, spin ? 24 : 21, spin ? Math.PI : 1.3, 12), e => {
    if (e.kind === 'civ') M.stats.civiliansHarmed += e.hp > 0 && !e.harmed ? (e.harmed = 1) : 0;
    if (e.mind && e.mind.state !== 'alert' && e.kind !== 'boss') { e.mind.level = 1.2; e.mind.last = { x: h.x, y: h.y, z: h.z }; }
    B.damage(h, e, dmg, { kind: 'strike' });
  });
};
/** a jump attack lands: a plunge onto whatever is under the hero */
Combat.landAttack = (h, M) => {
  Pt.dust(h.x, h.y, h.z, 8); game.shake(2); Au.sfx('stomp', { vol: .5 });
  for (const e of Combat.targets(M)) if (Math.hypot(e.x - h.x, e.y - h.y) < 18 && Math.abs(e.z - h.z) < 10) B.damage(h, e, 20, { kind: 'plunge' });
};
/** the riposte: a staggered enemy in reach dies at once (a boss loses 60) */
Combat.riposteTarget = (h, M) => { for (const e of Combat.targets(M)) if (e.status && e.status.stagger > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 24 && Math.abs(e.z - h.z) < 10) return e; return null; };
Combat.tryRiposte = (h, M) => {
  const e = Combat.riposteTarget(h, M); if (!e) return false;
  h.facing = Math.atan2(e.y - h.y, e.x - h.x); h.combo.cancel(); h.combo.press();
  game.flash('#ffffff', .1, .6); B.Cam.cine(1.4, .4); Au.sfx('clash'); Au.sfx('cutTwang', { vol: .5 });
  e.status.stagger = 0;
  B.damage(h, e, e.kind === 'boss' ? 60 / h.C.dmg : 999, { kind: 'riposte', unblockable: true });
  B.emit('riposte', { victim: e });
  return true;
};
/** an enemy's swing reaches its strike: a parry (block pressed within the window), a block, or a hit */
Combat.enemyStrike = (e, dmg, o = {}) => {
  const M = B.M, h = M.hero; if (!h || h.dead) return false;
  const reach = o.reach || 22, arc = o.arc || 1.1, d = Math.hypot(h.x - e.x, h.y - e.y);
  if (d > reach || Math.abs(h.z - e.z) > 12 || Math.abs(E.angDiff(e.facing, Math.atan2(h.y - e.y, h.x - e.x))) > arc) return false;
  const facing = Math.abs(E.angDiff(h.facing, Math.atan2(e.y - h.y, e.x - h.x))) < 1.2;
  if (o.parry !== false && h.parryT <= T('parryWindow') && facing && !h.swim) {
    e.status.stagger = o.stagger || 1.3; if (e.atk && e.atk.cancel) e.atk.cancel();
    Au.sfx('parry'); game.flash('#ffffff', .08, .5); Pt.sparks(e.x, e.y, e.z + 20, 14, Math.atan2(e.y - h.y, e.x - h.x)); game.freeze(.08);
    B.Hud.toast('Parried', '{a:attack} Riposte'); B.emit('parry', { by: h, enemy: e }); h.parryT = 9;
    return true;
  }
  B.damage(e, h, dmg, { kind: o.kind || 'melee', angle: Math.atan2(h.y - e.y, h.x - e.x), unblockable: o.unblockable });
  if (o.knock && !h.action) E.knockback(e, h, o.knock);
  return true;
};
B.Combat = Combat;
