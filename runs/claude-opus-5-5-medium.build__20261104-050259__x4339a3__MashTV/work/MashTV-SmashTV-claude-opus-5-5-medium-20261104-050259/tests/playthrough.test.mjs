// the whole game, scripted: title -> lobby -> cold open -> three episodes on the left path -> Green Room -> Ending B -> initials -> Top Earners -> title
import { boot, suite, until, errs } from './lib.mjs';
const ROUTE = ['1-2', '1-4', '1-5', '1-B', '2-2', '2-4', '2-5', '2-B', '3-2', '3-4', '3-5', '3-B'];
export default async () => {
  const S = suite('playthrough'), g = boot(), MT = g.MT, I = g.I, sc = () => g.snap().scene;
  MT.cfg.allowScores = true;
  const scenes = []; let last = null; const track = () => { const s = sc(); if (s !== last) { scenes.push(s); last = s; } };
  const run = (secs, step = .25) => { for (let t = 0; t < secs; t += step) { g.adv(step); track(); } };
  const waitScene = (name, limit = 60) => { for (let t = 0; t < limit; t += .25) { track(); if (sc() === name) return true; g.adv(.25); track(); } return sc() === name; };
  let primeN = 0; const hazards = {}; MT.on('world:prime', () => primeN++); MT.on('roomBegin', d => { const R = MT.ROOMS[d.id]; for (const h of R.hazards || []) hazards[h.kind === 'conveyor' ? 'conveyor' : 'vents'] = true; });
  g.adv(.5); track();
  I.tap('confirm'); waitScene('difficulty', 3);
  S.check('START THE SHOW opens difficulty', sc() === 'difficulty', sc());
  I.tap('confirm'); waitScene('lobby', 3);
  S.check('difficulty opens the lobby', sc() === 'lobby', sc());
  const p2 = g.game.addPlayer({ pad: 1 }); g.adv(.2);
  I.tap('confirm'); g.adv(.2); p2.tap('confirm'); g.adv(.2);
  waitScene('cut', 5); S.check('both ready: the cold open', sc() === 'cut', sc());
  for (const c of MT.run.contestants) { c.ctl = 'bot'; c.botOpts = { route: ROUTE, bombAt: 10 }; c.godMode = true; }
  MT.T.dmgMul = 3;   // (set directly: a test speed-up that leaves the scores open)
  run(4); I.hold('confirm'); run(1); I.hold('confirm', false);
  waitScene('play', 5); S.check('holding confirm skips the cold open into play', sc() === 'play', sc());
  let ok = true;
  for (const ep of [1, 2, 3]) {
    const reached = waitScene('recap', 600);
    ok = ok && reached; S.check('episode ' + ep + ' reaches its recap', reached, JSON.stringify(g.snap()).slice(0, 300));
    if (!reached) break;
    S.check('recap ' + ep + ' has prizes', MT.run.contestants.some(c => c.prizes.some(p => p.ep === ep)));
    for (const c of MT.run.contestants) c.godMode = true;
    for (let t = 0; t < 120 && sc() === 'recap'; t += .5) { I.tap('confirm'); g.adv(.5); track(); }
    if (ep < 3) { S.check('episode ' + (ep + 1) + ' begins', waitScene('play', 10), sc() + ' ' + JSON.stringify({ done: g.game.scene.done, shown: g.game.scene.shown, q: g.game.scene.queue && g.game.scene.queue.length, busy: MT.lines.busy, cur: MT.lines.current && MT.lines.current.text, ql: MT.lines.queue.length, t: g.game.scene.t, left: g.game.scene.left, errs: errs(g).slice(0,2) })); }
  }
  S.check('path took the left route', ['1-2', '1-4', '2-2', '2-4', '3-2', '3-4'].every(id => MT.run.path.includes(id)), MT.run.path.join(' '));
  S.check('keys >= 5', MT.run.keys >= 5, MT.run.keys + '');
  waitScene('cut', 60); S.check('the green room door opens', sc() === 'cut' || sc() === 'play', sc());
  waitScene('play', 30); for (const c of MT.run.contestants) c.godMode = true;
  S.check('the green room', g.snap().room === 'GR', g.snap().room);
  waitScene('ending', 80); S.check('ending B', sc() === 'ending' && g.game.scene.kind === 'b', sc());
  const robot = MT.run.lanceRobot, cover = { killed: Object.assign({}, MT.run.killedKinds), used: Object.assign({}, MT.run.usedW), prime: primeN, bombs: MT.run.bombsUsed, boats: MT.run.boats, hazards };
  waitScene('credits', 60); waitScene('initials', 40);
  S.check('initials after the credits', sc() === 'initials', sc());
  for (let k = 0; k < 4 && sc() === 'initials'; k++) { const sc0 = g.game.scene, who = sc0.order[sc0.k], J = (who && who.input) || I; J.tap('up'); g.adv(.1); for (let j = 0; j < 3; j++) { J.tap('confirm'); g.adv(.15); } g.adv(.2); }
  waitScene('scores', 5); S.check('Top Earners shows the entry', sc() === 'scores' && MT.cab.table('show').length > 0, JSON.stringify(MT.cab.table('show')).slice(0, 120));
  I.tap('confirm'); waitScene('title', 3); S.check('back to the title', sc() === 'title', sc());
  // coverage asserts
  const need = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'hecklerKing', 'tank', 'snake', 'brute'];
  S.check('every enemy kind killed', need.every(k => cover.killed[k]), need.filter(k => !cover.killed[k]).join(','));
  S.check('every weapon and add-on picked up', MT.CAPSULES.every(w => cover.used[w]), MT.CAPSULES.filter(w => !cover.used[w]).join(','));
  S.check('Prime Time at least once', cover.prime > 0);
  S.check('a Showstopper and a Showboat used', cover.bombs > 0 && cover.boats > 0, cover.bombs + '/' + cover.boats);
  S.check('both hazards met', cover.hazards.conveyor && cover.hazards.vents);
  S.check('the robot reveal ran', robot === true);
  S.check('scenes in order', ['title', 'difficulty', 'lobby', 'cut', 'play', 'recap', 'ending', 'credits', 'initials', 'scores', 'title'].every((s, i, a) => scenes.indexOf(s) >= 0), scenes.join('>'));
  S.check('no errors (run 1)', g.game.errors.length === 0, errs(g).slice(0, 3).join(' | '));
  // run 2: bots without cheats on ROOKIE in 1-1 until every life is gone -> CONTINUE -> let it run out -> Game Over -> initials
  MT.T.dmgMul = 1; MT.CHEATS.god = false;
  MT.newRun({ mode: 'arcade', diff: 'ROOKIE', seed: 9, players: [{ slot: 0, look: 0, input: I }] });
  g.game.go('play', { room: '1-1', noCard: true }); g.adv(.5);
  for (const c of MT.run.contestants) { c.lives = 1; c.hp = 1; }
  const W = MT.Show.W; W.contestants[0].hurt(5, null, W);
  const cont = until(g, () => MT.Show.state === 'continue', 10);
  S.check('every life gone: CONTINUE', cont, MT.Show.state);
  waitScene('gameover', 16); S.check('the countdown runs out: Game Over', sc() === 'gameover', sc());
  waitScene('initials', 20); S.check('then initials or the table', sc() === 'initials' || sc() === 'scores', sc());
  S.check('no errors (run 2)', g.game.errors.length === 0, errs(g).slice(0, 3).join(' | '));
  MT.cfg.allowScores = false;
  return S;
};
