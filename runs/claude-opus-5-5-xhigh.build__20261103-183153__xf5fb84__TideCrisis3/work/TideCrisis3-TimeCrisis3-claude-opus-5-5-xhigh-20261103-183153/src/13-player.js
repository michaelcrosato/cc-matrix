/* 13-player: PlayerState: the cover blend (exposed means c < .5), hold or toggle cover, reloading in cover, lives,
 * invulnerability after a hit, score, the chain multiplier, extra lives, stats, continues. Reads tune.player and the
 * Sim; emits 'hurt', 'reload', '1up', 'out' events. */
const AGENTS = ['kai', 'rook', 'mari', 'juno'];
function newPlayer(sim, o, i) {
  const lives = tune.player.startLives || sim.diff.lives;
  return {
    id: i, name: o.name || 'P' + (i + 1), color: o.color || SEAT_COLORS[i % 4], agent: o.agent || AGENTS[i % 4], aspect: o.aspect || 16 / 9,
    slot: i, c: 0, coverOn: false, coverT: 0, weapon: 'hg', mag: 9, ammo: { mg: 0, sg: 0, gl: 0 }, reloadT: 0, quickT: 0,
    cool: 0, switchT: 0, stripT: 0, bloom: 0, heldT: 0, recoil: 0, aim: [0, 0], lives, score: 0, chain: 0, best: 0, inv: 0,
    out: false, contT: 0, conts: 0, extra: 0, present: true, left: false, hurtT: 0,
    stats: { shots: 0, hits: 0, heads: 0, kills: 0, quick: 0, saves: 0, lost: 0, civ: 0, bestChain: 0, time: 0, reloads: 0 }
  };
}
TC.newPlayer = newPlayer;
const chainMul = p => Math.min(2, 1 + Math.floor(p.chain / 5) * .1);
TC.chainMul = chainMul;

/** cover, reload and the trigger's hold time for one step */
function playerStep(sim, p, cmd, dt) {
  p.aim[0] = cmd.aim[0]; p.aim[1] = cmd.aim[1];
  if (sim.cheat(p, 'ammo')) { p.ammo.mg = 240; p.ammo.sg = 36; p.ammo.gl = 6; p.mag = Math.max(p.mag, 1); (p.seen || (p.seen = {})).mg = p.seen.sg = p.seen.gl = true; }
  p.heldT = cmd.fireDown ? p.heldT + dt : 0;
  p.inv = Math.max(0, p.inv - dt); p.recoil = Math.max(0, p.recoil - dt * 6); p.hurtT = Math.max(0, p.hurtT - dt);
  if (TC.coverToggle && cmd.coverPressed) p.coverOn = !p.coverOn;
  if (cmd.reload && p.c < .5 && p.weapon === 'hg' && p.mag < 9) p.quickT = tune.player.reload + tune.player.coverIn + .05;
  p.quickT = Math.max(0, p.quickT - dt);
  const want = (TC.coverToggle ? p.coverOn : cmd.coverDown) || p.quickT > 0 || sim.forceCover;
  const was = p.c;
  p.c = want ? Math.min(1, p.c + dt / tune.player.coverIn) : Math.max(0, p.c - dt / tune.player.coverOut);
  if (was < .5 && p.c >= .5) sim.ev({ type: 'cover', p: p.id, on: true });
  if (was >= .5 && p.c < .5) { sim.ev({ type: 'cover', p: p.id, on: false }); sim.threatsPopOut(p); }
  // reloading: in cover the magazine refills after the reload time
  if (p.c >= .99) {
    if (p.mag < 9) { p.reloadT += dt; if (p.reloadT >= tune.player.reload) { p.mag = 9; p.reloadT = 0; p.stats.reloads++; sim.ev({ type: 'reload', p: p.id }); } }
    else p.reloadT = 0;
  } else p.reloadT = 0;
  if (p.switchBack !== undefined) { p.switchBack -= dt; if (p.switchBack <= 0) { delete p.switchBack; if (!hasAmmo(p, p.weapon)) { p.weapon = 'hg'; p.switchT = .2; sim.ev({ type: 'switch', p: p.id, w: 'hg' }); } } }
}
TC.playerStep = playerStep;

/** a hit on the player (a threat that landed): ignoreInv for time-up and civilian penalties */
function hurtPlayer(sim, p, why, ignoreInv) {
  if (p.out || (!ignoreInv && p.inv > 0)) return false;
  if (sim.cheat(p, 'god')) { sim.ev({ type: 'godblock', p: p.id }); return false; }
  if (sim.mode !== 'range') p.lives--; p.stats.lost++; p.inv = tune.player.iframes; p.hurtT = .5; if (p.chain) sim.ev({ type: 'chainbreak', p: p.id }); p.chain = 0;
  sim.ev({ type: 'hurt', p: p.id, why });
  if (p.lives <= 0) { p.lives = 0; p.out = true; p.contT = sim.mode === 'host' ? 6 : 10; sim.ev({ type: 'out', p: p.id }); }
  return true;
}
TC.hurtPlayer = hurtPlayer;

/** points with the chain multiplier (and extra lives at the thresholds) */
function addScore(sim, p, pts, at, noChain) {
  const v = Math.round(pts * (noChain ? 1 : chainMul(p)) / 10) * 10; p.score += v;
  if (at) sim.ev({ type: 'score', p: p.id, pts: v, at });
  for (const th of [150000, 400000]) if (p.score >= th && !(p.extra & (th === 150000 ? 1 : 2))) { p.extra |= th === 150000 ? 1 : 2; p.lives++; sim.ev({ type: '1up', p: p.id }); }
  return v;
}
TC.addScore = addScore;
function addHitChain(p) { p.chain++; if (p.chain > p.stats.bestChain) p.stats.bestChain = p.chain; }
TC.addHitChain = addHitChain;

/** a stage's rank from a player's stats */
function rankOf(p, stats, conts) {
  const acc = stats.shots ? stats.hits / stats.shots : 0;
  if (conts > 0) return 'D';
  if (acc >= .75 && stats.lost === 0) return 'S';
  if (acc >= .60 && stats.lost <= 1) return 'A';
  if (acc >= .45) return 'B';
  return 'C';
}
TC.rankOf = rankOf;
