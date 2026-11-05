// Infantry behaviors (7.6) and enemy fire: telegraph rings, target choice, hitscan accuracy, throws.
(() => {
const E = My3D2dge, WP = globalThis.WP, BEH = WP.BEH = WP.BEH || {}, { clamp } = WP;
const RUN = 70, WALK = 32, SPRINT = 110;

// ---------- enemy fire ----------
const Fire = WP.Fire = {
  depthFactor(D) { return D <= 150 ? 1 : D >= 500 ? .55 : 1 - .45 * (D - 150) / 350; },
  /** start a telegraph: spec { tele, bullets, acc, dmg, proj, glint, noRing }; returns false when nobody is there */
  start(sim, e, spec, o = {}) {
    const pl = sim.livePlayers(); if (!pl.length || sim.cheats.holdFire) return false;
    const pid = WP.pick(sim.R.ai, pl).pid, T = spec.tele * sim.teleK * (o.k || 1) * (o.hostage ? 1.3 : 1);
    const [b0, b1] = spec.bullets || [0, 0], n = b0 + Math.floor(sim.R.ai() * (b1 - b0 + 1));
    e.atk = { spec, T, t: 0, pid, phase: 'tele', n, shot: 0, shotT: 0, from: o.from || null, part: o.part || null, kind: spec.proj ? 'proj' : 'gun', hostage: o.hostage || null };
    sim.ev('telegraph', { id: e.id, pid, T, kind: e.atk.kind, part: o.part || null });
    return true;
  },
  /** advance a telegraph; returns 'done' when the attack is over */
  update(sim, e, dt, muzzle) {
    const a = e.atk; if (!a) return 'done';
    a.t += dt;
    if (a.phase === 'tele') {
      if (a.t < a.T) return 'tele';
      a.phase = 'fire'; a.shotT = 0;
      if (a.kind === 'proj') { WP.Proj.launch(sim, e, a.spec.proj, a.pid, muzzle ? muzzle() : null); sim.ev('efire', { id: e.id, pid: a.pid, proj: a.spec.proj, part: a.part }); e.atk = null; return 'done'; }
    }
    if (a.phase === 'fire') {
      a.shotT -= dt;
      while (a.shotT <= 0 && a.shot < a.n) {
        a.shot++; a.shotT += .1;
        if (a.hostage) {   // fire at a hostage: shoot the gunner before the ring closes
          const h = sim.byId(a.hostage), ok = h && !h.saved && !h.lost && sim.R.ai() < .5 * sim.accK;
          sim.ev('efire', { id: e.id, pid: -1, hit: !!ok, part: a.part, hostage: a.hostage });
          if (ok) WP.hostageHit(sim, h, null, 1);
          continue;
        }
        const p = sim.players.find(q => q.pid === a.pid);
        const D = Math.max(20, sim.view.depth(e.x, e.y)), spot = sim.spotted > 0 ? 1.5 : 1;
        const chance = clamp((a.spec.acc || .4) * Fire.depthFactor(D) * sim.accK * spot, 0, .98);
        const hit = !!p && !p.down && sim.R.ai() < chance;
        const lx = sim.view.lateral(e.x, e.y);
        sim.ev('efire', { id: e.id, pid: a.pid, hit, part: a.part, dir: lx < -60 ? -1 : lx > 60 ? 1 : 0 });
        if (hit) sim.hurtPlayer(p, (a.spec.dmg || 4) * sim.dmgK, { kind: 'bullet', dir: lx < -60 ? -1 : lx > 60 ? 1 : 0 });
      }
      if (a.shot >= a.n) { e.atk = null; return 'done'; }
      return 'fire';
    }
    return 'done';
  }
};

// ---------- helpers ----------
const towardCam = (sim, e) => Math.atan2(sim.view.P.y - e.y, sim.view.P.x - e.x);
const screenX = (sim, e) => { const p = sim.view.project(e.x, e.y, e.z); return p ? p[0] : null; };
const setMove = (sim, e, dir, speed) => { const P = sim.view.P; e.mvx = P.rx * dir; e.mvy = P.ry * dir; e.speed = speed; };
const move = (e, dt, k = 1) => { e.x += e.mvx * e.speed * dt * k; e.y += e.mvy * e.speed * dt * k; e.vx = e.mvx * e.speed * k; e.vy = e.mvy * e.speed * k; };
const still = e => { e.vx = e.vy = 0; };
const go = (e, st) => { e.st = st; e.stt = 0; };
WP.Inf = { towardCam, screenX, setMove, move, still, go, RUN, WALK, SPRINT };

/** begin this type's attack (gun, throw, whistle); false when it can't */
function attack(sim, e) {
  const tp = WP.TYPES[e.type];
  if (e.stun > 0) return false;
  if (tp.whistle) { e.whistle = { t: 0, T: tp.whistle }; sim.ev('whistle', { id: e.id }); sim.tip('tip.whistle'); return true; }
  if (tp.throws) {
    const pl = sim.livePlayers(); if (!pl.length || sim.cheats.holdFire) return false;
    e.throwing = { t: 0, T: tp.throws.tele * sim.teleK, proj: tp.throws.proj, pid: WP.pick(sim.R.ai, pl).pid };
    sim.ev('windup', { id: e.id, T: e.throwing.T }); return true;
  }
  if (tp.fire) return Fire.start(sim, e, tp.fire);
  return false;
}
/** advance an attack in progress: 'done' when over */
function attacking(sim, e, dt) {
  const tp = WP.TYPES[e.type];
  if (e.whistle) {
    e.whistle.t += dt;
    if (e.whistle.t >= e.whistle.T) {
      e.whistle = null; const n = sim.perks.commsDown ? 2 : 3;
      sim.ev('whistleDone', { id: e.id });
      for (let i = 0; i < n; i++) sim.spawn('rifleman', { side: i % 2 ? 'L' : 'R', dz: 150 + sim.R.ai() * 110, beh: 'cross', stops: 1, noQuota: false });
      return 'done';
    }
    return 'tele';
  }
  if (e.throwing) {
    const th = e.throwing; th.t += dt;
    if (th.t >= th.T) {
      e.throwing = null;
      const H = WP.Hit.worldH(tp);
      WP.Proj.launch(sim, e, th.proj, th.pid, [e.x, e.y, e.z + H * .8]);
      sim.ev('throw', { id: e.id, proj: th.proj });
      if (th.proj === 'grenade') sim.tip('tip.grenadeIn'); else if (th.proj === 'knife') sim.tip('tip.knife');
      return 'done';
    }
    return 'tele';
  }
  if (e.atk) { const H = WP.Hit.worldH(tp); return Fire.update(sim, e, dt, () => [e.x, e.y, e.z + H * .65]); }
  return 'done';
}
WP.Inf.attack = attack; WP.Inf.attacking = attacking;

function exitNow(sim, e) {
  const lx = sim.view.lateral(e.x, e.y); setMove(sim, e, lx < 0 ? -1 : 1, RUN); e.facing = Math.atan2(e.mvy, e.mvx); e.pose = null; e.hidden = false; go(e, 'exit');
}
WP.Inf.exitNow = exitNow;

BEH['init:infantry'] = (sim, e, o) => {
  const tp = WP.TYPES[e.type];
  e.beh = o.beh || (tp.whistle ? 'officer' : e.type === 'sniper' ? 'snipe' : e.type === 'mortar' ? 'mortar' : e.type === 'para' ? 'para' : 'cross');
  const lx = e.anchor === 'cam' ? e.lx : sim.view.lateral(e.x, e.y);
  if (e.dir === undefined || e.dir === 0) e.dir = lx < 0 ? 1 : -1;
  if (o.side === 'L') e.dir = 1; else if (o.side === 'R') e.dir = -1;
  e.facing = towardCam(sim, e);
  e.size = tp.size;
  e.cyclesLeft = e.cycles === undefined ? ({ popup: 2 + Math.floor(sim.R.ai() * 2), window: 2, door: 2, stand: 3, advance: 2, snipe: 99, mortar: 99, tower: 99, roof: 2, dismount: 2, branch: 2 }[e.beh] || 1) : e.cycles;
  e.stopsLeft = e.stops === undefined ? (e.beh === 'cross' ? (sim.R.ai() < .7 ? 1 : 0) : 0) : e.stops;
  if (e.beh === 'sprint') e.stopsLeft = 0;
  if (e.beh === 'para') { e.z = o.z || 160; e.chute = true; e.chuteHp = 1; }
  if (e.beh === 'branch') { e.z = o.z || 40; }
};

BEH['die:infantry'] = (sim, e, p, part, how) => {
  e.fadeAt = 2.5; e.floorZ = e.facade || e.tower ? e.z : 0;
  if (e.beh === 'para' && e.chute && how === 'chute') { e.floorZ = 0; }
  if (e.z > 4 && !e.facade && !e.tower) e.floorZ = 0;
  if (e.type === 'officer' && !e.drop) WP.Supply.drop(sim, e.x, e.y, e.z + 12, 'intel', p);
  if (e.whistle) e.whistle = null;
  e.throwing = null; e.atk = null;
  sim.ev('bark', { id: e.id, kind: 'die' });
};

// stagger and flinch on a non-lethal hit
BEH['hurt:infantry'] = (sim, e) => {
  e.hurtT = .25;
  const tp = WP.TYPES[e.type];
  if (tp.hp <= 2 && e.atk && e.atk.phase === 'tele' && e.atk.t < e.atk.T * .7) { e.atk = null; sim.ev('cancel', { id: e.id }); }
  if (e.throwing && tp.hp <= 2) e.throwing = null;
};

// ---------- behaviors ----------
BEH.cross = (sim, e, dt) => {
  if (e.leave && e.st !== 'exit') exitNow(sim, e);
  if (e.st === 'enter') { setMove(sim, e, e.dir, e.speed || (e.beh === 'sprint' ? SPRINT : e.beh === 'patrol' ? WALK : RUN)); e.stopX = WP.W * (.25 + sim.R.ai() * .5); go(e, 'run'); }
  if (e.st === 'run' || e.st === 'exit') {
    move(e, dt); e.facing = Math.atan2(e.mvy, e.mvx); e.pose = null;
    if (e.st === 'run' && e.stopsLeft > 0) {
      const sx = screenX(sim, e);
      if (sx !== null && ((e.dir > 0 && sx >= e.stopX) || (e.dir < 0 && sx <= WP.W - e.stopX))) { e.stopsLeft--; still(e); go(e, 'aim'); }
    }
    return;
  }
  if (e.st === 'aim') { e.facing = towardCam(sim, e); still(e); if (e.stt > .25) { if (attack(sim, e)) go(e, 'attack'); else go(e, 'run'); } return; }
  if (e.st === 'attack') { e.facing = towardCam(sim, e); if (attacking(sim, e, dt) === 'done') { go(e, 'recover'); } return; }
  if (e.st === 'recover') { if (e.stt > .4) { setMove(sim, e, e.dir, e.speed || RUN); go(e, 'run'); e.stopX = WP.W * (.25 + sim.R.ai() * .5); if (e.dir > 0) e.stopX = Math.max(e.stopX, (screenX(sim, e) || 0) + 60); else e.stopX = Math.max(e.stopX, WP.W - (screenX(sim, e) || WP.W) + 60); } }
};
BEH.sprint = BEH.cross; BEH.patrol = BEH.cross;

// a cover pop-up: hides (head only), stands, fires, sinks; cycles, then runs off
BEH.popup = (sim, e, dt) => {
  if (e.leave && e.st !== 'exit') exitNow(sim, e);
  if (e.st === 'enter') {
    const c = e.cover ? sim.propById(e.cover) : null, P = sim.view.P;
    if (c && !c.dead) { const off = e.coverOff === undefined ? (sim.R.ai() - .5) * (WP.TYPES[c.type].box[0] * .6) : e.coverOff; e.x = c.x + P.fx * 10 + P.rx * off; e.y = c.y + P.fy * 10 + P.ry * off; e.coverProp = c.id; }
    e.facing = towardCam(sim, e); e.pose = 'crouch'; e.hideT = .6 + sim.R.ai() * .8; go(e, 'hide');
  }
  if (e.st === 'exit') { move(e, dt); e.facing = Math.atan2(e.mvy, e.mvx); return; }
  const cp = e.coverProp ? sim.byId(e.coverProp) : null;
  if (e.coverProp && (!cp || cp.dead)) { e.coverProp = null; }
  still(e); e.facing = towardCam(sim, e);
  if (e.st === 'hide') { e.pose = 'crouch'; if (e.stt > e.hideT) go(e, 'rise'); return; }
  if (e.st === 'rise') { e.pose = e.stt < .2 ? 'crouch' : (e.kneelFire ? 'kneel' : null); if (e.stt > .2) { if (attack(sim, e)) go(e, 'attack'); else go(e, 'sink'); } return; }
  if (e.st === 'attack') { e.pose = e.kneelFire ? 'kneel' : null; if (attacking(sim, e, dt) === 'done') go(e, 'sink'); return; }
  if (e.st === 'sink') { if (e.stt > .35) { e.cyclesLeft--; if (e.cyclesLeft <= 0) { if (e.thenAdvance) { e.beh = 'advance'; go(e, 'enter'); } else exitNow(sim, e); } else { e.pose = 'crouch'; e.hideT = 2 + sim.R.ai(); go(e, 'hide'); } } }
};
BEH.roof = BEH.popup;

// a window or door: hidden inside, shutters open (.3 s), up in the opening (clipped to it), fires, back down
BEH.window = (sim, e, dt) => {
  if (e.leave && e.st !== 'gone') { e.hidden = true; e.gone = true; return; }
  still(e); e.facing = towardCam(sim, e);
  if (e.st === 'enter') { e.hidden = true; e.hideT = .5 + sim.R.ai() * 1.2; go(e, 'hide'); }
  if (e.st === 'hide') { e.hidden = true; if (e.stt > e.hideT) { go(e, 'open'); sim.ev('shutter', { id: e.id }); } return; }
  if (e.st === 'open') { e.hidden = e.stt < .3; if (e.stt > .45) { if (attack(sim, e)) go(e, 'attack'); else go(e, 'down'); } return; }
  if (e.st === 'attack') { e.hidden = false; if (attacking(sim, e, dt) === 'done') go(e, 'down'); return; }
  if (e.st === 'down') { if (e.stt > .4) { e.cyclesLeft--; if (e.cyclesLeft <= 0) { e.gone = true; e.escaped = true; } else { e.hidden = true; e.hideT = 1.8 + sim.R.ai() * 1.4; go(e, 'hide'); } } }
};
BEH.door = BEH.window;

// stands in place and fires a few times (brutes, tower gunners, the officer's men)
BEH.stand = (sim, e, dt) => {
  if (e.leave && e.st !== 'exit') exitNow(sim, e);
  if (e.st === 'exit') { move(e, dt); e.facing = Math.atan2(e.mvy, e.mvx); return; }
  still(e); e.facing = towardCam(sim, e); e.pose = e.kneelFire ? 'kneel' : null;
  if (e.st === 'enter') { e.waitT = .4 + sim.R.ai() * .6; go(e, 'wait'); }
  if (e.st === 'wait') { if (e.stt > e.waitT) { if (attack(sim, e)) go(e, 'attack'); else e.stt = 0; } return; }
  if (e.st === 'attack') { if (attacking(sim, e, dt) === 'done') { e.cyclesLeft--; if (e.cyclesLeft <= 0) { if (e.beh === 'tower' || e.beh === 'snipe') { e.cyclesLeft = 99; } else { exitNow(sim, e); return; } } e.waitT = 1.4 + sim.R.ai() * 1.2; go(e, 'wait'); } }
};
BEH.tower = (sim, e, dt) => {
  // a tower gunner: shoots at the players, or at a running hostage during an escort
  if (e.st === 'wait' && e.stt > e.waitT && !e.atk) {
    const hs = sim.ents.filter(h => h.type === 'hostage' && !h.saved && !h.lost && h.st === 'run');
    if (hs.length && sim.R.ai() < .55) { const h = WP.pick(sim.R.ai, hs); if (Fire.start(sim, e, WP.TYPES[e.type].fire || WP.TYPES.rifleman.fire, { hostage: h.id })) { go(e, 'attack'); return; } }
  }
  BEH.stand(sim, e, dt);
};
BEH.sway = (sim, e, dt) => { if (e.x0 === undefined) { e.x0 = e.x; e.y0 = e.y; } const P = sim.view.P, s = Math.sin(e.t * .9) * 90; e.x = e.x0 + P.rx * s; e.y = e.y0 + P.ry * s; e.vx = P.rx * Math.cos(e.t * .9) * 81; e.vy = P.ry * Math.cos(e.t * .9) * 81; e.facing = Math.atan2(e.vy, e.vx); };

// a sniper: still, a lens glint telegraph
BEH.snipe = (sim, e, dt) => {
  still(e); e.facing = towardCam(sim, e); e.pose = e.kneelFire ? 'kneel' : null;
  if (e.st === 'enter') { e.waitT = 1 + sim.R.ai() * 1.2; go(e, 'wait'); if (sim.perks.campLocated) e.marker = 1.5; }
  if (e.marker > 0) e.marker -= dt;
  if (e.leave) { e.gone = true; e.escaped = true; return; }
  if (e.st === 'wait') { if (e.stt > e.waitT) { if (attack(sim, e)) go(e, 'attack'); else e.stt = 0; } return; }
  if (e.st === 'attack') { if (attacking(sim, e, dt) === 'done') { e.waitT = 1.8 + sim.R.ai() * 1.5; go(e, 'wait'); } }
};

// walks toward the camera to depth 70, then fires or throws from there
BEH.advance = (sim, e, dt) => {
  if (e.leave && e.st !== 'exit') exitNow(sim, e);
  const P = sim.view.P, D = sim.view.depth(e.x, e.y);
  if (e.st === 'enter') { e.stopD = e.stopD || 70 + sim.R.ai() * 25; e.pose = null; go(e, 'walk'); }
  if (e.st === 'exit') { move(e, dt); e.facing = Math.atan2(e.mvy, e.mvx); return; }
  if (e.st === 'walk') {
    const sp = WP.TYPES[e.type].throws ? RUN * .8 : WALK; e.vx = -P.fx * sp; e.vy = -P.fy * sp; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = towardCam(sim, e);
    if (D <= e.stopD) { still(e); go(e, 'aim'); }
    return;
  }
  still(e); e.facing = towardCam(sim, e);
  if (e.st === 'aim') { if (e.stt > .2) { if (attack(sim, e)) go(e, 'attack'); else go(e, 'recover'); } return; }
  if (e.st === 'attack') { if (attacking(sim, e, dt) === 'done') go(e, 'recover'); return; }
  if (e.st === 'recover') { if (e.stt > .9) { e.cyclesLeft--; if (e.cyclesLeft <= 0) exitNow(sim, e); else go(e, 'aim'); } }
};

// knife men dropping out of branches (Op 2)
BEH.branch = (sim, e, dt) => {
  if (e.st === 'enter') { e.dropT = .4 + sim.R.ai() * .9; go(e, 'perch'); e.pose = 'crouch'; }
  if (e.st === 'perch') { still(e); e.facing = towardCam(sim, e); if (e.stt > e.dropT) { go(e, 'drop'); e.vz = 0; } return; }
  if (e.st === 'drop') { e.vz -= 500 * dt; e.z = Math.max(0, e.z + e.vz * dt); if (e.z <= 0) { e.pose = 'crouch'; sim.ev('land', { id: e.id }); e.beh = 'advance'; e.stopD = sim.view.depth(e.x, e.y) - 4; go(e, 'enter'); } }
};

// a paratrooper: the chute and the body are both hittable; a shot chute drops him fast to his death
BEH.para = (sim, e, dt) => {
  if (e.st === 'enter') { go(e, 'fall'); e.sway = sim.R.ai() * 6; }
  if (e.st === 'fall') {
    still(e); e.facing = towardCam(sim, e);
    if (e.chute) { e.z -= 22 * dt; e.x += Math.sin(e.t * 1.3 + e.sway) * 6 * dt; }
    else { e.vz = (e.vz || 0) - 500 * dt; e.z += e.vz * dt; }
    if (e.z <= 0) {
      e.z = 0;
      if (!e.chute) { sim.kill(e, e.chuteBy === undefined ? null : e.chuteBy, 'chute', 'fall'); return; }
      e.chute = false; sim.ev('land', { id: e.id }); e.beh = 'cross'; e.stopsLeft = 1; e.dir = sim.view.lateral(e.x, e.y) < 0 ? 1 : -1; go(e, 'enter');
    }
  }
};

// leaves a truck, APC or boat and fans out
BEH.dismount = (sim, e, dt) => {
  if (e.leave && e.st !== 'exit') exitNow(sim, e);
  if (e.st === 'enter') { setMove(sim, e, e.dir, RUN); e.runT = .5 + sim.R.ai() * .8; go(e, 'run'); }
  if (e.st === 'run') { move(e, dt); e.facing = Math.atan2(e.mvy, e.mvx); if (e.stt > e.runT) { e.beh = 'stand'; e.cyclesLeft = e.cyclesLeft || 2; still(e); go(e, 'enter'); } return; }
  if (e.st === 'exit') { move(e, dt); e.facing = Math.atan2(e.mvy, e.mvx); }
};

// a crew of two behind sandbags far away: a launch every 6 s; the shell's landing marker is the telegraph
BEH.mortar = (sim, e, dt) => {
  still(e); e.facing = towardCam(sim, e); e.pose = 'kneel';
  if (e.leave) { e.gone = true; e.escaped = true; return; }
  if (e.st === 'enter') { e.waitT = 1.5 + sim.R.ai() * 2; go(e, 'wait'); if (sim.perks.campLocated) e.marker = 1.5; }
  if (e.marker > 0) e.marker -= dt;
  if (e.st === 'wait' && e.stt > e.waitT) { go(e, 'load'); sim.ev('mortarLoad', { id: e.id }); }
  if (e.st === 'load' && e.stt > .6) {
    const pl = sim.livePlayers();
    if (pl.length && !sim.cheats.holdFire && !e.loader) WP.Proj.launch(sim, e, 'mortar', WP.pick(sim.R.ai, pl).pid, [e.x, e.y, e.z + 14]);
    e.waitT = 6 * sim.teleK - .6; go(e, 'wait');
  }
};

// the officer: a whistle for 2 s; finished, riflemen arrive. Kill him during it to cancel
BEH.officer = (sim, e, dt) => {
  if (e.leave && e.st !== 'exit') exitNow(sim, e);
  if (e.st === 'exit') { move(e, dt); e.facing = Math.atan2(e.mvy, e.mvx); return; }
  if (e.st === 'enter') { if (e.dir && !e.noWalk) { setMove(sim, e, e.dir, WALK); e.walkT = .8 + sim.R.ai() * .8; go(e, 'walk'); } else go(e, 'wait'); }
  if (e.st === 'walk') { move(e, dt); e.facing = Math.atan2(e.mvy, e.mvx); if (e.stt > e.walkT) { still(e); go(e, 'wait'); } return; }
  still(e); e.facing = towardCam(sim, e);
  if (e.st === 'wait' && e.stt > .5) { attack(sim, e); go(e, 'attack'); return; }
  if (e.st === 'attack') { if (attacking(sim, e, dt) === 'done') { go(e, 'shout'); } return; }
  if (e.st === 'shout' && e.stt > 2.5) exitNow(sim, e);
};

// follows a hostage; within 10 units for 1 s he grabs it and drags it back
BEH.chase = (sim, e, dt) => {
  const h = e.target ? sim.byId(e.target) : null;
  if (!h || h.dead || h.gone || h.saved || h.lost) { if (e.st !== 'exit' && e.st !== 'attack' && e.st !== 'aim') { e.beh = 'stand'; e.cyclesLeft = 1; go(e, 'enter'); } return; }
  if (e.st === 'enter') { go(e, 'run'); e.near = 0; }
  if (e.st === 'run') {
    const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1, sp = d > 40 ? 58 : 52;
    e.vx = dx / d * sp; e.vy = dy / d * sp; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = Math.atan2(dy, dx);
    if (d < 10) { e.near += dt; if (e.near > 1 && !h.grabbedBy) { h.grabbedBy = e.id; h.grabT = 0; go(e, 'drag'); sim.ev('grab', { id: h.id, by: e.id }); sim.radio('hostage.grab'); } } else e.near = Math.max(0, e.near - dt);
    return;
  }
  if (e.st === 'drag') {
    const back = h.from || [e.x, e.y], dx = back[0] - e.x, dy = back[1] - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx = dx / d * 20; e.vy = dy / d * 20; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = Math.atan2(-dy, -dx);
    h.x = e.x + (h.x - e.x) * .6 + Math.cos(e.facing) * 4; h.y = e.y + (h.y - e.y) * .6 + Math.sin(e.facing) * 4;
  }
};
BEH['dead:infantry'] = (sim, e, dt) => {
  // a grabbed hostage runs on when its captor dies
  for (const h of sim.ents) if (h.grabbedBy === e.id) { h.grabbedBy = null; sim.ev('freed', { id: h.id }); }
  BEH.dead(sim, e, dt);
};

// ---------- shapes ----------
BEH['shapes:infantry'] = (sim, e, out, V) => {
  if (e.dead || e.hidden) return;
  const p = V.project(e.x, e.y, e.z); if (!p) return;
  const D = V.depth(e.x, e.y); if (D < 14) return;
  const tp = WP.TYPES[e.type], q = V.q(p[2]), H = WP.Hit.rigH(tp, e) * q;
  let clip = null;
  if (e.facade) { const f = e.facade, a = V.project(f[0], f[1], f[2]), b = V.project(f[3], f[4], f[5]); if (a && b) clip = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; }
  WP.Hit.humanoid(out, e, D, p[0], p[1], H, { clip });
  if (e.chute && e.beh === 'para') { const r = Math.max(3, 12 * p[2]); out.push({ e, part: 'chute', D: D + .2, kind: 'c', cx: p[0], cy: p[1] - H - r * .9, r }); }
};
})();
