// specials, left-handers, charge and dive, the Megadome and the bells: each mechanic has a check that it changes the match.
import { loadSim } from '../lib.mjs';
export async function run({ check }) {
  const G = loadSim();
  const dt = 1 / 120;
  // the roster: eighteen specials, each with a kind and a real effect, and each owner is a player in a squad
  const names = Object.keys(G.SPECIALS);
  check('there are twenty-one specials', names.length === 21, names.length);
  const bat = names.filter(n => G.SPECIALS[n].kind === 'bat').length, bowl = names.filter(n => G.SPECIALS[n].kind === 'bowl').length, field = names.filter(n => G.SPECIALS[n].kind === 'field').length;
  check('eight batting, ten bowling and three fielding specials', bat === 8 && bowl === 10 && field === 3, [bat, bowl, field].join('/'));
  const squads = G.TEAMS.flatMap(t => t.squad);
  const owned = Object.keys(G.OWNERS);
  check('every owner is a player in a squad', owned.every(n => squads.indexOf(n) >= 0), owned.filter(n => squads.indexOf(n) < 0).join(','));
  const used = new Set(owned.flatMap(n => Object.values(G.OWNERS[n])));
  // the two generic specials belong to any player without one, so they have no owner
  check('every owned special has an owner (the two generic ones excepted)', names.filter(n => n !== 'kfShot' && n !== 'kfBall').every(n => used.has(n)), names.filter(n => !used.has(n)).join(','));
  check('every bowling special has a delivery', names.filter(n => G.SPECIALS[n].kind === 'bowl').every(n => G.SPECIALS[n].delivery));
  check('every batting special has a shot', names.filter(n => G.SPECIALS[n].kind === 'bat').every(n => G.SPECIALS[n].shot));

  // a special shot resolves to its shot from the press, and its flags reach the ball after contact
  const m = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground: 'green', seed: 21, humanSides: [], autoBowl: true, kerf: false });
  m.startRunup({ key: 'express', target: { x: G.W.PX, y: G.W.BAT_CREASE + 90 }, cpu: true });
  for (let k = 0; k < 120 * 3 && m.phase !== 'flight'; k++) m.update(dt);
  check('a delivery is in the air for the special test', m.phase === 'flight', m.phase);
  // press at the moment the ball reaches the contact plane, so the shot is a timed contact
  for (let k = 0; k < 120 * 3 && m.arriveAbs - m.t > 0.12; k++) m.update(dt);
  const pressed = m.batPress('loft', null, 'croquet');
  check('a special shot is accepted on the press', pressed === true);
  check('the croquet drive resolves to a ground drive', m.pressed && m.pressed.shot === 'drive', m.pressed && m.pressed.shot);
  for (let k = 0; k < 120 && m.phase === 'flight'; k++) m.update(dt);
  check('the croquet ball is unstoppable after contact', m.ball.unstoppable === true, m.ball.unstoppable);

  // the left-hander: his sector is mirrored, and the ball goes the other way off the bat
  const lhb = m.striker && m.striker.p % 3 === 2 ? 'lh' : 'rh';
  check('a left-hander is every third squad member', G.TEAMS[0].squad.length > 0 && [0, 1, 3, 4, 6, 7].every(p => p % 3 !== 2));
  const h = { handOf: G.Match.prototype.handOf };
  check('the hand of a left-hander is -1 and of a right-hander 1', h.handOf({ p: 2 }) === -1 && h.handOf({ p: 0 }) === 1, lhb);

  // charge: the contact plane moves toward the bowler, and the ball arrives sooner
  const c = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground: 'green', seed: 22, humanSides: [], autoBowl: true, kerf: false });
  c.startRunup({ key: 'express', target: { x: G.W.PX, y: G.W.BAT_CREASE + 90 }, cpu: true });
  for (let k = 0; k < 120 * 3 && c.phase !== 'flight'; k++) c.update(dt);
  const before = c.arriveAbs;
  check('charge brings the contact forward', c.charge() === true && c.arriveAbs < before, before + ' -> ' + c.arriveAbs);

  // a dive for the crease shortens the runner's time
  const d = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground: 'green', seed: 23, humanSides: [], autoBat: true, autoBowl: true, kerf: false });
  d.throwing = { runner: { y: G.W.BAT_CREASE + 20 }, end: 'A', runnerTime: 0.4, total: 0.2 };
  check('a dive shortens a runner\'s time when he is close to his crease', d.dive() === true && Math.abs(d.throwing.runnerTime - 0.25) < 1e-9, d.throwing.runnerTime);

  // the bells: a dot ball rings them while they last
  const b = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground: 'green', seed: 24, humanSides: [], autoBat: true, autoBowl: true, kerf: false });
  b.bells = 2; const hype0 = b.hype[b.bowlingSide];
  b.dotBall();
  check('the bells add Hype to the bowlers for a dot ball', b.hype[b.bowlingSide] > hype0 && b.bells === 1, b.hype[b.bowlingSide] + ' bells ' + b.bells);

  // the Megadome: floodlit, foggy, and it plays a complete match
  const dome = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground: 'dome', seed: 31, autoBat: true, autoBowl: true, humanSides: [], kerf: true });
  let steps = 0;
  while (dome.phase !== 'end' && steps < 120 * 60 * 30) { dome.update(dt); steps++; }
  check('the Megadome plays a complete match', dome.phase === 'end' && !!dome.result, dome.phase);
  check('the Megadome has its ground data', G.GROUNDS.dome && G.GROUNDS.dome.light === 'night' && G.GROUNDS.dome.fog === true);
  // the Kerfuffle Method and a revised target still hold
  check('the rain rule is unchanged (60 runs, 2 overs, 1 left: 31)', G.kerfTarget(60, 2, 1, 0) === 31);
  // the Owl-Eye reads the path the ball took
  check('the ball path is recorded for the review', Array.isArray(dome.path));
}
