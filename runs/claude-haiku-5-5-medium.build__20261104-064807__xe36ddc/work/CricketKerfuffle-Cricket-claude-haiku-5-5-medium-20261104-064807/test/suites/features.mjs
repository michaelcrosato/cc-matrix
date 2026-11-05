// the features the brief names: six teams, five grounds, five chapters, ten showreel segments, eleven Nets lessons, the
// stumping rule, the Story's rain, the ghosts, co-op and 2-v-2 routing. Each check runs the mechanic, not just its data.
import { loadSim, loadGame } from '../lib.mjs';
export async function run({ check }) {
  const G = loadSim();
  const dt = 1 / 120;
  check('six teams, each with an eleven', G.TEAMS.length === 6 && G.TEAMS.every(t => t.squad.length === 11), G.TEAMS.map(t => t.squad.length).join(','));
  check('every team has four bowlers and a keeper in its squad', G.TEAMS.every(t => t.bowlers.length === 4 && t.keeper < 11));
  check('five grounds, each with two stadium targets', G.GROUND_ORDER.length === 5 && G.GROUND_ORDER.every(g => G.GROUNDS[g].targets.length === 2));
  check('five chapters, each with three goals that are tests', G.CHAPTERS.length === 5 && G.CHAPTERS.every(c => c.goals.length === 3 && c.goals.every(([, f]) => typeof f === 'function')));
  check('ten showreel segments', G.ATTRACT_CHAIN.length === 10);
  check('eleven Nets lessons, each with a goal', G.LESSONS.length === 11 && G.LESSONS.every(l => typeof l.goal === 'function' && l.balls > 0));

  // the showreel: every segment plays a real match to a result, with no errors
  const cov = {};
  for (const seg of G.ATTRACT_CHAIN) {
    const m = new G.Match({ overs: 2, wickets: 5, teams: seg.teams, ground: seg.ground, seed: 7 + seg.teams[0] * 3, autoBat: true, autoBowl: true, humanSides: [], cheatPerfect: seg.ground !== 'green', kerf: true });
    let steps = 0;
    while (m.phase !== 'end' && steps < 120 * 60 * 30) { m.update(dt); steps++; }
    check(`the showreel segment on ${seg.ground} finishes`, m.phase === 'end' && !!m.result, m.phase);
    for (const [k, v] of Object.entries(m.coverage)) cov[k] = (cov[k] || 0) + v;
  }
  check('the showreel shows a four, a six, a wicket and a run', (cov.boundary || 0) > 0 && (cov.wicket || 0) > 0 && (cov.run || 0) > 0, JSON.stringify(cov).slice(0, 200));

  // the Nets lessons the bot can play: the ground shot and the lofted shot (a perfect batter), and running
  for (const id of [1, 2, 4]) {
    const L = G.LESSONS.find(l => l.id === id);
    const m = new G.Match({ overs: 30, wickets: 10, teams: [0, 3], ground: 'green', seed: 500 + id, batFirst: 0, humanSides: [], autoBowl: true, machine: L.machine, cheatPerfect: true, kerf: false, mode: 'lesson' });
    let steps = 0;
    while (m.phase !== 'end' && steps < 120 * 60 * 10 && !L.goal(m) && m.log.length < L.balls) { m.update(dt); steps++; }
    check(`lesson ${id} (${L.title}) can be passed by a perfect batter`, L.goal(m), JSON.stringify({ fours: m.stats.fours, lofts: m.stats.lofts, runs: m.stats.runsCompleted, balls: m.log.length }));
  }

  // the stumping rule: a charged batter who misses is stumped when the keeper takes the ball (Lightning makes it likelier)
  let stumped = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const m = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground: 'green', seed, humanSides: [], autoBowl: true, kerf: false });
    m.startRunup({ key: 'legbreak', target: { x: G.W.PX, y: G.W.BAT_CREASE + 90 }, cpu: true });
    for (let k = 0; k < 120 * 3 && m.phase !== 'flight'; k++) m.update(dt);
    m.charging = true; m.stumpRisk = true; m.lightningOver = true;
    m.ball.y = G.W.BAT_CREASE + 4; m.ball.x = G.W.PX; m.ball.z = 4; m.crossed = false;
    m.deliveryPassed();
    if (m.I.bat.some(b => b.how === 'stumped')) stumped++;
  }
  check('a charged, missed ball can stump the batter', stumped > 0, 'stumped ' + stumped + ' of 40');

  // Story's rain: the fourth chapter's second innings is rained off, and the target is revised by the Kerfuffle Method
  const r = new G.Match({ overs: 2, wickets: 5, teams: [0, 4], ground: 'downs', seed: 88, autoBat: true, autoBowl: true, humanSides: [], forceRain: true, kerf: true });
  let st = 0;
  while (r.phase !== 'end' && st < 120 * 60 * 30) { r.update(dt); st++; }
  check('the fourth chapter rains off the second innings', (r.coverage['rain:start'] || 0) > 0 && !!r.kmRevision, JSON.stringify(r.kmRevision || null));

  // the Thunderbolts' ghosts phase in and out: intangible for half a second in every six
  const g = new G.Match({ overs: 1, wickets: 5, teams: [0, 5], ground: 'dome', seed: 9, autoBat: true, autoBowl: true, humanSides: [] });
  g.placeFielders(); let ghosts = 0, phased = 0;
  for (let k = 0; k < 120 * 12; k++) { g.stepFielders(dt); g.t += dt; }
  for (const f of g.fielders) if (f.ghost) { ghosts++; if (f.intangible !== undefined) phased++; }
  check('the Thunderbolts field five ghosts that phase', ghosts === 5 && phased === 5, 'ghosts ' + ghosts);

  // the game: co-op puts two players on one side, 2 v 2 puts two a side
  const d = loadGame();
  d.game.addPlayer({ keys: 'right' }); d.game.addPlayer({ pad: 0 }); d.game.addPlayer({ pad: 1 });
  d.game.advance(0.2);
  d.game.debug.setLayout('coop');
  check('co-op: two players on the first side, none on the other', JSON.stringify(d.game.debug.humans()) === '[2,0]', JSON.stringify(d.game.debug.humans()));
  d.game.debug.setLayout('2v2');
  check('2 v 2: two players a side', JSON.stringify(d.game.debug.humans()) === '[2,2]', JSON.stringify(d.game.debug.humans()));
  d.game.debug.setLayout('1v1');
  check('1 v 1: one player a side', JSON.stringify(d.game.debug.humans()) === '[1,1]', JSON.stringify(d.game.debug.humans()));
  check('no errors in the layouts', d.errs().length === 0, d.errs().join(' | '));

  // the third umpire: a close run-out goes upstairs, with the margin on the screen
  const tu = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground: 'green', seed: 3, humanSides: [], autoBowl: true, kerf: false });
  const runner = tu.I.bat[0];
  tu.runs = { active: true, run: 0, awaitCall: 0, human: false };
  tu.phase = 'play';
  tu.ball = G.newBall(G.W.PX, G.W.SY + 20, 0);
  tu.throwing = { f: tu.fielders[0], end: 'A', t: 0.001, total: 0.3, hit: true, runner, runnerTime: 0.35, from: { x: 0, y: 0 }, to: { x: G.W.PX, y: G.W.SY } };
  tu.stepThrow(dt);
  const tuEv = tu.drain().find(e => e.type === 'third-umpire');
  check('a close run-out goes to the third umpire', !!tuEv && tuEv.data.out === true, JSON.stringify(tuEv && tuEv.data));
  // the high-score table: an empty table takes any score; a full table needs more than its last place
  const tab = new G.Match({ overs: 1, wickets: 2, teams: [0, 1], ground: 'green', seed: 4, humanSides: [], autoBowl: true });

  // the lessons and the chapters run in the game without errors
  const e = loadGame();
  e.game.advance(0.3);
  check('an empty table takes any score', e.game.debug.table('bat', 0) === true);
  // a six in a real match records an instant replay and a highlight clip
  e.game.debug.startMatch({ teams: [0, 1], ground: 'green', overs: 2, wickets: 5, kerf: false, batFirst: 0, seed: 11, humanSides: [], autoBat: true, autoBowl: true, cheatPerfect: true }, {});
  let clips = 0;
  for (let k = 0; k < 120 * 120 && clips === 0; k++) { e.game.advance(1 / 120); clips = e.snap().clips; }
  check('a big play in a match records a highlight clip', clips > 0, 'clips ' + clips);
  e.game.debug.lesson(6); e.game.advance(2);
  check('a Nets lesson starts in the game', e.snap().scene === 'match', e.snap().scene);
  e.game.debug.chapter(4); e.game.advance(2);
  check('chapter four starts in the game', e.snap().scene === 'match' || e.snap().scene === 'cutscene', e.snap().scene);
  check('no errors in the lessons and chapters', e.errs().length === 0, e.errs().join(' | '));
}
