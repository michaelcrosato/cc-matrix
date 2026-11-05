/* 17-euphoria: Europhoria (the crowd's burst), Super Strikes along their paths (registry 'super'), the Save Duel
 * (a timing ring in real time: PERFECT within 60 ms, GOOD within 140 ms, else MISS) and the CPU keeper's chance. */
Match.prototype.triggerEurophoria = function (s) {
  const m = this;
  if (m.euph[s] < 100 || m.euroT[s] > 0 || m.cheats.pure || m.o.pure) return false;
  m.euroT[s] = EF.T.europhoriaTime; m.superUsed[s] = false; m.euph[s] = 100;
  m.emit('europhoria', { side: s });
  return true;
};
const SUPER_PATHS = {
  // each: (u 0..1, base {x, y, z}, ctx) -> {x, y, z} offsets applied across the straight path (nx, ny: its normal)
  wobble: (u, c) => ({ lat: Math.sin(u * PI * 7) * 18 * Math.sin(u * PI), up: Math.sin(u * PI) * 20 }),
  zigzag: (u, c) => { const k = u * 4, tri = (k % 1 < .5 ? k % 1 : 1 - k % 1) * 2 - .5; return { lat: (Math.floor(k) % 2 ? -1 : 1) * tri * 52 * Math.sin(u * PI), up: 8 }; },
  hammer: (u, c) => ({ lat: 0, up: Math.abs(Math.sin(u * PI * 3)) * 26 * (1 - u * .4), hit: true }),
  meteor: (u, c) => ({ lat: 0, up: Math.sin(Math.min(1, u * 1.2) * PI) * 320, slow: u < .5 }),
  around: (u, c) => ({ lat: Math.sin(u * PI * 2) * 40 * (c.side || 1), up: 10 + Math.sin(u * PI) * 10 }),
  split: (u, c) => ({ lat: 0, up: 12 + Math.sin(u * PI) * 12, split: true }),
  rocket: (u, c) => ({ lat: 0, up: 10 + Math.sin(u * PI) * 6 })
};
EF.SUPER_PATHS = SUPER_PATHS;
function startSuper(m, f, it) {
  const s = f.side; m.superUsed[s] = true;
  const def = EF.get('super', f.data.captain && f.data.super ? f.data.super : 'rocket') || EF.get('super', 'rocket');
  const gx = m.goalX(s), aimY = it && it.aimY != null ? it.aimY : (m.rng() < .5 ? -.6 : .6);
  const to = { x: gx + m.dir(s) * 10, y: P.CY + aimY * (P.GH - 10), z: 14 };
  const ball = m.ball, from = { x: ball.x, y: ball.y, z: 2 };
  const d = hyp(to.x - from.x, to.y - from.y);
  m.superFlight = { f, def, side: s, phase: 'charge', t: 0, from, to, dur: Math.max(.45, d / EF.T.superSpeed) * (def.path === 'meteor' ? 1.8 : def.path === 'zigzag' || def.path === 'around' ? 1.3 : 1), outcome: null, hits: 0, lat: m.rng() < .5 ? -1 : 1 };
  m.owner = null; m.last = f; m.lastTouch = s; ball.vx = ball.vy = ball.vz = 0; ball.superPath = def.path; ball.superName = def.name; ball.kind = 'super';
  f.doAct('shotHard', .6); f.lift = 1;
  f.shots++; m.stats[s].shots++; m.stats[s].onTarget++;
  m.shot = null;
  m.emit('superStrike', { side: s, who: f.id, name: def.name, path: def.path, id: def.id });
  m.emit('slowmo', { k: .3, t: .5 });
}
Match.prototype.superStep = function (dt) {
  const m = this, S = m.superFlight; if (!S) return;
  const ball = m.ball, k = m.keeper[1 - S.side];
  S.t += S.phase === 'duel' ? 0 : dt;
  if (S.phase === 'charge') {
    ball.x = S.from.x; ball.y = S.from.y; ball.z = 2 + S.t * 30;
    if (S.t >= .3) { S.phase = 'flight'; S.t = 0; S.f.lift = 0; S.from.z = ball.z; m.emit('superRelease', { side: S.side, path: S.def.path }); this.superDecide(); }
    return;
  }
  if (S.phase === 'duel') { this.duelStep(); if (S.phase === 'duel') return; }
  const u = Math.min(1, S.t / S.dur), pth = SUPER_PATHS[S.def.path] || SUPER_PATHS.rocket, off = pth(u, { side: S.lat });
  const dx = S.to.x - S.from.x, dy = S.to.y - S.from.y, L = hyp(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  let bu = u; if (S.def.path === 'meteor') bu = u < .5 ? u * .15 : .075 + (u - .5) / .5 * .925;
  const px_ = lerp(S.from.x, S.to.x, bu) + nx * off.lat, py_ = lerp(S.from.y, S.to.y, bu) + ny * off.lat, pz = lerp(S.from.z, S.to.z, u) + off.up;
  ball.vx = (px_ - ball.x) / Math.max(dt, 1e-4); ball.vy = (py_ - ball.y) / Math.max(dt, 1e-4); ball.vz = (pz - ball.z) / Math.max(dt, 1e-4);
  ball.x = px_; ball.y = py_; ball.z = Math.max(0, pz); ball.roll += 30 * dt;
  if (off.hit && Math.abs(Math.sin(u * PI * 3)) < .08 && m.t - (S.lastHit || -9) > .12) { S.lastHit = m.t; S.hits++; m.emit('hammer', { x: ball.x, y: ball.y }); }
  ball.decoys = off.split ? [-1, 1].map(sd => ({ x: px_ + nx * 28 * sd * Math.sin(u * PI * .9 + .2), y: py_ + ny * 28 * sd * Math.sin(u * PI * .9 + .2), z: pz })) : null;
  // through bodies: they are knocked flying
  for (const p of m.players) if (p.side !== S.side && !p.gk && !p.sentOff && p.state === 'run' && hyp(p.body.x - ball.x, p.body.y - ball.y) < 7 && ball.z < 26) p.knock('launch', Math.atan2(dy, dx));
  // the bus: smashed
  if (m.bus && m.bus.on && ball.x > m.bus.x0 - 6 && ball.x < m.bus.x1 + 6 && Math.abs(ball.y - P.CY) < 34) { m.bus.on = false; m.emit('busSmash', { side: m.bus.side }); m.gain(S.side, 10, 'bus'); }
  if (S.phase === 'flight' && S.duelAt != null && u >= S.duelAt) { S.phase = 'duel'; S.duel.t = 0; m.duel = S.duel; m.emit('saveDuel', { side: 1 - S.side, slot: S.duel.slot }); return; }
  // the keeper goes for it
  if (k && u > .55 && k.state !== 'keeper-dive' && !S.dived) {
    S.dived = true; const need = S.to.y - k.body.y;
    k.dive = { t: 0, dur: .3, vy: (S.outcome === 'goal' ? need * .6 : need) / .3, side: sgn(need) || 1, high: 8, until: .6 }; k.setState('keeper-dive'); k.doAct('diveHigh', .6);
  }
  if (u >= .92 && S.outcome !== 'goal' && !S.resolved) {
    S.resolved = true; ball.superPath = null; ball.decoys = null; m.superFlight = null;
    if (S.outcome === 'perfect') { keeperCatch(k, 'super'); m.gain(k.side, 15, 'duel'); m.emit('save', { who: k.id, side: k.side, kind: 'super' }); }
    else { ball.vx = -m.dir(S.side) * 160; ball.vy = (m.rng() - .5) * 220; ball.vz = 120; ball.onGround = false; m.last = k; m.lastTouch = k.side; m.emit('save', { who: k.id, side: k.side, kind: 'superParry' }); m.emit('parry', { who: k.id }); }
    return;
  }
  if (u >= 1) {
    // into the net: the ball goes on along its last direction, the goal is found by the ball's own step
    ball.superPath = null; ball.decoys = null; m.superFlight = null;
    ball.vx = m.dir(S.side) * 220; ball.vy = 0; ball.vz = 0; ball.z = Math.min(ball.z, P.BAR - 8);
    if (k && S.outcome === 'goal' && S.duel) { k.body.x = lerp(k.body.x, ball.x, .7); }
    m.ballLoose(1 / 120, false);
  }
};
/** who saves it: a human keeper's side gets the Save Duel; else the CPU keeper's chance by difficulty */
Match.prototype.superDecide = function () {
  const m = this, S = m.superFlight, def = 1 - S.side;
  const inv = m.cheats['keeper' + def];
  const duelSlot = m.slots.filter(sl => sl.side === def && !sl.menu && sl.ctl).sort((a, b) => (a.f ? dist(a.f.body, m.keeper[def].body) : 999) - (b.f ? dist(b.f.body, m.keeper[def].body) : 999))[0];
  if (inv) { S.outcome = 'perfect'; return; }
  if (duelSlot && !m.o.attractDuel) { S.duelAt = .55; S.duel = { slot: duelSlot.i, t: 0, target: 1.0, pressed: null, result: null }; S.outcome = 'pending'; return; }
  if (m.o.attractDuel) { S.duelAt = .55; S.duel = { slot: -1, t: 0, target: 1.0, pressed: null, result: null, forced: 'miss' }; S.outcome = 'pending'; return; }
  const ch = m.diff.cpuSave * (m.keeper[def].data.boss ? 1.4 : 1);
  S.outcome = m.rng() < ch ? (m.rng() < .5 ? 'perfect' : 'good') : 'goal';
  m.emit('cpuSuperSave', { outcome: S.outcome });
};
Match.prototype.duelPress = function (at) {
  const d = this.duel; if (!d || d.pressed != null) return;
  d.pressed = at != null ? at : d.t;
};
Match.prototype.duelStep = function () {
  const m = this, S = m.superFlight, d = S.duel;
  d.t += m.realDt || 1 / 120;
  const sl = m.slots[d.slot];
  if (sl && d.pressed == null && sl.ctl && sl.ctl.duelPressed && sl.ctl.duelPressed(m, sl)) d.pressed = d.t;
  if (d.forced === 'miss' && d.t >= d.target + .2) d.pressed = d.target + .3;
  const late = d.t > d.target + .3;
  if (d.pressed == null && !late) return;
  const delta = d.pressed == null ? 9 : Math.abs(d.pressed - d.target);
  d.result = delta <= .06 ? 'perfect' : delta <= .14 ? 'good' : 'miss';
  S.outcome = d.result === 'miss' ? 'goal' : d.result;
  m.duel = null; S.phase = 'flight'; S.duelAt = null;
  m.emit('saveDuelResult', { result: d.result, delta, side: 1 - S.side });
};
EF.duelJudge = delta => delta <= .06 ? 'perfect' : delta <= .14 ? 'good' : 'miss';
