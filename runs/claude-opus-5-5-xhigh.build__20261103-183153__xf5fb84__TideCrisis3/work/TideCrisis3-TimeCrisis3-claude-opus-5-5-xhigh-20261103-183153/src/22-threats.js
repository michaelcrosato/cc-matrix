/* 22-threats: the ThreatDirector, our crisis flash. A shot becomes a THREAT (a hit if the player is still exposed when
 * it lands) only if the chance roll passes, the player has fewer active threats than the cap, and no two impacts on one
 * player land closer than minGap; otherwise it is a miss (spectacle). Some attacks are always threats (Red Tide,
 * snipers, rockets, slashes, torpedoes, bosses): they wait for a free slot instead. Pop-out protection slides an impact
 * that is about to land when the player leaves cover. Resolution happens at impact time. Reads tune.enemy. */
function maxThreats(sim) {
  if (tune.enemy.maxThreats > 0) return tune.enemy.maxThreats;
  const base = sim.stage && sim.stage.maxThreats || (sim.stageNum <= 1 ? 1 : 2);
  return Math.max(1, base + sim.diff.maxThreats);
}
TC.maxThreats = maxThreats;
/** choose the player an enemy aims at: alive, present, fewest threats, then the nearest seat */
function pickTarget(sim, from) {
  let best = -1, bs = 1e9;
  for (const p of sim.players) {
    if (p.out || !p.present) continue;
    const n = sim.threats.filter(t => t.target === p.id && !t.done).length, cam = sim.cameraFor(p.id), d = from ? Math.hypot(cam.x - from[0], cam.y - from[1]) : 0;
    const s = n * 1000 + d * .1 + sim.rng('target') * 60;
    if (s < bs) { bs = s; best = p.id; }
  }
  return best;
}
TC.pickTarget = pickTarget;
/**
 * ask for a threat on player `target`: o = { chance, tele (s), always, kind, src (an enemy or object id), pos () => muzzle
 * point, part } -> the threat, or null (a miss). The impact time T respects minGap against every active threat on
 * that player
 */
function requestThreat(sim, target, o) {
  const p = sim.players[target]; if (!p || p.out) return null;
  const active = sim.threats.filter(t => t.target === target && !t.done), cap = maxThreats(sim);
  if (!o.always) {
    const chance = (o.chance || 0) * tune.enemy.threatMul * sim.diff.threat;
    if (sim.rng('threat') >= chance) return null;
    if (active.length >= cap) return null;
  } else if (active.length >= cap + 1) return null;
  const gap = tune.enemy.minGap, tele = (o.tele || 1) * tune.enemy.teleMul;
  let T = sim.t + tele;
  const times = active.map(t => t.T).concat(p.lastImpact !== undefined ? [p.lastImpact] : []).sort((a, b) => a - b);
  for (let k = 0; k < 6; k++) { let moved = false; for (const u of times) if (Math.abs(T - u) < gap) { T = u + gap; moved = true; } if (!moved) break; }
  const th = { id: sim.nid(), target, t0: sim.t, T, dur: T - sim.t, kind: o.kind || 'shot', src: o.src || 0, pos: o.pos || null, done: false, slid: false, part: o.part || null, onResolve: o.onResolve || null, unblockable: !!o.unblockable, at: o.at || null };
  sim.threats.push(th);
  sim.ev({ type: 'threat', th: th.id, p: target, kind: th.kind, src: th.src, dur: th.dur });
  return th;
}
TC.requestThreat = requestThreat;
/** each step: resolve threats that land, drop threats whose source died first */
function threatsStep(sim) {
  for (const th of sim.threats) {
    if (th.done) continue;
    if (th.src && th.srcAlive && !th.srcAlive()) { th.done = true; th.cancelled = true; sim.ev({ type: 'threatoff', th: th.id }); continue; }
    const p = sim.players[th.target];
    // a remote player's impact resolves .2 s late, by the host, against the cover it reported for the impact's time
    if (sim.t < th.T + (p && p.remote ? .2 : 0)) continue;
    th.done = true;
    if (!p || p.out || !p.present) continue;
    p.lastImpact = sim.t;
    let exposed = p.c < .5 || th.unblockable;
    if (p.remote && !th.unblockable) { const f = sim.forced && sim.forced[th.id]; if (f !== undefined) exposed = f === 1; else if (sim.resolver) { const r = sim.resolver(th, p); if (r) exposed = r === 'hit'; } }
    if (exposed && p.inv <= 0 && !sim.cheat(p, 'god')) { hurtPlayer(sim, p, th.kind); th.result = 'hit'; }
    else if (exposed) { th.result = 'immune'; sim.ev({ type: 'graze', p: p.id }); }
    else { th.result = 'blocked'; p.stats.saves++; sim.ev({ type: 'blocked', p: p.id, kind: th.kind, at: th.at }); }
    if (p.remote && sim.onResolved) sim.onResolved(th, exposed ? 'hit' : 'blocked');
    if (th.onResolve) th.onResolve(th.result);
  }
  if (sim.threats.length > 40) sim.threats = sim.threats.filter(t => !t.done || sim.t - t.T < 1);
}
TC.threatsStep = threatsStep;
/** pop-out protection: leaving cover with less than .15 s of a telegraph left slides that impact .15 s later */
function threatsPopOut(sim, p) {
  for (const th of sim.threats) if (!th.done && th.target === p.id && !th.slid && th.T - sim.t < .15) { th.T = sim.t + .15; th.slid = true; }
}
TC.threatsPopOut = threatsPopOut;
