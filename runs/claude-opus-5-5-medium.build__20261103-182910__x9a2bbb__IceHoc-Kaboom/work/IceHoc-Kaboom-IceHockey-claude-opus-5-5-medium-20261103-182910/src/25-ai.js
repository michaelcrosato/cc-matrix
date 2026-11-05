/* ---- AI: team roles (carrier, support, point; pressure, cover, home; chase), decisions on a cadence, steering between ---- */
const AI = (() => {
  const C = Rink.C;
  const opps = s => M.skaters.filter(o => o.team !== s.team && o.state !== 'bin' && o.state !== 'fight');
  const mates = s => M.skaters.filter(o => o.team === s.team && o !== s && o.state !== 'bin' && o.state !== 'fight');
  const laneBlock = (s, x, y, r = 14) => opps(s).filter(o => U.segDist(o.x, o.y, s.x, s.y, x, y) < r).length;
  const into = side => -Rink.outDir(side);
  function skillOf(team) {
    const dev = team === 0 ? T.aiSkillHome : T.aiSkillAway; if (dev >= 0) return dev;
    if (M.aiSkill) return M.aiSkill[team];
    return .55;
  }
  function fresh(s) { return { t: RNG.sim() * .2, target: [s.x, s.y], turbo: false, act: null, holdShoot: 0, skill: skillOf(s.team), errK: 1, role: '', wait: 0 }; }
  /** what a CPU skater wants this step: { mx, my, turbo, shoot (held), lob (held), aim, press: {} } */
  function intent(s, dt) {
    const ai = s.ai || (s.ai = fresh(s));
    ai.skill = skillOf(s.team); ai.errK = lerp(1.6, .8, ai.skill);
    const it = { mx: 0, my: 0, turbo: false, shoot: false, lob: false, aim: null, press: {} };
    if (M.freezeAI && !M.attract) return it;
    ai.t -= dt;
    if (s.scripted) { ai.target = s.scripted; ai.t = 1; }
    else if (ai.t <= 0) { ai.t = lerp(.3, .12, ai.skill) * (.8 + RNG.sim() * .4); decide(s, ai); }
    const [tx, ty] = ai.target, dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    if (d > (ai.arrive || 5)) { const k = Math.min(1, d / 26); it.mx = dx / d * k; it.my = dy / d * k; }
    else if (ai.face !== undefined) { it.mx = Math.cos(ai.face) * .2; it.my = Math.sin(ai.face) * .2; }
    it.turbo = ai.turbo && (s.turbo > .25 || s.items.hotsauce > 0 || M.kaboomT[s.team] > 0);
    if (ai.act && (ai.wait -= dt) <= 0) { it.press[ai.act] = true; if (ai.aimAt) it.aim = ai.aimAt; it.passTo = ai.passTo; ai.act = null; ai.aimAt = null; }
    if (ai.holdShoot > 0) { it.shoot = true; ai.holdShoot -= dt; }
    if (ai.holdLob > 0) { it.lob = true; ai.holdLob -= dt; }
    return it;
  }
  function decide(s, ai) {
    const p = M.puck, own = p.owner, att = Skater.attackGoal(s.team), def = Skater.ownGoal(s.team), iA = into(att.side), iD = into(def.side);
    ai.turbo = false; ai.arrive = 5; ai.face = undefined; ai.role = '';
    if (M.phase !== 'play' && M.phase !== 'shootout') { ai.target = [s.x, s.y]; return; }
    if (own === s) return carrier(s, ai, att, iA);
    // a pass on its way: meet it, and one-time it near the net
    if (p.passTo === s && !own) {
      const lead = .15; ai.target = [p.x + p.vx * lead, p.y + p.vy * lead]; ai.role = 'receive';
      const dg = Math.hypot(att.x - s.x, att.y - s.y), dp = Math.hypot(p.x - s.x, p.y - s.y);
      if (dg < 190 && (s.x - att.x) * iA > 10 && dp < 80 && RNG.sim() < .6 + ai.skill * .35) { ai.act = 'shoot'; ai.wait = 0; }
      return;
    }
    // power-ups: a skater not in the play detours for one
    if (T.aiItemGreed > 0 && M.items.length) {
      const it = M.items.find(i => !i.held && Math.hypot(i.x - s.x, i.y - s.y) < T.aiItemGreed);
      const carrierNear = own && Math.hypot(own.x - s.x, own.y - s.y) < 60;
      if (it && !carrierNear && (!own || own.team === s.team || s.ai.role === 'home')) { ai.target = [it.x, it.y]; ai.turbo = true; ai.role = 'item'; if (RNG.sim() < .7) return; }
    }
    // the bear: chapter 4's "hunt the bear" sends a home skater at Polar Pete
    if (M.huntBear && s.team === 0 && M.mascot && !M.mascot.down && s.slot === 2 && !own) { ai.target = [M.mascot.x, M.mascot.y]; ai.turbo = true; ai.act = Math.hypot(M.mascot.x - s.x, M.mascot.y - s.y) < 30 ? 'shoot' : null; return; }
    // an enforcer with a grudge skates at its target (then Fight.watch drops the gloves)
    if (s.def.fgt >= 4 && M.fights < T.fightMax && (!own || own.team !== s.team)) {
      let tgt = null, best = M.challengy ? 30 : 45;
      for (const id in s.grudge) if (s.grudge[id] >= best) { const o = M.byId[id]; if (o && Skater.free(o) && !o.off) { best = s.grudge[id]; tgt = o; } }
      if (tgt) { ai.role = 'grudge'; ai.target = [tgt.x, tgt.y]; ai.turbo = true; return; }
    }
    if (!own) return loose(s, ai, att, def, iA, iD);
    if (own.team === s.team) return support(s, ai, own, att, iA);
    return defend(s, ai, own, def, iD);
  }
  function carrier(s, ai, att, iA) {
    ai.role = 'carrier';
    const dg = Math.hypot(att.x - s.x, att.y - s.y), front = (s.x - att.x) * iA, blockers = laneBlock(s, att.x, att.y, 12);
    const twister = s.def.look && s.def.look.twister && M.boss && front > 0 && dg < 260;
    if (twister && !s.twisterDone && RNG.sim() < .33 && s.state === 'skate') { s.twisterDone = true; s.twisterT = .6; Bus.emit('twister', { by: s.id, team: s.team }); ai.target = [s.x, s.y]; return; }
    if (M.phase === 'shootout' && dg < 95 && s.cool.deke <= 0 && !s.soDeke && RNG.sim() < .45) { s.soDeke = true; ai.act = 'deke'; ai.wait = 0; return; }
    // the shot
    if (front > 14 && dg < T.aiShootRange && Math.abs(s.y - C.y) < 130 && blockers < 2 && s.cool.shot <= 0) {
      const wrist = dg < 110 || RNG.sim() < .55;
      ai.holdShoot = wrist ? .08 : .2 + T.slapCharge * (M.kaboomT[s.team] > 0 ? .55 : .5 + RNG.sim() * .5); s.cool.shot = 1.2; ai.target = [s.x + Math.cos(s.facing) * 20, s.y + Math.sin(s.facing) * 20];
      if (M.kaboomT[s.team] > 0 && !wrist) ai.holdShoot = .2 + T.slapCharge / 2 + .05;
      return;
    }
    // pressured: pass to an open mate, deke, or carry away
    const press = opps(s).find(o => Math.hypot(o.x - s.x, o.y - s.y) < 30 && Math.abs(U.angDiff(Math.atan2(o.y - s.y, o.x - s.x), s.facing)) < 1.2);
    const open = mates(s).filter(m => laneBlock(s, m.x, m.y, 12) === 0).sort((a, b) => Math.hypot(a.x - att.x, a.y - att.y) - Math.hypot(b.x - att.x, b.y - att.y));
    const callFor = mates(s).find(m => m.callT > 0 && laneBlock(s, m.x, m.y, 12) === 0);
    if (callFor) { ai.act = 'pass'; ai.passTo = callFor; ai.wait = 0; callFor.callT = 0; return; }
    const tactic = M.tactic && M.tactic[s.team];
    if (press) {
      if (open.length && RNG.sim() < .65 + (tactic === 'finesse' ? .25 : 0)) { ai.act = laneBlock(s, open[0].x, open[0].y, 18) ? 'lob' : 'pass'; ai.passTo = open[0]; ai.wait = lerp(.25, .05, ai.skill); return; }
      if (s.cool.deke <= 0 && RNG.sim() < .4 * s.def.hnd / 3) { ai.act = 'deke'; ai.wait = 0; return; }
      const a = s.facing + (RNG.sim() < .5 ? 1.2 : -1.2); ai.target = [s.x + Math.cos(a) * 50, s.y + Math.sin(a) * 50]; return;
    }
    // a cross-crease feed: a mate in the slot or at the far post, the lane open
    const feed = dg < 230 && open.find(m => Math.hypot(m.x - att.x, m.y - att.y) < 120 && (m.x - att.x) * iA > 10 && Math.sign(m.y - C.y) !== Math.sign(s.y - C.y));
    if (feed && s.cool.shot <= 0 && RNG.sim() < .6 + (tactic === 'finesse' ? .2 : 0)) { ai.act = 'pass'; ai.passTo = feed; ai.wait = lerp(.15, .03, ai.skill); s.cool.shot = .6; return; }
    if (open.length && Math.hypot(open[0].x - att.x, open[0].y - att.y) + 60 < dg && (open[0].x - att.x) * iA > 10 && RNG.sim() < .3 + (tactic === 'finesse' ? .2 : 0)) { ai.act = 'pass'; ai.passTo = open[0]; ai.wait = lerp(.2, .04, ai.skill); return; }
    // carry toward the slot, slaloming around the nearest defender ahead
    let tx = att.x + iA * 60, ty = C.y + (s.y > C.y ? 18 : -18);
    const ahead = opps(s).filter(o => (o.x - s.x) * iA < 0 && Math.abs(o.y - s.y) < 40 && Math.hypot(o.x - s.x, o.y - s.y) < 90)[0];
    if (ahead) ty = ahead.y > s.y ? Math.min(ty, ahead.y - 45) : Math.max(ty, ahead.y + 45);
    ty = clamp(ty, C.y - 150, C.y + 150);
    ai.target = [tx, ty]; ai.turbo = dg > 230 && RNG.sim() < .7;
  }
  function support(s, ai, own, att, iA) {
    const ms = [s, ...mates(s).filter(m => m !== own)], closer = ms.slice().sort((a, b) => Math.abs(a.x - att.x) - Math.abs(b.x - att.x))[0];
    const deep = Math.abs(own.x - att.x) < 270, side = own.y > C.y ? -1 : 1;
    if (closer === s) { ai.role = 'support'; ai.target = deep ? [att.x + iA * 34, C.y + side * 22] : [att.x + iA * 130, C.y + side * 75]; ai.turbo = !deep; }
    else { ai.role = 'point'; ai.target = [att.x + iA * (M.tactic && M.tactic[s.team] === 'grit' ? 140 : 250), C.y + side * -40]; }
    ai.target[0] = clamp(ai.target[0], Rink.X0 + 30, Rink.X1 - 30);
  }
  function defend(s, ai, own, def, iD) {
    const ms = [s, ...mates(s)], nearest = ms.slice().sort((a, b) => Math.hypot(a.x - own.x, a.y - own.y) - Math.hypot(b.x - own.x, b.y - own.y));
    if (nearest[0] === s) {
      ai.role = 'pressure';
      const lead = .3 * (1 - .4 * (1 - ai.skill)); ai.target = [own.x + own.vx * lead, own.y + own.vy * lead]; ai.turbo = Math.hypot(own.x - s.x, own.y - s.y) > 60;
      const d = Math.hypot(own.x - s.x, own.y - s.y);
      if (d < 26 && s.cool.check <= 0 && s.def.hit >= 3 && RNG.sim() < T.aiAggression * (M.tactic && M.tactic[s.team] === 'grit' ? 1.3 : 1) * (M.challengy && s.team === 1 ? 1.4 : 1)) { ai.act = 'shoot'; ai.wait = lerp(.3, .05, ai.skill); }
      else if (d < 20 && s.cool.poke <= 0) { ai.act = 'deke'; ai.wait = lerp(.3, .05, ai.skill); }
      return;
    }
    if (nearest[1] === s) {   // cover: the most dangerous rival without the puck
      ai.role = 'cover';
      const foes = opps(s).filter(o => o !== own).sort((a, b) => Math.hypot(a.x - def.x, a.y - def.y) - Math.hypot(b.x - def.x, b.y - def.y)), f = foes[0];
      if (f) { ai.target = [lerp(f.x, def.x, .3), lerp(f.y, def.y, .3)]; return; }
    }
    ai.role = 'home'; ai.target = [def.x + iD * 45, lerp(C.y, own.y, .3)];
  }
  function loose(s, ai, att, def, iA, iD) {
    const p = M.puck, px1 = p.x + p.vx * .35, py1 = p.y + p.vy * .35, eta = o => Math.hypot(o.x - px1, o.y - py1) / (Skater.vmax(o, false) * .9);
    const mine = [s, ...mates(s)].sort((a, b) => eta(a) - eta(b)), theirs = opps(s).sort((a, b) => eta(a) - eta(b));
    if (mine[0] === s) { ai.role = 'chase'; ai.target = [px1, py1]; ai.turbo = Math.hypot(px1 - s.x, py1 - s.y) > 50; ai.arrive = 1; return; }
    const win = !theirs.length || eta(mine[0]) < eta(theirs[0]);
    if (win) return support(s, ai, mine[0], att, iA);
    if (mine[1] === s) { ai.role = 'home'; ai.target = [def.x + iD * 45, lerp(C.y, py1, .3)]; return; }
    ai.role = 'cover'; ai.target = [lerp(px1, def.x, .5), lerp(py1, def.y, .5)];
  }
  /** a CPU goalie in a shootout or a manual-goalie helper: nothing (Goalie.update positions them) */
  return { intent, fresh, skillOf, laneBlock };
})();
