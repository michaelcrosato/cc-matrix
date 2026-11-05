/* ---- THE SHOOTOUT (plan 7.14): after a tied overtime, three shots each (home first), then sudden death. A shooter
 * starts at centre with the puck and an 8-second clock; the attempt ends on a shot, a save, a goal, or the puck going
 * back. A human shooter drives it with the stick and the shoot button; a CPU shooter winds up and fires. A human on the
 * defending side steers the goalie along the line (the stick). The goals decide it. ---- */
function shootoutStart() {
  M.inSO = true; M.phase = 'so'; M.soAtt = 0; M.soGoalsT = [0, 0]; M.soT = 0; M.soPhase = 'ready'; M.soReady = 1.0;
  M.banner = 'SHOOTOUT!'; M.bannerT = 2.5; fx('horn'); say('SHOOTOUT! THREE SHOTS EACH, THEN SUDDEN DEATH.');
  soSetup();
}
/** the next shooter: the home side first, then the away side; each side's first skater takes the shots */
function soSetup() {
  const t = M.soAtt % 2, sk = M.skaters.find(s => s.t === t && s.slot === 0) || M.skaters.find(s => s.t === t);
  const d = dirOf(t);
  M.soSk = sk; M.over = false;
  sk.x = CX - 50 * d; sk.y = CY; sk.vx = sk.vy = 0; sk.face = d > 0 ? 0 : PI; sk.state = 'skate'; sk.st = 0; sk.cool = 0; sk.charge = 0;
  sk.want = .75 + srand() * .25;
  for (const g of M.goalies) { g.x = GX[g.t] + dirOf(g.t) * 12; g.y = CY; g.vx = g.vy = 0; g.state = 'ready'; g.react = T.goalieReact; }
  const pk = M.puck; pk.owner = sk; pk.shot = null; pk.pass = null; pk.z = 0; pk.vx = pk.vy = pk.vz = 0; pk.x = sk.x + d * 10; pk.y = sk.y; pk.inNet = false;
  M.soPhase = 'ready'; M.soReady = 1.0; M.soT = 0;
  say(sk.name + ' IS UP. ' + (sk.human ? 'HOLD SHOOT AND LET GO.' : 'HERE COMES THE SHOT.'));
}
/** one step of an attempt: the wind-up of a CPU shooter, the human's stick, the puck's flight, the clock */
function soStep(dt) {
  const sk = M.soSk, pk = M.puck;
  for (const g of M.goalies) goalieStep(g, dt);
  if (M.soPhase === 'ready') {
    M.soReady -= dt;
    if (M.soReady <= 0) M.soPhase = 'shot';
    return;
  }
  M.soT += dt;
  if (M.soPhase === 'shot') {
    if (sk.human) skaterStep(sk, dt);
    else if (!pk.shot && M.soT > .6) { pk.owner = sk; sk.charge = Math.min(1, sk.charge + dt / T.chargeTime); if (sk.charge >= sk.want) { const ch = sk.charge; sk.charge = 0; shoot(sk, Math.max(.1, ch), { y: CY + (srand() - .5) * 24 }); } }
    if (pk.shot) M.soPhase = 'flight';
    if (M.soT > 8 && !pk.shot) return soNext();
    return;
  }
  // the flight: the puck's own step; the attempt ends when it stops, goes back, or the clock runs out
  puckStep(dt);
  const spd = Math.hypot(pk.vx, pk.vy);
  if (M.phase !== 'so') return;   // (a goal or a whistle moved the match on)
  if (sdRect(pk.x, pk.y) > 3) return soNext();   // (off the ice: the attempt is over)
  if (pk.owner || (spd < 6 && pk.z < 1 && M.soT > 1) || M.soT > 12) return soNext();
}
/** an attempt is over: the tally, the decision (after each side has had three, the goals decide; then sudden death) */
function soNext() {
  M.soAtt++;
  const rounds = Math.ceil(M.soAtt / 2);
  if (rounds >= 3 && M.soAtt % 2 === 0 && M.soGoalsT[0] !== M.soGoalsT[1]) return soFinish(M.soGoalsT[0] > M.soGoalsT[1] ? 0 : 1);
  if (M.soAtt >= 40) return soFinish(srand() < .5 ? 0 : 1);
  M.phase = 'so'; M.puck.shot = null;
  soSetup();
}
function soFinish(w) {
  M.inSO = false; M.soWinner = w; M.soScore = M.soGoalsT.slice();
  M.phase = 'over'; M.over = true; M.timer = 2; fx('horn');
  say('SHOOTOUT! ' + M.teams[w].def.name + ' WIN IT ' + M.soGoalsT[0] + ' - ' + M.soGoalsT[1] + '.');
}
/** the defending human's stick moves the goalie along the line in a shootout */
function soGoalieStep(g, dt) {
  const h = M.humans.find(x => x.sk.t === g.t && x.p);
  if (!h) return false;
  const mv = h.p.move();
  g.vy = mv[1] * T.goalieSpeed; g.y = clamp(g.y + g.vy * dt, CY - 30, CY + 30); g.x = GX[g.t] + dirOf(g.t) * 12; g.face = dirOf(g.t) > 0 ? 0 : PI;
  return true;
}
