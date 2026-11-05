/* ---- HITS (7.7): bodies push apart; a check that meets a rival lands an impulse by closing speed, mass, the Hit rating,
 * turbo, KABOOM and Poutine: a bump, a check, or a BIG HIT that knocks them down into a belly slide; bodies into the boards
 * crack and shatter the glass; the referee and the mascot fall over too ---- */
const Hits = (() => {
  const mass = s => s.def.build === 'bulky' ? 1.35 : 1;
  function contacts(m, dt) {
    const all = m.skaters.filter(s => s.state !== 'bin' && s.state !== 'frozen' && !s.offIce);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j]; if (a.state === 'fight' || b.state === 'fight') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = 14; if (d >= R + (a.state === 'check' || b.state === 'check' ? 4 : 0) || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d;
      // a check lands
      for (const [att, tgt, sgn] of [[a, b, 1], [b, a, -1]]) {
        if (att.state !== 'check' || att.team === tgt.team || att.hitDone[tgt.id]) continue;
        att.hitDone[tgt.id] = true; land(m, att, tgt, nx * sgn, ny * sgn);
      }
      if (d >= R) continue;
      // push apart (restitution .3)
      const ma = mass(a), mb = mass(b), pen = R - d, ka = mb / (ma + mb), kb = ma / (ma + mb);
      a.x -= nx * pen * ka; a.y -= ny * pen * ka; b.x += nx * pen * kb; b.y += ny * pen * kb;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { const jn = -(1.3) * rv / (1 / ma + 1 / mb); a.vx -= jn / ma * nx; a.vy -= jn / ma * ny; b.vx += jn / mb * nx; b.vy += jn / mb * ny;
        if (-rv > T.accidentalHit && a.team !== b.team && Skater.free(a) && Skater.free(b)) { const v = mass(a) * Math.hypot(a.vx, a.vy) > mass(b) * Math.hypot(b.vx, b.vy) ? b : a; knock(m, v, Math.atan2(v.y - (v === a ? b : a).y, v.x - (v === a ? b : a).x), -rv * .6, null); } }
    }
    // the referee and the mascot are bodies too
    for (const o of m.extras) {
      if (!o.body || o.down > 0) continue;
      for (const s of m.skaters) {
        const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy); if (d >= 16 || d < 1e-6) continue;
        const sp = Math.hypot(s.vx, s.vy);
        if ((s.state === 'check' && !s.hitDone[o.id]) || sp > 170) { if (s.hitDone) s.hitDone[o.id] = true; o.down = 3; o.vx = dx / d * sp * .8; o.vy = dy / d * sp * .8; Bus.emit(o.kind === 'pete' ? 'mascot_down' : 'ref_down', { by: s.id, team: s.team, x: o.x, y: o.y }); continue; }
        s.x -= dx / d * (16 - d) * .6; s.y -= dy / d * (16 - d) * .6; o.x += dx / d * (16 - d) * .4; o.y += dy / d * (16 - d) * .4;
      }
    }
  }
  /** a check meeting its target: the impulse and what it does */
  function land(m, att, tgt, nx, ny) {
    if (tgt.state === 'deke' && tgt.stateT > .15 && RNG.sim() < .7 + .04 * (tgt.def.r[5] - 3)) { Bus.emit('deke_dodge', { by: tgt.id, att: att.id }); return; }
    const closing = Math.max(0, (att.vx - tgt.vx) * nx + (att.vy - tgt.vy) * ny);
    let imp = T.checkPower * (closing + 60) * (mass(att) / mass(tgt)) * RATE.hit(att.def) * (att.turboOn ? 1.45 : 1) * (m.kaboom[att.team] > 0 ? 2 : 1) * (att.items.poutine > 0 ? 1.6 : 1);
    if (att.items.poutine > 0) imp = Math.max(imp, T.knockdown + 1);
    if (tgt.twistT > 0) { imp = Math.max(imp, T.knockdown + 20); Boom.add(m, att.team, 10); }
    const carrier = m.puck.owner === tgt, ang = Math.atan2(ny, nx);
    att.stats.hits++; m.teams[att.team].hits++;
    if (imp < 90) {
      Skater.setState(tgt, 'stun', .25); tgt.vx += nx * imp * .6; tgt.vy += ny * imp * .6;
      if (carrier && (tgt.items.tape > 0 ? false : RNG.sim() < .5)) { Puck.loose(m, m.puck); m.puck.vx = tgt.vx + nx * 60; m.puck.vy = tgt.vy + ny * 60; }
      Grudge.add(m, tgt, att, 5);
      Bus.emit('hit', { by: att.id, victim: tgt.id, power: Math.round(imp), big: false, kind: 'bump', x: tgt.x, y: tgt.y, team: att.team });
    } else if (imp < T.knockdown || tgt.items.poutine > 0 || (m.cheats.god && tgt.ctrl.kind === 'human')) {
      Skater.setState(tgt, 'stun', .5); tgt.vx += nx * imp * .8; tgt.vy += ny * imp * .8;
      if (carrier && !(tgt.items.tape > 0)) { Puck.loose(m, m.puck); m.puck.vx = tgt.vx + nx * 80; m.puck.vy = tgt.vy + ny * 80; }
      Grudge.add(m, tgt, att, 10);
      Bus.emit('hit', { by: att.id, victim: tgt.id, power: Math.round(imp), big: false, kind: 'check', x: tgt.x, y: tgt.y, team: att.team });
    } else {
      att.stats.bigHits++;
      knock(m, tgt, ang, imp, att);
      Grudge.add(m, tgt, att, 35);
      for (const mate of m.teams[tgt.team].skaters) if (mate !== tgt) Grudge.add(m, mate, att, 10);
      Bus.emit('hit', { by: att.id, victim: tgt.id, power: Math.round(imp), big: true, kind: 'big', x: tgt.x, y: tgt.y, team: att.team, kaboom: m.kaboom[att.team] > 0 });
      m.hitstop = .07;
      Items.thinIceHit(m, tgt, true);
    }
  }
  /** knocked down: a tumble, then a belly slide along the hit, then up */
  function knock(m, s, ang, power, by) {
    if (s.state === 'bin' || s.state === 'fight') return;
    if (m.cheats.god && s.ctrl.kind === 'human') { Skater.setState(s, 'stun', .4); return; }
    if (m.puck.owner === s) { Puck.loose(m, m.puck); m.puck.vx = Math.cos(ang) * 120; m.puck.vy = Math.sin(ang) * 120; }
    Skater.setState(s, 'down', 1.4); s.vx = Math.cos(ang) * power * .8; s.vy = Math.sin(ang) * power * .8; s.slideHit = true; s.downBy = by ? by.id : -1;
    Rink.addScuff(s.x, s.y, .2, 1);
    Bus.emit('knockdown', { victim: s.id, by: by ? by.id : -1, x: s.x, y: s.y });
    Items.thinIceHit(m, s, false);
  }
  /** a skater against the boards: the rattle, the glass breaking, snowbanks burying */
  function boards(m, s) {
    const hit = Rink.clampBody(s, 7, s.state === 'down' ? .25 : .3, .85); if (!hit) return;
    const n = Rink.clampBody.n;
    if (hit > 120) Bus.emit('rattle', { x: s.x, y: s.y, speed: Math.round(hit), by: s.id });
    if (m.arena.snowbanks) { if ((s.state === 'down' || s.slideHit) && hit > 140) { Skater.setState(s, 'buried', 1.5); Bus.emit('buried', { victim: s.id, x: s.x, y: s.y }); } s.slideHit = false; return; }
    if ((s.state === 'down' || s.state === 'stun' || s.slideHit) && hit > T.glassCrack) {
      const p = Rink.panelAt(s.x - n.nx * 8, s.y - n.ny * 8); if (p) glass(m, p, hit, s);
    }
    s.slideHit = false;
  }
  function glass(m, p, speed, by) {
    if (!p || p.state === 'shattered' || m.arena.snowbanks) return;
    const was = p.state;
    if (was === 'cracked' || speed > T.glassShatter) { p.state = 'shattered'; p.fixT = 0; Bus.emit('glass', { panel: p.i, state: 'shattered', x: p.mx, y: p.my, by: by ? by.id : -1, team: by ? 1 - by.team : -1 }); }
    else { p.state = 'cracked'; Bus.emit('glass', { panel: p.i, state: 'cracked', x: p.mx, y: p.my, by: by ? by.id : -1, team: by ? 1 - by.team : -1 }); }
    p.shake = .6;
  }
  return { contacts, land, knock, boards, glass, mass };
})();

/* ---- BOOM and KABOOM (7.10): a meter per team; at 100 the team goes KABOOM for 15 s or until the other team scores ---- */
const Boom = (() => {
  const GAIN = { bigHit: 12, check: 3, crack: 6, shatter: 12, fightWin: 45, fightLoss: 5, goal: 15, shotOnGoal: 2, save: 2, pass: 1, onetimer: 6, dekeBeat: 6, chirp: 3, boombox: 40, mascot: 10, flood: 30, organ: 30, turtleWin: 10, turtleLose: -10, draw: 10 };
  function add(m, team, n) {
    if (team < 0 || team > 1 || m.kaboom[team] > 0 || !m.rules.boom) return;
    const k = n > 0 ? T.boomGain * (m.teams[team].tactic === 'grit' ? 1.15 : 1) : 1;
    m.boom[team] = clamp(m.boom[team] + n * k, 0, 100);
    if (m.boom[team] >= 100) start(m, team);
  }
  function start(m, team) {
    if (m.kaboom[team] > 0) return;
    m.boom[team] = 0; m.kaboom[team] = T.kaboomTime; m.teams[team].kabooms++;
    Bus.emit('kaboom_start', { team, gilded: m.teams[team].id === 'grizzlies' });
  }
  function end(m, team, why) { if (m.kaboom[team] <= 0) return; m.kaboom[team] = 0; Bus.emit('kaboom_end', { team, why }); }
  function step(m, dt) {
    for (const t of [0, 1]) {
      if (m.kaboom[t] > 0) { m.kaboom[t] -= dt; if (m.kaboom[t] <= 0) { m.kaboom[t] = .001; end(m, t, 'time'); } }
      if (m.cheats.alwaysKaboom && m.teams[t].human && m.kaboom[t] <= 0 && m.phase === 'play') start(m, t);
    }
  }
  /** the gains, from the rules' events */
  function wire() {
    const G = (e) => Match.m;
    Bus.sim('hit', e => { const m = G(); if (!m) return; add(m, e.team, e.big ? GAIN.bigHit : e.kind === 'check' ? GAIN.check : 0); });
    Bus.sim('glass', e => { const m = G(); if (m && e.team >= 0) add(m, 1 - e.team, e.state === 'shattered' ? GAIN.shatter : GAIN.crack); });
    Bus.sim('goal', e => { const m = G(); if (!m) return; add(m, e.team, GAIN.goal); end(m, 1 - e.team, 'scored'); });
    Bus.sim('shot', e => { const m = G(); if (m && e.onGoal) add(m, e.team, GAIN.shotOnGoal); });
    Bus.sim('save', e => { const m = G(); if (m) add(m, e.team, GAIN.save); });
    Bus.sim('pass_complete', e => { const m = G(); if (m) add(m, e.team, GAIN.pass); });
    Bus.sim('onetimer', e => { const m = G(); if (m) add(m, e.team, GAIN.onetimer); });
    Bus.sim('deke_beat', e => { const m = G(); if (m) add(m, e.team, GAIN.dekeBeat); });
    Bus.sim('chirp', e => { const m = G(); if (m) add(m, m.byId(e.by).team, GAIN.chirp); });
    Bus.sim('mascot_down', e => { const m = G(); if (m) add(m, e.team, GAIN.mascot); });
    Bus.sim('fight_end', e => { const m = G(); if (!m) return; if (e.draw) { add(m, 0, GAIN.draw); add(m, 1, GAIN.draw); } else { add(m, m.byId(e.winner).team, GAIN.fightWin); add(m, m.byId(e.loser).team, GAIN.fightLoss); } });
    Bus.sim('turtle', e => { const m = G(); if (!m) return; const s = m.byId(e.by); add(m, s.team, GAIN.turtleLose); add(m, 1 - s.team, GAIN.turtleWin); });
  }
  return { add, start, end, step, wire, GAIN };
})();

/* ---- ITEMS and HAZARDS (7.12): fans throw goodies (and octopi) over the glass; arena hazards: thin ice, the rubber rat,
 * hats after a hat trick, Polar Pete, the Discount Drop ---- */
const Items = (() => {
  function make(kind, x, y) { return { kind, x, y, z: 0, vx: 0, vy: 0, vz: 0, t: 12, id: Math.floor(RNG.sim() * 1e9) }; }
  /** a fan's throw: a lob from the stands onto the neutral or attacking zone */
  function toss(m, kind, from) {
    const fx = from ? from[0] : Rink.C.x + (RNG.sim() - .5) * 600, fy = from ? from[1] : Rink.Y0 - 30;
    const tx = Rink.C.x + (RNG.sim() - .5) * 500, ty = Rink.C.y + (RNG.sim() - .5) * 260;
    const it = make(kind, fx, fy); if (kind === 'octopus') it.t = 999; it.z = 40; const t = .9; it.vx = (tx - fx) / t; it.vy = (ty - fy) / t; it.vz = (0 - 40 + 350 * t * t) / t; it.air = true;
    m.items.push(it); Bus.emit('item_throw', { kind, x: tx, y: ty });
    return it;
  }
  function pickKind(m) { const pool = m.arena.items; return pool[Math.floor(RNG.sim() * pool.length)]; }
  function step(m, dt) {
    if (!m.rules.items) return;
    // throws: every itemEvery seconds of play on average
    if (m.phase === 'play') {
      m.itemT -= dt;
      if (m.itemT <= 0) { m.itemT = T.itemEvery * (.7 + RNG.sim() * .6); toss(m, pickKind(m)); }
      if (m.cheats.octoRain && RNG.sim() < dt * .35) toss(m, 'octopus');
      if (m.arena.hazards.includes('drop')) { m.dropT -= dt; if (m.dropT <= 0) { m.dropT = 40; m.extras.push({ kind: 'crate', x: Rink.C.x, y: Rink.C.y, z: 120, vz: 0, body: false, t: 0 }); Bus.emit('drop_start', {}); } }
      if (m.arena.hazards.includes('rat') && !m.items.some(i => i.kind === 'rat') && RNG.sim() < dt / 50) { const r = toss(m, 'rat'); r.t = 10; }
    }
    for (const it of m.items) {
      if (it.air) { it.vz -= 700 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt; if (it.z <= 0) { it.z = 0; it.air = false; it.vx *= .4; it.vy *= .4; Bus.emit('item_land', { kind: it.kind, x: it.x, y: it.y }); } continue; }
      it.x += it.vx * dt; it.y += it.vy * dt; it.vx *= Math.exp(-3 * dt); it.vy *= Math.exp(-3 * dt);
      if (it.kind === 'rat') { it.rt = (it.rt || 0) - dt; if (it.rt <= 0) { it.rt = .4 + RNG.sim() * .6; const a = RNG.sim() * TAU; it.vx = Math.cos(a) * 90; it.vy = Math.sin(a) * 90; } }
      Rink.clampBody(it, 4, .5, .9);
      if (m.phase === 'play') it.t -= dt;
      // pickups and slips
      for (const s of m.skaters) {
        if (!Skater.free(s) || s.state === 'bin') continue;
        const d = Math.hypot(s.x - it.x, s.y - it.y);
        if (it.kind === 'octopus' || it.kind === 'rat') { if (d < (it.kind === 'octopus' ? 10 : 8) && Math.hypot(s.vx, s.vy) > 40 && !(s.items.poutine > 0)) { Skater.setState(s, 'slip', 1.2); if (m.puck.owner === s) Puck.loose(m, m.puck); Bus.emit('hazard', { kind: it.kind, victim: s.id, x: s.x, y: s.y }); if (it.kind === 'rat') it.t = 0; } continue; }
        if (it.kind === 'hat') continue;
        if (d < 12) { apply(m, s, it.kind); it.t = 0; break; }
      }
    }
    m.items = m.items.filter(i => i.t > 0 || (i.kind === 'octopus' && m.phase === 'play' && i.t > -999 && false));
    // the Discount Drop's crate: lowered from the ceiling, it breaks into a power-up
    for (const c of m.extras) if (c.kind === 'crate' && !c.done) { c.t += dt; c.z = Math.max(0, 120 - c.t * 40); if (c.z <= 0) { c.done = true; c.gone = 1; Bus.emit('crate', { x: c.x, y: c.y }); const it = make(['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox'][Math.floor(RNG.sim() * 6)], c.x, c.y); it.vx = (RNG.sim() - .5) * 120; it.vy = (RNG.sim() - .5) * 120; m.items.push(it); } }
    m.extras = m.extras.filter(c => !(c.kind === 'crate' && c.done && (c.gone -= dt) <= 0));
    thinIce(m, dt);
  }
  function apply(m, s, kind) {
    const D = ITEM_DEFS[kind]; if (!D) return;
    if (kind === 'boombox') Boom.add(m, s.team, 40);
    else if (kind === 'lumber') s.items.lumber = 3;
    else if (kind === 'bricks') { const g = m.teams[s.team].goalie; if (g) g.bricks = D.t; }
    else if (kind === 'cocoa') { s.items.cocoa = D.t; s.turbo = 1; }
    else s.items[kind] = D.t;
    s.stats.items = (s.stats.items || 0) + 1;
    Bus.emit('item', { by: s.id, kind, team: s.team });
  }
  /* ---- thin ice at the pond: 3 patches; knockdowns crack them, a big hit breaks them into a hole ---- */
  function setupIce(m) {
    m.ice = m.arena.hazards.includes('thinice') ? [[Rink.C.x - 190, Rink.C.y - 80], [Rink.C.x + 170, Rink.C.y + 90], [Rink.C.x + 10, Rink.C.y - 130]].map(([x, y], i) => ({ i, x, y, rx: 40, ry: 24, hp: 100, hole: 0 })) : [];
  }
  const onPatch = (m, x, y) => m.ice.find(p => ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 <= 1);
  function thinIceHit(m, s, big) {
    if (!m.ice || !m.ice.length) return;
    const p = onPatch(m, s.x, s.y); if (!p || p.hole > 0) return;
    p.hp -= big ? 100 : 50;
    if (p.hp <= 0) { p.hole = 30; p.hp = 0; Bus.emit('thin_ice_break', { patch: p.i, x: p.x, y: p.y, by: s.downBy, victim: s.id, victimTeam: s.team }); }
    else Bus.emit('ice_crack', { patch: p.i, x: p.x, y: p.y });
  }
  function thinIce(m, dt) {
    for (const p of m.ice || []) {
      if (p.hole > 0) {
        p.hole -= dt; if (p.hole <= 0) { p.hp = 60; Bus.emit('refreeze', { patch: p.i }); }
        const holeIn = (x, y) => ((x - p.x) / (p.rx * .7)) ** 2 + ((y - p.y) / (p.ry * .7)) ** 2 <= 1;
        for (const s of m.skaters) if (holeIn(s.x, s.y) && s.state !== 'frozen' && s.state !== 'bin' && s.state !== 'fight') { Skater.setState(s, 'frozen', 3); s.vx = s.vy = 0; if (m.puck.owner === s) { Puck.loose(m, m.puck); } Bus.emit('plunge', { victim: s.id, x: s.x, y: s.y }); const a = U.angTo(p, s); s.x = p.x + Math.cos(a) * p.rx * .3; s.y = p.y + Math.sin(a) * p.ry * .3; s.popTo = [p.x + Math.cos(a) * (p.rx + 10), p.y + Math.sin(a) * (p.ry + 10)]; }
        const pk = m.puck; if (!pk.owner && pk.inNet < 0 && !pk.out && pk.z < 1 && holeIn(pk.x, pk.y) && m.phase === 'play') { pk.out = true; Bus.emit('puck_lost', { x: pk.x, y: pk.y }); }
      }
    }
    for (const s of m.skaters) if (s.state === 'frozen' && s.stateT < .05 && s.popTo) { s.x = s.popTo[0]; s.y = s.popTo[1]; s.popTo = null; }
  }
  /** Polar Pete: figure eights in the neutral zone; checked, he goes down for 3 s, then waves */
  function setupExtras(m) {
    m.extras = [];
    if (m.arena.hazards.includes('pete') && m.rules.hazards) { const rig = Rigs.cast('pete'); m.extras.push({ kind: 'pete', id: 200, x: Rink.C.x, y: Rink.C.y - 60, vx: 0, vy: 0, t: 0, body: true, down: 0, rig, facing: 0 }); }
  }
  function extrasStep(m, dt) {
    for (const o of m.extras) {
      if (o.kind !== 'pete') continue;
      o.t += dt;
      if (o.down > 0) { o.down -= dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= Math.exp(-2 * dt); o.vy *= Math.exp(-2 * dt); if (o.down <= 0) { o.waveT = 2; Bus.emit('mascot_up', {}); } }
      else if (m.phase === 'play') { const a = o.t * .6, tx = Rink.C.x + Math.sin(a) * 90, ty = Rink.C.y + Math.sin(a * 2) * 60; o.vx = (tx - o.x) * 2; o.vy = (ty - o.y) * 2; o.x += o.vx * dt; o.y += o.vy * dt; if (Math.hypot(o.vx, o.vy) > 5) o.facing = Math.atan2(o.vy, o.vx); }
      o.waveT = Math.max(0, (o.waveT || 0) - dt);
      Rink.clampBody(o, 8);
      const hk = o.rig.hk; hk.ph = (hk.ph || 0) + dt * Math.hypot(o.vx, o.vy) / 22; hk.push = clamp(Math.hypot(o.vx, o.vy) / 80, 0, 1);
      o.rig.update(dt, { x: o.x, y: o.y, z: 0, vx: 0, vy: 0, facing: o.facing, down: o.down > 0 ? Math.min(1, (3 - o.down) * 3) : 0, pose: o.waveT > 0 ? 'wave' : m.phase !== 'play' ? 'cheer' : null });
    }
  }
  function wire() {
    Bus.sim('goal', e => { const m = Match.m; if (!m || !m.rules.items || e.so || m.cfg.mode === 'drill') return; if (m.arena.hazards.includes('octopus') && RNG.sim() < (m.arena.id === 'grindhouse' ? .6 : .25)) Items.toss(m, 'octopus'); else if (RNG.sim() < .25) Items.toss(m, pickKind(m)); });
    Bus.sim('hit', e => { const m = Match.m; if (m && e.big && m.rules.items && m.cfg.mode !== 'drill' && RNG.sim() < .25) Items.toss(m, pickKind(m)); });
  }
  return { toss, step, apply, setupIce, thinIceHit, setupExtras, extrasStep, onPatch, make, wire };
})();
