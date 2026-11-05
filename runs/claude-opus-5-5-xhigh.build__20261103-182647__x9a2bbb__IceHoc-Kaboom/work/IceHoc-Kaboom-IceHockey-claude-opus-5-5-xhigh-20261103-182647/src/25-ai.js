/* ---- AI (7.13): every CPU skater writes the same intent a player's controller does (so the network, the bot and the
 * attract mode reuse it). Roles per team: with the puck carrier / support / point; without it pressure / cover / home;
 * a loose puck sends whoever gets there first. Each re-thinks every lerp(0.3, 0.12, skill) s and steers in between ---- */
const AI = (() => {
  const blankIntent = () => ({ mx: 0, my: 0, aim: null, face: null, back: false, held: { shoot: false, lob: false, turbo: false }, press: { pass: false, shoot: false, deke: false, lob: false, chirp: false, switch: false } });
  const clearPress = it => { const p = it.press; p.pass = p.shoot = p.deke = p.lob = p.chirp = p.switch = false; };
  /** time for s to reach point (x, y) at its top speed */
  const reach = (m, s, x, y) => Math.hypot(x - s.x, y - s.y) / Math.max(40, Skater.vmax(s, m) * (s.turboOn ? 1.3 : 1));
  /** no rival body or blade near the line from s to (x, y) (a pass's lane), w wide */
  const laneClear = (m, s, x, y, team, w = 15) => m.teams[1 - team].skaters.every(o => { if (o.state === 'bin' || o.offIce || !Skater.free(o)) return true; const [bx, by] = Skater.blade(o), a = U.segPt(o.x, o.y, s.x, s.y, x, y), b = U.segPt(bx, by, s.x, s.y, x, y); return (a.d > w || a.u > .97) && (b.d > w * .7 || b.u > .97); });
  const leadOf = o => [o.x + o.vx * .35, o.y + o.vy * .35];
  /** roles for one team (each step: cheap) */
  function roles(m, t) {
    const team = m.teams[t], sk = team.skaters.filter(s => s.state !== 'bin' && s.state !== 'frozen' && s.state !== 'fight' && !s.offIce), pk = m.puck, own = pk.owner;
    const R = {};
    if (own && own.team === t) {
      R[own.id] = 'carrier'; const dir = m.attackDir(t), rest = sk.filter(s => s !== own).sort((a, b) => (b.x - a.x) * dir - (a.x - b.x) * dir * 0 - 0);
      rest.sort((a, b) => b.x * dir - a.x * dir); if (rest[0]) R[rest[0].id] = 'support'; if (rest[1]) R[rest[1].id] = 'point';
    } else if (own) {
      const near = sk.slice().sort((a, b) => reach(m, a, own.x + own.vx * .3, own.y + own.vy * .3) - reach(m, b, own.x + own.vx * .3, own.y + own.vy * .3));
      if (near[0]) R[near[0].id] = 'pressure'; if (near[1]) R[near[1].id] = 'cover'; if (near[2]) R[near[2].id] = 'home';
    } else {
      const px = pk.x + pk.vx * .35, py = pk.y + pk.vy * .35, near = sk.slice().sort((a, b) => reach(m, a, px, py) - reach(m, b, px, py));
      const them = m.teams[1 - t].skaters.filter(s => Skater.free(s)).map(s => reach(m, s, px, py)), ours = near[0] ? reach(m, near[0], px, py) : 9, win = ours <= Math.min(9, ...them) + .1;
      if (pk.passTo && pk.passTo.team === t) R[pk.passTo.id] = 'receive';
      for (const s of near) if (!R[s.id]) { R[s.id] = 'chase'; break; }
      const rest = near.filter(s => !R[s.id]);
      rest.forEach((s, i) => { R[s.id] = win ? (i === 0 ? 'support' : 'point') : (i === 0 ? 'cover' : 'home'); });
    }
    team.roles = R; return R;
  }
  /** the most dangerous rival without the puck (to mark) */
  function markOf(m, s) {
    const net = m.defNet(s.team), gx = Rink.goalX(net), pk = m.puck;
    let best = null, bd = 1e9;
    for (const o of m.teams[1 - s.team].skaters) { if (o === pk.owner || o.state === 'bin') continue; const d = Math.hypot(o.x - gx, o.y - Rink.C.y) + U.dist(o, s) * .3; const taken = m.teams[s.team].skaters.some(q => q !== s && q.ai.mark === o.id); if (!taken && d < bd) { bd = d; best = o; } }
    return best;
  }
  function think(m, s) {
    const ai = s.ai, it = s.intent, pk = m.puck, t = s.team, role = (m.teams[t].roles || {})[s.id] || 'home', dir = m.attackDir(t), skill = m.aiSkill(t);
    const gxA = Rink.goalX(m.attackNet(t)), gxD = Rink.goalX(m.defNet(t)), C = Rink.C;
    ai.role = role; ai.turbo = false; ai.face = null; ai.back = false; it.aim = null;
    let tx = s.x, ty = s.y;
    const owner = pk.owner;
    if (role === 'carrier') {
      const dg = Math.hypot(gxA - s.x, C.y - s.y), ang = Math.abs(Math.atan2(C.y - s.y, (gxA - s.x) * dir)), front = m.teams[1 - t].skaters.filter(o => Skater.free(o) && U.dist(o, s) < 34 && Math.abs(U.angDiff(s.facing, U.angTo(s, o))) < .8);
      const mates = m.teams[t].skaters.filter(o => o !== s && Skater.free(o) && o.state !== 'bin');
      // a human calling for it
      if (s.callFor && s.callFor.t > 0) { const c = s.callFor.by; if (laneClear(m, s, c.x, c.y, t) || s.callFor.t < .1) { s.passPick = c.id; it.press.pass = true; s.callFor = null; return; } }
      // shoot from the zone with a lane
      const inZone = dg < T.aiShootRange * (.8 + skill * .3) && ang < 1.05 && (gxA - s.x) * dir > 20;
      const lane = m.teams[1 - t].skaters.filter(o => U.segPt(o.x, o.y, s.x, s.y, gxA, C.y).d < 10 && U.segPt(o.x, o.y, s.x, s.y, gxA, C.y).u < .95).length;
      if (inZone && lane <= 1 && (dg < 120 || RNG.sim() < .55 + skill * .3) && s.state !== 'wind') {
        const slap = dg > 110 && !front.length && RNG.sim() < .55, kab = m.kaboom[t] > 0 && !front.length;
        ai.shootHold = kab ? .18 + T.slapCharge / 2 + .05 : slap ? .2 + T.slapCharge * (.4 + RNG.sim() * .6) : .04;
        it.press.shoot = true; ai.shootT = ai.shootHold; return;
      }
      // pass when pressured, or when a mate is clearly better placed
      const better = mates.filter(o => (o.x - s.x) * dir > 40 && Math.hypot(gxA - o.x, C.y - o.y) + 60 < dg && laneClear(m, s, ...leadOf(o), t));
      const pressured = front.some(o => U.dist(o, s) < 26);
      if ((pressured || (better.length && RNG.sim() < .35 + skill * .3)) && mates.length) {
        const to = better[0] || mates.filter(o => laneClear(m, s, ...leadOf(o), t))[0] || (pressured && RNG.sim() < .4 ? mates[0] : null);
        if (to) { s.passPick = to.id; const lob = !laneClear(m, s, ...leadOf(to), t, 15); if (lob) it.press.lob = true; else it.press.pass = true; return; }
      }
      if (front.length && s.dekeCD <= 0 && RNG.sim() < .4 * s.def.r[5] / 3) { it.press.deke = true; }
      // Golden Twister: Sterling's spin in the zone
      if (s.def.twister && (gxA - s.x) * dir > 0 && Math.abs(gxA - s.x) < 260 && !(s.twistT > 0) && (s.twistCD || 0) < m.t && RNG.sim() < .33) { s.twistT = .6; s.twistCD = m.t + 6; Bus.emit('twister', { by: s.id }); }
      if (s.twistT > 0) { it.mx = it.my = 0; return; }
      // carry toward the net, around defenders
      tx = gxA - dir * 40; ty = C.y + (s.y < C.y ? -30 : 30) * (dg > 160 ? 1 : .3);
      if (front.length) { const o = front[0], side = U.angDiff(s.facing, U.angTo(s, o)) > 0 ? -1 : 1; tx = s.x + dir * 60; ty = s.y + side * 50; }
      ai.turbo = !front.length && dg > 140 && s.turbo > .3;
    } else if (role === 'support') {
      const carrier = owner && owner.team === t ? owner : null, deep = carrier && (carrier.x - Rink.C.x) * dir > 108;
      if (deep) { tx = gxA - dir * (40 + RNG.sim() * 25); ty = C.y + (carrier.y < C.y ? 1 : -1) * (24 + RNG.sim() * 20); }
      else { tx = clamp((owner ? owner.x : pk.x) + dir * 120, Rink.X0 + 90, Rink.X1 - 90); ty = C.y + ((owner ? owner.y : pk.y) < C.y ? 1 : -1) * 110; }
      ai.turbo = Math.hypot(tx - s.x, ty - s.y) > 120 && s.turbo > .5;
      // arm a one-timer when a pass is coming in the slot
      if (pk.passTo === s && Math.abs(gxA - s.x) < 170 && RNG.sim() < .45 + skill * .4) { it.held.shoot = true; ai.shootT = .4; ai.shootHold = .4; }
    } else if (role === 'point') {
      const carrier = owner && owner.team === t ? owner : null;
      tx = Rink.C.x + dir * 125; ty = C.y + ((carrier ? carrier.y : pk.y) < C.y ? 1 : -1) * 50;
      if (carrier && (carrier.x - Rink.C.x) * dir < 0) tx = carrier.x - dir * 60;
      if (pk.rebound && m.t - pk.rebound < 1 && Math.abs(gxA - pk.x) < 120 && m.cfg.aggressive) { tx = pk.x; ty = pk.y; }
    } else if (role === 'pressure' && owner) {
      const lead = .3 * (1 - skill * .4); tx = owner.x + owner.vx * lead; ty = owner.y + owner.vy * lead;
      // stay goal-side: approach from between the carrier and our net
      tx += Math.sign(gxD - owner.x) * 6;
      const d = U.dist(s, owner); ai.turbo = d > 60 && s.turbo > .4;
      if (d < 30 && s.checkCD <= 0 && s.cool <= 0) {
        const hitter = s.def.r[3] >= 3 && RNG.sim() < T.aiAggression * (m.teams[t].tactic === 'grit' ? 1.3 : m.teams[t].tactic === 'finesse' ? .7 : 1) * (.6 + skill * .6);
        if (hitter && d < 26) it.press.shoot = true; else if (d < 22 && RNG.sim() < .5 + skill * .3) it.press.deke = true;
      }
    } else if (role === 'cover') {
      const o = markOf(m, s); ai.mark = o ? o.id : null;
      if (o) { tx = lerp(o.x, gxD, .22); ty = lerp(o.y, C.y, .22); ai.face = U.angTo(s, pk); }
      else { tx = gxD - dir * -90; ty = C.y; }
      if (owner && U.dist(s, owner) < 24 && s.checkCD <= 0 && RNG.sim() < .4) it.press.shoot = true;
    } else if (role === 'home') {
      tx = gxD + dir * 70; ty = lerp(C.y, owner ? owner.y : pk.y, .3); ai.face = U.angTo(s, owner || pk);
      if (owner && owner.team !== t && U.dist(s, owner) < 20 && s.cool <= 0) it.press.deke = true;
    } else if (role === 'chase' || role === 'receive') {
      const lead = role === 'receive' ? .15 : .3; tx = pk.x + pk.vx * lead; ty = pk.y + pk.vy * lead; ai.turbo = role === 'chase' && U.dist(s, pk) > 50 && s.turbo > .3;
    }
    // detours: items, the bear, Big Lou's grudges
    if ((role === 'point' || role === 'home' || role === 'cover') && m.items.length && T.aiItemGreed > 0) { const it2 = m.items.find(i => !i.air && !['octopus', 'rat', 'hat'].includes(i.kind) && Math.hypot(i.x - s.x, i.y - s.y) < T.aiItemGreed); if (it2) { tx = it2.x; ty = it2.y; } }
    if (m.teams[t].huntBear && role !== 'carrier') { const p = m.extras.find(e => e.kind === 'pete' && e.down <= 0); if (p && U.dist(p, s) < 140 && RNG.sim() < .5) { tx = p.x; ty = p.y; if (U.dist(p, s) < 30 && s.checkCD <= 0) it.press.shoot = true; } }
    if (s.bubbleT <= 0 && s.chirpCD <= 0 && m.lastBigHitBy === s.id && RNG.sim() < .3) { it.press.chirp = true; m.lastBigHitBy = null; }
    const w = Rink.wall(tx, ty); if (w.d < 14 && role !== 'chase' && role !== 'pressure') { tx += w.nx * (14 - w.d); ty += w.ny * (14 - w.d); }
    ai.tx = tx; ai.ty = ty;
    if (role === 'cover' || role === 'home') ai.back = ai.face !== null && Math.abs(U.angDiff(ai.face, Math.atan2(ty - s.y, tx - s.x))) > 2;
  }
  /** each step for a CPU skater: re-think on its cadence, then steer */
  function step(m, s, dt) {
    const ai = s.ai, it = s.intent, skill = m.aiSkill(s.team);
    clearPress(it);
    if (s.callFor) { s.callFor.t -= dt; if (s.callFor.t <= 0) s.callFor = null; }
    ai.thinkT -= dt;
    if (ai.thinkT <= 0 && (m.phase === 'play' || m.phase === 'shootout')) { ai.thinkT = lerp(.3, .12, skill) * (.8 + RNG.sim() * .4); think(m, s); }
    // held shot: hold, then let go
    if (ai.shootT > 0) { ai.shootT -= dt; it.held.shoot = ai.shootT > 0; } else it.held.shoot = false;
    if (s.state === 'wind' && m.puck.owner !== s) ai.shootT = 0;
    // steer: to the target, apart from teammates
    let dx = (ai.tx === undefined ? s.x : ai.tx) - s.x, dy = (ai.ty === undefined ? s.y : ai.ty) - s.y;
    for (const o of m.teams[s.team].skaters) if (o !== s && o.state !== 'bin') { const ox = s.x - o.x, oy = s.y - o.y, d = Math.hypot(ox, oy); if (d < 40 && d > 0) { dx += ox / d * (40 - d) * 1.2; dy += oy / d * (40 - d) * 1.2; } }
    const d = Math.hypot(dx, dy), k = d > 8 ? 1 : d / 8;
    it.mx = d > 1 ? dx / d * k : 0; it.my = d > 1 ? dy / d * k : 0;
    it.held.turbo = !!ai.turbo; it.face = ai.back ? ai.face : null; it.back = !!ai.back;
    if (m.cheats.freezeAI && s.ctrl.kind === 'cpu') { it.mx = it.my = 0; clearPress(it); it.held.shoot = false; }
  }
  /** the shootout's CPU shooter: skate in, deke or shoot */
  function shooter(m, s, dt) {
    const it = s.intent, ai = s.ai, gx = Rink.goalX(m.attackNet(s.team)), dir = m.attackDir(s.team), dg = Math.abs(gx - s.x), g = m.goalieAt(m.attackNet(s.team));
    clearPress(it);
    if (!ai.plan) ai.plan = { at: 60 + RNG.sim() * 70, deke: RNG.sim() < .45, side: RNG.sim() < .5 ? 1 : -1 };
    if (ai.plan.deke && !ai.plan.dk) { ai.plan.dk = true; ai.plan.at = 38 + RNG.sim() * 20; }
    it.mx = dir; it.my = (Rink.C.y + ai.plan.side * 20 - s.y) / 80; it.held.turbo = dg > 200;
    if (ai.shootT > 0) { ai.shootT -= dt; it.held.shoot = ai.shootT > 0; return; }
    if (m.puck.owner === s && dg < ai.plan.at + (ai.plan.deke ? 34 : 0)) {
      if (ai.plan.deke && !ai.deked) { ai.deked = true; it.press.deke = true; it.my = -ai.plan.side; return; }
      if (!ai.deked || s.state !== 'deke') { it.press.shoot = true; ai.shootT = dg > 110 ? .5 : .04; it.held.shoot = true; }
    }
  }
  return { blankIntent, clearPress, roles, think, step, shooter, laneClear };
})();
