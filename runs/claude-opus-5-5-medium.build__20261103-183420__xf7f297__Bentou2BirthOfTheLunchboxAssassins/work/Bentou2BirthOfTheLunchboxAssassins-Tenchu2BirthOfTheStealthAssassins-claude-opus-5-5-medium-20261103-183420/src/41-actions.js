/* 41-actions: paired and traversal actions on the engine's E.ACTIONS (Silent Cuts in five kinds for each character, the
 * grapple's throw / pull / mantle or swing, the riposte), their detection, the damage pipeline, parries, and the
 * hero's interactions (bodies, levers, cages, pickups, people). */
const lerpP = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z || 0, b.z || 0, u) });
const CUT_BEATS = {
  back: { sojiro: [['grab', .16], ['strike', .24], ['hold', .25], ['drop', .4], ['recover', .18]], kaede: [['hop', .14], ['strike', .16], ['strike2', .16], ['drop', .36], ['recover', .16]] },
  side: { sojiro: [['dash', .2], ['strike', .2], ['drop', .4], ['recover', .18]], kaede: [['dash', .14], ['spin', .3], ['drop', .36], ['recover', .14]] },
  front: { sojiro: [['set', .12], ['rising', .26], ['drop', .45], ['recover', .2]], kaede: [['set', .1], ['xcut', .26], ['drop', .4], ['recover', .16]] },
  above: { sojiro: [['leap', .38], ['strike', .2], ['drop', .45], ['recover', .25]], kaede: [['leap', .34], ['plunge', .2], ['drop', .4], ['recover', .2]] },
  water: { sojiro: [['rise', .2], ['grab', .24], ['pull', .5], ['recover', .2]], kaede: [['rise', .18], ['grab', .22], ['pull', .46], ['recover', .18]] }
};
E.ACTIONS.silentCut = {
  beats: CUT_BEATS.back.sojiro,
  setup(A) {
    const v = A.o.other, kind = A.o.kind || 'back', style = A.o.style === 'kaede' ? 'kaede' : 'sojiro';
    A.beats = CUT_BEATS[kind][style]; A.kind = kind; A.style = style;
    const toV = Math.atan2(v.y - A.start.y, v.x - A.start.x), gap = 8;
    A.vic = { x: v.x, y: v.y, z: v.z || 0, facing: v.facing || 0 };
    const a = kind === 'back' ? v.facing : toV; A.facing = a;
    A.spot = { x: v.x - Math.cos(a) * gap, y: v.y - Math.sin(a) * gap, z: v.z || 0 };
    if (kind === 'side') A.past = { x: v.x + Math.cos(toV) * 14, y: v.y + Math.sin(toV) * 14, z: v.z || 0 };
    if (kind === 'water') { A.spot = { x: A.start.x, y: A.start.y, z: 0 }; A.sink = { x: A.start.x + Math.cos(toV + Math.PI) * 6, y: A.start.y + Math.sin(toV + Math.PI) * 6, z: -6 }; }
  },
  at(A, b, u) {
    const st = { facing: A.facing }, V = { x: A.vic.x, y: A.vic.y, z: A.vic.z }, vs = { facing: A.vic.facing }, K = A.kind, S = A.style;
    const out = (p, s, vp, v2) => Object.assign(p, { state: Object.assign(st, s), other: Object.assign(vp || V, { state: Object.assign(vs, v2 || {}) }) });
    if (b === 'grab' && K === 'back') return out(lerpP(A.start, A.spot, E.ease.outQuad(u)), { stance: 'ready', crouch: u < .5 }, null, { hurt: u > .7, expr: 'wince' });
    if (b === 'hop') { const p = lerpP(A.start, A.spot, u); p.z += Math.sin(u * Math.PI) * 6; return out(p, { air: true }); }
    if (b === 'dash') return out(lerpP(A.start, A.spot, E.ease.inQuad(u)), { sprint: true, stance: 'ready' });
    if (b === 'set') return out(lerpP(A.start, A.spot, u), { stance: 'ready' });
    if (b === 'leap') { const p = lerpP(A.start, A.spot, u); p.z = lerp(A.start.z, A.spot.z, u * u) + Math.sin(u * Math.PI) * 12; return out(p, { air: true }); }
    if (b === 'rise') { const p = lerpP(A.start, A.spot, u); p.z = -8 + u * 8; return out(p, { crouch: true }); }
    const p = { x: A.spot.x, y: A.spot.y, z: A.spot.z };
    if (b === 'strike' && K === 'side') { const q = lerpP(A.spot, A.past, u); return out(q, { attack: E.move('slash', u) }, null, { hurt: u > .4, expr: 'wince' }); }
    if (b === 'strike' || b === 'plunge') return out(p, { attack: E.move(K === 'above' ? (S === 'kaede' ? 'plunge' : 'overhead') : 'thrust', u), land: K === 'above' && u < .2 ? 1 : 0 }, null, { hurt: u > .35, expr: 'wince' });
    if (b === 'strike2') return out(p, { attack: E.move('backslash', u) }, null, { hurt: true, expr: 'wince' });
    if (b === 'hold') return out(p, { attack: E.move('thrust', 1, 'recover') }, null, { hurt: true, expr: 'wince' });
    if (b === 'spin') { const q = lerpP(A.spot, A.past || A.spot, u); return out(q, { attack: E.move('spin', u) }, null, { hurt: u > .3, expr: 'wince' }); }
    if (b === 'rising') return out(p, { attack: E.move('rising', u) }, null, { hurt: u > .4, expr: 'wince' });
    if (b === 'xcut') return out(p, { attack: E.move(u < .5 ? 'slash' : 'backslash', u < .5 ? u * 2 : u * 2 - 1) }, null, { hurt: u > .3, expr: 'wince' });
    if (b === 'grab' && K === 'water') return out(p, { attack: E.move('claw', u), crouch: true }, null, { hurt: u > .5, expr: 'wince' });
    if (b === 'pull') { const vp = lerpP(V, A.sink, E.ease.inQuad(u)); return out({ x: p.x, y: p.y, z: -4 * u }, { crouch: true }, vp, { down: Math.min(1, u * 2), hurt: true }); }
    const sideEnd = K === 'side' && A.past ? { x: A.past.x, y: A.past.y, z: A.past.z } : p;
    if (b === 'drop') return out(sideEnd, { stance: 'ready' }, K === 'water' ? Object.assign({}, A.sink) : null, { down: E.ease.inQuad(u), fallBack: K === 'front' });
    return out(sideEnd, { crouch: u < .5 }, K === 'water' ? Object.assign({}, A.sink) : null, { down: 1 });
  }
};
E.ACTIONS.grapple = {
  beats: [['throw', .16], ['pull', .4], ['mantle', .2]],
  setup(A) {
    const t = A.o.to, d = Math.hypot(t.x - A.start.x, t.y - A.start.y, t.z - A.start.z), sp = B.T('grappleSpeed') * (A.o.pull || 1);
    A.to = t; A.facing = Math.atan2(t.y - A.start.y, t.x - A.start.x);
    A.hang = t.kind === 'swing' ? { x: t.x, y: t.y, z: t.z - 22 } : { x: t.x + Math.cos(A.facing) * -3, y: t.y + Math.sin(A.facing) * -3, z: t.z - 10 };
    if (t.kind === 'swing') {
      const lx = t.x + Math.cos(A.facing) * 46, ly = t.y + Math.sin(A.facing) * 46, gz = A.o.map ? A.o.map.groundAt(lx, ly, 4, 200) || 0 : 0;
      A.land = { x: lx, y: ly, z: gz }; A.beats = [['throw', .16], ['pull', Math.max(.2, d / sp)], ['swing', .45]];
    } else { A.land = { x: t.lx, y: t.ly, z: t.lz }; A.beats = [['throw', .16], ['pull', Math.max(.18, d / sp)], ['mantle', .22]]; }
  },
  at(A, b, u) {
    const st = { facing: A.facing };
    if (b === 'throw') return Object.assign({ x: A.start.x, y: A.start.y, z: A.start.z }, { state: Object.assign(st, { attack: E.move('throw', u) }) });
    if (b === 'pull') { const p = lerpP(A.start, A.hang, E.ease.inOutQuad(u)); p.z += Math.sin(u * Math.PI) * 10; return Object.assign(p, { state: Object.assign(st, { air: true }) }); }
    if (b === 'swing') { const p = lerpP(A.hang, A.land, u); p.z = lerp(A.hang.z, A.land.z, u) + Math.sin(u * Math.PI) * 18; return Object.assign(p, { state: Object.assign(st, { air: true, flip: u > .3 && u < .8 ? (u - .3) * 2 : 0 }) }); }
    const p = lerpP(A.hang, A.land, E.ease.outQuad(u)); if (u < .5) p.z = lerp(A.hang.z, A.land.z + 2, u * 2); else p.z = A.land.z;
    return Object.assign(p, { state: Object.assign(st, { crouch: true, hang: u < .4, hangZ: 22 }) });
  }
};
E.ACTIONS.riposte = {
  beats: [['strike', .22], ['hold', .3], ['recover', .16]],
  setup(A) { const v = A.o.other; A.facing = Math.atan2(v.y - A.start.y, v.x - A.start.x); A.vic = { x: v.x, y: v.y, z: v.z || 0, facing: v.facing || 0 }; },
  at(A, b, u) {
    const p = { x: A.start.x, y: A.start.y, z: A.start.z }, st = { facing: A.facing }, V = Object.assign({}, A.vic);
    if (b === 'strike') return Object.assign(p, { state: Object.assign(st, { attack: E.move('thrust', u) }), other: Object.assign(V, { state: { facing: A.vic.facing, hurt: u > .4, expr: 'wince' } }) });
    if (b === 'hold') return Object.assign(p, { state: Object.assign(st, { attack: E.move('thrust', 1, 'recover') }), other: Object.assign(V, { state: { facing: A.vic.facing, down: E.ease.inQuad(u) } }) });
    return Object.assign(p, { state: st, other: Object.assign(V, { state: { facing: A.vic.facing, down: 1 } }) });
  }
};

/* ---- Silent Cut detection: the best candidate this step ---- */
B.cutCandidate = (h, M) => {
  if (h.action || h.drag || h.eatT > 0 || h.combo.busy || h.dead) return null;
  const W = M.world, R = B.T('killRange'), back = B.T('killBackAngle') * Math.PI / 180;
  let best = null, bd = 1e9;
  for (const g of M.guards) {
    if (!g.alive || g.boss || g.dying || g.fighting || g.mind.state === 'alert') continue;
    const d = Math.hypot(g.x - h.x, g.y - h.y), dz = h.z - g.z;
    let kind = null;
    if (h.swim) { if (d <= 20 && Math.abs(dz) < 10 && W.isDeep(h.x, h.y) && !W.isDeep(g.x, g.y)) kind = 'water'; }
    else if (dz >= 14 && d <= 44 && h.onGround) { let ok = true; for (let k = 1; k < 8; k++) { const u = k / 8; if (W.heightAt(lerp(h.x, g.x, u), lerp(h.y, g.y, u)) > h.z + 2) ok = false; } if (ok) kind = 'above'; }
    else if (d <= R && Math.abs(dz) <= 10) {
      const rel = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - h.y, g.x - h.x))), seeing = g.seesHero;
      const inc = g.asleep || g.eating || g.stunT > 0 || g.blindT > 0 || g.poisonT > 0;
      if (inc) kind = rel < back ? 'back' : rel < Math.PI * 2 / 3 ? 'side' : 'front';
      else if (rel < back && !seeing) kind = 'back';
      else if (rel < Math.PI * 2 / 3 && g.mind.state === 'calm' && !seeing) kind = 'side';
    }
    if (kind && d < bd) { best = { g, kind }; bd = d; }
  }
  return best;
};
B.CUT_NAMES = { back: 'Back', side: 'Side', front: 'Front', above: 'From above', water: 'Undertow' };
B.tryCut = (h, M) => {
  const c = B.cutCandidate(h, M); if (!c) return false;
  const g = c.g; h.play('silentCut', { other: g, kind: c.kind, style: h.char === 'kaede' ? 'kaede' : 'sojiro', speed: h.C.cutSpeed, map: M.world.map });
  g.dying = h.action; g.alive = false; g.cutKind = c.kind; if (c.kind === 'water') g.sunkLater = true;
  M.silentCut(c.kind, g); return true;
};
/* ---- combat: hits, parries, ripostes, and the one damage pipeline ---- */
B.heroHits = (h, M) => {
  const C = h.C, step = Math.max(0, h.combo.step || 0), dmg = (C.comboDmg[step] || 14) * C.dmg * (M.cheats.oneHit ? 99 : 1);
  h.combo.hits(M.guards.filter(g => g.alive && !g.dying), g => E.inArc(h, h.facing, g, 22, 1.3, 12), g => B.damage(h, g, dmg, { kind: 'melee', angle: h.facing }));
  for (const b of M.bosses) if (b.alive && b.active) h.combo.hits([b], g => E.inArc(h, h.facing, g, 26 + (b.reachBonus || 0), 1.3, 14), g => B.damage(h, g, dmg, { kind: 'melee', angle: h.facing }));
  for (const c of M.clones || []) if (c.alive) h.combo.hits([c], g => E.inArc(h, h.facing, g, 24, 1.3, 14), g => { g.alive = false; P.smoke(g.x, g.y, g.z + 14, 10, { size: 2 }); B.sfx('smoke'); });
};
B.tryParry = (h, M) => {
  const win = B.T('parryWindow'); let any = false;
  for (const g of M.guards.concat(M.bosses)) {
    if (!g.alive || !g.swing || g.swing.phase !== 'wind') continue;
    const d = Math.hypot(g.x - h.x, g.y - h.y); if (d > 34 + (g.reachBonus || 0)) continue;
    const left = (1 - g.swing.u) * (g.swing.o ? g.swing.o.wind || .4 : .4) * (g.windMul || 1);
    if (left <= win + .05 && g.parryable !== false) {
      g.swing.cancel(); g.staggerT = g.boss ? .9 : 1.3; any = true; B.sfx('parry'); B.game.flash('#ffffff', .06, .5); P.sparks(g.x, g.y, g.z + 18, 12, h.facing);
      M.toast('Parried', g.boss ? 'Strike now!' : 'Riposte!'); B.emit('parry', { g });
    }
  }
  return any;
};
B.tryRiposte = (h, M) => {
  const g = M.guards.concat(M.bosses).find(e => e.alive && e.staggerT > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 28 && Math.abs(e.z - h.z) < 10);
  if (!g) return false;
  if (g.boss) { h.facing = Math.atan2(g.y - h.y, g.x - h.x); h.combo.press(); B.damage(h, g, 60, { kind: 'riposte', pierce: true }); g.staggerT = 0; B.sfx('twang'); return true; }
  h.play('riposte', { other: g }); g.dying = h.action; g.alive = false; B.sfx('twang'); B.game.freeze(.06); M.kill(g, 'riposte'); return true;
};
B.damage = (src, dst, amt, o = {}) => {
  const M = B.mission, G = B.game; if (!M || !dst) return 0;
  if (dst.isHero) {
    if (dst.dead || M.cheats.god || M.over) return 0;
    if (!o.pierce && (dst.iframes > 0 || (dst.action && dst.action.invulnerable))) return 0;
    let a = amt * (o.kind === 'fall' || o.kind === 'drown' ? 1 : B.T('enemyDmg'));
    const blocking = M.intent && M.intent.blockDown && !dst.action && !dst.swim;
    if (blocking && src && !o.pierce && !o.unblockable && Math.abs(E.angDiff(dst.facing, Math.atan2(src.y - dst.y, src.x - dst.x))) < Math.PI / 3) { a *= 1 - dst.C.block; B.sfx('clash'); P.sparks(dst.x, dst.y, dst.z + 18, 6, dst.facing); }
    else { B.sfx('thud'); G.shake(3); G.freeze(.04); if (G.settings.blood === 'ink') P.bits(dst.x, dst.y, dst.z + 16, 6, ['#d02a20', '#8a1410']); }
    dst.hp -= a; dst.hurtT = .35; dst.iframes = .4; dst.damaged = true; M.hitFlash = .3; B.emit('damage', { dst, amt: a });
    if (dst.hp <= 0) { dst.hp = 0; M.heroDeath(o.kind); }
    return a;
  }
  return dst.takeHit ? dst.takeHit(src, amt, o) : 0;
};

/* ---- the grapple: targeting (auto, aim mode, mouse), firing ---- */
B.grappleUpdate = (h, dt, I, M) => {
  const G = B.game; h._gT = (h._gT || 0) - dt;
  if (h._gT <= 0) { h._gT = .1; h.anchors = h.dead ? [] : M.world.anchorsNear(h, B.T('grappleRange'), 96); }
  const L = h.anchors || [], aimDir = h.grappleHold > .25 && Math.hypot(I.move[0], I.move[1]) > .3 ? Math.atan2(I.move[1], I.move[0]) : h.facing;
  const ptr = I.aimPoint && B.lastR ? G.input.pointer() : null;
  let best = null, bs = 1e9;
  for (const a of L) {
    let s;
    if (ptr) { const q = B.lastR.w(a.x, a.y, a.z); s = Math.hypot(q[0] - ptr[0], q[1] - ptr[1]); if (s > 40) continue; }
    else { const da = Math.abs(E.angDiff(aimDir, Math.atan2(a.y - h.y, a.x - h.x))); if (da > 1.22) continue; s = da * 60 + a.d * .5 + (a.z - h.z) * .1; }
    if (s < bs) { bs = s; best = a; }
  }
  if (I.grappleTarget) best = I.grappleTarget;
  h.anchor = best;
  const can = !h.action && !h.dive && !h.drag && h.eatT <= 0 && !h.dead;
  if (I.grapplePressed && can) h.grappleHold = 0;
  if (h.grappleHold >= 0) {
    if (I.grappleDown) { h.grappleHold += dt / Math.max(.1, G.timeScale); if (h.grappleHold > .25 && !M.slowmoT) G.timeScale = .5; }
    if (I.grappleReleased || !I.grappleDown) {
      if (!M.slowmoT) G.timeScale = 1;
      const a = h.anchor; h.grappleHold = -1;
      if (a && can && (h._gCool || 0) <= G.time) {
        h.play('grapple', { to: a, map: M.world.map, pull: h.C.pull }); h._gCool = G.time + .3; h.rope = a;
        B.sfx('grappleThrow'); G.after(.16, () => { B.sfx('clink'); B.sfx('zip'); }); B.noise(a.x, a.y, a.z, 30, 'grapple', null); M.stats.grapples++; B.emit('grapple', { a });
      }
    }
  }
  if (!h.action || h.action.name !== 'grapple') h.rope = null;
};

/* ---- interactions: the nearest thing to use, held ones with a progress ring ---- */
B.interactable = (h, M) => {
  if (h.drag) return { kind: 'drop', label: 'Drop body' };
  const b = B.nearBody(h, M); if (b) return { kind: 'body', b, label: b.asleep ? 'Drag sleeper' : 'Drag body' };
  for (const it of M.interacts) { if (it.done || !it.active) continue; if (Math.hypot(it.x - h.x, it.y - h.y) < (it.r || 18) && Math.abs((it.z || 0) - h.z) < 12) return { kind: 'hold', it, label: it.text }; }
  for (const p of M.pickups) { if (p.taken) continue; if (Math.hypot(p.x - h.x, p.y - h.y) < 16 && Math.abs((p.z || 0) - h.z) < 12) return { kind: 'pickup', p, label: p.kind === 'story' ? 'Take ' + (p.name || 'it') : 'Pick up' }; }
  const npc = M.talkers.find(t => Math.hypot(t.x - h.x, t.y - h.y) < 22 && t.canTalk && t.canTalk()); if (npc) return { kind: 'talk', npc, label: npc.talkLabel || 'Talk' };
  if (M.escort && M.escort.alive && M.escort.freed && Math.hypot(M.escort.x - h.x, M.escort.y - h.y) < 24) return { kind: 'escort', label: M.escort.waiting ? 'Tobei: follow me' : 'Tobei: wait here' };
  return null;
};
B.interact = (h, M, pressed) => {
  const it = B.interactable(h, M); if (!it || !pressed) return;
  if (it.kind === 'drop') B.dropBody(h, M);
  else if (it.kind === 'body') { h.drag = it.b; it.b.carried = true; h.crouch = false; B.sfx('bodyDrop', { vol: .5 }); }
  else if (it.kind === 'pickup') M.takePickup(it.p);
  else if (it.kind === 'talk') it.npc.talk();
  else if (it.kind === 'escort') M.escort.toggle();
};
B.holdInteract = (h, dt, I, M) => {
  const it = B.interactable(h, M);
  if (!it || it.kind !== 'hold' || !I.interactDown) { if (h.holdTarget) h.holdTarget.prog = 0; h.holdTarget = null; return; }
  if (h.holdTarget !== it.it) { if (h.holdTarget) h.holdTarget.prog = 0; h.holdTarget = it.it; it.it.prog = 0; }
  it.it.prog += dt; if (crand() < dt * 6) B.sfx('lever', { vol: .3 });
  if (it.it.prog >= (it.it.hold || 1)) { it.it.prog = 0; h.holdTarget = null; M.useInteract(it.it); }
};
