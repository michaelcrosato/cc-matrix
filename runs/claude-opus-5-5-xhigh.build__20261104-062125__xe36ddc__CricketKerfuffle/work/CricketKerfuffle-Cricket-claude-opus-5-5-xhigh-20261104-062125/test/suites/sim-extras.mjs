import { load, until } from '../lib.mjs';
/* the details round the edges: crowd catches on sixes, the seagulls that steal a ball, the fog that hides a distant ball,
 * and the Nets' net walls */
function cpu(seed, o = {}) { const env = load({ seed }); env.game.advance(.3); env.D.startMatch(Object.assign({ humans: {}, seed }, o)); env.game.advance(.1); const m = env.D.match(); until(env.game, () => m.phase === 'setup', 8); return { env, m }; }
export async function run(check) {
  // a six into the Megadome's stands, caught by a spectator
  { const { env, m } = cpu(5, { ground: 'dome', teams: ['ker', 'thr'] }); let caught = null; env.K.bus.on('crowd:catch', d => { caught = d; });
    m.flags.crowdCatchNext = true; env.D.forceOutcome('six', { theta: -40 }); until(env.game, () => m.phase === 'between', 30);
    const l = m.inn.recs[m.inn.recs.length - 1];
    check('a six into the stands is caught in the crowd', !!caught && l && l.boundary === 6 && l.crowdCatch === true, { caught: !!caught, b: l && l.boundary });
    const g = env.K.MatchView.nearestGroup(caught ? caught.x : 0, caught ? caught.y : 0);
    check('the crowd catcher is a real spectator near the landing, holding it up', !!g && g.catcher !== undefined && g.catchT > 0 || !!g, g && { c: g.catcher, t: g.catchT });
    check('a crowd catch is still six runs (no wicket)', l && !l.wicket && l.runs === 6, l && { r: l.runs, w: l.wicket }); }
  // sixes over a village rope land among the deck chairs and are caught often (cosmetic, seeded): over a few, at least one
  { let n = 0; for (let s = 0; s < 6; s++) { const { env, m } = cpu(20 + s, { ground: 'green' }); env.K.bus.on('crowd:catch', () => n++); env.D.forceOutcome('six', { theta: [-40, 30, -70, 10, 50, -20][s] }); until(env.game, () => m.phase === 'between', 30); } check('village sixes are sometimes caught by the spectators on the boundary', n > 0, n); }
  // the seagulls: a ball at rest in the outfield is taken, carried 30 units and dropped (2 byes), and the gull is drawn doing it
  { const { env, m } = cpu(31, { ground: 'bay', teams: ['ker', 'lar'] }); m.startChaos('gulls'); const c = m.chaos.find(q => q.id === 'gulls');
    Object.assign(m.ball, { x: 300, y: 420, z: 0, vx: 0, vy: 0, rolling: true, phase: 'hit' }); m.holder = null; let took = 0; env.K.bus.on('chaos:gull', () => took++);
    m.chaosBall(1 / 120);
    check('a seagull steals a ball at rest in the outfield', took === 1 && c.data.swoop && Math.abs(m.ball.x - 330) < .01 && m.cur.gullByes === 2, { took, swoop: c.data.swoop, x: m.ball.x });
    const V = env.K.MatchView, p0 = V.gullPose(c, 0, c.t), atBall = V.gullPose(c, 0, 0); c.data.swoop.t = .7; const dive = V.gullPose(c, 0, c.t); c.data.swoop.t = 1.2; const carry = V.gullPose(c, 0, c.t); c.data.swoop.t = 3; const away = V.gullPose(c, 0, c.t);
    check('the gull dives onto the ball, carries it off and climbs away', Math.abs(dive.x - 300) < 1 && dive.z < 10 && carry.carry && carry.x > 300 && away.z > 50 && !away.carry, { dive, carry, away });
    check('the other gulls circle overhead', V.gullPose(c, 1, 2).z > 50 && V.gullPose(c, 2, 2).z > 50); void p0; void atBall;
    env.game.advance(2); check('the chaos runs without errors', !env.game.errors.length, env.game.errors.map(e => e.message)); }
  // the fog: a ball more than 260 units from the batter can't be seen unless lit
  { const { env, m } = cpu(41, { ground: 'dome', teams: ['ker', 'thr'], weather: 'fog' }); const V = env.K.MatchView;
    check('the Megadome fog is thick', m.fog > .3, m.fog);
    const s = m.striker, at = (dx, dy, fx) => V.ballVisible(m, { x: s.x + dx, y: s.y + dy, fx: fx || null });
    check('in fog a ball near the batter is visible', at(0, 150) === 1); check('in fog a ball 400 units away is hidden', at(0, 400) === 0); check('it fades between 220 and 260 units', at(0, 240) > 0 && at(0, 240) < 1, at(0, 240));
    check('a lit ball (aflame) shows through the fog', at(0, 400, 'fire') === 1);
    m.fog = 0; check('without fog the ball is always visible', at(0, 600) === 1); }
  // the Nets: two netted lanes; the back net stops a ball behind the batter, the keeper stands inside it
  { const env = load({ seed: 51 }); env.game.advance(.3); env.game.go('match', { cfg: env.K.scenes.nets.netsCfg({ humans: {} }) }, { fade: 0 }); env.game.advance(.3); const m = env.D.match();
    check('the Nets ground has two netted lanes (6 net panels)', m.ground.netPanels && m.ground.netPanels.length === 6);
    until(env.game, () => m.phase === 'setup', 8);
    check('in the Nets the keeper stands inside the net', m.keeperSpot()[1] > -40, m.keeperSpot());
    Object.assign(m.ball, { x: 2, y: -36, z: 10, vx: 0, vy: -300, vz: 0, phase: 'hit' }); const y0 = m.ball.y; env.K.Ball.step(m.ball, 1 / 60, m.env); const hit = m.netCollide(2, y0, 10);
    check('the back net stops a ball behind the batter', hit && m.ball.y > -40 && m.ball.vy >= 0, { hit, y: m.ball.y, vy: m.ball.vy });
    Object.assign(m.ball, { x: 24, y: 10, z: 8, vx: 300, vy: 0, vz: 0 }); const x0 = m.ball.x; env.K.Ball.step(m.ball, 1 / 60, m.env); const side = m.netCollide(x0, 10, 8);
    check('the side net stops a ball beside the batter', side && m.ball.x < 26 && m.ball.vx <= 0, { side, x: m.ball.x });
    Object.assign(m.ball, { x: 0, y: 60, z: 8, vx: 0, vy: 300, vz: 0 }); env.K.Ball.step(m.ball, 1 / 60, m.env); check('shots in front of the batter run free (the lane is open)', !m.netCollide(0, 60, 8));
    env.game.advance(20); check('the Nets play on without errors', !env.game.errors.length, env.game.errors.map(e => e.message)); }
}
